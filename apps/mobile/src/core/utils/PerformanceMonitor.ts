/**
 * Enterprise Performance Monitor for EchoTrail
 * Comprehensive performance tracking and optimization system
 */

import { Logger } from "./Logger";

export interface PerformanceMetric {
  readonly id: string;
  readonly name: string;
  readonly category:
    | "api"
    | "ui"
    | "database"
    | "navigation"
    | "memory"
    | "custom";
  readonly value: number;
  readonly unit: "ms" | "bytes" | "count" | "percent" | "custom";
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
  readonly threshold?: number;
  readonly isAlert: boolean;
}

export interface PerformanceReport {
  readonly sessionId: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly metrics: PerformanceMetric[];
  readonly summary: {
    readonly totalApiCalls: number;
    readonly averageApiTime: number;
    readonly slowApiCalls: number;
    readonly memoryUsage: number;
    readonly memoryLeaks: number;
    readonly uiLagEvents: number;
    readonly crashEvents: number;
  };
  readonly alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  readonly id: string;
  readonly type: "slow_api" | "memory_leak" | "ui_lag" | "crash" | "custom";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly message: string;
  readonly metric: PerformanceMetric;
  readonly timestamp: number;
}

export interface PerformanceConfig {
  readonly enableMonitoring: boolean;
  readonly sampleRate: number;
  readonly enableMemoryTracking: boolean;
  readonly enableNetworkTracking: boolean;
  readonly enableRenderTracking: boolean;
  readonly enableNavigationTracking: boolean;
  readonly enableCustomMetrics: boolean;
  readonly thresholds: {
    readonly apiCallSlowThreshold: number;
    readonly memoryUsageThreshold: number;
    readonly uiRenderThreshold: number;
    readonly navigationThreshold: number;
  };
  readonly reportingInterval: number;
  readonly maxMetrics: number;
  readonly enableAlerts: boolean;
}

// Default performance configuration
const DEFAULT_PERF_CONFIG: PerformanceConfig = {
  enableMonitoring: true,
  sampleRate: __DEV__ ? 1.0 : 0.1,
  enableMemoryTracking: true,
  enableNetworkTracking: true,
  enableRenderTracking: true,
  enableNavigationTracking: true,
  enableCustomMetrics: true,
  thresholds: {
    apiCallSlowThreshold: 3000, // 3 seconds
    memoryUsageThreshold: 150 * 1024 * 1024, // 150MB
    uiRenderThreshold: 16.67, // 60fps target
    navigationThreshold: 1000, // 1 second
  },
  reportingInterval: 60000, // 1 minute
  maxMetrics: 1000,
  enableAlerts: true,
};

/**
 * Enterprise Performance Monitor Class
 */
export class PerformanceMonitor {
  private static config: PerformanceConfig = DEFAULT_PERF_CONFIG;
  private static logger = new Logger("PerformanceMonitor");
  private static metrics: PerformanceMetric[] = [];
  private static alerts: PerformanceAlert[] = [];
  private static sessionId: string = PerformanceMonitor.generateSessionId();
  private static timers = new Map<string, number>();
  private static intervalId?: number;

  /**
   * Configure performance monitor
   */
  static configure(config: Partial<PerformanceConfig>): void {
    PerformanceMonitor.config = { ...DEFAULT_PERF_CONFIG, ...config };

    if (PerformanceMonitor.config.enableMonitoring) {
      PerformanceMonitor.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  static startMonitoring(): void {
    if (PerformanceMonitor.intervalId) {
      clearInterval(PerformanceMonitor.intervalId);
    }

    PerformanceMonitor.intervalId = setInterval(() => {
      PerformanceMonitor.collectSystemMetrics();
    }, PerformanceMonitor.config.reportingInterval) as unknown as number;

    PerformanceMonitor.logger.info("Performance monitoring started");
  }

  /**
   * Stop performance monitoring
   */
  static stopMonitoring(): void {
    if (PerformanceMonitor.intervalId) {
      clearInterval(PerformanceMonitor.intervalId);
      PerformanceMonitor.intervalId = undefined;
    }

    PerformanceMonitor.logger.info("Performance monitoring stopped");
  }

  /**
   * Track API call performance
   */
  static trackApiCall(
    url: string,
    method: string,
    duration: number,
    status: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!PerformanceMonitor.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: `api_${method}_${PerformanceMonitor.sanitizeUrl(url)}`,
      category: "api",
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        url,
        method,
        status,
        ...metadata,
      },
      threshold: PerformanceMonitor.config.thresholds.apiCallSlowThreshold,
      isAlert:
        duration > PerformanceMonitor.config.thresholds.apiCallSlowThreshold,
    };

    PerformanceMonitor.addMetric(metric);

    if (metric.isAlert) {
      PerformanceMonitor.createAlert(
        "slow_api",
        "medium",
        `Slow API call: ${method} ${url} took ${duration}ms`,
        metric
      );
    }
  }

  /**
   * Track database operation performance
   */
  static trackDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    recordCount?: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!PerformanceMonitor.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: `db_${operation}_${table}`,
      category: "database",
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        operation,
        table,
        recordCount,
        ...metadata,
      },
      threshold: 1000, // 1 second threshold for DB operations
      isAlert: duration > 1000,
    };

    PerformanceMonitor.addMetric(metric);
  }

  /**
   * Track UI render performance
   */
  static trackRender(
    componentName: string,
    renderDuration: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!PerformanceMonitor.config.enableRenderTracking) return;
    if (!PerformanceMonitor.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: `render_${componentName}`,
      category: "ui",
      value: renderDuration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        componentName,
        ...metadata,
      },
      threshold: PerformanceMonitor.config.thresholds.uiRenderThreshold,
      isAlert:
        renderDuration > PerformanceMonitor.config.thresholds.uiRenderThreshold,
    };

    PerformanceMonitor.addMetric(metric);

    if (metric.isAlert) {
      PerformanceMonitor.createAlert(
        "ui_lag",
        "low",
        `Slow render: ${componentName} took ${renderDuration}ms`,
        metric
      );
    }
  }

  /**
   * Track navigation performance
   */
  static trackNavigation(
    from: string,
    to: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!PerformanceMonitor.config.enableNavigationTracking) return;
    if (!PerformanceMonitor.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: `navigation_${from}_to_${to}`,
      category: "navigation",
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata: {
        from,
        to,
        ...metadata,
      },
      threshold: PerformanceMonitor.config.thresholds.navigationThreshold,
      isAlert:
        duration > PerformanceMonitor.config.thresholds.navigationThreshold,
    };

    PerformanceMonitor.addMetric(metric);
  }

  /**
   * Track memory usage
   */
  static trackMemoryUsage(
    memoryUsed: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!PerformanceMonitor.config.enableMemoryTracking) return;

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: "memory_usage",
      category: "memory",
      value: memoryUsed,
      unit: "bytes",
      timestamp: Date.now(),
      metadata,
      threshold: PerformanceMonitor.config.thresholds.memoryUsageThreshold,
      isAlert:
        memoryUsed > PerformanceMonitor.config.thresholds.memoryUsageThreshold,
    };

    PerformanceMonitor.addMetric(metric);

    if (metric.isAlert) {
      PerformanceMonitor.createAlert(
        "memory_leak",
        "high",
        `High memory usage: ${Math.round(memoryUsed / 1024 / 1024)}MB`,
        metric
      );
    }
  }

  /**
   * Track custom metric
   */
  static trackCustomMetric(
    name: string,
    value: number,
    unit: PerformanceMetric["unit"] = "custom",
    threshold?: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!PerformanceMonitor.config.enableCustomMetrics) return;
    if (!PerformanceMonitor.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: `custom_${name}`,
      category: "custom",
      value,
      unit,
      timestamp: Date.now(),
      metadata,
      threshold,
      isAlert: threshold ? value > threshold : false,
    };

    PerformanceMonitor.addMetric(metric);
  }

  /**
   * Start timing operation
   */
  static startTimer(operationName: string): void {
    PerformanceMonitor.timers.set(operationName, performance.now());
  }

  /**
   * End timing operation and record metric
   */
  static endTimer(
    operationName: string,
    category: PerformanceMetric["category"] = "custom",
    metadata?: Record<string, unknown>
  ): number {
    const startTime = PerformanceMonitor.timers.get(operationName);
    if (!startTime) {
      PerformanceMonitor.logger.warn("Timer not found", { operationName });
      return 0;
    }

    const duration = performance.now() - startTime;
    PerformanceMonitor.timers.delete(operationName);

    const metric: PerformanceMetric = {
      id: PerformanceMonitor.generateMetricId(),
      name: operationName,
      category,
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      metadata,
      isAlert: false,
    };

    PerformanceMonitor.addMetric(metric);
    return duration;
  }

  /**
   * Measure async operation performance
   */
  static async measure<T>(
    operationName: string,
    operation: () => Promise<T>,
    category: PerformanceMetric["category"] = "custom",
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      const metric: PerformanceMetric = {
        id: PerformanceMonitor.generateMetricId(),
        name: operationName,
        category,
        value: duration,
        unit: "ms",
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          success: true,
        },
        isAlert: false,
      };

      PerformanceMonitor.addMetric(metric);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      const metric: PerformanceMetric = {
        id: PerformanceMonitor.generateMetricId(),
        name: operationName,
        category,
        value: duration,
        unit: "ms",
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          success: false,
          error: (error as Error).message,
        },
        isAlert: true,
      };

      PerformanceMonitor.addMetric(metric);
      throw error;
    }
  }

  /**
   * Collect system performance metrics
   */
  private static collectSystemMetrics(): void {
    try {
      // Collect memory metrics if available
      if (global.performance && "memory" in global.performance) {
        const memory = (global.performance as any).memory;
        PerformanceMonitor.trackMemoryUsage(memory.usedJSHeapSize);
      }

      // Additional system metrics would go here
      // This might include CPU usage, battery level, etc.
    } catch (error) {
      PerformanceMonitor.logger.warn("Failed to collect system metrics", {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Create performance alert
   */
  private static createAlert(
    type: PerformanceAlert["type"],
    severity: PerformanceAlert["severity"],
    message: string,
    metric: PerformanceMetric
  ): void {
    if (!PerformanceMonitor.config.enableAlerts) return;

    const alert: PerformanceAlert = {
      id: PerformanceMonitor.generateAlertId(),
      type,
      severity,
      message,
      metric,
      timestamp: Date.now(),
    };

    PerformanceMonitor.alerts.push(alert);

    // Trim alerts buffer
    if (PerformanceMonitor.alerts.length > 100) {
      PerformanceMonitor.alerts = PerformanceMonitor.alerts.slice(-100);
    }

    PerformanceMonitor.logger.warn("Performance alert", {
      type,
      severity,
      message,
      metricName: metric.name,
      metricValue: metric.value,
    });
  }

  /**
   * Add metric to buffer
   */
  private static addMetric(metric: PerformanceMetric): void {
    PerformanceMonitor.metrics.push(metric);

    // Trim metrics buffer
    if (
      PerformanceMonitor.metrics.length > PerformanceMonitor.config.maxMetrics
    ) {
      PerformanceMonitor.metrics = PerformanceMonitor.metrics.slice(
        -PerformanceMonitor.config.maxMetrics
      );
    }

    PerformanceMonitor.logger.debug("Performance metric recorded", {
      name: metric.name,
      category: metric.category,
      value: metric.value,
      unit: metric.unit,
      isAlert: metric.isAlert,
    });
  }

  /**
   * Check if we should sample this metric
   */
  private static shouldSample(): boolean {
    return Math.random() < PerformanceMonitor.config.sampleRate;
  }

  /**
   * Generate performance report
   */
  static generateReport(): PerformanceReport {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentMetrics = PerformanceMonitor.metrics.filter(
      (m) => m.timestamp > oneHourAgo
    );

    const apiMetrics = recentMetrics.filter((m) => m.category === "api");
    const slowApiCalls = apiMetrics.filter((m) => m.isAlert);

    const memoryMetrics = recentMetrics.filter((m) => m.category === "memory");
    const currentMemoryUsage =
      memoryMetrics.length > 0
        ? memoryMetrics[memoryMetrics.length - 1].value
        : 0;

    return {
      sessionId: PerformanceMonitor.sessionId,
      timestamp: new Date().toISOString(),
      duration: 60 * 60 * 1000, // 1 hour
      metrics: recentMetrics,
      summary: {
        totalApiCalls: apiMetrics.length,
        averageApiTime:
          apiMetrics.length > 0
            ? apiMetrics.reduce((sum, m) => sum + m.value, 0) /
              apiMetrics.length
            : 0,
        slowApiCalls: slowApiCalls.length,
        memoryUsage: currentMemoryUsage,
        memoryLeaks: memoryMetrics.filter((m) => m.isAlert).length,
        uiLagEvents: recentMetrics.filter(
          (m) => m.category === "ui" && m.isAlert
        ).length,
        crashEvents: 0, // Would be tracked by ErrorHandler
      },
      alerts: PerformanceMonitor.alerts.filter((a) => a.timestamp > oneHourAgo),
    };
  }

  /**
   * Utility methods
   */
  private static generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private static generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private static sanitizeUrl(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): PerformanceMetric[] {
    return [...PerformanceMonitor.metrics];
  }

  /**
   * Get filtered metrics
   */
  static getFilteredMetrics(
    category?: PerformanceMetric["category"],
    since?: Date
  ): PerformanceMetric[] {
    return PerformanceMonitor.metrics.filter((metric) => {
      if (category && metric.category !== category) return false;
      if (since && metric.timestamp < since.getTime()) return false;
      return true;
    });
  }

  /**
   * Get all alerts
   */
  static getAllAlerts(): PerformanceAlert[] {
    return [...PerformanceMonitor.alerts];
  }

  /**
   * Clear all metrics and alerts
   */
  static clear(): void {
    PerformanceMonitor.metrics = [];
    PerformanceMonitor.alerts = [];
    PerformanceMonitor.timers.clear();
    PerformanceMonitor.sessionId = PerformanceMonitor.generateSessionId();
  }

  /**
   * Export performance data as JSON
   */
  static exportData(): string {
    return JSON.stringify(
      {
        sessionId: PerformanceMonitor.sessionId,
        config: PerformanceMonitor.config,
        metrics: PerformanceMonitor.metrics,
        alerts: PerformanceMonitor.alerts,
        report: PerformanceMonitor.generateReport(),
      },
      null,
      2
    );
  }
}
