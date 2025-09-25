/**
 * Unit tests for Default Configuration
 */

import { getDefaultConfig } from '../defaultConfig';
import { BuildPipelineConfig } from '../types';

describe('Default Configuration', () => {
  let config: BuildPipelineConfig;

  beforeEach(() => {
    config = getDefaultConfig();
  });

  describe('getDefaultConfig', () => {
    it('should return a valid configuration object', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });

    it('should enable the pipeline by default', () => {
      expect(config.enabled).toBe(true);
    });
  });

  describe('CI Configuration', () => {
    it('should have CI configuration with default values', () => {
      expect(config.ci).toBeDefined();
      expect(config.ci.platform).toBe('github');
    });

    it('should have integration settings disabled by default', () => {
      expect(config.ci.integration.enabled).toBe(false);
      expect(config.ci.integration.webhooks).toBe(false);
      expect(config.ci.integration.statusChecks).toBe(false);
      expect(config.ci.integration.artifactUpload).toBe(false);
    });

    it('should have appropriate trigger settings', () => {
      expect(config.ci.triggers.onPush).toBe(true);
      expect(config.ci.triggers.onPullRequest).toBe(true);
      expect(config.ci.triggers.onSchedule).toBe(false);
      expect(config.ci.triggers.scheduleExpression).toBe('0 2 * * *'); // Daily at 2 AM
    });
  });

  describe('Performance Configuration', () => {
    it('should have regression detection enabled', () => {
      expect(config.performance.regression_detection.enabled).toBe(true);
      expect(config.performance.regression_detection.threshold_bundle_size).toBe(10);
      expect(config.performance.regression_detection.threshold_build_time).toBe(25);
      expect(config.performance.regression_detection.baseline_builds).toBe(5);
      expect(config.performance.regression_detection.alert_on_regression).toBe(true);
    });

    it('should have benchmarking disabled by default', () => {
      expect(config.performance.benchmarking.enabled).toBe(false);
      expect(config.performance.benchmarking.platforms).toEqual(['android', 'ios']);
      expect(config.performance.benchmarking.environments).toEqual(['development', 'production']);
      expect(config.performance.benchmarking.warmup_builds).toBe(2);
      expect(config.performance.benchmarking.measurement_builds).toBe(5);
    });

    it('should have reasonable threshold values', () => {
      const { regression_detection } = config.performance;
      
      // Bundle size threshold should be reasonable (10%)
      expect(regression_detection.threshold_bundle_size).toBeGreaterThan(0);
      expect(regression_detection.threshold_bundle_size).toBeLessThan(50);
      
      // Build time threshold should be reasonable (25%)
      expect(regression_detection.threshold_build_time).toBeGreaterThan(0);
      expect(regression_detection.threshold_build_time).toBeLessThan(100);
      
      // Baseline builds should be adequate
      expect(regression_detection.baseline_builds).toBeGreaterThanOrEqual(3);
      expect(regression_detection.baseline_builds).toBeLessThanOrEqual(10);
    });
  });

  describe('Optimization Configuration', () => {
    it('should have automatic optimizations enabled', () => {
      expect(config.optimization.automatic.enabled).toBe(true);
      expect(config.optimization.automatic.tree_shaking).toBe(true);
      expect(config.optimization.automatic.dead_code_elimination).toBe(true);
      expect(config.optimization.automatic.bundle_splitting).toBe(false);
      expect(config.optimization.automatic.cache_optimization).toBe(true);
    });

    it('should have analysis features enabled', () => {
      expect(config.optimization.analysis.bundle_analyzer).toBe(true);
      expect(config.optimization.analysis.dependency_analysis).toBe(true);
      expect(config.optimization.analysis.performance_profiling).toBe(true);
      expect(config.optimization.analysis.size_tracking).toBe(true);
    });

    it('should have conservative defaults for experimental features', () => {
      // Bundle splitting is experimental and should be disabled by default
      expect(config.optimization.automatic.bundle_splitting).toBe(false);
    });
  });

  describe('Artifacts Configuration', () => {
    it('should have reasonable retention settings', () => {
      expect(config.artifacts.retention.days).toBe(30);
      expect(config.artifacts.retention.max_artifacts).toBe(100);
      
      // Values should be reasonable
      expect(config.artifacts.retention.days).toBeGreaterThan(0);
      expect(config.artifacts.retention.days).toBeLessThanOrEqual(365);
      expect(config.artifacts.retention.max_artifacts).toBeGreaterThan(0);
    });

    it('should have storage configuration', () => {
      expect(config.artifacts.storage.local).toBe(true);
      expect(config.artifacts.storage.cloud).toBe(false);
      // Provider should be undefined when cloud is false
      expect(config.artifacts.storage.provider).toBeUndefined();
    });

    it('should have all report types enabled', () => {
      expect(config.artifacts.reports.bundle_analysis).toBe(true);
      expect(config.artifacts.reports.performance_metrics).toBe(true);
      expect(config.artifacts.reports.optimization_suggestions).toBe(true);
      expect(config.artifacts.reports.comparison_reports).toBe(true);
    });
  });

  describe('Notifications Configuration', () => {
    it('should have empty notifications configuration', () => {
      expect(config.notifications).toBeDefined();
      expect(typeof config.notifications).toBe('object');
      expect(config.notifications.slack).toBeUndefined();
      expect(config.notifications.email).toBeUndefined();
      expect(config.notifications.github).toBeUndefined();
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent platform support across configurations', () => {
      const expectedPlatforms = ['android', 'ios'];
      expect(config.performance.benchmarking.platforms).toEqual(expectedPlatforms);
    });

    it('should have consistent environment support', () => {
      const expectedEnvironments = ['development', 'production'];
      expect(config.performance.benchmarking.environments).toEqual(expectedEnvironments);
    });

    it('should have performance settings that make sense together', () => {
      const { regression_detection, benchmarking } = config.performance;
      
      // If benchmarking is enabled, it should have enough builds to be meaningful
      if (benchmarking.enabled) {
        expect(benchmarking.measurement_builds).toBeGreaterThan(1);
        expect(benchmarking.warmup_builds).toBeGreaterThan(0);
      }
      
      // Regression detection should have meaningful baselines
      expect(regression_detection.baseline_builds).toBeGreaterThan(1);
    });

    it('should have artifact retention that matches typical usage patterns', () => {
      // 30 days should be reasonable for most teams
      expect(config.artifacts.retention.days).toBeGreaterThanOrEqual(7);
      expect(config.artifacts.retention.days).toBeLessThanOrEqual(90);
      
      // 100 artifacts should handle most scenarios without excessive storage
      expect(config.artifacts.retention.max_artifacts).toBeGreaterThanOrEqual(50);
      expect(config.artifacts.retention.max_artifacts).toBeLessThanOrEqual(1000);
    });
  });

  describe('Configuration Validation', () => {
    it('should return a new object on each call', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // But same content
    });

    it('should be deeply immutable from external changes', () => {
      const originalConfig = getDefaultConfig();
      const testConfig = getDefaultConfig();
      
      // Try to modify the config
      testConfig.enabled = false;
      testConfig.ci.platform = 'gitlab';
      testConfig.performance.regression_detection.enabled = false;
      
      // Original should remain unchanged
      const freshConfig = getDefaultConfig();
      expect(freshConfig.enabled).toBe(originalConfig.enabled);
      expect(freshConfig.ci.platform).toBe(originalConfig.ci.platform);
      expect(freshConfig.performance.regression_detection.enabled).toBe(originalConfig.performance.regression_detection.enabled);
    });

    it('should have all required properties', () => {
      const requiredTopLevelKeys = [
        'enabled',
        'ci',
        'performance', 
        'optimization',
        'artifacts',
        'notifications'
      ];

      requiredTopLevelKeys.forEach(key => {
        expect(config).toHaveProperty(key);
      });
    });

    it('should have valid cron expression for scheduled builds', () => {
      const cronExpression = config.ci.triggers.scheduleExpression;
      
      // Basic validation of cron format (5 parts: minute hour day month weekday)
      const parts = cronExpression.split(' ');
      expect(parts).toHaveLength(5);
      
      // Should be a valid time (2 AM daily)
      expect(parts[0]).toBe('0'); // minute
      expect(parts[1]).toBe('2'); // hour
      expect(parts[2]).toBe('*'); // day
      expect(parts[3]).toBe('*'); // month
      expect(parts[4]).toBe('*'); // weekday
    });

    it('should have sensible timeout and retry values', () => {
      // While not directly in config, the values should be reasonable for the types of operations
      // This ensures the config structure supports reasonable operational parameters
      expect(config.performance.benchmarking.warmup_builds).toBeLessThan(10);
      expect(config.performance.benchmarking.measurement_builds).toBeLessThan(20);
      expect(config.performance.regression_detection.baseline_builds).toBeLessThan(20);
    });
  });
});