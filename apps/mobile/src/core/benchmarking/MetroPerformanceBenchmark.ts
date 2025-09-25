/**
 * Metro Performance Benchmarking System for EchoTrail
 * 
 * Enterprise-grade performance measurement and benchmarking system for Metro bundler:
 * - Automated performance tracking across different configurations
 * - Historical performance data analysis and trending
 * - Bundle size optimization measurement
 * - Build time performance monitoring
 * - Memory usage tracking during builds
 * - Comparative analysis between optimization strategies
 * - Performance regression detection
 * - Detailed reporting with actionable insights
 * 
 * @author EchoTrail Development Team
 * @version 2.0.0
 * @enterprise true
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { Logger } from '../utils/Logger';
// spawn import reserved for future async process implementation

/**
 * Performance metrics structure
 */
interface PerformanceMetrics {
  timestamp: string;
  buildId: string;
  configuration: BenchmarkConfiguration;
  metrics: {
    buildTime: {
      total: number;
      phases: {
        resolution: number;
        transformation: number;
        serialization: number;
        minification?: number;
      };
    };
    bundleSize: {
      total: number;
      gzipped: number;
      modules: number;
      assets: number;
    };
    memoryUsage: {
      peak: number;
      average: number;
      final: number;
    };
    optimization: {
      treeShakingEffectiveness: number;
      deadCodeEliminated: number;
      modulesOptimized: number;
      compressionRatio: number;
    };
  };
  environment: {
    nodeVersion: string;
    metroVersion: string;
    platform: string;
    os: string;
    cpuCores: number;
    totalMemory: number;
  };
}

/**
 * Benchmark configuration options
 */
interface BenchmarkConfiguration {
  name: string;
  description: string;
  platform: 'android' | 'ios' | 'web';
  environment: 'development' | 'production';
  optimizations: {
    minification: boolean;
    treeShaking: boolean;
    deadCodeElimination: boolean;
    bundleSplitting: boolean;
  };
  caching: boolean;
  sourceMap: boolean;
}

/**
 * Performance trend analysis
 */
interface PerformanceTrend {
  metric: string;
  period: 'day' | 'week' | 'month';
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
  recommendations: string[];
}

/**
 * Benchmark comparison result
 */
interface BenchmarkComparison {
  baselineId: string;
  currentId: string;
  improvements: ComparisonMetric[];
  regressions: ComparisonMetric[];
  summary: {
    overallScore: number;
    recommendation: string;
  };
}

interface ComparisonMetric {
  metric: string;
  baseline: number;
  current: number;
  changePercentage: number;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Main Metro Performance Benchmark class
 */
export class MetroPerformanceBenchmark {
  private static instance: MetroPerformanceBenchmark;
  private benchmarkHistory: PerformanceMetrics[] = [];
  private isRunning = false;
  private currentBenchmark: string | null = null;

  // Standard benchmark configurations
  private readonly BENCHMARK_CONFIGS: BenchmarkConfiguration[] = [
    {
      name: 'development-android-basic',
      description: 'Basic development build for Android',
      platform: 'android',
      environment: 'development',
      optimizations: {
        minification: false,
        treeShaking: false,
        deadCodeElimination: false,
        bundleSplitting: false,
      },
      caching: true,
      sourceMap: true,
    },
    {
      name: 'production-android-optimized',
      description: 'Fully optimized production build for Android',
      platform: 'android',
      environment: 'production',
      optimizations: {
        minification: true,
        treeShaking: true,
        deadCodeElimination: true,
        bundleSplitting: true,
      },
      caching: true,
      sourceMap: false,
    },
    {
      name: 'production-ios-optimized',
      description: 'Fully optimized production build for iOS',
      platform: 'ios',
      environment: 'production',
      optimizations: {
        minification: true,
        treeShaking: true,
        deadCodeElimination: true,
        bundleSplitting: true,
      },
      caching: true,
      sourceMap: false,
    },
    {
      name: 'development-web-debug',
      description: 'Development build for web with full debugging',
      platform: 'web',
      environment: 'development',
      optimizations: {
        minification: false,
        treeShaking: false,
        deadCodeElimination: false,
        bundleSplitting: false,
      },
      caching: true,
      sourceMap: true,
    },
  ];

  /**
   * Singleton pattern implementation
   */
  static getInstance(): MetroPerformanceBenchmark {
    if (!MetroPerformanceBenchmark.instance) {
      MetroPerformanceBenchmark.instance = new MetroPerformanceBenchmark();
    }
    return MetroPerformanceBenchmark.instance;
  }

  /**
   * Get current benchmark ID
   */
  getCurrentBenchmark(): string | null {
    return this.currentBenchmark;
  }

  /**
   * Initialize the benchmarking system
   */
  async initialize(): Promise<void> {
    try {
      await this.loadHistoricalData();
      await this.ensureDirectories();
      Logger.info('🏁 Metro Performance Benchmarking System initialized');
    } catch (error) {
      Logger.error('❌ Failed to initialize benchmarking system:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive performance benchmarks
   */
  async runComprehensiveBenchmarks(): Promise<PerformanceMetrics[]> {
    if (this.isRunning) {
      throw new Error('Benchmarks are already running');
    }

    this.isRunning = true;
    const results: PerformanceMetrics[] = [];

    try {
      Logger.info('🚀 Starting comprehensive Metro performance benchmarks...');
      
      for (const config of this.BENCHMARK_CONFIGS) {
        Logger.info(`📊 Running benchmark: ${config.name}`);
        const metrics = await this.runSingleBenchmark(config);
        results.push(metrics);
        
        // Add delay between benchmarks to allow system recovery
        await this.delay(2000);
      }

      // Save results
      await this.saveResults(results);
      
      Logger.info(`✅ Completed ${results.length} benchmarks successfully`);
      return results;
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a single benchmark configuration
   */
  async runSingleBenchmark(config: BenchmarkConfiguration): Promise<PerformanceMetrics> {
    const buildId = this.generateBuildId(config);
    this.currentBenchmark = buildId;

    const startTime = performance.now();
    let memoryPeak = 0;
    let memorySum = 0;
    let memorySamples = 0;

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      memoryPeak = Math.max(memoryPeak, usage.heapUsed);
      memorySum += usage.heapUsed;
      memorySamples++;
    }, 100);

    try {
      // Clean previous build artifacts
      await this.cleanBuildArtifacts();

      // Configure environment
      this.setEnvironmentForBenchmark(config);

      // Run Metro build with performance tracking
      const buildResult = await this.runMetroBuild(config);
      
      const endTime = performance.now();
      const buildTime = endTime - startTime;

      // Stop memory monitoring
      clearInterval(memoryInterval);

      // Collect bundle analysis
      const bundleAnalysis = await this.analyzeBundleSize(buildResult.bundlePath);
      const optimizationAnalysis = await this.analyzeOptimizations(buildResult.bundlePath);

      // Create performance metrics
      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        buildId,
        configuration: config,
        metrics: {
          buildTime: {
            total: buildTime,
            phases: buildResult.phases,
          },
          bundleSize: bundleAnalysis,
          memoryUsage: {
            peak: memoryPeak,
            average: memorySamples > 0 ? memorySum / memorySamples : 0,
            final: process.memoryUsage().heapUsed,
          },
          optimization: optimizationAnalysis,
        },
        environment: this.getEnvironmentInfo(),
      };

      // Add to history
      this.benchmarkHistory.push(metrics);

      return metrics;

    } finally {
      clearInterval(memoryInterval);
      this.currentBenchmark = null;
    }
  }

  /**
   * Run Metro build with performance tracking
   */
  private async runMetroBuild(config: BenchmarkConfiguration): Promise<{
    bundlePath: string;
    phases: {
      resolution: number;
      transformation: number;
      serialization: number;
      minification?: number;
    };
  }> {
    const bundlePath = `benchmark-bundle-${config.name}.js`;
    
    // Build Metro command
    const metroCommand = [
      'npx', 'metro', 'build', 'index.js',
      '--out', bundlePath,
      '--platform', config.platform,
      '--dev', config.environment === 'development' ? 'true' : 'false',
      '--minify', config.optimizations.minification ? 'true' : 'false',
      '--source-map', config.sourceMap ? 'true' : 'false',
    ];

    if (!config.caching) {
      metroCommand.push('--reset-cache');
    }

    // Run build and capture phases
    const phaseStartTime = performance.now();
    
    try {
      execSync(metroCommand.join(' '), {
        stdio: 'pipe',
        timeout: 120000, // 2 minute timeout
      });
    } catch (error) {
      throw new Error(`Metro build failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const phaseEndTime = performance.now();

    // For now, we'll estimate phases based on total time
    // In a more advanced implementation, we'd hook into Metro's internal metrics
    const totalPhaseTime = phaseEndTime - phaseStartTime;
    const phases = {
      resolution: totalPhaseTime * 0.1,     // ~10% resolution
      transformation: totalPhaseTime * 0.7,  // ~70% transformation
      serialization: totalPhaseTime * 0.15,  // ~15% serialization
      minification: config.optimizations.minification ? totalPhaseTime * 0.05 : undefined, // ~5% if enabled
    };

    return {
      bundlePath,
      phases,
    };
  }

  /**
   * Analyze bundle size and composition
   */
  private async analyzeBundleSize(bundlePath: string): Promise<{
    total: number;
    gzipped: number;
    modules: number;
    assets: number;
  }> {
    try {
      const stats = await fs.stat(bundlePath);
      const bundleContent = await fs.readFile(bundlePath, 'utf8');

      // Calculate gzipped size (estimation)
      const gzippedSize = Math.floor(stats.size * 0.3); // Rough estimation

      // Count modules (rough estimation based on common patterns)
      const moduleMatches = bundleContent.match(/module\.exports\s*=/g);
      const moduleCount = moduleMatches ? moduleMatches.length : 0;

      return {
        total: stats.size,
        gzipped: gzippedSize,
        modules: moduleCount,
        assets: 0, // Would need more sophisticated analysis
      };
    } catch (error) {
      Logger.warn('Bundle analysis failed:', error instanceof Error ? error.message : String(error));
      return {
        total: 0,
        gzipped: 0,
        modules: 0,
        assets: 0,
      };
    }
  }

  /**
   * Analyze optimization effectiveness
   */
  private async analyzeOptimizations(bundlePath: string): Promise<{
    treeShakingEffectiveness: number;
    deadCodeEliminated: number;
    modulesOptimized: number;
    compressionRatio: number;
  }> {
    try {
      const bundleContent = await fs.readFile(bundlePath, 'utf8');

      // Basic optimization analysis
      const deadCodePatterns = [
        /if\s*\(\s*false\s*\)/g,
        /if\s*\(\s*0\s*\)/g,
        /\/\*[\s\S]*?\*\//g,
      ];

      let deadCodeCount = 0;
      deadCodePatterns.forEach(pattern => {
        const matches = bundleContent.match(pattern);
        if (matches) deadCodeCount += matches.length;
      });

      // Tree shaking effectiveness (estimation)
      const exportMatches = bundleContent.match(/exports\./g);
      const importMatches = bundleContent.match(/require\(/g);
      const treeShakingEffectiveness = exportMatches && importMatches ? 
        Math.min(100, (importMatches.length / exportMatches.length) * 100) : 0;

      return {
        treeShakingEffectiveness,
        deadCodeEliminated: deadCodeCount,
        modulesOptimized: bundleContent.split('module.exports').length - 1,
        compressionRatio: bundleContent.length > 0 ? 
          ((bundleContent.length - bundleContent.replace(/\s+/g, ' ').length) / bundleContent.length) * 100 : 0,
      };
    } catch (error) {
      Logger.warn('Optimization analysis failed:', error instanceof Error ? error.message : String(error));
      return {
        treeShakingEffectiveness: 0,
        deadCodeEliminated: 0,
        modulesOptimized: 0,
        compressionRatio: 0,
      };
    }
  }

  /**
   * Compare benchmarks and identify trends
   */
  async compareBenchmarks(baselineId: string, currentId: string): Promise<BenchmarkComparison> {
    const baseline = this.benchmarkHistory.find(b => b.buildId === baselineId);
    const current = this.benchmarkHistory.find(b => b.buildId === currentId);

    if (!baseline || !current) {
      throw new Error('Benchmark data not found for comparison');
    }

    const improvements: ComparisonMetric[] = [];
    const regressions: ComparisonMetric[] = [];

    // Compare build time
    const buildTimeChange = ((current.metrics.buildTime.total - baseline.metrics.buildTime.total) / baseline.metrics.buildTime.total) * 100;
    if (buildTimeChange < -5) {
      improvements.push({
        metric: 'Build Time',
        baseline: baseline.metrics.buildTime.total,
        current: current.metrics.buildTime.total,
        changePercentage: buildTimeChange,
        impact: this.calculateImpact(Math.abs(buildTimeChange), 20, 10),
      });
    } else if (buildTimeChange > 5) {
      regressions.push({
        metric: 'Build Time',
        baseline: baseline.metrics.buildTime.total,
        current: current.metrics.buildTime.total,
        changePercentage: buildTimeChange,
        impact: this.calculateImpact(Math.abs(buildTimeChange), 20, 10),
      });
    }

    // Compare bundle size
    const bundleSizeChange = ((current.metrics.bundleSize.total - baseline.metrics.bundleSize.total) / baseline.metrics.bundleSize.total) * 100;
    if (bundleSizeChange < -2) {
      improvements.push({
        metric: 'Bundle Size',
        baseline: baseline.metrics.bundleSize.total,
        current: current.metrics.bundleSize.total,
        changePercentage: bundleSizeChange,
        impact: this.calculateImpact(Math.abs(bundleSizeChange), 10, 5),
      });
    } else if (bundleSizeChange > 2) {
      regressions.push({
        metric: 'Bundle Size',
        baseline: baseline.metrics.bundleSize.total,
        current: current.metrics.bundleSize.total,
        changePercentage: bundleSizeChange,
        impact: this.calculateImpact(Math.abs(bundleSizeChange), 10, 5),
      });
    }

    // Calculate overall score
    const improvementScore = improvements.reduce((score, imp) => {
      const impact = this.getImpactScore(imp.impact);
      return score + (Math.abs(imp.changePercentage) * impact);
    }, 0);

    const regressionScore = regressions.reduce((score, reg) => {
      const impact = this.getImpactScore(reg.impact);
      return score - (Math.abs(reg.changePercentage) * impact);
    }, 0);

    const overallScore = improvementScore + regressionScore;

    return {
      baselineId,
      currentId,
      improvements,
      regressions,
      summary: {
        overallScore,
        recommendation: this.generateRecommendation(overallScore, improvements, regressions),
      },
    };
  }

  /**
   * Generate performance trends analysis
   */
  async analyzePerformanceTrends(days: number = 30): Promise<PerformanceTrend[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentBenchmarks = this.benchmarkHistory.filter(
      benchmark => new Date(benchmark.timestamp) >= cutoffDate
    );

    if (recentBenchmarks.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];

    // Analyze build time trend
    const buildTimes = recentBenchmarks.map(b => b.metrics.buildTime.total);
    const buildTimeTrend = this.calculateTrend(buildTimes);
    trends.push({
      metric: 'Build Time',
      period: this.getPeriod(days),
      trend: buildTimeTrend.direction,
      changePercentage: buildTimeTrend.change,
      recommendations: this.generateTrendRecommendations('Build Time', buildTimeTrend),
    });

    // Analyze bundle size trend
    const bundleSizes = recentBenchmarks.map(b => b.metrics.bundleSize.total);
    const bundleSizeTrend = this.calculateTrend(bundleSizes);
    trends.push({
      metric: 'Bundle Size',
      period: this.getPeriod(days),
      trend: bundleSizeTrend.direction,
      changePercentage: bundleSizeTrend.change,
      recommendations: this.generateTrendRecommendations('Bundle Size', bundleSizeTrend),
    });

    return trends;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<string> {
    const report = [];
    
    report.push('# Metro Performance Benchmark Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    // Summary statistics
    if (this.benchmarkHistory.length > 0) {
      const latest = this.benchmarkHistory[this.benchmarkHistory.length - 1];
      report.push('## Latest Benchmark Results');
      report.push(`Configuration: ${latest.configuration.name}`);
      report.push(`Build Time: ${Math.round(latest.metrics.buildTime.total)}ms`);
      report.push(`Bundle Size: ${Math.round(latest.metrics.bundleSize.total / 1024)} KB`);
      report.push(`Memory Peak: ${Math.round(latest.metrics.memoryUsage.peak / 1024 / 1024)} MB`);
      report.push('');
    }

    // Performance trends
    const trends = await this.analyzePerformanceTrends(30);
    if (trends.length > 0) {
      report.push('## Performance Trends (30 days)');
      trends.forEach(trend => {
        report.push(`### ${trend.metric}`);
        report.push(`Trend: ${trend.trend} (${trend.changePercentage.toFixed(1)}%)`);
        report.push('Recommendations:');
        trend.recommendations.forEach(rec => report.push(`- ${rec}`));
        report.push('');
      });
    }

    // Configuration comparison
    report.push('## Configuration Performance Summary');
    const configSummary = this.getConfigurationSummary();
    configSummary.forEach(config => {
      report.push(`### ${config.name}`);
      report.push(`Average Build Time: ${Math.round(config.avgBuildTime)}ms`);
      report.push(`Average Bundle Size: ${Math.round(config.avgBundleSize / 1024)} KB`);
      report.push(`Optimization Score: ${config.optimizationScore.toFixed(1)}/10`);
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Utility methods
   */
  private generateBuildId(config: BenchmarkConfiguration): string {
    const timestamp = Date.now().toString();
    const configHash = createHash('md5').update(JSON.stringify(config)).digest('hex').substring(0, 8);
    return `${config.name}-${configHash}-${timestamp}`;
  }

  private setEnvironmentForBenchmark(config: BenchmarkConfiguration): void {
    process.env.NODE_ENV = config.environment;
    process.env.EXPO_PLATFORM = config.platform;
  }

  private async cleanBuildArtifacts(): Promise<void> {
    try {
      const artifacts = [
        'bundle.js',
        'bundle.js.map',
        'benchmark-bundle-*.js',
        'benchmark-bundle-*.js.map',
      ];

      for (const pattern of artifacts) {
        try {
          if (pattern.includes('*')) {
            // Handle glob patterns - simplified implementation
            const files = await fs.readdir('.');
            const matchingFiles = files.filter(file => 
              file.startsWith(pattern.split('*')[0]) && 
              file.endsWith(pattern.split('*')[1])
            );
            
            for (const file of matchingFiles) {
              await fs.unlink(file);
            }
          } else {
            await fs.unlink(pattern);
          }
        } catch (error) {
          // Ignore file not found errors
        }
      }
    } catch (error) {
      Logger.warn('Failed to clean build artifacts:', error instanceof Error ? error.message : String(error));
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  private getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      metroVersion: this.getMetroVersion(),
      platform: process.platform,
      os: `${process.platform} ${process.arch}`,
      cpuCores: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
    };
  }

  private getMetroVersion(): string {
    try {
      const packageJson = require('metro/package.json');
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }

  private calculateTrend(values: number[]): { direction: 'improving' | 'degrading' | 'stable'; change: number } {
    if (values.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const first = values.slice(0, Math.floor(values.length / 2));
    const last = values.slice(Math.ceil(values.length / 2));

    const firstAvg = first.reduce((sum, val) => sum + val, 0) / first.length;
    const lastAvg = last.reduce((sum, val) => sum + val, 0) / last.length;

    const change = ((lastAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) < 2) {
      return { direction: 'stable', change };
    }

    return {
      direction: change < 0 ? 'improving' : 'degrading',
      change,
    };
  }

  private generateTrendRecommendations(metric: string, trend: { direction: 'improving' | 'degrading' | 'stable'; change: number }): string[] {
    const recommendations: string[] = [];

    if (metric === 'Build Time') {
      if (trend.direction === 'degrading') {
        recommendations.push('Consider enabling more aggressive caching');
        recommendations.push('Review recent code changes for performance impact');
        recommendations.push('Check for unnecessary dependencies');
      } else if (trend.direction === 'improving') {
        recommendations.push('Great work! Build times are improving');
        recommendations.push('Continue current optimization strategies');
      }
    }

    if (metric === 'Bundle Size') {
      if (trend.direction === 'degrading') {
        recommendations.push('Enable tree shaking and dead code elimination');
        recommendations.push('Review recently added dependencies');
        recommendations.push('Consider code splitting strategies');
      } else if (trend.direction === 'improving') {
        recommendations.push('Bundle size optimization is working well');
        recommendations.push('Monitor for regression in future builds');
      }
    }

    return recommendations;
  }

  private generateRecommendation(score: number, _improvements: ComparisonMetric[], _regressions: ComparisonMetric[]): string {
    // Parameters reserved for detailed recommendation analysis
    if (score > 10) {
      return 'Significant performance improvements detected. Continue with current optimization strategy.';
    } else if (score > 0) {
      return 'Minor performance improvements. Monitor for consistency.';
    } else if (score > -10) {
      return 'Minor performance regression detected. Review recent changes.';
    } else {
      return 'Significant performance regression detected. Immediate attention required.';
    }
  }

  private getConfigurationSummary(): Array<{
    name: string;
    avgBuildTime: number;
    avgBundleSize: number;
    optimizationScore: number;
  }> {
    const configGroups = this.benchmarkHistory.reduce((groups, benchmark) => {
      const configName = benchmark.configuration.name;
      if (!groups[configName]) {
        groups[configName] = [];
      }
      groups[configName].push(benchmark);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);

    return Object.entries(configGroups).map(([name, benchmarks]) => {
      const avgBuildTime = benchmarks.reduce((sum, b) => sum + b.metrics.buildTime.total, 0) / benchmarks.length;
      const avgBundleSize = benchmarks.reduce((sum, b) => sum + b.metrics.bundleSize.total, 0) / benchmarks.length;
      
      // Calculate optimization score based on various factors
      const optimizationScore = this.calculateOptimizationScore(benchmarks[benchmarks.length - 1]);

      return {
        name,
        avgBuildTime,
        avgBundleSize,
        optimizationScore,
      };
    });
  }

  private calculateOptimizationScore(benchmark: PerformanceMetrics): number {
    let score = 5; // Base score

    // Build time factor
    if (benchmark.metrics.buildTime.total < 30000) score += 2;
    else if (benchmark.metrics.buildTime.total > 60000) score -= 2;

    // Bundle size factor
    if (benchmark.metrics.bundleSize.total < 1024 * 1024) score += 2; // < 1MB
    else if (benchmark.metrics.bundleSize.total > 5 * 1024 * 1024) score -= 2; // > 5MB

    // Optimization effectiveness
    if (benchmark.metrics.optimization.treeShakingEffectiveness > 70) score += 1;
    if (benchmark.metrics.optimization.compressionRatio > 30) score += 1;

    return Math.max(0, Math.min(10, score));
  }

  private async loadHistoricalData(): Promise<void> {
    try {
      const dataPath = path.join('benchmark-data', 'historical.json');
      const data = await fs.readFile(dataPath, 'utf8');
      this.benchmarkHistory = JSON.parse(data);
    } catch (error) {
      // No historical data exists yet
      this.benchmarkHistory = [];
    }
  }

  private async saveResults(results: PerformanceMetrics[]): Promise<void> {
    try {
      await this.ensureDirectories();
      
      // Save individual results
      for (const result of results) {
        const resultPath = path.join('benchmark-data', 'results', `${result.buildId}.json`);
        await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
      }

      // Save updated historical data
      const historicalPath = path.join('benchmark-data', 'historical.json');
      await fs.writeFile(historicalPath, JSON.stringify(this.benchmarkHistory, null, 2));

    } catch (error) {
      Logger.error('Failed to save benchmark results:', error);
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      'benchmark-data',
      'benchmark-data/results',
      'benchmark-data/reports',
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private calculateImpact(value: number, highThreshold: number, mediumThreshold: number): 'high' | 'medium' | 'low' {
    if (value > highThreshold) {
      return 'high';
    }
    if (value > mediumThreshold) {
      return 'medium';
    }
    return 'low';
  }

  private getImpactScore(impact: 'high' | 'medium' | 'low'): number {
    switch (impact) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  private getPeriod(days: number): 'day' | 'week' | 'month' {
    if (days <= 7) {
      return 'day';
    }
    if (days <= 30) {
      return 'week';
    }
    return 'month';
  }
}

export default MetroPerformanceBenchmark;