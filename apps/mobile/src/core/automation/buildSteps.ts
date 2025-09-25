/**
 * Build steps for Metro Build Pipeline
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import MetroPerformanceMonitor from '../monitoring/MetroPerformanceMonitor';
import MetroCacheManager from '../caching/MetroCacheManager';
import { 
  BuildStep, 
  BuildContext, 
  StepResult, 
  BenchmarkResult, 
  BuildPipelineConfig 
} from './types';

/**
 * Cache Warming Build Step
 * 
 * Pre-warms the Metro cache to optimize subsequent build performance.
 * This step initializes cache entries and improves cache hit rates for faster builds.
 * 
 * @implements {BuildStep}
 * 
 * @example
 * ```typescript
 * const step = new CacheWarmingStep();
 * const result = await step.execute(buildContext);
 * console.log(`Cache hit rate: ${result.metrics?.hitRate}%`);
 * ```
 */
export class CacheWarmingStep implements BuildStep {
  name = 'Cache Warming';
  description = 'Pre-warm Metro cache for optimal build performance';
  enabled = true;
  timeout = 300000; // 5 minutes
  retries = 2;
  continueOnFailure = true;

  async execute(_context: BuildContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const cacheManager = MetroCacheManager.getInstance();
      await cacheManager.warmCache();
      
      const stats = await cacheManager.getStats();
      
      return {
        success: true,
        duration: Date.now() - startTime,
        output: `Cache warming completed. Entries: ${stats.entries.total}, Hit rate: ${stats.hitRate.toFixed(1)}%`,
        metrics: {
          cacheEntries: stats.entries.total,
          cacheSize: stats.size.total,
          hitRate: stats.hitRate,
        },
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Bundle Build Step
 * 
 * Executes the Metro bundling process for a specific platform and environment combination.
 * Handles bundle generation, source map creation, performance monitoring, and artifact creation.
 * 
 * @implements {BuildStep}
 * 
 * @example
 * ```typescript
 * const step = new BundleBuildStep('android', 'production');
 * const result = await step.execute(buildContext);
 * console.log(`Bundle size: ${result.metrics?.bundleSize} bytes`);
 * console.log(`Build time: ${result.metrics?.buildTime}ms`);
 * ```
 */
export class BundleBuildStep implements BuildStep {
  name = 'Bundle Build';
  description = 'Build Metro bundle with optimizations';
  enabled = true;
  timeout = 600000; // 10 minutes
  retries = 1;
  continueOnFailure = false;

  /**
   * Create a new Bundle Build Step
   * 
   * @param platform - Target platform ('android' | 'ios')
   * @param environment - Target environment ('development' | 'production')
   */
  // eslint-disable-next-line no-unused-vars
  constructor(private platform: string, private environment: string) {}

  async execute(context: BuildContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      const performanceMonitor = MetroPerformanceMonitor.getInstance();
      const buildId = `${context.buildId}-${this.platform}-${this.environment}`;
      
      performanceMonitor.startBuildMonitoring(buildId, this.platform, this.environment as any);
      
      // Execute Metro build
      const command = `npx expo export --platform ${this.platform} --dev=${this.environment === 'development'}`;
      const output = execSync(command, { 
        cwd: context.environment.project_root,
        encoding: 'utf8',
        timeout: this.timeout,
      });
      
      // Get bundle size
      const bundlePath = this.getBundlePath(context.environment.project_root, this.platform);
      const bundleSize = await this.getBundleSize(bundlePath);
      
      await performanceMonitor.endBuildMonitoring(buildId, bundleSize);
      
      const artifacts = {
        bundle: bundlePath,
        sourceMap: `${bundlePath}.map`,
      };
      
      return {
        success: true,
        duration: Date.now() - startTime,
        output,
        artifacts,
        metrics: {
          bundleSize,
          buildTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private getBundlePath(projectRoot: string, platform: string): string {
    return path.join(projectRoot, 'dist', 'bundles', `${platform}-bundle.js`);
  }

  private async getBundleSize(bundlePath: string): Promise<number> {
    try {
      const stats = await fs.stat(bundlePath);
      return stats.size;
    } catch {
      return 0;
    }
  }
}

/**
 * Bundle Analysis Step
 * 
 * Analyzes the generated bundle for composition, dependencies, and optimization opportunities.
 * Generates detailed reports about bundle contents, size breakdown, and recommendations.
 * 
 * @implements {BuildStep}
 * 
 * @example
 * ```typescript
 * const step = new BundleAnalysisStep();
 * const result = await step.execute(buildContext);
 * console.log('Analysis report:', result.artifacts?.report);
 * console.log('Analysis data:', result.metrics?.analysisData);
 * ```
 */
export class BundleAnalysisStep implements BuildStep {
  name = 'Bundle Analysis';
  description = 'Analyze bundle composition and optimizations';
  enabled = true;
  timeout = 180000; // 3 minutes
  retries = 1;
  continueOnFailure = true;

  async execute(context: BuildContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      // Run bundle analyzer
      const command = 'node scripts/analyze-metro-bundle-fixed.js';
      const output = execSync(command, { 
        cwd: context.environment.project_root,
        encoding: 'utf8',
        timeout: this.timeout,
      });
      
      // Read analysis results
      const analysisPath = path.join(context.environment.project_root, 'metro-analysis-results');
      const reportPath = path.join(analysisPath, 'metro-bundle-analysis.json');
      
      let analysisData = {};
      try {
        const analysisContent = await fs.readFile(reportPath, 'utf8');
        analysisData = JSON.parse(analysisContent);
      } catch {
        // Analysis file not found
      }
      
      return {
        success: true,
        duration: Date.now() - startTime,
        output,
        artifacts: {
          analysis: reportPath,
          report: path.join(analysisPath, 'metro-bundle-analysis.md'),
        },
        metrics: {
          analysisData,
        },
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Performance Benchmark Step
 * 
 * Executes comprehensive performance benchmarks across multiple platforms and environments.
 * Runs controlled build iterations to collect statistically significant performance metrics
 * including build times, bundle sizes, memory usage, and percentile distributions.
 * 
 * @implements {BuildStep}
 * 
 * @example
 * ```typescript
 * const config = {
 *   enabled: true,
 *   platforms: ['android', 'ios'],
 *   environments: ['development', 'production'],
 *   warmup_builds: 2,
 *   measurement_builds: 5
 * };
 * 
 * const step = new PerformanceBenchmarkStep(config);
 * const result = await step.execute(buildContext);
 * 
 * result.metrics?.benchmarks.forEach(benchmark => {
 *   console.log(`${benchmark.platform}-${benchmark.environment}:`);
 *   console.log(`  Average build time: ${benchmark.averages.buildTime}ms`);
 *   console.log(`  P95 build time: ${benchmark.percentiles.p95.buildTime}ms`);
 * });
 * ```
 */
export class PerformanceBenchmarkStep implements BuildStep {
  name = 'Performance Benchmark';
  description = 'Run performance benchmarks';
  enabled = true;
  timeout = 900000; // 15 minutes
  retries = 1;
  continueOnFailure = true;

  // eslint-disable-next-line no-unused-vars  
  constructor(private readonly config: BuildPipelineConfig['performance']['benchmarking']) {}

  async execute(context: BuildContext): Promise<StepResult> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      return {
        success: true,
        duration: Date.now() - startTime,
        output: 'Performance benchmarking disabled',
      };
    }
    
    try {
      const results: BenchmarkResult[] = [];
      
      const benchmarkPromises = this.config.platforms.flatMap(platform =>
        this.config.environments.map(environment =>
          this.runBenchmark(context, platform, environment)
        )
      );
      
      const benchmarkResults = await Promise.all(benchmarkPromises);
      results.push(...benchmarkResults);
      
      return {
        success: true,
        duration: Date.now() - startTime,
        output: `Completed ${results.length} benchmark runs`,
        metrics: {
          benchmarks: results,
        },
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async runBenchmark(context: BuildContext, platform: string, environment: string): Promise<BenchmarkResult> {
    const runs = {
      buildTime: [] as number[],
      bundleSize: [] as number[],
      memoryUsage: [] as number[],
    };

    // Warmup runs
    const warmupPromises = Array.from({ length: this.config.warmup_builds }, () =>
      this.singleBuildRun(context, platform, environment)
    );
    await Promise.all(warmupPromises);

    // Measurement runs
    const buildPromises = Array.from({ length: this.config.measurement_builds }, () =>
      this.singleBuildRun(context, platform, environment)
    );
    
    const buildResults = await Promise.all(buildPromises);
    
    buildResults.forEach(result => {
      runs.buildTime.push(result.buildTime);
      runs.bundleSize.push(result.bundleSize);
      runs.memoryUsage.push(result.memoryUsage);
    });

    const averages = {
      buildTime: runs.buildTime.reduce((sum, val) => sum + val, 0) / runs.buildTime.length,
      bundleSize: runs.bundleSize.reduce((sum, val) => sum + val, 0) / runs.bundleSize.length,
      memoryUsage: runs.memoryUsage.reduce((sum, val) => sum + val, 0) / runs.memoryUsage.length,
    };

    const percentiles = {
      p50: {
        buildTime: this.calculatePercentile(runs.buildTime, 50),
        bundleSize: this.calculatePercentile(runs.bundleSize, 50),
        memoryUsage: this.calculatePercentile(runs.memoryUsage, 50),
      },
      p95: {
        buildTime: this.calculatePercentile(runs.buildTime, 95),
        bundleSize: this.calculatePercentile(runs.bundleSize, 95),
        memoryUsage: this.calculatePercentile(runs.memoryUsage, 95),
      },
      p99: {
        buildTime: this.calculatePercentile(runs.buildTime, 99),
        bundleSize: this.calculatePercentile(runs.bundleSize, 99),
        memoryUsage: this.calculatePercentile(runs.memoryUsage, 99),
      },
    };

    return {
      id: `${context.buildId}-${platform}-${environment}`,
      timestamp: Date.now(),
      platform,
      environment,
      runs,
      averages,
      percentiles,
    };
  }

  private async singleBuildRun(context: BuildContext, platform: string, environment: string): Promise<{
    buildTime: number;
    bundleSize: number;
    memoryUsage: number;
  }> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    // Clean build
    execSync('rm -rf dist', { cwd: context.environment.project_root });

    // Build
    const command = `npx expo export --platform ${platform} --dev=${environment === 'development'}`;
    execSync(command, { cwd: context.environment.project_root });

    const buildTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage().heapUsed - initialMemory;

    // Get bundle size
    const bundlePath = path.join(context.environment.project_root, 'dist', 'bundles', `${platform}-bundle.js`);
    let bundleSize = 0;
    try {
      const stats = await fs.stat(bundlePath);
      bundleSize = stats.size;
    } catch {
      // Bundle file not found
    }

    return { buildTime, bundleSize, memoryUsage };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}