/**
 * AI Performance Monitoring Service for EchoTrail
 * Comprehensive monitoring, analytics, and optimization for AI operations
 * Created by: Kent Rune Henriksen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../../core/utils';
import { AIConfig } from '../../config/ai';

export interface AIOperationMetrics {
  operationId: string;
  type: 'story_generation' | 'tts_generation' | 'cache_operation';
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata: {
    model?: string;
    tokens?: number;
    audioLength?: number;
    cacheHit?: boolean;
    location?: string;
    language?: string;
    retryCount?: number;
    cost?: number;
  };
  timestamp: string;
}

export interface PerformanceAnalytics {
  totalOperations: number;
  successRate: number;
  averageResponseTime: number;
  tokenUsage: {
    total: number;
    average: number;
    costEstimate: number;
  };
  cacheEfficiency: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
  };
  errorAnalysis: {
    mostCommonErrors: Array<{ error: string; count: number }>;
    errorRate: number;
  };
  dailyUsage: Array<{
    date: string;
    operations: number;
    tokens: number;
    cost: number;
  }>;
  modelPerformance: Record<string, {
    avgResponseTime: number;
    successRate: number;
    totalOperations: number;
  }>;
}

export interface PerformanceAlerts {
  slowOperations: AIOperationMetrics[];
  highErrorRate: boolean;
  unusualTokenUsage: boolean;
  cachePerformanceIssues: boolean;
  costThresholdExceeded: boolean;
}

export class AIPerformanceService {
  private readonly logger: Logger;
  private readonly metricsKey = '@echotrail_ai_metrics';
  private readonly alertsKey = '@echotrail_ai_alerts';
  // private readonly configKey = '@echotrail_ai_perf_config'; // For future config storage
  
  // Performance thresholds
  private readonly thresholds = {
    slowOperationMs: 10000, // 10 seconds
    errorRateThreshold: 0.1, // 10%
    maxDailyCost: 5.0, // $5 per day
    maxTokensPerHour: 50000,
    cacheHitRateThreshold: 0.6, // 60%
  };

  constructor() {
    this.logger = new Logger('AIPerformanceService');
  }

  /**
   * Start tracking an AI operation
   */
  startOperation(type: AIOperationMetrics['type'], metadata: Partial<AIOperationMetrics['metadata']> = {}): string {
    const operationId = this.generateOperationId();
    const metric: AIOperationMetrics = {
      operationId,
      type,
      startTime: Date.now(),
      success: false,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.logger.debug('Started AI operation', { operationId, type, metadata });
    
    // Store in-memory for completion
    this.storeInProgressOperation(operationId, metric);
    
    return operationId;
  }

  /**
   * Complete tracking an AI operation
   */
  async completeOperation(
    operationId: string, 
    success: boolean, 
    additionalMetadata: Partial<AIOperationMetrics['metadata']> = {},
    error?: string
  ): Promise<void> {
    try {
      const inProgressMetric = await this.getInProgressOperation(operationId);
      if (!inProgressMetric) {
        this.logger.warn('Completed operation not found in progress', { operationId });
        return;
      }

      const endTime = Date.now();
      const completedMetric: AIOperationMetrics = {
        ...inProgressMetric,
        endTime,
        duration: endTime - inProgressMetric.startTime,
        success,
        error,
        metadata: {
          ...inProgressMetric.metadata,
          ...additionalMetadata
        }
      };

      // Save completed metric
      await this.saveMetric(completedMetric);

      // Remove from in-progress
      await this.removeInProgressOperation(operationId);

      // Check for performance alerts
      await this.checkPerformanceAlerts(completedMetric);

      this.logger.debug('Completed AI operation', {
        operationId,
        success,
        duration: completedMetric.duration,
        type: completedMetric.type
      });

    } catch (error) {
      this.logger.error('Failed to complete operation tracking', { error, operationId });
    }
  }

  /**
   * Track AI operation with metrics (simplified interface)
   * Compatible with existing code patterns
   */
  async trackAIOperation(metrics: {
    operationType: 'story_generation' | 'tts_generation' | 'cache_operation';
    startTime: number;
    endTime: number;
    success: boolean;
    cached?: boolean;
    error?: string;
    location?: string;
    [key: string]: any;
  }): Promise<void> {
    try {
      const duration = metrics.endTime - metrics.startTime;
      
      const operationMetric: AIOperationMetrics = {
        operationId: this.generateOperationId(),
        type: metrics.operationType,
        startTime: metrics.startTime,
        endTime: metrics.endTime,
        duration,
        success: metrics.success,
        error: metrics.error,
        metadata: {
          cacheHit: metrics.cached,
          location: metrics.location,
          ...metrics
        },
        timestamp: new Date().toISOString()
      };

      await this.saveMetric(operationMetric);
      await this.checkPerformanceAlerts(operationMetric);

      this.logger.debug('Tracked AI operation', {
        operationId: operationMetric.operationId,
        type: operationMetric.type,
        duration,
        success: metrics.success
      });

    } catch (error) {
      this.logger.error('Failed to track AI operation', { error, metrics });
    }
  }

  /**
   * Get comprehensive performance analytics
   */
  async getPerformanceAnalytics(days: number = 7): Promise<PerformanceAnalytics> {
    try {
      const metrics = await this.getMetrics(days);
      
      if (metrics.length === 0) {
        return this.getEmptyAnalytics();
      }

      const successfulOps = metrics.filter(m => m.success);
      const failedOps = metrics.filter(m => !m.success);

      // Calculate basic stats
      const totalOperations = metrics.length;
      const successRate = successfulOps.length / totalOperations;
      const averageResponseTime = successfulOps.reduce((sum, m) => sum + (m.duration || 0), 0) / successfulOps.length;

      // Token usage analysis
      const tokenMetrics = metrics.filter(m => m.metadata.tokens);
      const totalTokens = tokenMetrics.reduce((sum, m) => sum + (m.metadata.tokens || 0), 0);
      const averageTokens = totalTokens / tokenMetrics.length || 0;
      const costEstimate = this.estimateCost(totalTokens, tokenMetrics);

      // Cache efficiency
      const cacheOps = metrics.filter(m => m.type === 'cache_operation' || m.metadata.cacheHit !== undefined);
      const cacheHits = cacheOps.filter(m => m.metadata.cacheHit).length;
      const cacheMisses = cacheOps.length - cacheHits;

      // Error analysis
      const errorCounts = new Map<string, number>();
      failedOps.forEach(op => {
        if (op.error) {
          const count = errorCounts.get(op.error) || 0;
          errorCounts.set(op.error, count + 1);
        }
      });

      const mostCommonErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily usage
      const dailyUsage = this.calculateDailyUsage(metrics);

      // Model performance
      const modelPerformance = this.calculateModelPerformance(metrics);

      return {
        totalOperations,
        successRate,
        averageResponseTime,
        tokenUsage: {
          total: totalTokens,
          average: averageTokens,
          costEstimate
        },
        cacheEfficiency: {
          hitRate: cacheOps.length > 0 ? cacheHits / cacheOps.length : 0,
          missRate: cacheOps.length > 0 ? cacheMisses / cacheOps.length : 0,
          totalRequests: cacheOps.length
        },
        errorAnalysis: {
          mostCommonErrors,
          errorRate: failedOps.length / totalOperations
        },
        dailyUsage,
        modelPerformance
      };

    } catch (error) {
      this.logger.error('Failed to get performance analytics', { error });
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get current performance alerts
   */
  async getPerformanceAlerts(): Promise<PerformanceAlerts> {
    try {
      const alertsData = await AsyncStorage.getItem(this.alertsKey);
      if (alertsData) {
        return JSON.parse(alertsData);
      }

      return {
        slowOperations: [],
        highErrorRate: false,
        unusualTokenUsage: false,
        cachePerformanceIssues: false,
        costThresholdExceeded: false
      };

    } catch (error) {
      this.logger.error('Failed to get performance alerts', { error });
      return {
        slowOperations: [],
        highErrorRate: false,
        unusualTokenUsage: false,
        cachePerformanceIssues: false,
        costThresholdExceeded: false
      };
    }
  }

  /**
   * Optimize AI operations based on performance data
   */
  async getOptimizationRecommendations(): Promise<{
    caching: string[];
    prompts: string[];
    models: string[];
    costs: string[];
  }> {
    try {
      const analytics = await this.getPerformanceAnalytics();
      const recommendations = {
        caching: [] as string[],
        prompts: [] as string[],
        models: [] as string[],
        costs: [] as string[]
      };

      // Cache optimization
      if (analytics.cacheEfficiency.hitRate < this.thresholds.cacheHitRateThreshold) {
        recommendations.caching.push(
          `Cache hit rate er ${(analytics.cacheEfficiency.hitRate * 100).toFixed(1)}%. Vurder å øke cache størrelse eller TTL.`
        );
      }

      // Response time optimization
      if (analytics.averageResponseTime > this.thresholds.slowOperationMs * 0.5) {
        recommendations.models.push(
          `Gjennomsnittlig responstid er ${(analytics.averageResponseTime / 1000).toFixed(1)}s. Vurder å bruke raskere modeller for enkle operasjoner.`
        );
      }

      // Token usage optimization
      if (analytics.tokenUsage.average > 1000) {
        recommendations.prompts.push(
          `Gjennomsnittlig token-bruk er høy (${Math.round(analytics.tokenUsage.average)} tokens). Optimaliser prompts for kortere responser.`
        );
      }

      // Cost optimization
      if (analytics.tokenUsage.costEstimate > this.thresholds.maxDailyCost) {
        recommendations.costs.push(
          `Daglig kostnadsestimat er ${analytics.tokenUsage.costEstimate.toFixed(2)} USD. Vurder aggressive caching og prompt-optimalisering.`
        );
      }

      // Error rate optimization
      if (analytics.errorAnalysis.errorRate > this.thresholds.errorRateThreshold) {
        recommendations.models.push(
          `Feilrate er ${(analytics.errorAnalysis.errorRate * 100).toFixed(1)}%. Implementer bedre retry-logikk og feilhåndtering.`
        );
      }

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to get optimization recommendations', { error });
      return { caching: [], prompts: [], models: [], costs: [] };
    }
  }

  /**
   * Export performance data for external analysis
   */
  async exportPerformanceData(): Promise<{
    metrics: AIOperationMetrics[];
    analytics: PerformanceAnalytics;
    alerts: PerformanceAlerts;
  }> {
    try {
      const [metrics, analytics, alerts] = await Promise.all([
        this.getMetrics(30), // Last 30 days
        this.getPerformanceAnalytics(30),
        this.getPerformanceAlerts()
      ]);

      return { metrics, analytics, alerts };
    } catch (error) {
      this.logger.error('Failed to export performance data', { error });
      return {
        metrics: [],
        analytics: this.getEmptyAnalytics(),
        alerts: {
          slowOperations: [],
          highErrorRate: false,
          unusualTokenUsage: false,
          cachePerformanceIssues: false,
          costThresholdExceeded: false
        }
      };
    }
  }

  /**
   * Clear performance data
   */
  async clearPerformanceData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.metricsKey),
        AsyncStorage.removeItem(this.alertsKey)
      ]);
      
      this.logger.info('Performance data cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear performance data', { error });
      throw error;
    }
  }

  /**
   * Private methods
   */

  private generateOperationId(): string {
    return `ai_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeInProgressOperation(operationId: string, metric: AIOperationMetrics): Promise<void> {
    // For simplicity, we'll store in AsyncStorage with a temporary key
    const tempKey = `${this.metricsKey}_progress_${operationId}`;
    await AsyncStorage.setItem(tempKey, JSON.stringify(metric));
  }

  private async getInProgressOperation(operationId: string): Promise<AIOperationMetrics | null> {
    try {
      const tempKey = `${this.metricsKey}_progress_${operationId}`;
      const data = await AsyncStorage.getItem(tempKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async removeInProgressOperation(operationId: string): Promise<void> {
    const tempKey = `${this.metricsKey}_progress_${operationId}`;
    await AsyncStorage.removeItem(tempKey);
  }

  private async saveMetric(metric: AIOperationMetrics): Promise<void> {
    const existingData = await AsyncStorage.getItem(this.metricsKey);
    const metrics: AIOperationMetrics[] = existingData ? JSON.parse(existingData) : [];
    
    metrics.push(metric);
    
    // Keep only last 1000 metrics to manage storage
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
    
    await AsyncStorage.setItem(this.metricsKey, JSON.stringify(metrics));
  }

  private async getMetrics(days: number): Promise<AIOperationMetrics[]> {
    try {
      const data = await AsyncStorage.getItem(this.metricsKey);
      if (!data) return [];

      const allMetrics: AIOperationMetrics[] = JSON.parse(data);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return allMetrics.filter(metric => 
        new Date(metric.timestamp) >= cutoffDate
      );
    } catch {
      return [];
    }
  }

  private async checkPerformanceAlerts(metric: AIOperationMetrics): Promise<void> {
    const alerts = await this.getPerformanceAlerts();
    let alertsUpdated = false;

    // Check for slow operations
    if (metric.duration && metric.duration > this.thresholds.slowOperationMs) {
      alerts.slowOperations.push(metric);
      alerts.slowOperations = alerts.slowOperations.slice(-10); // Keep last 10
      alertsUpdated = true;
    }

    // Additional alert checks could be added here

    if (alertsUpdated) {
      await AsyncStorage.setItem(this.alertsKey, JSON.stringify(alerts));
    }
  }

  private estimateCost(_totalTokens: number, metrics: AIOperationMetrics[]): number {
    let totalCost = 0;

    metrics.forEach(metric => {
      if (metric.metadata.model && metric.metadata.tokens) {
        const modelCosts = AIConfig.costs[metric.metadata.model as keyof typeof AIConfig.costs];
        if (modelCosts && 'input' in modelCosts) {
          // Simplified cost calculation
          totalCost += (metric.metadata.tokens / 1000) * modelCosts.input;
        }
      }
    });

    return totalCost;
  }

  private calculateDailyUsage(metrics: AIOperationMetrics[]): PerformanceAnalytics['dailyUsage'] {
    const dailyMap = new Map<string, { operations: number; tokens: number; cost: number }>();

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { operations: 0, tokens: 0, cost: 0 };
      
      existing.operations++;
      if (metric.metadata.tokens) {
        existing.tokens += metric.metadata.tokens;
      }
      if (metric.metadata.cost) {
        existing.cost += metric.metadata.cost;
      }
      
      dailyMap.set(date, existing);
    });

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));
  }

  private calculateModelPerformance(metrics: AIOperationMetrics[]): PerformanceAnalytics['modelPerformance'] {
    const modelMap = new Map<string, { durations: number[]; successes: number; total: number }>();

    metrics.forEach(metric => {
      if (metric.metadata.model) {
        const existing = modelMap.get(metric.metadata.model) || {
          durations: [],
          successes: 0,
          total: 0
        };
        
        existing.total++;
        if (metric.success) existing.successes++;
        if (metric.duration) existing.durations.push(metric.duration);
        
        modelMap.set(metric.metadata.model, existing);
      }
    });

    const result: Record<string, {
      avgResponseTime: number;
      successRate: number;
      totalOperations: number;
    }> = {};

    modelMap.forEach((data, model) => {
      result[model] = {
        avgResponseTime: data.durations.length > 0 
          ? data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length 
          : 0,
        successRate: data.successes / data.total,
        totalOperations: data.total
      };
    });

    return result;
  }

  private getEmptyAnalytics(): PerformanceAnalytics {
    return {
      totalOperations: 0,
      successRate: 0,
      averageResponseTime: 0,
      tokenUsage: {
        total: 0,
        average: 0,
        costEstimate: 0
      },
      cacheEfficiency: {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0
      },
      errorAnalysis: {
        mostCommonErrors: [],
        errorRate: 0
      },
      dailyUsage: [],
      modelPerformance: {}
    };
  }
}

// Export singleton instance
export const aiPerformanceService = new AIPerformanceService();
export default aiPerformanceService;