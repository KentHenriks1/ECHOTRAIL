/**
 * Unit tests for Build Steps
 */

import { jest } from '@jest/globals';
import { 
  CacheWarmingStep,
  BundleBuildStep, 
  BundleAnalysisStep,
  PerformanceBenchmarkStep 
} from '../buildSteps';
import { BuildContext } from '../types';

// Mock dependencies
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{"analysis": "data"}'),
  stat: jest.fn().mockResolvedValue({ size: 12345 }),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue('command output'),
}));

jest.mock('../../caching/MetroCacheManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      warmCache: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue({
        entries: { total: 150 },
        size: { total: 1024000 },
        hitRate: 87.5,
      }),
    }),
  },
}));

jest.mock('../../monitoring/MetroPerformanceMonitor', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      startBuildMonitoring: jest.fn().mockResolvedValue(undefined),
      endBuildMonitoring: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Build Steps', () => {
  let mockContext: BuildContext;

  beforeEach(() => {
    mockContext = {
      buildId: 'test-build-123',
      config: {} as any,
      environment: {
        platform: 'darwin',
        node_version: 'v18.17.0',
        metro_version: '0.73.0',
        project_root: '/test/project',
      },
      git: {
        branch: 'main',
        commit: 'abc123def456',
        author: 'Test Author',
        message: 'Test commit',
      },
      artifacts: new Map(),
      metrics: new Map(),
    };
    jest.clearAllMocks();
  });

  describe('CacheWarmingStep', () => {
    let step: CacheWarmingStep;

    beforeEach(() => {
      step = new CacheWarmingStep();
    });

    it('should have correct configuration', () => {
      expect(step.name).toBe('Cache Warming');
      expect(step.description).toBe('Pre-warm Metro cache for optimal build performance');
      expect(step.enabled).toBe(true);
      expect(step.timeout).toBe(300000); // 5 minutes
      expect(step.retries).toBe(2);
      expect(step.continueOnFailure).toBe(true);
    });

    it('should execute cache warming successfully', async () => {
      const result = await step.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.output).toContain('Cache warming completed');
      expect(result.metrics).toMatchObject({
        cacheEntries: 150,
        cacheSize: 1024000,
        hitRate: 87.5,
      });
    });

    it('should handle cache warming errors', async () => {
      const MetroCacheManager = (await import('../../caching/MetroCacheManager')).default;
      const mockInstance = MetroCacheManager.getInstance();
      (mockInstance.warmCache as jest.Mock).mockRejectedValueOnce(new Error('Cache error'));

      const result = await step.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache error');
    });
  });

  describe('BundleBuildStep', () => {
    let step: BundleBuildStep;

    beforeEach(() => {
      step = new BundleBuildStep('android', 'development');
    });

    it('should have correct configuration', () => {
      expect(step.name).toBe('Bundle Build');
      expect(step.description).toBe('Build Metro bundle with optimizations');
      expect(step.enabled).toBe(true);
      expect(step.timeout).toBe(600000); // 10 minutes
      expect(step.retries).toBe(1);
      expect(step.continueOnFailure).toBe(false);
    });

    it('should execute bundle build successfully', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockReturnValueOnce('Bundle built successfully');

      const result = await step.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.output).toBe('Bundle built successfully');
      expect(result.artifacts).toMatchObject({
        bundle: expect.stringContaining('android-bundle.js'),
        sourceMap: expect.stringContaining('android-bundle.js.map'),
      });
      expect(result.metrics).toMatchObject({
        bundleSize: 12345,
        buildTime: expect.any(Number),
      });
    });

    it('should handle build errors', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Build failed');
      });

      const result = await step.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Build failed');
    });

    it('should construct correct command for production build', async () => {
      const prodStep = new BundleBuildStep('ios', 'production');
      const { execSync } = await import('child_process');
      
      await prodStep.execute(mockContext);

      expect(execSync).toHaveBeenCalledWith(
        'npx expo export --platform ios --dev=false',
        expect.any(Object)
      );
    });

    it('should construct correct command for development build', async () => {
      const devStep = new BundleBuildStep('android', 'development');
      const { execSync } = await import('child_process');
      
      await devStep.execute(mockContext);

      expect(execSync).toHaveBeenCalledWith(
        'npx expo export --platform android --dev=true',
        expect.any(Object)
      );
    });
  });

  describe('BundleAnalysisStep', () => {
    let step: BundleAnalysisStep;

    beforeEach(() => {
      step = new BundleAnalysisStep();
    });

    it('should have correct configuration', () => {
      expect(step.name).toBe('Bundle Analysis');
      expect(step.description).toBe('Analyze bundle composition and optimizations');
      expect(step.enabled).toBe(true);
      expect(step.timeout).toBe(180000); // 3 minutes
      expect(step.retries).toBe(1);
      expect(step.continueOnFailure).toBe(true);
    });

    it('should execute bundle analysis successfully', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockReturnValueOnce('Analysis completed');

      const result = await step.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.output).toBe('Analysis completed');
      expect(result.artifacts).toMatchObject({
        analysis: expect.stringContaining('metro-bundle-analysis.json'),
        report: expect.stringContaining('metro-bundle-analysis.md'),
      });
      expect(result.metrics).toMatchObject({
        analysisData: expect.any(Object),
      });
    });

    it('should handle analysis errors', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Analysis failed');
      });

      const result = await step.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Analysis failed');
    });

    it('should handle missing analysis file gracefully', async () => {
      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

      const result = await step.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.metrics?.analysisData).toEqual({});
    });
  });

  describe('PerformanceBenchmarkStep', () => {
    let step: PerformanceBenchmarkStep;
    let mockConfig: any;

    beforeEach(() => {
      mockConfig = {
        enabled: true,
        platforms: ['android', 'ios'],
        environments: ['development', 'production'],
        warmup_builds: 2,
        measurement_builds: 3,
      };
      step = new PerformanceBenchmarkStep(mockConfig);
    });

    it('should have correct configuration', () => {
      expect(step.name).toBe('Performance Benchmark');
      expect(step.description).toBe('Run performance benchmarks');
      expect(step.enabled).toBe(true);
      expect(step.timeout).toBe(900000); // 15 minutes
      expect(step.retries).toBe(1);
      expect(step.continueOnFailure).toBe(true);
    });

    it('should skip benchmarks when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledStep = new PerformanceBenchmarkStep(disabledConfig);

      const result = await disabledStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Performance benchmarking disabled');
    });

    it('should execute benchmarks successfully', async () => {
      const { execSync } = await import('child_process');
      // Mock successful builds
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // Clean dist
        .mockReturnValueOnce('Build output'); // First build

      const result = await step.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.output).toContain('benchmark runs');
      expect(result.metrics?.benchmarks).toBeDefined();
    });

    it('should handle benchmark errors', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Benchmark failed');
      });

      const result = await step.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Benchmark failed');
    });

    it('should calculate percentiles correctly', async () => {
      const values = [100, 200, 300, 400, 500];
      const calculatePercentile = (step as any).calculatePercentile.bind(step);

      expect(calculatePercentile(values, 50)).toBe(300); // 50th percentile (median)
      expect(calculatePercentile(values, 95)).toBe(500); // 95th percentile
    });

    it('should run correct number of warmup and measurement builds', async () => {
      const config = {
        enabled: true,
        platforms: ['android'],
        environments: ['development'],
        warmup_builds: 1,
        measurement_builds: 2,
      };
      const customStep = new PerformanceBenchmarkStep(config);

      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockReturnValue('Build output');

      const result = await customStep.execute(mockContext);

      expect(result.success).toBe(true);
      // Should run 1 platform × 1 environment × (1 warmup + 2 measurement builds per run)
      // Plus cleaning builds = multiple execSync calls
      expect((execSync as jest.Mock).mock.calls.length).toBeGreaterThan(2);
    });
  });

  describe('Step Integration', () => {
    it('should work together in pipeline sequence', async () => {
      const cacheStep = new CacheWarmingStep();
      const buildStep = new BundleBuildStep('android', 'development');
      const analysisStep = new BundleAnalysisStep();

      // Execute in sequence
      const cacheResult = await cacheStep.execute(mockContext);
      expect(cacheResult.success).toBe(true);

      const buildResult = await buildStep.execute(mockContext);
      expect(buildResult.success).toBe(true);

      const analysisResult = await analysisStep.execute(mockContext);
      expect(analysisResult.success).toBe(true);
    });

    it('should handle timeout configurations appropriately', () => {
      const steps = [
        new CacheWarmingStep(),
        new BundleBuildStep('android', 'development'),
        new BundleAnalysisStep(),
        new PerformanceBenchmarkStep({
          enabled: true,
          platforms: ['android'],
          environments: ['development'],
          warmup_builds: 1,
          measurement_builds: 1,
        }),
      ];

      // Verify timeout configurations make sense for each step
      expect(steps[0].timeout).toBeLessThan(steps[1].timeout); // Cache < Build
      expect(steps[2].timeout).toBeLessThan(steps[1].timeout); // Analysis < Build
      expect(steps[3].timeout).toBeGreaterThan(steps[1].timeout); // Benchmark > Build
    });
  });
});