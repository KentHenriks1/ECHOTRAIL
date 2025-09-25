/**
 * Types and interfaces for Metro Build Pipeline Automation
 */

export interface BuildPipelineConfig {
  enabled: boolean;
  ci: {
    platform: 'github' | 'gitlab' | 'jenkins' | 'azure' | 'generic';
    integration: {
      enabled: boolean;
      webhooks: boolean;
      statusChecks: boolean;
      artifactUpload: boolean;
    };
    triggers: {
      onPush: boolean;
      onPullRequest: boolean;
      onSchedule: boolean;
      scheduleExpression: string;
    };
  };
  performance: {
    regression_detection: {
      enabled: boolean;
      threshold_bundle_size: number; // Percentage increase
      threshold_build_time: number; // Percentage increase
      baseline_builds: number; // Number of builds to average
      alert_on_regression: boolean;
    };
    benchmarking: {
      enabled: boolean;
      platforms: string[];
      environments: string[];
      warmup_builds: number;
      measurement_builds: number;
    };
  };
  optimization: {
    automatic: {
      enabled: boolean;
      tree_shaking: boolean;
      dead_code_elimination: boolean;
      bundle_splitting: boolean;
      cache_optimization: boolean;
    };
    analysis: {
      bundle_analyzer: boolean;
      dependency_analysis: boolean;
      performance_profiling: boolean;
      size_tracking: boolean;
    };
  };
  artifacts: {
    retention: {
      days: number;
      max_artifacts: number;
    };
    storage: {
      local: boolean;
      cloud: boolean;
      provider?: 's3' | 'gcs' | 'azure';
    };
    reports: {
      bundle_analysis: boolean;
      performance_metrics: boolean;
      optimization_suggestions: boolean;
      comparison_reports: boolean;
    };
  };
  notifications: {
    slack?: {
      webhook: string;
      channels: string[];
    };
    email?: {
      smtp: string;
      recipients: string[];
    };
    github?: {
      comments: boolean;
      status_checks: boolean;
    };
  };
}

export interface BuildResult {
  id: string;
  timestamp: number;
  branch: string;
  commit: string;
  platform: string;
  environment: string;
  success: boolean;
  duration: number;
  bundleSize: number;
  artifacts: {
    bundle: string;
    sourceMap?: string;
    analysis?: string;
    performance?: string;
  };
  metrics: {
    buildTime: number;
    bundleSize: number;
    cacheHitRate: number;
    memoryUsage: number;
    optimizations: string[];
  };
  warnings: string[];
  errors: string[];
}

export interface PerformanceRegression {
  id: string;
  timestamp: number;
  build: string;
  metric: 'bundle_size' | 'build_time' | 'memory_usage';
  baseline: number;
  current: number;
  regression: number; // Percentage
  severity: 'minor' | 'major' | 'critical';
  recommendations: string[];
}

export interface BenchmarkResult {
  id: string;
  timestamp: number;
  platform: string;
  environment: string;
  runs: {
    buildTime: number[];
    bundleSize: number[];
    memoryUsage: number[];
  };
  averages: {
    buildTime: number;
    bundleSize: number;
    memoryUsage: number;
  };
  percentiles: {
    p50: { buildTime: number; bundleSize: number; memoryUsage: number };
    p95: { buildTime: number; bundleSize: number; memoryUsage: number };
    p99: { buildTime: number; bundleSize: number; memoryUsage: number };
  };
}

/**
 * Build Step Interface
 */
export interface BuildStep {
  name: string;
  description: string;
  enabled: boolean;
  timeout: number;
  retries: number;
  continueOnFailure: boolean;
  execute(_context: BuildContext): Promise<StepResult>;
}

export interface BuildContext {
  buildId: string;
  config: BuildPipelineConfig;
  environment: {
    platform: string;
    node_version: string;
    metro_version: string;
    project_root: string;
  };
  git: {
    branch: string;
    commit: string;
    author: string;
    message: string;
  };
  artifacts: Map<string, string>;
  metrics: Map<string, any>;
}

export interface StepResult {
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  artifacts?: { [key: string]: string };
  metrics?: { [key: string]: any };
}