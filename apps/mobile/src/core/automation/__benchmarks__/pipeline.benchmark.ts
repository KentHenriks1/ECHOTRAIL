/**
 * Performance Benchmark Suite for Metro Build Pipeline
 * 
 * This suite measures performance characteristics of the refactored pipeline
 * and compares them against baseline metrics to ensure no regressions were
 * introduced during the refactoring process.
 */

import { performance } from 'perf_hooks';
import { MetroBuildPipeline } from '../MetroBuildPipeline';
import { BuildResult } from '../types';
import { Logger } from '../../utils/Logger';
import * as fs from 'fs/promises';

interface BenchmarkResult {
  name: string;
  duration: number;
  memoryUsage: {
    peak: number;
    current: number;
  };
  iterations: number;
  timestamp: number;
}

interface ComparisonResult {
  operation: string;
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  improvement: {
    duration: number; // Negative = slower, positive = faster
    memory: number;   // Negative = more memory, positive = less memory
  };
  regression: boolean;
}

/**
 * Comprehensive Performance Benchmark Suite
 */
export class PipelineBenchmarkSuite {
  private pipeline: MetroBuildPipeline;
  private results: BenchmarkResult[] = [];
  private baselineResults: BenchmarkResult[] = [];
  
  constructor() {
    this.pipeline = MetroBuildPipeline.getInstance();
  }

  /**
   * Run complete performance benchmark suite
   */
  async runFullSuite(): Promise<void> {
    Logger.info('🚀 Starting Metro Build Pipeline Performance Benchmark Suite');
    Logger.info('==============================================================');
    
    try {
      // Load baseline results if they exist
      await this.loadBaselineResults();
      
      // Run all benchmark tests
      await this.benchmarkInitialization();
      await this.benchmarkSingleBuild();
      await this.benchmarkMultiplePlatformBuild();
      await this.benchmarkRegressionAnalysis();
      await this.benchmarkConcurrentBuilds();
      await this.benchmarkMemoryUsage();
      await this.benchmarkConfigurationOverhead();
      
      // Save results and generate comparison report
      await this.saveResults();
      await this.generateComparisonReport();
      
      Logger.info('✅ Performance benchmark suite completed successfully');
      
    } catch (error) {
      Logger.error('❌ Benchmark suite failed:', error);
      throw error;
    }
  }

  /**
   * Benchmark pipeline initialization performance
   */
  private async benchmarkInitialization(): Promise<void> {
    Logger.info('📊 Benchmarking pipeline initialization...');
    
    const result = await this.measureOperation(
      'pipeline_initialization',
      async () => {
        const freshPipeline = MetroBuildPipeline.getInstance();
        await freshPipeline.initialize({
          enabled: true,
          performance: {
            benchmarking: { 
              enabled: true, 
              platforms: ['android'],
              environments: ['development'],
              warmup_builds: 1,
              measurement_builds: 5
            },
            regression_detection: { 
              enabled: true,
              threshold_bundle_size: 10,
              threshold_build_time: 10,
              baseline_builds: 5,
              alert_on_regression: false
            }
          }
        });
      },
      10 // Run 10 iterations
    );
    
    this.results.push(result);
    Logger.info(`  ✅ Initialization: ${result.duration.toFixed(2)}ms avg (${result.iterations} iterations)`);
  }

  /**
   * Benchmark single build performance
   */
  private async benchmarkSingleBuild(): Promise<void> {
    Logger.info('📊 Benchmarking single build execution...');
    
    const result = await this.measureOperation(
      'single_build_execution',
      async () => {
        // Mock a lightweight build for benchmarking
        await this.pipeline.executeBuild({
          platforms: ['android'],
          environments: ['development'],
          runBenchmarks: false
        });
      },
      5 // Run 5 iterations
    );
    
    this.results.push(result);
    Logger.info(`  ✅ Single build: ${result.duration.toFixed(2)}ms avg (${result.iterations} iterations)`);
  }

  /**
   * Benchmark multi-platform build performance
   */
  private async benchmarkMultiplePlatformBuild(): Promise<void> {
    Logger.info('📊 Benchmarking multi-platform build execution...');
    
    const result = await this.measureOperation(
      'multiplatform_build_execution',
      async () => {
        await this.pipeline.executeBuild({
          platforms: ['android', 'ios'],
          environments: ['development', 'production'],
          runBenchmarks: false
        });
      },
      3 // Run 3 iterations (more resource intensive)
    );
    
    this.results.push(result);
    Logger.info(`  ✅ Multi-platform build: ${result.duration.toFixed(2)}ms avg (${result.iterations} iterations)`);
  }

  /**
   * Benchmark regression analysis performance
   */
  private async benchmarkRegressionAnalysis(): Promise<void> {
    Logger.info('📊 Benchmarking regression analysis performance...');
    
    // Generate mock build history for testing
    await this.generateMockBuildHistory();
    
    const result = await this.measureOperation(
      'regression_analysis',
      async () => {
        await this.pipeline.analyzeRegressions(50); // Analyze last 50 builds
      },
      10 // Run 10 iterations
    );
    
    this.results.push(result);
    Logger.info(`  ✅ Regression analysis: ${result.duration.toFixed(2)}ms avg (${result.iterations} iterations)`);
  }

  /**
   * Benchmark concurrent build performance
   */
  private async benchmarkConcurrentBuilds(): Promise<void> {
    Logger.info('📊 Benchmarking concurrent build handling...');
    
    const result = await this.measureOperation(
      'concurrent_builds',
      async () => {
        // Attempt multiple concurrent builds (should be rejected)
        const promises = Array(5).fill(0).map(() => 
          this.pipeline.executeBuild({
            platforms: ['android'],
            environments: ['development'],
            runBenchmarks: false
          }).catch(() => {}) // Ignore expected rejections
        );
        await Promise.allSettled(promises);
      },
      3 // Run 3 iterations
    );
    
    this.results.push(result);
    Logger.info(`  ✅ Concurrent handling: ${result.duration.toFixed(2)}ms avg (${result.iterations} iterations)`);
  }

  /**
   * Benchmark memory usage patterns
   */
  private async benchmarkMemoryUsage(): Promise<void> {
    Logger.info('📊 Benchmarking memory usage patterns...');
    
    const initialMemory = process.memoryUsage();
    
    // Run a series of operations to test memory behavior
    for (let i = 0; i < 10; i++) {
      await this.pipeline.analyzeRegressions(10);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    };
    
    const result: BenchmarkResult = {
      name: 'memory_usage_pattern',
      duration: 0, // Not applicable for memory test
      memoryUsage: {
        peak: Math.max(finalMemory.heapUsed, initialMemory.heapUsed),
        current: finalMemory.heapUsed
      },
      iterations: 10,
      timestamp: Date.now()
    };
    
    this.results.push(result);
    Logger.info(`  ✅ Memory pattern: Peak ${(result.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`);
    Logger.info(`      Delta: Heap ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB, External ${(memoryDelta.external / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Benchmark configuration overhead
   */
  private async benchmarkConfigurationOverhead(): Promise<void> {
    Logger.info('📊 Benchmarking configuration overhead...');
    
    const configurations = [
      { enabled: true }, // Minimal config
      { 
        enabled: true,
        performance: { 
          benchmarking: { 
            enabled: true, 
            platforms: ['android'],
            environments: ['development'],
            warmup_builds: 1,
            measurement_builds: 10
          },
          regression_detection: { 
            enabled: true,
            threshold_bundle_size: 10,
            threshold_build_time: 10,
            baseline_builds: 5,
            alert_on_regression: false
          }
        }
      }, // Full performance config
      {
        enabled: true,
        ci: {
          platform: 'github' as const,
          integration: { 
            enabled: true,
            webhooks: false,
            statusChecks: false,
            artifactUpload: false
          },
          triggers: {
            onPush: true,
            onPullRequest: true,
            onSchedule: false,
            scheduleExpression: '0 2 * * *'
          }
        }
      } // CI integration config
    ];
    
    for (const [index, config] of configurations.entries()) {
      const result = await this.measureOperation(
        `configuration_overhead_${index}`,
        async () => {
          const tempPipeline = MetroBuildPipeline.getInstance();
          await tempPipeline.initialize(config);
        },
        10 // Run 10 iterations
      );
      
      this.results.push(result);
      Logger.info(`  ✅ Config ${index}: ${result.duration.toFixed(2)}ms avg`);
    }
  }

  /**
   * Measure operation performance with detailed metrics
   */
  private async measureOperation(
    name: string,
    operation: () => Promise<void>,
    iterations: number
  ): Promise<BenchmarkResult> {
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    // Warm up (don't count first run)
    try {
      await operation();
    } catch {
      // Ignore warm-up errors
    }
    
    for (let i = 0; i < iterations; i++) {
      // Clean up memory before each iteration
      if (global.gc) {
        global.gc();
      }
      
      const startMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      
      try {
        await operation();
      } catch (error) {
        // Log error but continue with benchmarking
        Logger.warn(`  ⚠️ Iteration ${i + 1} failed: ${error}`);
      }
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      durations.push(endTime - startTime);
      memoryUsages.push(endMemory - startMemory);
    }
    
    return {
      name,
      duration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      memoryUsage: {
        peak: Math.max(...memoryUsages.map(m => m > 0 ? m : 0)),
        current: process.memoryUsage().heapUsed
      },
      iterations,
      timestamp: Date.now()
    };
  }

  /**
   * Generate mock build history for testing regression analysis
   */
  private async generateMockBuildHistory(): Promise<void> {
    const mockBuilds: BuildResult[] = [];
    
    for (let i = 0; i < 100; i++) {
      mockBuilds.push({
        id: `mock-build-${i}`,
        timestamp: Date.now() - (i * 3600000), // Each build 1 hour apart
        branch: 'main',
        commit: `commit-${i}`,
        platform: i % 2 === 0 ? 'android' : 'ios',
        environment: i % 3 === 0 ? 'production' : 'development',
        success: Math.random() > 0.1, // 90% success rate
        duration: 30000 + Math.random() * 60000, // 30-90 seconds
        bundleSize: 1000000 + Math.random() * 500000, // 1-1.5MB
        artifacts: { bundle: `bundle-${i}.js` },
        metrics: {
          buildTime: 30000 + Math.random() * 60000,
          bundleSize: 1000000 + Math.random() * 500000,
          cacheHitRate: Math.random() * 100,
          memoryUsage: 50000000 + Math.random() * 20000000, // 50-70MB
          optimizations: []
        },
        warnings: [],
        errors: []
      });
    }
    
    // Save mock history
    await fs.writeFile('build-history.json', JSON.stringify(mockBuilds, null, 2));
  }

  /**
   * Save benchmark results to file
   */
  private async saveResults(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = `./benchmarks/pipeline-benchmark-${timestamp}.json`;
    
    await fs.mkdir('./benchmarks', { recursive: true });
    await fs.writeFile(resultsPath, JSON.stringify({
      timestamp: Date.now(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory_limit: process.env.NODE_OPTIONS?.includes('--max-old-space-size')
      },
      results: this.results
    }, null, 2));
    
    Logger.info(`📄 Benchmark results saved: ${resultsPath}`);
  }

  /**
   * Load baseline results from previous benchmarks
   */
  private async loadBaselineResults(): Promise<void> {
    try {
      const baselinePath = './benchmarks/baseline-results.json';
      const content = await fs.readFile(baselinePath, 'utf8');
      const baseline = JSON.parse(content);
      this.baselineResults = baseline.results || [];
      Logger.info(`📊 Loaded ${this.baselineResults.length} baseline results`);
    } catch {
      Logger.info('📊 No baseline results found - this will become the baseline');
    }
  }

  /**
   * Generate performance comparison report
   */
  private async generateComparisonReport(): Promise<void> {
    if (this.baselineResults.length === 0) {
      Logger.info('📄 No baseline for comparison - saving current results as baseline');
      await fs.mkdir('./benchmarks', { recursive: true });
      await fs.writeFile('./benchmarks/baseline-results.json', JSON.stringify({
        timestamp: Date.now(),
        results: this.results
      }, null, 2));
      return;
    }
    
    const comparisons: ComparisonResult[] = [];
    
    for (const current of this.results) {
      const baseline = this.baselineResults.find(b => b.name === current.name);
      if (!baseline) continue;
      
      const durationImprovement = ((baseline.duration - current.duration) / baseline.duration) * 100;
      const memoryImprovement = ((baseline.memoryUsage.peak - current.memoryUsage.peak) / baseline.memoryUsage.peak) * 100;
      
      comparisons.push({
        operation: current.name,
        baseline,
        current,
        improvement: {
          duration: durationImprovement,
          memory: memoryImprovement
        },
        regression: durationImprovement < -5 || memoryImprovement < -10 // 5% slower or 10% more memory = regression
      });
    }
    
    // Generate report
    Logger.info('');
    Logger.info('📈 PERFORMANCE COMPARISON REPORT');
    Logger.info('=====================================');
    
    let hasRegressions = false;
    
    for (const comp of comparisons) {
      const durationChange = comp.improvement.duration >= 0 ? 
        `${comp.improvement.duration.toFixed(1)}% faster` : 
        `${Math.abs(comp.improvement.duration).toFixed(1)}% slower`;
      
      const memoryChange = comp.improvement.memory >= 0 ?
        `${comp.improvement.memory.toFixed(1)}% less memory` :
        `${Math.abs(comp.improvement.memory).toFixed(1)}% more memory`;
      
      const status = comp.regression ? '❌ REGRESSION' : '✅ OK';
      
      Logger.info(`${status} ${comp.operation}:`);
      Logger.info(`  Duration: ${durationChange} (${comp.current.duration.toFixed(2)}ms vs ${comp.baseline.duration.toFixed(2)}ms)`);
      Logger.info(`  Memory: ${memoryChange} (${(comp.current.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB vs ${(comp.baseline.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB)`);
      
      if (comp.regression) {
        hasRegressions = true;
      }
    }
    
    Logger.info('');
    if (hasRegressions) {
      Logger.error('❌ PERFORMANCE REGRESSIONS DETECTED!');
      Logger.error('Please review the changes and optimize before proceeding.');
    } else {
      Logger.info('✅ No performance regressions detected!');
      Logger.info('The refactored code maintains or improves performance.');
    }
    
    // Save detailed report
    const reportPath = `./benchmarks/comparison-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: Date.now(),
      summary: {
        total_operations: comparisons.length,
        regressions_detected: comparisons.filter(c => c.regression).length,
        improvements: comparisons.filter(c => !c.regression).length,
        has_regressions: hasRegressions
      },
      comparisons
    }, null, 2));
    
    Logger.info(`📄 Detailed comparison report saved: ${reportPath}`);
  }
}

/**
 * Run the complete benchmark suite
 */
export async function runPipelineBenchmarks(): Promise<void> {
  const suite = new PipelineBenchmarkSuite();
  await suite.runFullSuite();
}

// If this file is run directly, execute the benchmark suite
if (require.main === module) {
  runPipelineBenchmarks().catch(console.error);
}