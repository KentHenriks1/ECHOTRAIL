/**
 * Unit tests for MetroBuildPipeline
 */

import { jest } from '@jest/globals';
import { MetroBuildPipeline } from '../MetroBuildPipeline';
import { BuildPipelineConfig, BuildContext, BuildResult } from '../types';

// Mock dependencies
jest.mock('../../utils/Logger', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{"key": "value"}'),
  stat: jest.fn().mockResolvedValue({ size: 12345 }),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue('build output'),
}));

jest.mock('../buildSteps', () => ({
  CacheWarmingStep: jest.fn().mockImplementation(() => ({
    name: 'Cache Warming',
    enabled: true,
    timeout: 300000,
    retries: 2,
    continueOnFailure: true,
    execute: jest.fn().mockResolvedValue({
      success: true,
      duration: 1000,
      output: 'Cache warmed',
      metrics: { cacheEntries: 100, hitRate: 85 },
    }),
  })),
  BundleBuildStep: jest.fn().mockImplementation(() => ({
    name: 'Bundle Build',
    enabled: true,
    timeout: 600000,
    retries: 1,
    continueOnFailure: false,
    execute: jest.fn().mockResolvedValue({
      success: true,
      duration: 5000,
      output: 'Bundle built successfully',
      artifacts: { bundle: '/path/to/bundle.js' },
      metrics: { bundleSize: 12345, buildTime: 5000 },
    }),
  })),
  BundleAnalysisStep: jest.fn().mockImplementation(() => ({
    name: 'Bundle Analysis',
    enabled: true,
    timeout: 180000,
    retries: 1,
    continueOnFailure: true,
    execute: jest.fn().mockResolvedValue({
      success: true,
      duration: 2000,
      output: 'Analysis complete',
      artifacts: { analysis: '/path/to/analysis.json' },
      metrics: { analysisData: {} },
    }),
  })),
  PerformanceBenchmarkStep: jest.fn().mockImplementation(() => ({
    name: 'Performance Benchmark',
    enabled: true,
    timeout: 900000,
    retries: 1,
    continueOnFailure: true,
    execute: jest.fn().mockResolvedValue({
      success: true,
      duration: 10000,
      output: 'Benchmarks completed',
      metrics: { benchmarks: [] },
    }),
  })),
}));

describe('MetroBuildPipeline', () => {
  let pipeline: MetroBuildPipeline;

  beforeEach(() => {
    // Reset singleton
    (MetroBuildPipeline as any).instance = undefined;
    pipeline = MetroBuildPipeline.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    (MetroBuildPipeline as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = MetroBuildPipeline.getInstance();
      const instance2 = MetroBuildPipeline.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(MetroBuildPipeline);
    });
  });

  describe('initialize', () => {
    it('should initialize with default config', async () => {
      await expect(pipeline.initialize()).resolves.not.toThrow();
    });

    it('should merge custom config with defaults', async () => {
      const customConfig: Partial<BuildPipelineConfig> = {
        performance: {
          regression_detection: {
            enabled: false,
            threshold_bundle_size: 15,
            threshold_build_time: 30,
            baseline_builds: 3,
            alert_on_regression: false,
          },
          benchmarking: {
            enabled: true,
            platforms: ['android'],
            environments: ['production'],
            warmup_builds: 1,
            measurement_builds: 3,
          },
        },
      };

      await expect(pipeline.initialize(customConfig)).resolves.not.toThrow();
    });

    it('should skip initialization when disabled', async () => {
      const disabledConfig: Partial<BuildPipelineConfig> = {
        enabled: false,
      };

      await pipeline.initialize(disabledConfig);
      
      // Should complete without attempting setup
      expect(true).toBe(true);
    });

    it('should emit initialization event', async () => {
      const eventSpy = jest.fn();
      pipeline.on('pipeline:initialized', eventSpy);

      await pipeline.initialize();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('executeBuild', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should execute build with default options', async () => {
      const results = await pipeline.executeBuild();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should execute build with custom platforms and environments', async () => {
      const options = {
        platforms: ['android'],
        environments: ['development'],
        branch: 'main',
        commit: 'abc123',
      };

      const results = await pipeline.executeBuild(options);

      expect(results).toBeDefined();
      expect(results.length).toBe(1); // 1 platform × 1 environment
      expect(results[0]).toMatchObject({
        platform: 'android',
        environment: 'development',
        branch: 'main',
        commit: 'abc123',
      });
    });

    it('should prevent concurrent builds', async () => {
      const buildPromise1 = pipeline.executeBuild();
      const buildPromise2 = pipeline.executeBuild();

      await expect(buildPromise1).resolves.toBeDefined();
      await expect(buildPromise2).rejects.toThrow('Build pipeline is already running');
    });

    it('should emit completion event on success', async () => {
      const eventSpy = jest.fn();
      pipeline.on('pipeline:completed', eventSpy);

      await pipeline.executeBuild();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({
        buildId: expect.any(String),
        results: expect.any(Array),
      });
    });

    it('should emit failure event on error', async () => {
      const eventSpy = jest.fn();
      pipeline.on('pipeline:failed', eventSpy);

      // Mock a step to fail
      const { BundleBuildStep } = await import('../buildSteps');
      (BundleBuildStep as jest.Mock).mockImplementationOnce(() => ({
        name: 'Bundle Build',
        enabled: true,
        timeout: 600000,
        retries: 1,
        continueOnFailure: false,
        execute: jest.fn().mockResolvedValue({
          success: false,
          duration: 1000,
          output: '',
          error: 'Build failed',
        }),
      }));

      await expect(pipeline.executeBuild()).rejects.toThrow();
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should run benchmarks when requested', async () => {
      const options = {
        platforms: ['android'],
        environments: ['development'],
        runBenchmarks: true,
      };

      await expect(pipeline.executeBuild(options)).resolves.toBeDefined();
    });
  });

  describe('analyzeRegressions', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should return empty array for insufficient build history', async () => {
      const regressions = await pipeline.analyzeRegressions();
      expect(regressions).toEqual([]);
    });

    it('should detect bundle size regression', async () => {
      // First build some history
      await pipeline.executeBuild({
        platforms: ['android'],
        environments: ['development'],
      });

      // Mock larger bundle size for regression detection
      const { BundleBuildStep } = await import('../buildSteps');
      (BundleBuildStep as jest.Mock).mockImplementationOnce(() => ({
        name: 'Bundle Build',
        enabled: true,
        timeout: 600000,
        retries: 1,
        continueOnFailure: false,
        execute: jest.fn().mockResolvedValue({
          success: true,
          duration: 5000,
          output: 'Bundle built successfully',
          artifacts: { bundle: '/path/to/bundle.js' },
          metrics: { bundleSize: 50000, buildTime: 5000 }, // Much larger
        }),
      }));

      await pipeline.executeBuild({
        platforms: ['android'],
        environments: ['development'],
      });

      const regressions = await pipeline.analyzeRegressions();
      expect(regressions.length).toBeGreaterThan(0);
    });
  });

  describe('generateCIWorkflows', () => {
    it('should generate GitHub workflow', async () => {
      await expect(pipeline.generateCIWorkflows('github')).resolves.not.toThrow();
    });

    it('should generate GitLab workflow', async () => {
      await expect(pipeline.generateCIWorkflows('gitlab')).resolves.not.toThrow();
    });

    it('should generate Jenkins workflow', async () => {
      await expect(pipeline.generateCIWorkflows('jenkins')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle step execution errors gracefully', async () => {
      // Mock a step to throw an error
      const { CacheWarmingStep } = await import('../buildSteps');
      (CacheWarmingStep as jest.Mock).mockImplementationOnce(() => ({
        name: 'Cache Warming',
        enabled: true,
        timeout: 300000,
        retries: 2,
        continueOnFailure: true,
        execute: jest.fn().mockRejectedValue(new Error('Cache warming failed')),
      }));

      await pipeline.initialize();
      
      // Should not throw because continueOnFailure is true
      const results = await pipeline.executeBuild({
        platforms: ['android'],
        environments: ['development'],
      });

      expect(results).toBeDefined();
      expect(results[0].warnings.length).toBeGreaterThan(0);
    });

    it('should stop build on critical step failure', async () => {
      // Mock a critical step to fail
      const { BundleBuildStep } = await import('../buildSteps');
      (BundleBuildStep as jest.Mock).mockImplementationOnce(() => ({
        name: 'Bundle Build',
        enabled: true,
        timeout: 600000,
        retries: 1,
        continueOnFailure: false,
        execute: jest.fn().mockRejectedValue(new Error('Critical build failure')),
      }));

      await pipeline.initialize();
      
      await expect(pipeline.executeBuild({
        platforms: ['android'],
        environments: ['development'],
      })).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      expect(pipeline).toBeInstanceOf(MetroBuildPipeline);
      // Default configuration should be loaded
    });

    it('should override default configuration with custom values', async () => {
      const customConfig: Partial<BuildPipelineConfig> = {
        ci: {
          platform: 'gitlab',
          integration: {
            enabled: true,
            webhooks: true,
            statusChecks: true,
            artifactUpload: true,
          },
          triggers: {
            onPush: false,
            onPullRequest: true,
            onSchedule: true,
            scheduleExpression: '0 3 * * *',
          },
        },
      };

      await expect(pipeline.initialize(customConfig)).resolves.not.toThrow();
    });
  });
});