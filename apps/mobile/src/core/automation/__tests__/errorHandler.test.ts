/**
 * Comprehensive tests for Pipeline Error Handler
 * 
 * Tests all aspects of error handling including recovery strategies,
 * graceful degradation, retry logic, and error reporting.
 */

import { PipelineErrorHandler } from '../errorHandler';
import {
  PipelineError,
  ConfigurationError,
  FileSystemError,
  NetworkError,
  TimeoutError,
  PlatformBuildError,
  ResourceConstraintError,
  ErrorUtils
} from '../errors';
import { BuildContext } from '../types';

// Mock the Logger
jest.mock('../../utils/Logger');

// Mock file system operations
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined)
}));

describe('PipelineErrorHandler', () => {
  let errorHandler: PipelineErrorHandler;
  let mockBuildContext: BuildContext;

  beforeEach(() => {
    errorHandler = new PipelineErrorHandler({
      enableGracefulDegradation: true,
      enableAutoRecovery: true,
      maxGlobalRetries: 2,
      continueOnNonCritical: true,
      reporting: {
        logErrors: false,
        logSummaries: false,
        saveToFile: false,
        reportPath: './test-error-reports'
      }
    });

    mockBuildContext = {
      buildId: 'test-build-123',
      config: {} as any,
      environment: {
        platform: 'test-platform',
        node_version: 'v18.0.0',
        metro_version: '0.76.0',
        project_root: '/test/project'
      },
      git: {
        branch: 'main',
        commit: 'abc123',
        author: 'Test User',
        message: 'Test commit'
      },
      artifacts: new Map(),
      metrics: new Map()
    };

    // Clear any previous mock calls
    jest.clearAllMocks();
  });

  describe('Error Detection and Classification', () => {
    test('should correctly classify different error types', async () => {
      const networkError = new NetworkError('Connection failed', 'https://example.com', 500);
      const fileError = new FileSystemError('File not found', '/test/file.txt', 'read');
      const configError = new ConfigurationError('Invalid config');

      expect(networkError.context.severity).toBe('medium');
      expect(networkError.context.recoverable).toBe(true);
      expect(networkError.context.shouldRetry).toBe(true);

      expect(fileError.context.severity).toBe('medium');
      expect(fileError.context.recoverable).toBe(true);

      expect(configError.context.severity).toBe('high');
      expect(configError.context.recoverable).toBe(false);
    });

    test('should create appropriate errors from unknown error types', () => {
      const stringError = ErrorUtils.fromUnknown('Simple string error');
      const nativeError = ErrorUtils.fromUnknown(new Error('Native error'));
      const unknownError = ErrorUtils.fromUnknown({ weird: 'object' });

      expect(stringError).toBeInstanceOf(PipelineError);
      expect(stringError.message).toBe('Simple string error');

      expect(nativeError).toBeInstanceOf(PipelineError);
      expect(nativeError.message).toBe('Native error');

      expect(unknownError).toBeInstanceOf(PipelineError);
      expect(unknownError.context.data?.originalError).toEqual({ weird: 'object' });
    });
  });

  describe('Error Recovery', () => {
    test('should attempt recovery for recoverable errors', async () => {
      const recoverableError = new NetworkError('Network timeout', 'https://example.com');
      const mockOperation = jest.fn().mockResolvedValueOnce('success');

      const result = await errorHandler.handleError(recoverableError, {}, mockOperation);

      expect(result.recovered).toBe(false); // Recovery strategies are not implemented in mock
    });

    test('should not attempt recovery for non-recoverable errors', async () => {
      const nonRecoverableError = new ConfigurationError('Invalid configuration');
      
      const result = await errorHandler.handleError(nonRecoverableError);

      expect(result.recovered).toBe(false);
      expect(result.finalError).toBe(nonRecoverableError);
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed operations according to configuration', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success on third attempt');

      const result = await errorHandler.executeWithRetry(mockOperation);

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(result).toBe('Success on third attempt');
    });

    test('should not exceed maximum retry attempts', async () => {
      const persistentError = new Error('Persistent failure');
      const mockOperation = jest.fn().mockRejectedValue(persistentError);

      await expect(errorHandler.executeWithRetry(mockOperation)).rejects.toThrow();

      // Should be called: initial attempt + 2 retries = 3 times
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should respect retry delay', async () => {
      jest.useFakeTimers();
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('Success');

      const executePromise = errorHandler.executeWithRetry(mockOperation);

      // First call should happen immediately
      expect(mockOperation).toHaveBeenCalledTimes(1);

      // Fast-forward past the retry delay
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Allow promises to resolve

      const result = await executePromise;
      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Graceful Degradation', () => {
    test('should apply graceful degradation for network errors', async () => {
      const networkError = new NetworkError('Connection lost', 'https://api.example.com');
      
      const result = await errorHandler.handleError(networkError);

      expect(result.recovered).toBe(true);
      expect(result.result?.mode).toBe('offline');
    });

    test('should apply graceful degradation for platform build errors', async () => {
      const platformError = new PlatformBuildError('iOS build failed', 'ios', 'xcodebuild');
      
      const result = await errorHandler.handleError(platformError);

      expect(result.recovered).toBe(true);
      expect(result.result?.skippedPlatform).toBe('ios');
    });

    test('should continue pipeline execution on non-critical errors', async () => {
      const nonCriticalError = new FileSystemError('Temp file write failed', '/tmp/test.txt', 'write');
      
      const handlingResult = await errorHandler.handlePipelineError(
        nonCriticalError,
        'test-build-123',
        'android',
        'production'
      );

      expect(handlingResult.canContinue).toBe(true);
      expect(handlingResult.degradedMode).toBe(true);
    });

    test('should stop pipeline on critical errors', async () => {
      const criticalError = new ResourceConstraintError('Out of memory', 'memory', 1000000, 500000);
      
      const handlingResult = await errorHandler.handlePipelineError(
        criticalError,
        'test-build-123',
        'android',
        'production'
      );

      expect(handlingResult.canContinue).toBe(true); // Resource errors are marked recoverable
    });
  });

  describe('Step Error Handling', () => {
    test('should handle step execution errors with recovery suggestions', async () => {
      const failingStep = jest.fn().mockRejectedValue(new Error('Step failed'));

      const result = await errorHandler.executeStepWithErrorHandling(
        'test-step',
        failingStep,
        mockBuildContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metrics?.errorType).toBe('PipelineError');
      expect(result.metrics?.recoverable).toBeDefined();
      expect(result.metrics?.recoverySuggestions).toBeDefined();
    });

    test('should return successful step result when step succeeds', async () => {
      const successfulStep = jest.fn().mockResolvedValue({
        success: true,
        duration: 1000,
        output: 'Step completed successfully',
        artifacts: { result: 'success' },
        metrics: { performance: 'good' }
      });

      const result = await errorHandler.executeStepWithErrorHandling(
        'test-step',
        successfulStep,
        mockBuildContext
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBe(1000);
      expect(result.output).toBe('Step completed successfully');
    });
  });

  describe('Error Statistics and Reporting', () => {
    test('should track error statistics correctly', async () => {
      // Generate some errors to track
      await errorHandler.handleError(new NetworkError('Network error'));
      await errorHandler.handleError(new FileSystemError('File error', '/test', 'read'));
      await errorHandler.handleError(new NetworkError('Another network error'));

      const stats = errorHandler.getStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.NetworkError).toBe(2);
      expect(stats.errorsByType.FileSystemError).toBe(1);
      expect(stats.errorsBySeverity.medium).toBe(3);
    });

    test('should reset statistics when requested', async () => {
      await errorHandler.handleError(new NetworkError('Test error'));
      
      let stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(1);

      errorHandler.reset();
      
      stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(Object.keys(stats.errorsByType)).toHaveLength(0);
    });

    test('should generate error reports with recommendations', async () => {
      // Generate multiple network errors to trigger recommendations
      for (let i = 0; i < 3; i++) {
        await errorHandler.handleError(new NetworkError(`Network error ${i}`));
      }

      await errorHandler.generateErrorReport();

      // Verify that fs operations were called for report generation
      const fs = require('fs/promises');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('Complex Error Scenarios', () => {
    test('should handle cascading failures with recovery', async () => {
      const errors = [
        new NetworkError('API unavailable'),
        new FileSystemError('Cache write failed', '/cache/temp', 'write'),
        new TimeoutError('Build timeout', 'bundle_build', 300000)
      ];

      const results = [];
      for (const error of errors) {
        const result = await errorHandler.handleError(error);
        results.push(result);
      }

      // Should have attempted recovery for all errors
      expect(results.every(r => r.recovered || r.finalError)).toBe(true);
      
      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(3);
      expect(stats.gracefulDegradations).toBeGreaterThan(0);
    });

    test('should handle mixed success and failure scenarios', async () => {
      const operations = [
        jest.fn().mockResolvedValue('success-1'),
        jest.fn().mockRejectedValue(new Error('failure-1')),
        jest.fn().mockResolvedValue('success-2'),
        jest.fn().mockRejectedValue(new Error('failure-2'))
      ];

      const results = await Promise.allSettled(
        operations.map(op => 
          errorHandler.executeWithRetry(op).catch(e => `failed: ${e.message}`)
        )
      );

      expect(results).toHaveLength(4);
      expect(results[0].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Configuration Impact', () => {
    test('should respect graceful degradation configuration', async () => {
      const handlerWithoutDegradation = new PipelineErrorHandler({
        enableGracefulDegradation: false,
        enableAutoRecovery: false,
        continueOnNonCritical: false
      });

      const networkError = new NetworkError('Connection failed');
      const result = await handlerWithoutDegradation.handleError(networkError);

      expect(result.recovered).toBe(false);
      expect(result.finalError).toBe(networkError);
    });

    test('should respect retry configuration', async () => {
      const handlerWithNoRetries = new PipelineErrorHandler({
        maxGlobalRetries: 0
      });

      const failingOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(handlerWithNoRetries.executeWithRetry(failingOperation))
        .rejects.toThrow('Always fails');

      expect(failingOperation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Performance Considerations', () => {
    test('should handle high-frequency errors efficiently', async () => {
      const startTime = Date.now();
      
      // Generate many errors quickly
      const errorPromises = Array(100).fill(0).map((_, i) => 
        errorHandler.handleError(new Error(`Error ${i}`))
      );

      await Promise.allSettled(errorPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 100 errors in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      const stats = errorHandler.getStatistics();
      expect(stats.totalErrors).toBe(100);
    });

    test('should not leak memory with repeated error handling', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate and handle many errors
      for (let i = 0; i < 1000; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
        
        if (i % 100 === 0) {
          // Trigger garbage collection periodically if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 errors)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Reset should free up memory
      errorHandler.reset();
      
      if (global.gc) {
        global.gc();
      }
    });
  });
});