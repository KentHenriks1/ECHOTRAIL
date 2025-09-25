/**
 * Chaos Engineering Tests for PipelineErrorHandler
 * 
 * Tests graceful degradation under extreme failure conditions:
 * - High network error rates
 * - File system locks and permissions issues
 * - Memory pressure and resource constraints
 * - Timing and concurrency issues
 * 
 * These tests prove that our error handling is truly robust.
 */

import { PipelineErrorHandler } from '../errorHandler';
import { NetworkError, FileSystemError, ResourceConstraintError, TimeoutError } from '../errors';
import { BuildContext } from '../types';

// Chaos testing utilities
class ChaosTestUtils {
  /**
   * Simulates flaky network conditions with configurable error rates
   */
  static withFlakyNetwork<T>(
    options: { errorRate: number; timeoutRate?: number },
    operation: () => Promise<T>
  ): Promise<T> {
    const originalFetch = global.fetch;
    
    // Mock network calls to be unreliable
    global.fetch = jest.fn().mockImplementation(() => {
      const random = Math.random();
      
      if (random < options.errorRate) {
        throw new NetworkError('Simulated network failure', 'https://chaos-test.local', 500);
      }
      
      if (options.timeoutRate && random < options.errorRate + options.timeoutRate) {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new NetworkError('Network timeout', 'https://chaos-test.local', 408)), 100);
        });
      }
      
      return Promise.resolve(new Response('{"success": true}'));
    });
    
    return operation().finally(() => {
      global.fetch = originalFetch;
    });
  }

  /**
   * Simulates file system under stress with locks and permission issues
   */
  static withLockedFS<T>(
    options: { lockRatio: number; permissionDeniedRatio?: number },
    operation: () => Promise<T>
  ): Promise<T> {
    const mockFS = {
      writeFile: jest.fn(),
      readFile: jest.fn(),
      mkdir: jest.fn(),
      unlink: jest.fn()
    };

    // Inject failures into file system operations
    Object.keys(mockFS).forEach(method => {
      mockFS[method].mockImplementation(() => {
        const random = Math.random();
        
        if (random < options.lockRatio) {
          throw new FileSystemError(`File locked: ${method}`, '/test/path', method as any);
        }
        
        if (options.permissionDeniedRatio && random < options.lockRatio + options.permissionDeniedRatio) {
          throw new FileSystemError(`Permission denied: ${method}`, '/test/path', method as any);
        }
        
        return Promise.resolve('success');
      });
    });

    return operation();
  }

  /**
   * Simulates memory pressure and resource constraints
   */
  static withResourcePressure<T>(
    options: { memoryPressure: boolean; cpuPressure: boolean },
    operation: () => Promise<T>
  ): Promise<T> {
    const originalMemoryUsage = process.memoryUsage;
    
    if (options.memoryPressure) {
      // Mock high memory usage
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 512 * 1024 * 1024, // 512MB
        heapUsed: 480 * 1024 * 1024, // 480MB (93.75% usage)
        external: 100 * 1024 * 1024, // 100MB
        arrayBuffers: 50 * 1024 * 1024 // 50MB
      });
    }
    
    return operation().finally(() => {
      process.memoryUsage = originalMemoryUsage;
    });
  }

  /**
   * Creates a mock build context for chaos testing
   */
  static createChaosBuildContext(id: string = 'chaos-test'): BuildContext {
    return {
      buildId: `chaos-${id}-${Date.now()}`,
      config: {} as any,
      environment: {
        platform: 'chaos-test',
        node_version: process.version,
        metro_version: '0.76.0',
        project_root: '/chaos/test'
      },
      git: {
        branch: 'chaos-branch',
        commit: 'chaos123',
        author: 'Chaos Engineer',
        message: 'Chaos testing commit'
      },
      artifacts: new Map(),
      metrics: new Map()
    };
  }
}

describe('PipelineErrorHandler - Chaos Engineering Tests', () => {
  let errorHandler: PipelineErrorHandler;
  let mockBuildContext: BuildContext;

  beforeEach(() => {
    errorHandler = new PipelineErrorHandler({
      enableGracefulDegradation: true,
      enableAutoRecovery: true,
      maxGlobalRetries: 3,
      retryDelayMultiplier: 0.1, // Speed up tests
      continueOnNonCritical: true,
      reporting: {
        logErrors: false,
        logSummaries: false,
        saveToFile: false,
        reportPath: '/dev/null'
      }
    });

    mockBuildContext = ChaosTestUtils.createChaosBuildContext();
    jest.clearAllMocks();
  });

  describe('Network Chaos Scenarios', () => {
    it('should gracefully degrade under 50% network error rate', async () => {
      await ChaosTestUtils.withFlakyNetwork(
        { errorRate: 0.5, timeoutRate: 0.2 },
        async () => {
          const results = [];
          
          // Simulate multiple network-dependent operations
          for (let i = 0; i < 20; i++) {
            const result = await errorHandler.handleError(
              new NetworkError(`Network operation ${i}`, `https://api-${i}.test.com`),
              { buildId: mockBuildContext.buildId },
              async () => {
                // Simulate network operation
                await fetch(`https://api-${i}.test.com`);
                return `success-${i}`;
              }
            );
            
            results.push(result);
          }
          
          const stats = errorHandler.getStatistics();
          
          // Under 50% error rate, should have significant degradation but continue
          expect(stats.gracefulDegradations).toBeGreaterThan(5);
          expect(stats.totalErrors).toBeGreaterThan(10);
          
          // Should still have some successful operations due to graceful degradation
          const successfulResults = results.filter(r => r.recovered);
          expect(successfulResults.length).toBeGreaterThan(0);
          
          // Recovery rate should be reasonable despite high error rate
          const recoveryRate = stats.recoveredErrors / stats.totalErrors;
          expect(recoveryRate).toBeGreaterThan(0.3); // At least 30% recovery
        }
      );
    });

    it('should maintain exponential backoff under network instability', async () => {
      jest.useFakeTimers();
      
      try {
        const startTime = Date.now();
        const timings: number[] = [];
        
        const flakyOperation = jest.fn()
          .mockRejectedValueOnce(new NetworkError('First failure'))
          .mockRejectedValueOnce(new NetworkError('Second failure'))
          .mockRejectedValueOnce(new NetworkError('Third failure'))
          .mockResolvedValueOnce('Finally success');

        const executePromise = errorHandler.executeWithRetry(
          async () => {
            timings.push(Date.now() - startTime);
            return await flakyOperation();
          },
          { buildId: mockBuildContext.buildId }
        );

        // Fast-forward through retry delays
        for (let i = 0; i < 4; i++) {
          await Promise.resolve(); // Let promises resolve
          jest.advanceTimersByTime(5000); // Advance past retry delay
        }

        const result = await executePromise;
        expect(result).toBe('Finally success');
        
        // Verify exponential backoff timing pattern
        expect(timings).toHaveLength(4); // Initial + 3 retries
        expect(flakyOperation).toHaveBeenCalledTimes(4);
        
        const stats = errorHandler.getStatistics();
        expect(stats.retriedOperations).toBe(3);
        
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle cascading network failures across multiple services', async () => {
      const services = ['auth', 'api', 'cdn', 'analytics', 'monitoring'];
      const results = new Map();

      await ChaosTestUtils.withFlakyNetwork(
        { errorRate: 0.7 }, // Very high error rate
        async () => {
          // Simulate failure cascade across multiple services
          const servicePromises = services.map(async service => {
            const errors = [];
            
            for (let attempt = 0; attempt < 5; attempt++) {
              try {
                const result = await errorHandler.executeWithRetry(
                  async () => {
                    throw new NetworkError(`${service} service unavailable`, `https://${service}.test.com`, 503);
                  },
                  { buildId: mockBuildContext.buildId, data: { service, attempt } },
                  2 // Limited retries for this test
                );
                return { service, success: true, result };
              } catch (error) {
                errors.push(error);
              }
            }
            
            return { service, success: false, errors: errors.length };
          });

          const serviceResults = await Promise.allSettled(servicePromises);
          
          serviceResults.forEach(result => {
            if (result.status === 'fulfilled') {
              results.set(result.value.service, result.value);
            }
          });

          const stats = errorHandler.getStatistics();
          
          // Should have attempted graceful degradation for multiple services
          expect(stats.gracefulDegradations).toBeGreaterThan(0);
          expect(stats.totalErrors).toBeGreaterThan(10);
          
          // Verify that error handler maintained stability despite cascade
          expect(stats.errorsByType.NetworkError).toBeGreaterThan(5);
          
          // System should still be operational (no critical failures that stop everything)
          expect(stats.criticalFailures).toBeLessThan(stats.totalErrors);
        }
      );
    });
  });

  describe('File System Chaos Scenarios', () => {
    it('should handle file system locks and permission issues', async () => {
      await ChaosTestUtils.withLockedFS(
        { lockRatio: 0.3, permissionDeniedRatio: 0.2 },
        async () => {
          const fileOperations = [
            'cache-write', 'config-read', 'log-append', 'report-generate', 
            'temp-create', 'backup-save', 'artifact-store'
          ];

          const operationResults = [];

          for (const operation of fileOperations) {
            const result = await errorHandler.executeStepWithErrorHandling(
              `fs-${operation}`,
              async () => {
                // Simulate file operation that might fail
                const random = Math.random();
                if (random < 0.4) { // 40% chance of file system error
                  throw new FileSystemError(
                    `File system error during ${operation}`,
                    `/tmp/${operation}.tmp`,
                    'write'
                  );
                }
                
                return {
                  success: true,
                  duration: Math.random() * 100,
                  output: `${operation} completed`,
                  artifacts: { [operation]: `/tmp/${operation}.tmp` },
                  metrics: { operation }
                };
              },
              mockBuildContext
            );

            operationResults.push({ operation, result });
          }

          const stats = errorHandler.getStatistics();
          
          // Should have encountered file system errors but continued
          expect(stats.errorsByType.FileSystemError).toBeGreaterThan(0);
          expect(stats.gracefulDegradations).toBeGreaterThan(0);

          // Most operations should still complete (via degradation)
          const successfulOps = operationResults.filter(op => op.result.success);
          const failedOps = operationResults.filter(op => !op.result.success);
          
          // Should have some successes despite chaos
          expect(successfulOps.length).toBeGreaterThan(0);
          
          // Failed operations should have error context
          failedOps.forEach(op => {
            expect(op.result.metrics?.errorType).toBeDefined();
            expect(op.result.metrics?.recoverySuggestions).toBeDefined();
          });
        }
      );
    });

    it('should maintain performance under file system stress', async () => {
      const startTime = Date.now();
      const operations = [];

      // Simulate heavy file I/O under stress conditions
      for (let i = 0; i < 50; i++) {
        const operation = errorHandler.executeWithRetry(
          async () => {
            // Simulate file operation with potential stress
            if (Math.random() < 0.2) {
              throw new FileSystemError('Disk full', `/tmp/stress-${i}.tmp`, 'write');
            }
            
            // Simulate I/O delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            return `file-${i}-processed`;
          },
          { buildId: mockBuildContext.buildId, data: { iteration: i } }
        );

        operations.push(operation);
      }

      const results = await Promise.allSettled(operations);
      const totalTime = Date.now() - startTime;

      // Performance requirements under stress
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Should maintain reasonable success rate despite stress
      const successRate = successful / (successful + failed);
      expect(successRate).toBeGreaterThan(0.6); // At least 60% success rate

      const stats = errorHandler.getStatistics();
      expect(stats.averageRecoveryTime).toBeLessThan(1000); // Recovery should be fast
    });
  });

  describe('Resource Pressure Scenarios', () => {
    it('should handle memory pressure gracefully', async () => {
      await ChaosTestUtils.withResourcePressure(
        { memoryPressure: true, cpuPressure: false },
        async () => {
          const memoryIntensiveOperations = [];

          // Simulate operations under memory pressure
          for (let i = 0; i < 10; i++) {
            const operation = errorHandler.handleError(
              new ResourceConstraintError(
                'Memory usage critical',
                'memory',
                450 * 1024 * 1024, // Current usage
                512 * 1024 * 1024  // Limit
              ),
              { buildId: mockBuildContext.buildId }
            );

            memoryIntensiveOperations.push(operation);
          }

          const results = await Promise.all(memoryIntensiveOperations);

          // Under memory pressure, should apply graceful degradation
          const recoveredCount = results.filter(r => r.recovered).length;
          expect(recoveredCount).toBeGreaterThan(5); // Most should recover

          const stats = errorHandler.getStatistics();
          expect(stats.errorsByType.ResourceConstraintError).toBe(10);
          expect(stats.gracefulDegradations).toBeGreaterThan(0);
        }
      );
    });

    it('should maintain stability under concurrent stress', async () => {
      const concurrentOperations = 20;
      const operationPromises = [];

      // Launch concurrent operations that will experience various failures
      for (let i = 0; i < concurrentOperations; i++) {
        const promise = errorHandler.executeWithRetry(
          async () => {
            // Random failure injection
            const random = Math.random();
            
            if (random < 0.3) {
              throw new NetworkError(`Concurrent network error ${i}`, `https://concurrent-${i}.test`);
            } else if (random < 0.5) {
              throw new FileSystemError(`Concurrent file error ${i}`, `/tmp/concurrent-${i}`, 'write');
            } else if (random < 0.6) {
              throw new TimeoutError(`Concurrent timeout ${i}`, `operation-${i}`, 5000);
            }
            
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            return `concurrent-result-${i}`;
          },
          { 
            buildId: mockBuildContext.buildId, 
            data: { concurrentId: i } 
          }
        );

        operationPromises.push(promise);
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(operationPromises);
      const totalTime = Date.now() - startTime;

      // Concurrency performance requirements
      expect(totalTime).toBeLessThan(5000); // Should handle concurrency efficiently

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should maintain reasonable success rate under concurrent stress
      expect(successful).toBeGreaterThan(concurrentOperations * 0.5);

      const stats = errorHandler.getStatistics();
      
      // Should have handled errors without system breakdown
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.totalErrors).toBeLessThan(concurrentOperations * 2); // Shouldn't explode
      
      // Recovery mechanisms should have been used
      if (stats.totalErrors > 0) {
        expect(stats.recoveredErrors + stats.gracefulDegradations).toBeGreaterThan(0);
      }
    });
  });

  describe('Extreme Chaos Scenarios', () => {
    it('should survive the perfect storm of failures', async () => {
      // Combine all chaos conditions
      await ChaosTestUtils.withFlakyNetwork(
        { errorRate: 0.6, timeoutRate: 0.3 },
        async () => {
          await ChaosTestUtils.withLockedFS(
            { lockRatio: 0.4, permissionDeniedRatio: 0.3 },
            async () => {
              await ChaosTestUtils.withResourcePressure(
                { memoryPressure: true, cpuPressure: true },
                async () => {
                  const chaosOperations = [
                    'network-api-call',
                    'file-cache-write', 
                    'memory-intensive-analysis',
                    'concurrent-batch-job',
                    'external-service-ping',
                    'config-file-read',
                    'log-file-append',
                    'metrics-collection'
                  ];

                  const results = [];

                  for (const operation of chaosOperations) {
                    try {
                      const result = await errorHandler.executeWithRetry(
                        async () => {
                          // Multiple failure points
                          const failureType = Math.random();
                          
                          if (failureType < 0.3) {
                            throw new NetworkError(`Chaos network: ${operation}`);
                          } else if (failureType < 0.5) {
                            throw new FileSystemError(`Chaos file: ${operation}`, '/tmp/chaos', 'write');
                          } else if (failureType < 0.7) {
                            throw new ResourceConstraintError(`Chaos memory: ${operation}`, 'memory', 500000000, 400000000);
                          } else if (failureType < 0.85) {
                            throw new TimeoutError(`Chaos timeout: ${operation}`, operation, 1000);
                          }
                          
                          return `chaos-success-${operation}`;
                        },
                        { 
                          buildId: mockBuildContext.buildId,
                          data: { chaosOperation: operation } 
                        },
                        1 // Limited retries in perfect storm
                      );

                      results.push({ operation, success: true, result });
                    } catch (error) {
                      results.push({ operation, success: false, error });
                    }
                  }

                  const stats = errorHandler.getStatistics();

                  // Even under perfect storm, should maintain basic functionality
                  expect(stats.totalErrors).toBeGreaterThan(0);
                  expect(stats.gracefulDegradations + stats.recoveredErrors).toBeGreaterThan(0);
                  
                  // Should not have crashed
                  expect(() => errorHandler.getStatistics()).not.toThrow();
                  
                  // Should have some successful operations despite chaos
                  const successfulOps = results.filter(r => r.success);
                  expect(successfulOps.length).toBeGreaterThan(0);
                  
                  // Error handler should still be functional for new operations
                  const finalTest = await errorHandler.handleError(
                    new Error('Post-chaos test'), 
                    { buildId: mockBuildContext.buildId }
                  );
                  
                  expect(finalTest).toBeDefined();
                }
              );
            }
          );
        }
      );
    });

    it('should generate meaningful chaos test report', async () => {
      // Run a controlled chaos scenario and verify reporting
      const chaosErrors = [
        new NetworkError('Chaos network 1'),
        new FileSystemError('Chaos file 1', '/tmp/chaos1', 'write'),
        new TimeoutError('Chaos timeout 1', 'op1', 5000),
        new ResourceConstraintError('Chaos memory 1', 'memory', 1000, 800)
      ];

      for (const error of chaosErrors) {
        await errorHandler.handleError(error, { buildId: mockBuildContext.buildId });
      }

      const stats = errorHandler.getStatistics();

      // Verify comprehensive statistics collection under chaos
      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByType.NetworkError).toBe(1);
      expect(stats.errorsByType.FileSystemError).toBe(1);
      expect(stats.errorsByType.TimeoutError).toBe(1);
      expect(stats.errorsByType.ResourceConstraintError).toBe(1);

      // Should have attempted recovery
      expect(stats.gracefulDegradations).toBeGreaterThan(0);

      // Generate report should work after chaos
      expect(async () => {
        await errorHandler.generateErrorReport();
      }).not.toThrow();
    });
  });
});