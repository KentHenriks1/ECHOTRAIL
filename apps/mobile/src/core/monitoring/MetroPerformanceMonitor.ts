/**
 * Advanced Metro Performance Monitor for EchoTrail
 * 
 * Enterprise-grade monitoring system for Metro bundler performance:
 * - Real-time build performance tracking
 * - Bundle size monitoring with alerts
 * - Cache effectiveness analysis
 * - Memory usage monitoring
 * - Performance regression detection
 * - Automated alerting and notifications
 * - Historical performance data
 * - Performance bottleneck identification
 * - CI/CD integration support
 */

import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger';
// os and performance imports reserved for future system monitoring implementation

interface BuildMetrics {
  buildId: string;
  timestamp: number;
  duration: number;
  bundleSize: number;
  sourceMapSize?: number;
  assetCount: number;
  moduleCount: number;
  cacheHitRate: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  platform: string;
  environment: 'development' | 'production';
  errors: string[];
  warnings: string[];
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'build_time' | 'bundle_size' | 'memory_usage' | 'cache_performance' | 'error_rate';
  message: string;
  value: number;
  threshold: number;
  buildId?: string;
  actionRequired: boolean;
  recommendations: string[];
}

interface MonitoringConfig {
  enabled: boolean;
  alerting: {
    enabled: boolean;
    thresholds: {
      buildTimeMs: number;
      bundleSizeMB: number;
      memoryUsageMB: number;
      cacheHitRatePercent: number;
      errorRatePercent: number;
    };
    notifications: {
      console: boolean;
      file: boolean;
      webhook?: string;
      email?: string;
    };
  };
  storage: {
    enabled: boolean;
    retentionDays: number;
    exportPath: string;
    aggregationInterval: number;
  };
  reporting: {
    enabled: boolean;
    intervalMs: number;
    includeTrends: boolean;
    includeRecommendations: boolean;
  };
}

interface PerformanceTrends {
  buildTime: {
    average: number;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  };
  bundleSize: {
    average: number;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  };
  cachePerformance: {
    average: number;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  };
  memoryUsage: {
    average: number;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  };
}

export class MetroPerformanceMonitor extends EventEmitter {
  private static instance: MetroPerformanceMonitor;
  private config: MonitoringConfig;
  private buildMetrics: Map<string, BuildMetrics>;
  private alerts: PerformanceAlert[];
  private isMonitoring: boolean;
  private startTime: number;
  private reportingInterval?: NodeJS.Timeout;
  private alertingEnabled: boolean;

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.buildMetrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.startTime = Date.now();
    this.alertingEnabled = false;
    
    this.setupEventListeners();
  }

  static getInstance(): MetroPerformanceMonitor {
    if (!MetroPerformanceMonitor.instance) {
      MetroPerformanceMonitor.instance = new MetroPerformanceMonitor();
    }
    return MetroPerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(config?: Partial<MonitoringConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      Logger.info('📊 Metro Performance Monitor disabled');
      return;
    }

    this.isMonitoring = true;
    this.alertingEnabled = this.config.alerting.enabled;

    // Load historical data
    await this.loadHistoricalData();

    // Setup reporting
    if (this.config.reporting.enabled) {
      this.startReporting();
    }

    // Setup storage
    if (this.config.storage.enabled) {
      await this.ensureStorageDirectory();
    }

    Logger.info('🚀 Metro Performance Monitor initialized');
    Logger.info(`📊 Monitoring: ${this.config.enabled ? 'Enabled' : 'Disabled'}`);
    Logger.info(`🚨 Alerting: ${this.config.alerting.enabled ? 'Enabled' : 'Disabled'}`);
    
    this.emit('monitor:initialized', this.config);
  }

  /**
   * Start monitoring a build
   */
  public startBuildMonitoring(buildId: string, platform: string, environment: 'development' | 'production'): void {
    if (!this.isMonitoring) return;

    const buildMetrics: BuildMetrics = {
      buildId,
      timestamp: Date.now(),
      duration: 0,
      bundleSize: 0,
      assetCount: 0,
      moduleCount: 0,
      cacheHitRate: 0,
      memoryUsage: this.getMemoryUsage(),
      platform,
      environment,
      errors: [],
      warnings: [],
    };

    this.buildMetrics.set(buildId, buildMetrics);
    this.emit('build:started', buildMetrics);
  }

  /**
   * End monitoring a build
   */
  public async endBuildMonitoring(
    buildId: string,
    bundleSize: number,
    additionalMetrics?: Partial<BuildMetrics>
  ): Promise<void> {
    if (!this.isMonitoring) return;

    const buildMetrics = this.buildMetrics.get(buildId);
    if (!buildMetrics) {
      Logger.warn(`⚠️ Build metrics not found for buildId: ${buildId}`);
      return;
    }

    // Update final metrics
    buildMetrics.duration = Date.now() - buildMetrics.timestamp;
    buildMetrics.bundleSize = bundleSize;
    buildMetrics.memoryUsage = this.getMemoryUsage();

    if (additionalMetrics) {
      Object.assign(buildMetrics, additionalMetrics);
    }

    // Store metrics
    await this.storeMetrics(buildMetrics);

    // Check for alerts
    if (this.alertingEnabled) {
      await this.checkAlerts(buildMetrics);
    }

    // Emit completion event
    this.emit('build:completed', buildMetrics);

    Logger.info(`📊 Build ${buildId} completed in ${buildMetrics.duration}ms (${(bundleSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  /**
   * Record build error
   */
  public recordError(buildId: string, error: string): void {
    const buildMetrics = this.buildMetrics.get(buildId);
    if (buildMetrics) {
      buildMetrics.errors.push(error);
    }
  }

  /**
   * Record build warning
   */
  public recordWarning(buildId: string, warning: string): void {
    const buildMetrics = this.buildMetrics.get(buildId);
    if (buildMetrics) {
      buildMetrics.warnings.push(warning);
    }
  }

  /**
   * Update cache hit rate
   */
  public updateCacheHitRate(buildId: string, hitRate: number): void {
    const buildMetrics = this.buildMetrics.get(buildId);
    if (buildMetrics) {
      buildMetrics.cacheHitRate = hitRate;
    }
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(days = 7): PerformanceTrends {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentMetrics = Array.from(this.buildMetrics.values())
      .filter(m => m.timestamp > cutoff);

    if (recentMetrics.length < 2) {
      return this.getEmptyTrends();
    }

    const midpoint = Math.floor(recentMetrics.length / 2);
    const earlier = recentMetrics.slice(0, midpoint);
    const later = recentMetrics.slice(midpoint);

    const earlierAvg = {
      buildTime: earlier.reduce((sum, m) => sum + m.duration, 0) / earlier.length,
      bundleSize: earlier.reduce((sum, m) => sum + m.bundleSize, 0) / earlier.length,
      cacheHitRate: earlier.reduce((sum, m) => sum + m.cacheHitRate, 0) / earlier.length,
      memoryUsage: earlier.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / earlier.length,
    };

    const laterAvg = {
      buildTime: later.reduce((sum, m) => sum + m.duration, 0) / later.length,
      bundleSize: later.reduce((sum, m) => sum + m.bundleSize, 0) / later.length,
      cacheHitRate: later.reduce((sum, m) => sum + m.cacheHitRate, 0) / later.length,
      memoryUsage: later.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / later.length,
    };

    return {
      buildTime: {
        average: laterAvg.buildTime,
        trend: this.calculateTrend(earlierAvg.buildTime, laterAvg.buildTime, true),
        change: ((laterAvg.buildTime - earlierAvg.buildTime) / earlierAvg.buildTime) * 100,
      },
      bundleSize: {
        average: laterAvg.bundleSize,
        trend: this.calculateTrend(earlierAvg.bundleSize, laterAvg.bundleSize, true),
        change: ((laterAvg.bundleSize - earlierAvg.bundleSize) / earlierAvg.bundleSize) * 100,
      },
      cachePerformance: {
        average: laterAvg.cacheHitRate,
        trend: this.calculateTrend(earlierAvg.cacheHitRate, laterAvg.cacheHitRate),
        change: ((laterAvg.cacheHitRate - earlierAvg.cacheHitRate) / earlierAvg.cacheHitRate) * 100,
      },
      memoryUsage: {
        average: laterAvg.memoryUsage,
        trend: this.calculateTrend(earlierAvg.memoryUsage, laterAvg.memoryUsage, true),
        change: ((laterAvg.memoryUsage - earlierAvg.memoryUsage) / earlierAvg.memoryUsage) * 100,
      },
    };
  }

  /**
   * Generate performance report
   */
  public async generatePerformanceReport(): Promise<string> {
    const trends = this.getPerformanceTrends();
    const recentAlerts = this.alerts.filter(a => a.timestamp > Date.now() - 24 * 60 * 60 * 1000);
    const totalBuilds = this.buildMetrics.size;
    const avgBuildTime = Array.from(this.buildMetrics.values())
      .reduce((sum, m) => sum + m.duration, 0) / totalBuilds;

    const report = `# Metro Performance Report

**Generated:** ${new Date().toLocaleString()}
**Monitoring Period:** ${Math.round((Date.now() - this.startTime) / (24 * 60 * 60 * 1000))} days
**Total Builds:** ${totalBuilds}
**Average Build Time:** ${Math.round(avgBuildTime)}ms

## Performance Trends

### Build Time
- **Average:** ${Math.round(trends.buildTime.average)}ms
- **Trend:** ${trends.buildTime.trend} (${trends.buildTime.change > 0 ? '+' : ''}${trends.buildTime.change.toFixed(1)}%)

### Bundle Size
- **Average:** ${(trends.bundleSize.average / 1024 / 1024).toFixed(2)}MB
- **Trend:** ${trends.bundleSize.trend} (${trends.bundleSize.change > 0 ? '+' : ''}${trends.bundleSize.change.toFixed(1)}%)

### Cache Performance
- **Hit Rate:** ${trends.cachePerformance.average.toFixed(1)}%
- **Trend:** ${trends.cachePerformance.trend} (${trends.cachePerformance.change > 0 ? '+' : ''}${trends.cachePerformance.change.toFixed(1)}%)

### Memory Usage
- **Average:** ${(trends.memoryUsage.average / 1024 / 1024).toFixed(1)}MB
- **Trend:** ${trends.memoryUsage.trend} (${trends.memoryUsage.change > 0 ? '+' : ''}${trends.memoryUsage.change.toFixed(1)}%)

## Recent Alerts (Last 24h)

${recentAlerts.length === 0 ? 'No alerts in the last 24 hours.' : recentAlerts
  .map(alert => `### ${alert.severity.toUpperCase()}: ${alert.message}
- **Type:** ${alert.type}
- **Value:** ${alert.value}
- **Threshold:** ${alert.threshold}
- **Time:** ${new Date(alert.timestamp).toLocaleString()}
${alert.recommendations.length > 0 ? `- **Recommendations:** ${alert.recommendations.join(', ')}` : ''}
`).join('\n')}

## Recommendations

${this.generateRecommendations(trends)}

---
*Generated by EchoTrail Metro Performance Monitor*
`;

    return report;
  }

  /**
   * Export performance data
   */
  public async exportPerformanceData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = Array.from(this.buildMetrics.values());
    
    if (format === 'csv') {
      const headers = 'buildId,timestamp,duration,bundleSize,platform,environment,cacheHitRate,memoryUsed,errors,warnings';
      const rows = data.map(m => [
        m.buildId,
        new Date(m.timestamp).toISOString(),
        m.duration,
        m.bundleSize,
        m.platform,
        m.environment,
        m.cacheHitRate,
        m.memoryUsage.heapUsed,
        m.errors.length,
        m.warnings.length,
      ].join(','));
      
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      config: this.config,
      metrics: data,
      alerts: this.alerts,
      trends: this.getPerformanceTrends(),
    }, null, 2);
  }

  /**
   * Stop monitoring
   */
  public async stop(): Promise<void> {
    this.isMonitoring = false;
    this.alertingEnabled = false;

    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    // Save final data
    if (this.config.storage.enabled) {
      await this.saveHistoricalData();
    }

    Logger.info('📊 Metro Performance Monitor stopped');
    this.emit('monitor:stopped');
  }

  // Private methods

  private getDefaultConfig(): MonitoringConfig {
    return {
      enabled: true,
      alerting: {
        enabled: true,
        thresholds: {
          buildTimeMs: 120000, // 2 minutes
          bundleSizeMB: 10,
          memoryUsageMB: 1024, // 1GB
          cacheHitRatePercent: 70,
          errorRatePercent: 10,
        },
        notifications: {
          console: true,
          file: true,
        },
      },
      storage: {
        enabled: true,
        retentionDays: 30,
        exportPath: './metro-performance-data',
        aggregationInterval: 60000, // 1 minute
      },
      reporting: {
        enabled: true,
        intervalMs: 300000, // 5 minutes
        includeTrends: true,
        includeRecommendations: true,
      },
    };
  }

  private setupEventListeners(): void {
    this.on('build:completed', this.onBuildCompleted.bind(this));
    this.on('alert:created', this.onAlertCreated.bind(this));
  }

  private async onBuildCompleted(_metrics: BuildMetrics): Promise<void> {
    // metrics parameter reserved for detailed build completion analysis
    // Clean up old metrics
    if (this.buildMetrics.size > 1000) {
      const oldestKey = Array.from(this.buildMetrics.keys())[0];
      this.buildMetrics.delete(oldestKey);
    }
  }

  private async onAlertCreated(alert: PerformanceAlert): Promise<void> {
    if (this.config.alerting.notifications.console) {
      Logger.warn(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
    }

    if (this.config.alerting.notifications.file) {
      await this.saveAlertToFile(alert);
    }

    // Clean up old alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-250);
    }
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }

  private async storeMetrics(metrics: BuildMetrics): Promise<void> {
    if (!this.config.storage.enabled) return;

    try {
      const fileName = `metrics-${new Date().toISOString().split('T')[0]}.jsonl`;
      const filePath = path.join(this.config.storage.exportPath, fileName);
      
      const line = `${JSON.stringify(metrics)  }\n`;
      await fs.appendFile(filePath, line);
    } catch (error) {
      Logger.error('Failed to store metrics:', error);
    }
  }

  private async checkAlerts(metrics: BuildMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Build time alert
    if (metrics.duration > this.config.alerting.thresholds.buildTimeMs) {
      alerts.push({
        id: `build-time-${metrics.buildId}`,
        timestamp: Date.now(),
        severity: metrics.duration > this.config.alerting.thresholds.buildTimeMs * 2 ? 'critical' : 'high',
        type: 'build_time',
        message: `Build time exceeded threshold: ${Math.round(metrics.duration / 1000)}s`,
        value: metrics.duration,
        threshold: this.config.alerting.thresholds.buildTimeMs,
        buildId: metrics.buildId,
        actionRequired: true,
        recommendations: [
          'Check for large modules that can be code-split',
          'Verify cache is working properly',
          'Consider optimizing dependencies',
        ],
      });
    }

    // Bundle size alert
    const bundleSizeMB = metrics.bundleSize / 1024 / 1024;
    if (bundleSizeMB > this.config.alerting.thresholds.bundleSizeMB) {
      alerts.push({
        id: `bundle-size-${metrics.buildId}`,
        timestamp: Date.now(),
        severity: bundleSizeMB > this.config.alerting.thresholds.bundleSizeMB * 2 ? 'critical' : 'high',
        type: 'bundle_size',
        message: `Bundle size exceeded threshold: ${bundleSizeMB.toFixed(2)}MB`,
        value: bundleSizeMB,
        threshold: this.config.alerting.thresholds.bundleSizeMB,
        buildId: metrics.buildId,
        actionRequired: true,
        recommendations: [
          'Enable tree shaking optimizations',
          'Implement code splitting',
          'Analyze and remove unused dependencies',
        ],
      });
    }

    // Memory usage alert
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.config.alerting.thresholds.memoryUsageMB) {
      alerts.push({
        id: `memory-${metrics.buildId}`,
        timestamp: Date.now(),
        severity: memoryUsageMB > this.config.alerting.thresholds.memoryUsageMB * 1.5 ? 'critical' : 'medium',
        type: 'memory_usage',
        message: `Memory usage exceeded threshold: ${memoryUsageMB.toFixed(1)}MB`,
        value: memoryUsageMB,
        threshold: this.config.alerting.thresholds.memoryUsageMB,
        buildId: metrics.buildId,
        actionRequired: memoryUsageMB > this.config.alerting.thresholds.memoryUsageMB * 1.5,
        recommendations: [
          'Check for memory leaks in transformers',
          'Consider reducing parallel processing',
          'Optimize large file processing',
        ],
      });
    }

    // Cache performance alert
    if (metrics.cacheHitRate < this.config.alerting.thresholds.cacheHitRatePercent) {
      alerts.push({
        id: `cache-${metrics.buildId}`,
        timestamp: Date.now(),
        severity: metrics.cacheHitRate < this.config.alerting.thresholds.cacheHitRatePercent / 2 ? 'high' : 'medium',
        type: 'cache_performance',
        message: `Cache hit rate below threshold: ${metrics.cacheHitRate.toFixed(1)}%`,
        value: metrics.cacheHitRate,
        threshold: this.config.alerting.thresholds.cacheHitRatePercent,
        buildId: metrics.buildId,
        actionRequired: false,
        recommendations: [
          'Verify cache configuration',
          'Check cache storage permissions',
          'Consider cache warming strategies',
        ],
      });
    }

    // Store and emit alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.emit('alert:created', alert);
    }
  }

  private startReporting(): void {
    this.reportingInterval = setInterval(async () => {
      if (this.buildMetrics.size === 0) return;

      const report = await this.generatePerformanceReport();
      Logger.info('📊 Metro Performance Update:');
      Logger.info(report.split('\n').slice(0, 10).join('\n')); // First 10 lines
      
      this.emit('report:generated', report);
    }, this.config.reporting.intervalMs);
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.exportPath, { recursive: true });
    } catch (error) {
      Logger.error('Failed to create storage directory:', error);
    }
  }

  private async loadHistoricalData(): Promise<void> {
    if (!this.config.storage.enabled) return;

    try {
      const files = await fs.readdir(this.config.storage.exportPath);
      const metricsFiles = files.filter(f => f.startsWith('metrics-') && f.endsWith('.jsonl'));
      
      for (const file of metricsFiles.slice(-7)) { // Load last 7 days
        const filePath = path.join(this.config.storage.exportPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            const metrics: BuildMetrics = JSON.parse(line);
            this.buildMetrics.set(metrics.buildId, metrics);
          }
        }
      }

      Logger.info(`📊 Loaded ${this.buildMetrics.size} historical build metrics`);
    } catch (error) {
      Logger.warn('Could not load historical data:', error);
    }
  }

  private async saveHistoricalData(): Promise<void> {
    if (!this.config.storage.enabled || this.buildMetrics.size === 0) return;

    try {
      const exportData = await this.exportPerformanceData('json');
      const fileName = `performance-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(this.config.storage.exportPath, fileName);
      
      await fs.writeFile(filePath, exportData);
      Logger.info(`📊 Performance data exported to ${fileName}`);
    } catch (error) {
      Logger.error('Failed to save historical data:', error);
    }
  }

  private async saveAlertToFile(alert: PerformanceAlert): Promise<void> {
    try {
      const fileName = `alerts-${new Date().toISOString().split('T')[0]}.jsonl`;
      const filePath = path.join(this.config.storage.exportPath, fileName);
      
      const line = `${JSON.stringify(alert)  }\n`;
      await fs.appendFile(filePath, line);
    } catch (error) {
      Logger.error('Failed to save alert:', error);
    }
  }

  private calculateTrend(earlier: number, later: number, lowerIsBetter = false): 'improving' | 'degrading' | 'stable' {
    const change = Math.abs((later - earlier) / earlier) * 100;
    
    if (change < 5) return 'stable';
    
    const isImproving = lowerIsBetter ? later < earlier : later > earlier;
    return isImproving ? 'improving' : 'degrading';
  }

  private getEmptyTrends(): PerformanceTrends {
    return {
      buildTime: { average: 0, trend: 'stable', change: 0 },
      bundleSize: { average: 0, trend: 'stable', change: 0 },
      cachePerformance: { average: 0, trend: 'stable', change: 0 },
      memoryUsage: { average: 0, trend: 'stable', change: 0 },
    };
  }

  private generateRecommendations(trends: PerformanceTrends): string {
    const recommendations = [];

    if (trends.buildTime.trend === 'degrading') {
      recommendations.push('🔄 Build times are increasing - consider optimizing transformers and enabling more aggressive caching');
    }

    if (trends.bundleSize.trend === 'degrading') {
      recommendations.push('📦 Bundle size is growing - implement tree shaking, code splitting, and dependency optimization');
    }

    if (trends.cachePerformance.trend === 'degrading') {
      recommendations.push('🗃️ Cache performance is declining - check cache configuration and storage');
    }

    if (trends.memoryUsage.trend === 'degrading') {
      recommendations.push('💾 Memory usage is increasing - investigate potential memory leaks and optimize transformers');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance metrics look stable - consider proactive optimizations for future growth');
    }

    return recommendations.map(rec => `- ${rec}`).join('\n');
  }
}

export default MetroPerformanceMonitor;