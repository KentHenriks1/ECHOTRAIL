/**
 * Robust Error Handler for Metro Build Pipeline
 * 
 * This module provides comprehensive error handling capabilities including
 * graceful degradation, intelligent retry mechanisms, and recovery strategies.
 */

import { Logger } from '../utils/Logger';
import {
  PipelineError,
  ErrorAggregator,
  ErrorRecoveryStrategy,
  ErrorUtils,
  FileSystemError,
  NetworkError,
  PlatformBuildError,
  DependencyError,
  PipelineErrorContext
} from './errors';
import { BuildContext, StepResult } from './types';

// Export type aliases for test compatibility  
export type ErrorHandlerConfig = ErrorHandlingConfig;
export type RetryStrategy = {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
};
export type RecoveryStrategy = {
  fallbackConfig: any;
  skipNonCritical: boolean;
  gracefulDegradation: boolean;
  enableRetry: boolean;
};

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  /** Enable graceful degradation */
  enableGracefulDegradation: boolean;
  /** Enable automatic recovery attempts */
  enableAutoRecovery: boolean;
  /** Maximum retry attempts across all operations */
  maxGlobalRetries: number;
  /** Global retry delay multiplier */
  retryDelayMultiplier: number;
  /** Timeout for recovery operations */
  recoveryTimeoutMs: number;
  /** Whether to continue pipeline on non-critical errors */
  continueOnNonCritical: boolean;
  /** Error reporting configuration */
  reporting: {
    /** Log all errors */
    logErrors: boolean;
    /** Log error summaries */
    logSummaries: boolean;
    /** Save error reports to file */
    saveToFile: boolean;
    /** Report path */
    reportPath: string;
  };
}

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_HANDLING_CONFIG: ErrorHandlingConfig = {
  enableGracefulDegradation: true,
  enableAutoRecovery: true,
  maxGlobalRetries: 3,
  retryDelayMultiplier: 1.5,
  recoveryTimeoutMs: 30000,
  continueOnNonCritical: true,
  reporting: {
    logErrors: true,
    logSummaries: true,
    saveToFile: true,
    reportPath: './error-reports'
  }
};

/**
 * Error handling statistics
 */
export interface ErrorHandlingStats {
  totalErrors: number;
  recoveredErrors: number;
  retriedOperations: number;
  gracefulDegradations: number;
  criticalFailures: number;
  averageRecoveryTime: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
}

/**
 * Comprehensive Error Handler for Metro Build Pipeline
 */
export class PipelineErrorHandler {
  private config: ErrorHandlingConfig;
  private errorAggregator: ErrorAggregator;
  private stats: ErrorHandlingStats;
  private logger: Logger;
  
  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_HANDLING_CONFIG, ...config };
    this.errorAggregator = new ErrorAggregator();
    this.logger = new Logger('PipelineErrorHandler');
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      retriedOperations: 0,
      gracefulDegradations: 0,
      criticalFailures: 0,
      averageRecoveryTime: 0,
      errorsByType: {},
      errorsBySeverity: {}
    };
  }

  /**
   * Handle an error with comprehensive recovery strategies
   */
  async handleError(
    error: unknown,
    context: Partial<PipelineErrorContext> = {},
    operation?: () => Promise<any>
  ): Promise<{ recovered: boolean; result?: any; finalError?: PipelineError }> {
    const pipelineError = ErrorUtils.fromUnknown(error, context);
    this.errorAggregator.add(pipelineError);
    this.updateStats(pipelineError);

    if (this.config.reporting.logErrors) {
      this.logger.error(
        `Error occurred: ${pipelineError.getDetailedMessage()}`,
        pipelineError.toJSON()
      );
    }

    // Attempt recovery if enabled and error is recoverable
    if (this.config.enableAutoRecovery && pipelineError.context.recoverable) {
      const recoveryStartTime = Date.now();
      
      try {
        const recovered = await this.attemptRecovery(pipelineError, operation);
        const recoveryTime = Date.now() - recoveryStartTime;
        
        if (recovered.success) {
          this.stats.recoveredErrors++;
          this.updateAverageRecoveryTime(recoveryTime);
          
          this.logger.info(
            `Successfully recovered from error: ${pipelineError.constructor.name}`,
            { recoveryTimeMs: recoveryTime }
          );
          
          return { recovered: true, result: recovered.result };
        }
      } catch (recoveryError) {
        this.logger.error(
          'Recovery attempt failed',
          { originalError: pipelineError.toJSON(), recoveryError }
        );
      }
    }

    // Check if error should cause pipeline to fail
    if (pipelineError.context.severity === 'critical' || !this.config.continueOnNonCritical) {
      this.stats.criticalFailures++;
      return { recovered: false, finalError: pipelineError };
    }

    // Attempt graceful degradation
    if (this.config.enableGracefulDegradation) {
      const degradationResult = await this.attemptGracefulDegradation(pipelineError, context);
      if (degradationResult.success) {
        this.stats.gracefulDegradations++;
        this.logger.warn(
          `Applied graceful degradation for error: ${pipelineError.constructor.name}`,
          { degradationStrategy: degradationResult.strategy }
        );
        return { recovered: true, result: degradationResult.result };
      }
    }

    return { recovered: false, finalError: pipelineError };
  }

  /**
   * Execute operation with comprehensive error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<PipelineErrorContext> = {},
    maxRetries?: number
  ): Promise<T> {
    return this.handleWithRetry(operation, context, maxRetries);
  }

  /**
   * Handle operation with retry logic (alias for executeWithRetry)
   */
  async handleWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<PipelineErrorContext> = {},
    maxRetries?: number
  ): Promise<T> {
    const effectiveMaxRetries = maxRetries ?? this.config.maxGlobalRetries;
    let lastError: PipelineError | undefined;

    for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const pipelineError = ErrorUtils.fromUnknown(error, {
          ...context,
          data: { attempt, maxRetries: effectiveMaxRetries }
        });

        lastError = pipelineError;

        // Don't retry if it's the last attempt or error is not retryable
        if (attempt >= effectiveMaxRetries || !ErrorUtils.isRetryable(pipelineError, attempt)) {
          break;
        }

        this.stats.retriedOperations++;
        const delay = ErrorUtils.getRetryDelay(pipelineError, attempt) * this.config.retryDelayMultiplier;

        this.logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${effectiveMaxRetries + 1})`,
          { error: pipelineError.message, delay }
        );

        await this.sleep(delay);
      }
    }

    // If we get here, all retries failed
    const result = await this.handleError(lastError!, context, operation);
    if (result.recovered && result.result !== undefined) {
      return result.result;
    }

    throw result.finalError || lastError!;
  }

  /**
   * Handle build step execution with error recovery
   */
  async executeStepWithErrorHandling(
    stepName: string,
    stepExecutor: () => Promise<StepResult>,
    context: BuildContext
  ): Promise<StepResult> {
    try {
      return await this.executeWithRetry(
        stepExecutor,
        {
          buildId: context.buildId,
          platform: context.environment.platform,
          data: { stepName }
        }
      );
    } catch (error) {
      const pipelineError = ErrorUtils.fromUnknown(error, {
        buildId: context.buildId,
        platform: context.environment.platform
      });

      // Create failed step result with recovery suggestions
      return {
        success: false,
        duration: 0,
        output: '',
        error: pipelineError.getDetailedMessage(),
        artifacts: {},
        metrics: {
          errorType: pipelineError.constructor.name,
          errorId: pipelineError.context.id,
          recoverySuggestions: pipelineError.context.recoverySuggestions,
          recoverable: pipelineError.context.recoverable
        }
      };
    }
  }

  /**
   * Handle pipeline-wide errors with graceful degradation
   */
  async handlePipelineError(
    error: unknown,
    buildId: string,
    platform?: string,
    environment?: string
  ): Promise<{ canContinue: boolean; degradedMode: boolean }> {
    const pipelineError = ErrorUtils.fromUnknown(error, {
      buildId,
      platform,
      environment
    });

    const result = await this.handleError(pipelineError);

    // Determine if pipeline can continue
    const canContinue = result.recovered || 
      (pipelineError.context.severity !== 'critical' && this.config.continueOnNonCritical);

    return {
      canContinue,
      degradedMode: result.recovered && this.stats.gracefulDegradations > 0
    };
  }

  /**
   * Generate comprehensive error report
   */
  async generateErrorReport(): Promise<void> {
    const errors = this.errorAggregator.getAllErrors();
    const summary = ErrorUtils.createErrorSummary([...errors]);

    const report = {
      timestamp: Date.now(),
      summary,
      statistics: this.stats,
      configuration: this.config,
      errors: errors.map(error => error.toJSON()),
      recommendations: this.generateRecommendations()
    };

    if (this.config.reporting.logSummaries) {
      this.logger.info('Error Handling Summary', {
        totalErrors: this.stats.totalErrors,
        recoveredErrors: this.stats.recoveredErrors,
        criticalFailures: this.stats.criticalFailures,
        recoveryRate: this.stats.totalErrors > 0 ? (this.stats.recoveredErrors / this.stats.totalErrors) * 100 : 0
      });
    }

    if (this.config.reporting.saveToFile) {
      try {
        const fs = await import('fs/promises');
        await fs.mkdir(this.config.reporting.reportPath, { recursive: true });
        
        const reportPath = `${this.config.reporting.reportPath}/error-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.logger.info(`Error report saved: ${reportPath}`);
      } catch (fileError) {
        this.logger.error('Failed to save error report', { error: fileError });
      }
    }
  }

  /**
   * Get current error statistics
   */
  getStatistics(): ErrorHandlingStats {
    return { ...this.stats };
  }

  /**
   * Clear error history and statistics
   */
  reset(): void {
    this.errorAggregator.clear();
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      retriedOperations: 0,
      gracefulDegradations: 0,
      criticalFailures: 0,
      averageRecoveryTime: 0,
      errorsByType: {},
      errorsBySeverity: {}
    };
  }

  // Private methods

  private async attemptRecovery(
    error: PipelineError,
    operation?: () => Promise<any>
  ): Promise<{ success: boolean; result?: any }> {
    try {
      const recoverySuccess = await Promise.race([
        ErrorRecoveryStrategy.attemptRecovery(error),
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Recovery timeout')), this.config.recoveryTimeoutMs);
        })
      ]);

      if (recoverySuccess && operation) {
        // If recovery succeeded and we have the original operation, try it again
        try {
          const result = await operation();
          return { success: true, result };
        } catch (retryError) {
          // Recovery succeeded but operation still fails - partial recovery
          return { success: false };
        }
      }

      return { success: recoverySuccess };
    } catch (recoveryError) {
      return { success: false };
    }
  }

  private async attemptGracefulDegradation(
    error: PipelineError,
    _context: Partial<PipelineErrorContext>
  ): Promise<{ success: boolean; strategy?: string; result?: any }> {
    // Implement graceful degradation strategies based on error type
    
    if (error instanceof NetworkError) {
      // For network errors, continue without remote operations
      return {
        success: true,
        strategy: 'offline_mode',
        result: { mode: 'offline', message: 'Continuing without network operations' }
      };
    }

    if (error instanceof FileSystemError) {
      // For file system errors, try using temporary directory
      return {
        success: true,
        strategy: 'temp_directory',
        result: { tempPath: '/tmp/pipeline-fallback' }
      };
    }

    if (error instanceof PlatformBuildError) {
      // For platform-specific errors, skip that platform but continue with others
      return {
        success: true,
        strategy: 'skip_platform',
        result: { skippedPlatform: error.targetPlatform }
      };
    }

    if (error instanceof DependencyError) {
      // For dependency errors, continue with available dependencies
      return {
        success: true,
        strategy: 'skip_dependency',
        result: { skippedDependency: error.dependency }
      };
    }

    return { success: false };
  }

  private updateStats(error: PipelineError): void {
    this.stats.totalErrors++;
    
    // Update error type statistics
    const errorType = error.constructor.name;
    this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
    
    // Update severity statistics
    const severity = error.context.severity;
    this.stats.errorsBySeverity[severity] = (this.stats.errorsBySeverity[severity] || 0) + 1;
  }

  private updateAverageRecoveryTime(recoveryTime: number): void {
    const currentAvg = this.stats.averageRecoveryTime;
    const recoveredCount = this.stats.recoveredErrors;
    
    // Calculate new average: (old_avg * (n-1) + new_value) / n
    this.stats.averageRecoveryTime = (currentAvg * (recoveredCount - 1) + recoveryTime) / recoveredCount;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // General recommendations based on error patterns
    if (this.stats.errorsByType['NetworkError'] > 2) {
      recommendations.push('Consider implementing offline-first functionality due to frequent network issues');
    }
    
    if (this.stats.errorsByType['FileSystemError'] > 3) {
      recommendations.push('Review file system operations for potential optimization');
    }
    
    if (this.stats.errorsByType['TimeoutError'] > 2) {
      recommendations.push('Consider increasing timeout values or optimizing slow operations');
    }
    
    if (this.stats.criticalFailures > this.stats.recoveredErrors) {
      recommendations.push('Review error handling strategies - more errors could be made recoverable');
    }
    
    if (this.stats.retriedOperations > this.stats.totalErrors * 0.5) {
      recommendations.push('High retry rate detected - investigate root causes to reduce retries');
    }
    
    return recommendations;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}