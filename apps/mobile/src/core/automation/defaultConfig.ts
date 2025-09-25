import { BuildPipelineConfig } from './types';

/**
 * Get default configuration for Metro Build Pipeline
 * 
 * Returns a comprehensive default configuration with sensible defaults for all
 * pipeline features. This configuration can be used as-is or extended with
 * custom overrides for specific deployment scenarios.
 * 
 * Default configuration includes:
 * - Pipeline enabled by default
 * - GitHub as default CI platform with basic integrations disabled
 * - Performance regression detection enabled (10% bundle size, 25% build time thresholds)
 * - Automatic optimizations enabled (tree shaking, dead code elimination, cache optimization)
 * - Local artifact storage with 30-day retention
 * - All report types enabled
 * - Empty notifications configuration
 * 
 * @returns Complete default configuration object
 * 
 * @example
 * ```typescript
 * // Use default configuration
 * const config = getDefaultConfig();
 * 
 * // Override specific settings
 * const customConfig = {
 *   ...getDefaultConfig(),
 *   performance: {
 *     ...getDefaultConfig().performance,
 *     regression_detection: {
 *       ...getDefaultConfig().performance.regression_detection,
 *       threshold_bundle_size: 15 // More strict threshold
 *     }
 *   }
 * };
 * ```
 */
export function getDefaultConfig(): BuildPipelineConfig {
  return {
    enabled: true,
    ci: {
      platform: 'github',
      integration: {
        enabled: false,
        webhooks: false,
        statusChecks: false,
        artifactUpload: false,
      },
      triggers: {
        onPush: true,
        onPullRequest: true,
        onSchedule: false,
        scheduleExpression: '0 2 * * *', // Daily at 2 AM
      },
    },
    performance: {
      regression_detection: {
        enabled: true,
        threshold_bundle_size: 10, // 10% increase
        threshold_build_time: 25, // 25% increase
        baseline_builds: 5,
        alert_on_regression: true,
      },
      benchmarking: {
        enabled: false,
        platforms: ['android', 'ios'],
        environments: ['development', 'production'],
        warmup_builds: 2,
        measurement_builds: 5,
      },
    },
    optimization: {
      automatic: {
        enabled: true,
        tree_shaking: true,
        dead_code_elimination: true,
        bundle_splitting: false,
        cache_optimization: true,
      },
      analysis: {
        bundle_analyzer: true,
        dependency_analysis: true,
        performance_profiling: true,
        size_tracking: true,
      },
    },
    artifacts: {
      retention: {
        days: 30,
        max_artifacts: 100,
      },
      storage: {
        local: true,
        cloud: false,
      },
      reports: {
        bundle_analysis: true,
        performance_metrics: true,
        optimization_suggestions: true,
        comparison_reports: true,
      },
    },
    notifications: {},
  };
}