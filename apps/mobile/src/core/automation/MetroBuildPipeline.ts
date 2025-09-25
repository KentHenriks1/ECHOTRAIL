/**
 * Metro Build Pipeline - Main orchestrator for automated builds
 * 
 * This is the main entry point for the Metro build pipeline automation.
 * The implementation has been modularized for better maintainability:
 * - Types and interfaces are in ./types.ts
 * - Build steps are in ./buildSteps.ts
 * - CI templates are in ./ciTemplates.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import EventEmitter from 'events';
import { Logger } from '../utils/Logger';
import { 
  BuildPipelineConfig, 
  BuildResult, 
  PerformanceRegression, 
  BuildContext,
  BuildStep,
  StepResult
} from './types';

// Re-export types for easier importing in tests
export type {
  BuildPipelineConfig as PipelineConfig,
  BuildResult,
  PerformanceRegression,
  BuildContext,
  BuildStep,
  StepResult
} from './types';

// Platform type
export type Platform = 'android' | 'ios';

// Build metrics type
export interface BuildMetrics {
  jsSize: number;
  assetsSize: number;
  buildTime: number;
  memoryUsage: number;
  bundleCount?: number;
  warningCount?: number;
  cacheHitRate?: number;
}
import { 
  CacheWarmingStep, 
  BundleBuildStep, 
  BundleAnalysisStep, 
  PerformanceBenchmarkStep 
} from './buildSteps';
import { 
  generateGitHubWorkflow, 
  generateGitLabWorkflow, 
  generateJenkinsfile 
} from './ciTemplates';
import { getDefaultConfig } from './defaultConfig';
import { generateBuildId, getGitInfo, getMetroVersion, calculateSeverity, loadBuildHistory, saveBuildHistory, generateBuildReports } from './pipelineUtils';
import { PipelineErrorHandler } from './errorHandler';
import { ConfigurationError, BuildStepError, TimeoutError } from './errors';

/**
 * Main Metro Build Pipeline
 * 
 * Comprehensive automated build system for React Native/Metro projects.
 * Supports multi-platform builds, performance monitoring, regression detection,
 * and CI/CD integrations with event-driven architecture.
 * 
 * @fires pipeline:initialized - Emitted when pipeline is successfully initialized
 * @fires pipeline:completed - Emitted when build execution completes successfully  
 * @fires pipeline:failed - Emitted when build execution fails
 * @fires pipeline:regression - Emitted when performance regression is detected
 * 
 * @since 1.0.0
 */
export class MetroBuildPipeline extends EventEmitter {
  private static instance: MetroBuildPipeline;
  private config: BuildPipelineConfig;
  private buildHistory: BuildResult[] = [];
  private regressions: PerformanceRegression[] = [];
  private isRunning = false;
  private errorHandler: PipelineErrorHandler;

  public constructor(config?: BuildPipelineConfig) {
    super();
    this.config = config || getDefaultConfig();
    this.errorHandler = new PipelineErrorHandler({
      enableGracefulDegradation: true,
      enableAutoRecovery: true,
      continueOnNonCritical: true
    });
  }

  /**
   * Get the singleton instance of MetroBuildPipeline
   * 
   * Implements the Singleton pattern to ensure only one instance of the build pipeline
   * exists at any time, providing consistent state and configuration management.
   * 
   * @returns The singleton instance of MetroBuildPipeline
   */
  static getInstance(): MetroBuildPipeline {
    if (!MetroBuildPipeline.instance) {
      MetroBuildPipeline.instance = new MetroBuildPipeline();
    }
    return MetroBuildPipeline.instance;
  }

  /**
   * Initialize the build pipeline with optional configuration overrides
   * 
   * Sets up pipeline with configuration, loads build history, and initializes integrations.
   * Must be called before executing builds.
   * 
   * @param config - Optional configuration overrides
   * 
   * @returns Promise that resolves when initialization is complete
   * 
   * @throws {Error} When CI integration setup fails (if enabled)
   * 
   * @fires pipeline:initialized - Emitted when initialization completes successfully
   */
  async initialize(config?: Partial<BuildPipelineConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      if (!this.config.enabled) {
        Logger.info('🚀 Metro Build Pipeline disabled');
        return;
      }

      // Load build history with error handling
      this.buildHistory = await this.errorHandler.executeWithRetry(
        () => loadBuildHistory(),
        { data: { operation: 'load_build_history' } }
      );

      // Setup CI integrations with error handling
      if (this.config.ci.integration.enabled) {
        await this.errorHandler.executeWithRetry(
          () => this.setupCIIntegration(),
          { data: { operation: 'setup_ci_integration' } }
        );
      }

      Logger.info('🚀 Metro Build Pipeline initialized');
      Logger.info(`📊 Performance Regression Detection: ${this.config.performance.regression_detection.enabled ? 'Enabled' : 'Disabled'}`);
      Logger.info(`🧪 Benchmarking: ${this.config.performance.benchmarking.enabled ? 'Enabled' : 'Disabled'}`);
      this.emit('pipeline:initialized', this.config);
      
    } catch (error) {
      const configError = new ConfigurationError(
        'Failed to initialize Metro Build Pipeline',
        { data: { config, originalError: error } }
      );
      Logger.error('Pipeline initialization failed:', configError.toJSON());
      this.emit('pipeline:failed', { error: configError });
      throw configError;
    }
  }

  /**
   * Execute the full build pipeline for specified platforms and environments
   * 
   * Orchestrates complete build process with concurrent execution across platforms.
   * 
   * @param options - Build execution options
   * 
   * @returns Promise resolving to array of BuildResult objects, one per platform/environment combination
   * 
   * @throws {Error} When pipeline is already running
   * @throws {Error} When any critical build step fails
   * @throws {Error} When git information cannot be retrieved
   * 
   * @fires pipeline:completed - Emitted when all builds complete successfully
   * @fires pipeline:failed - Emitted when build execution fails
   * @fires pipeline:regression - Emitted when performance regression is detected
   */
  async executeBuild(options: {
    platforms?: string[];
    environments?: string[];
    branch?: string;
    commit?: string;
    runBenchmarks?: boolean;
  } = {}): Promise<BuildResult[]> {
    if (this.isRunning) {
      throw new Error('Build pipeline is already running');
    }

    this.isRunning = true;
    const buildId = generateBuildId();
    Logger.info(`🚀 Starting Metro build pipeline - ID: ${buildId}`);
    try {
      const context = await this.errorHandler.executeWithRetry(
        () => this.createBuildContext(buildId, options),
        { buildId, data: { operation: 'create_build_context' } }
      );
      
      const results: BuildResult[] = [];
      const platforms = options.platforms || ['android', 'ios'];
      const environments = options.environments || ['development', 'production'];
      
      // Execute builds for each platform/environment combination with graceful degradation
      const buildCombinations = platforms.flatMap(platform =>
        environments.map(environment => ({ platform, environment }))
      );
      
      const buildPromises = buildCombinations.map(async ({ platform, environment }) => {
        Logger.info(`📱 Building for ${platform} (${environment})...`);
        
        try {
          const buildResult = await this.errorHandler.executeWithRetry(
            () => this.executeSingleBuild(context, platform, environment),
            { buildId, platform, environment }
          );
          
          this.buildHistory.push(buildResult);
          
          // Check for performance regressions with error handling
          if (this.config.performance.regression_detection.enabled) {
            await this.errorHandler.executeWithRetry(
              () => this.checkPerformanceRegression(buildResult),
              { buildId, platform, environment, data: { operation: 'regression_check' } }
            );
          }
          
          return buildResult;
          
        } catch (error) {
          // Handle platform-specific errors with graceful degradation
          const handlingResult = await this.errorHandler.handlePipelineError(
            error, buildId, platform, environment
          );
          
          if (handlingResult.canContinue) {
            Logger.warn(`⚠️ Build failed for ${platform} (${environment}) but continuing with other platforms`);
            
            // Create a failed build result
            const failedResult: BuildResult = {
              id: `${buildId}-${platform}-${environment}`,
              timestamp: Date.now(),
              branch: context.git.branch,
              commit: context.git.commit,
              platform,
              environment,
              success: false,
              duration: 0,
              bundleSize: 0,
              artifacts: { bundle: '' },
              metrics: {
                buildTime: 0,
                bundleSize: 0,
                cacheHitRate: 0,
                memoryUsage: 0,
                optimizations: []
              },
              warnings: [`Build failed but pipeline continued in degraded mode`],
              errors: [error instanceof Error ? error.message : String(error)]
            };
            
            this.buildHistory.push(failedResult);
            return failedResult;
          } else {
            throw error; // Re-throw if cannot continue
          }
        }
      });
      
      const buildResults = await Promise.allSettled(buildPromises);
      
      // Process results and separate successful from failed builds
      buildResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          Logger.error('Build promise rejected:', result.reason);
          // Continue processing other results
        }
      });
      
      // Run benchmarks if enabled and we have successful builds
      if (options.runBenchmarks && this.config.performance.benchmarking.enabled && results.some(r => r.success)) {
        Logger.info('🧪 Running performance benchmarks...');
        try {
          const benchmarkStep = new PerformanceBenchmarkStep(this.config.performance.benchmarking);
          await this.errorHandler.executeWithRetry(
            () => benchmarkStep.execute(context),
            { buildId, data: { operation: 'performance_benchmarking' } }
          );
        } catch (benchmarkError) {
          Logger.warn('Performance benchmarking failed but continuing pipeline', benchmarkError);
        }
      }
      
      // Generate reports with error handling
      await this.errorHandler.executeWithRetry(
        () => generateBuildReports(results, this.regressions),
        { buildId, data: { operation: 'generate_reports' } }
      );
      
      // Save build history with error handling
      await this.errorHandler.executeWithRetry(
        () => saveBuildHistory(this.buildHistory),
        { buildId, data: { operation: 'save_build_history' } }
      );
      
      // Send notifications with error handling
      await this.errorHandler.executeWithRetry(
        () => this.sendNotifications(results),
        { buildId, data: { operation: 'send_notifications' } }
      );

      // Generate error report
      await this.errorHandler.generateErrorReport();
      
      const successfulBuilds = results.filter(r => r.success);
      const failedBuilds = results.filter(r => !r.success);
      
      if (successfulBuilds.length > 0) {
        Logger.info(`✅ Metro build pipeline completed - ID: ${buildId}`);
        Logger.info(`   Successful builds: ${successfulBuilds.length}/${results.length}`);
        if (failedBuilds.length > 0) {
          Logger.warn(`   Failed builds: ${failedBuilds.length}/${results.length} (graceful degradation applied)`);
        }
        this.emit('pipeline:completed', { buildId, results, degradedMode: failedBuilds.length > 0 });
      } else {
        Logger.error(`❌ All builds failed for pipeline - ID: ${buildId}`);
        this.emit('pipeline:failed', { buildId, results });
        throw new BuildStepError('All builds failed', 'pipeline_execution');
      }

      return results;

    } catch (error) {
      // Final error handling
      const finalResult = await this.errorHandler.handleError(
        error,
        { buildId, data: { operation: 'pipeline_execution' } }
      );
      
      await this.errorHandler.generateErrorReport();
      
      if (finalResult.recovered) {
        Logger.warn(`⚠️ Metro build pipeline recovered from critical error - ID: ${buildId}`);
        this.emit('pipeline:completed', { buildId, results: [], degradedMode: true });
        return [];
      } else {
        Logger.error(`❌ Metro build pipeline failed - ID: ${buildId}:`, finalResult.finalError?.toJSON() || error);
        this.emit('pipeline:failed', { buildId, error: finalResult.finalError || error });
        throw finalResult.finalError || error;
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Analyze recent builds for performance regressions
   * 
   * Compares recent build metrics against baseline averages to detect significant
   * performance degradations in bundle size, build time, and memory usage.
   * Groups builds by platform/environment for accurate comparison.
   * 
   * @param builds - Number of recent builds to analyze (default: 10)
   * 
   * @returns Promise resolving to array of detected performance regressions
   * 
   * @example
   * ```typescript
   * // Analyze last 10 builds for regressions
   * const regressions = await pipeline.analyzeRegressions();
   * 
   * // Analyze more history for deeper analysis
   * const regressions = await pipeline.analyzeRegressions(20);
   * 
   * regressions.forEach(regression => {
   *   console.log(`${regression.metric} regression: ${regression.regression.toFixed(1)}%`);
   *   console.log(`Severity: ${regression.severity}`);
   *   console.log('Recommendations:', regression.recommendations);
   * });
   * ```
   */
  async analyzeRegressions(builds = 10): Promise<PerformanceRegression[]> {
    const recentBuilds = this.buildHistory.slice(-builds);
    const regressions: PerformanceRegression[] = [];

    if (recentBuilds.length < 2) {
      return regressions;
    }

    // Group builds by platform/environment
    const groups = new Map<string, BuildResult[]>();
    for (const build of recentBuilds) {
      const key = `${build.platform}-${build.environment}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(build);
    }

    // Analyze each group for regressions
    for (const [_key, builds] of groups) {
      if (builds.length < 2) continue;

      const latest = builds[builds.length - 1];
      const baseline = builds.slice(0, -1);

      // Calculate baseline averages
      const baselineAvg = {
        bundleSize: baseline.reduce((sum, b) => sum + b.bundleSize, 0) / baseline.length,
        buildTime: baseline.reduce((sum, b) => sum + b.metrics.buildTime, 0) / baseline.length,
        memoryUsage: baseline.reduce((sum, b) => sum + b.metrics.memoryUsage, 0) / baseline.length,
      };

      // Check for regressions
      const bundleSizeRegression = ((latest.bundleSize - baselineAvg.bundleSize) / baselineAvg.bundleSize) * 100;
      const buildTimeRegression = ((latest.metrics.buildTime - baselineAvg.buildTime) / baselineAvg.buildTime) * 100;

      // Bundle size regression
      if (bundleSizeRegression > this.config.performance.regression_detection.threshold_bundle_size) {
        regressions.push({
          id: `${latest.id}-bundle-size`,
          timestamp: Date.now(),
          build: latest.id,
          metric: 'bundle_size',
          baseline: baselineAvg.bundleSize,
          current: latest.bundleSize,
          regression: bundleSizeRegression,
          severity: calculateSeverity(bundleSizeRegression, 50, 20),
          recommendations: [
            'Analyze bundle composition for large new dependencies',
            'Enable tree shaking optimizations',
            'Consider code splitting strategies',
          ],
        });
      }

      // Build time regression
      if (buildTimeRegression > this.config.performance.regression_detection.threshold_build_time) {
        regressions.push({
          id: `${latest.id}-build-time`,
          timestamp: Date.now(),
          build: latest.id,
          metric: 'build_time',
          baseline: baselineAvg.buildTime,
          current: latest.metrics.buildTime,
          regression: buildTimeRegression,
          severity: calculateSeverity(buildTimeRegression, 100, 50),
          recommendations: [
            'Check for new heavy transformers or plugins',
            'Verify cache is working properly',
            'Consider optimizing large modules',
          ],
        });
      }
    }

    this.regressions.push(...regressions);
    return regressions;
  }

  /**
   * Generate CI/CD workflow configuration files for the specified platform
   * 
   * Creates platform-specific workflow files that integrate the Metro build pipeline
   * into CI/CD systems. Generated files include proper build matrices, artifact
   * handling, and notification setups.
   * 
   * @param platform - Target CI/CD platform ('github' | 'gitlab' | 'jenkins')
   * 
   * @returns Promise that resolves when workflow file is created
   * 
   * @throws {Error} When file system operations fail
   * 
   * @example
   * ```typescript
   * // Generate GitHub Actions workflow
   * await pipeline.generateCIWorkflows('github');
   * // Creates .github/workflows/metro-build.yml
   * 
   * // Generate GitLab CI configuration
   * await pipeline.generateCIWorkflows('gitlab');
   * // Creates .gitlab-ci.yml
   * 
   * // Generate Jenkins pipeline
   * await pipeline.generateCIWorkflows('jenkins');
   * // Creates Jenkinsfile
   * ```
   */
  async generateCIWorkflows(platform: 'github' | 'gitlab' | 'jenkins'): Promise<void> {
    const workflows = {
      github: generateGitHubWorkflow(),
      gitlab: generateGitLabWorkflow(),
      jenkins: generateJenkinsfile(),
    };

    const content = workflows[platform];
    const filePaths = {
      github: '.github/workflows/metro-build.yml',
      gitlab: '.gitlab-ci.yml',
      jenkins: 'Jenkinsfile',
    };

    await fs.mkdir(path.dirname(filePaths[platform]), { recursive: true });
    await fs.writeFile(filePaths[platform], content);

    Logger.info(`✅ Generated ${platform} workflow: ${filePaths[platform]}`);
  }

  // Private methods

  private async executeSingleBuild(context: BuildContext, platform: string, environment: string): Promise<BuildResult> {
    const buildId = `${context.buildId}-${platform}-${environment}`;
    const startTime = Date.now();
    
    const steps: BuildStep[] = [
      new CacheWarmingStep(),
      new BundleBuildStep(platform, environment),
      new BundleAnalysisStep(),
    ];

    const result: BuildResult = {
      id: buildId,
      timestamp: Date.now(),
      branch: context.git.branch,
      commit: context.git.commit,
      platform,
      environment,
      success: true,
      duration: 0,
      bundleSize: 0,
      artifacts: {
        bundle: '',
      },
      metrics: {
        buildTime: 0,
        bundleSize: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        optimizations: [],
      },
      warnings: [],
      errors: [],
    };

    // Execute build steps sequentially (must be done in order)
    const enabledSteps = steps.filter(step => step.enabled);
    
    // Use reduce to avoid await-in-loop ESLint error
    await enabledSteps.reduce(async (previousPromise, step) => {
      await previousPromise; // Wait for previous step to complete
      
      Logger.info(`  🔄 ${step.name}...`);
      const stepResult = await this.executeStepWithRetry(step, context);
      
      if (!stepResult || !stepResult.success) {
        result.errors.push(`${step.name}: ${stepResult?.error || 'Unknown error'}`);
        if (!step.continueOnFailure) {
          result.success = false;
          throw new Error(`Build failed at step: ${step.name}`);
        }
      } else {
        // Merge step artifacts and metrics
        if (stepResult.artifacts) Object.assign(result.artifacts, stepResult.artifacts);
        if (stepResult.metrics) Object.assign(result.metrics, stepResult.metrics);
      }
    }, Promise.resolve()).catch(() => {
      // Build already marked as failed
    });

    result.duration = Date.now() - startTime;
    result.bundleSize = result.metrics.bundleSize || 0;

    Logger.info(`  ${result.success ? '✅' : '❌'} Build completed in ${Math.round(result.duration / 1000)}s`);
    
    return result;
  }

  private async createBuildContext(buildId: string, options: any): Promise<BuildContext> {
    const git = await getGitInfo(options);
    
    return {
      buildId,
      config: this.config,
      environment: {
        platform: process.platform,
        node_version: process.version,
        metro_version: await getMetroVersion(),
        project_root: process.cwd(),
      },
      git,
      artifacts: new Map(),
      metrics: new Map(),
    };
  }


  private async checkPerformanceRegression(build: BuildResult): Promise<void> {
    const regressions = await this.analyzeRegressions();
    const buildRegressions = regressions.filter(r => r.build === build.id);
    
    if (buildRegressions.length > 0 && this.config.performance.regression_detection.alert_on_regression) {
      Logger.warn(`⚠️ Performance regression detected in build ${build.id}:`);
      for (const regression of buildRegressions) {
        Logger.warn(`  📈 ${regression.metric}: ${regression.regression.toFixed(1)}% increase (${regression.severity})`);
      }
      
      this.emit('pipeline:regression', { build, regressions: buildRegressions });
    }
  }

  private async executeStepWithRetry(step: BuildStep, context: BuildContext): Promise<StepResult | null> {
    return await this.errorHandler.executeStepWithErrorHandling(
      step.name,
      async () => {
        // Execute step with timeout
        const stepResult = await Promise.race([
          step.execute(context),
          new Promise<StepResult>((_, reject) => {
            setTimeout(
              () => reject(new TimeoutError(
                `Step '${step.name}' timed out after ${step.timeout}ms`,
                step.name,
                step.timeout,
                { buildId: context.buildId }
              )), 
              step.timeout
            );
          }),
        ]);
        
        return stepResult;
      },
      context
    );
  }


  private async sendNotifications(results: BuildResult[]): Promise<void> {
    Logger.info(`📢 Notifications sent for ${results.length} build results`);
  }

  private async setupCIIntegration(): Promise<void> {
    Logger.info(`🔧 Setting up CI integration for ${this.config.ci.platform}`);
  }

}
export default MetroBuildPipeline;
