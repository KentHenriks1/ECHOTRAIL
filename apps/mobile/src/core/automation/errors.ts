/**
 * Structured Error Types for Metro Build Pipeline
 * 
 * This module defines a comprehensive error hierarchy with recovery strategies,
 * detailed error context, and standardized error handling patterns.
 */

/**
 * Base error interface for all pipeline errors
 */
export interface PipelineErrorContext {
  /** Unique error identifier */
  readonly id: string;
  /** Timestamp when error occurred */
  readonly timestamp: number;
  /** Build ID if error occurred during a build */
  readonly buildId?: string;
  /** Platform where error occurred */
  readonly platform?: string;
  /** Environment where error occurred */
  readonly environment?: string;
  /** Additional context data */
  readonly data?: Record<string, unknown>;
  /** Stack trace if available */
  readonly stack?: string;
  /** Recovery suggestions */
  readonly recoverySuggestions: string[];
  /** Whether error is recoverable */
  readonly recoverable: boolean;
  /** Error severity level */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether to retry automatically */
  readonly shouldRetry: boolean;
  /** Maximum retry attempts */
  readonly maxRetries: number;
  /** Delay between retries in milliseconds */
  readonly retryDelay: number;
}

// Export type aliases for test compatibility
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorContext = PipelineErrorContext;

// These aliases will be defined after the class declarations

/**
 * Base class for all Metro Build Pipeline errors
 */
export abstract class PipelineError extends Error {
  public readonly context: PipelineErrorContext;
  
  constructor(message: string, context: Partial<PipelineErrorContext> = {}) {
    super(message);
    this.name = this.constructor.name;
    
    // Generate unique error ID
    const errorId = `${this.constructor.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.context = {
      id: errorId,
      timestamp: Date.now(),
      recoverySuggestions: [],
      recoverable: false,
      severity: 'medium',
      shouldRetry: false,
      maxRetries: 0,
      retryDelay: 1000,
      ...context
    };
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
  
  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      context: this.context
    };
  }
  
  /**
   * Get formatted error message with context
   */
  getDetailedMessage(): string {
    const contextStr = this.context.buildId ? ` [Build: ${this.context.buildId}]` : '';
    const platformStr = this.context.platform ? ` [Platform: ${this.context.platform}]` : '';
    return `${this.message}${contextStr}${platformStr}`;
  }
}

/**
 * Configuration related errors
 */
export class ConfigurationError extends PipelineError {
  constructor(message: string, context: Partial<PipelineErrorContext> = {}) {
    super(message, {
      severity: 'high',
      recoverable: false,
      shouldRetry: false,
      recoverySuggestions: [
        'Check configuration file syntax',
        'Validate required configuration properties',
        'Review configuration documentation'
      ],
      ...context
    });
  }
}

/**
 * Build step execution errors
 */
export class BuildStepError extends PipelineError {
  public readonly stepName: string;
  
  constructor(message: string, stepName: string, context: Partial<PipelineErrorContext> = {}) {
    super(message, {
      severity: 'high',
      recoverable: true,
      shouldRetry: true,
      maxRetries: 3,
      retryDelay: 2000,
      recoverySuggestions: [
        'Check step configuration',
        'Verify required dependencies are installed',
        'Check file permissions and disk space',
        'Review step logs for more details'
      ],
      ...context
    });
    this.stepName = stepName;
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends PipelineError {
  public readonly filePath: string;
  public readonly operation: 'read' | 'write' | 'delete' | 'mkdir' | 'access';
  
  constructor(
    message: string, 
    filePath: string, 
    operation: FileSystemError['operation'],
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'medium',
      recoverable: true,
      shouldRetry: true,
      maxRetries: 2,
      retryDelay: 1000,
      recoverySuggestions: [
        'Check file/directory exists',
        'Verify read/write permissions',
        'Ensure sufficient disk space',
        'Check if file is locked by another process'
      ],
      data: { filePath, operation },
      ...context
    });
    this.filePath = filePath;
    this.operation = operation;
  }
}

/**
 * Network/remote operation errors
 */
export class NetworkError extends PipelineError {
  public readonly url?: string;
  public readonly statusCode?: number;
  
  constructor(
    message: string, 
    url?: string, 
    statusCode?: number,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'medium',
      recoverable: true,
      shouldRetry: true,
      maxRetries: 3,
      retryDelay: 5000,
      recoverySuggestions: [
        'Check network connectivity',
        'Verify URL/endpoint is correct',
        'Check API keys or authentication',
        'Try again after some time'
      ],
      data: { url, statusCode },
      ...context
    });
    this.url = url;
    this.statusCode = statusCode;
  }
}

/**
 * Platform-specific build errors
 */
export class PlatformBuildError extends PipelineError {
  public readonly targetPlatform: string;
  public readonly buildTool: string;
  
  constructor(
    message: string, 
    platform: string, 
    buildTool: string,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'high',
      recoverable: true,
      shouldRetry: false,
      recoverySuggestions: [
        `Check ${platform} SDK installation`,
        `Verify ${buildTool} configuration`,
        'Review platform-specific requirements',
        'Check simulator/device connectivity'
      ],
      data: { targetPlatform: platform, buildTool },
      platform,
      ...context
    });
    this.targetPlatform = platform;
    this.buildTool = buildTool;
  }
}

/**
 * Performance regression errors
 */
export class PerformanceRegressionError extends PipelineError {
  public readonly metric: string;
  public readonly regression: number;
  public readonly threshold: number;
  
  constructor(
    message: string, 
    metric: string, 
    regression: number, 
    threshold: number,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: regression > threshold * 2 ? 'critical' : 'high',
      recoverable: true,
      shouldRetry: false,
      recoverySuggestions: [
        'Analyze bundle composition changes',
        'Check for new heavy dependencies',
        'Review recent code changes',
        'Run bundle analyzer for insights'
      ],
      data: { metric, regression, threshold },
      ...context
    });
    this.metric = metric;
    this.regression = regression;
    this.threshold = threshold;
  }
}

/**
 * Dependency resolution errors
 */
export class DependencyError extends PipelineError {
  public readonly dependency: string;
  public readonly version?: string;
  
  constructor(
    message: string, 
    dependency: string, 
    version?: string,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'high',
      recoverable: true,
      shouldRetry: false,
      recoverySuggestions: [
        'Check package.json dependencies',
        'Run npm/yarn install',
        'Clear node_modules and reinstall',
        'Check for version conflicts'
      ],
      data: { dependency, version },
      ...context
    });
    this.dependency = dependency;
    this.version = version;
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends PipelineError {
  public readonly operation: string;
  public readonly timeoutMs: number;
  
  constructor(
    message: string, 
    operation: string, 
    timeoutMs: number,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'medium',
      recoverable: true,
      shouldRetry: true,
      maxRetries: 1,
      retryDelay: 0,
      recoverySuggestions: [
        'Increase timeout limit if appropriate',
        'Check system resources (CPU, memory)',
        'Verify operation is not stuck in infinite loop',
        'Consider optimizing the operation'
      ],
      data: { operation, timeoutMs },
      ...context
    });
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Resource constraint errors
 */
export class ResourceConstraintError extends PipelineError {
  public readonly resource: 'memory' | 'disk' | 'cpu' | 'network';
  public readonly limit: number;
  public readonly current: number;
  
  constructor(
    message: string, 
    resource: ResourceConstraintError['resource'],
    current: number, 
    limit: number,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'critical',
      recoverable: true,
      shouldRetry: false,
      recoverySuggestions: [
        `Free up ${resource} resources`,
        'Close unnecessary applications',
        'Consider running build on different machine',
        'Optimize build configuration to use fewer resources'
      ],
      data: { resource, current, limit },
      ...context
    });
    this.resource = resource;
    this.limit = limit;
    this.current = current;
  }
}

/**
 * CI/CD integration errors
 */
export class CIError extends PipelineError {
  public readonly ciPlatform: string;
  public readonly stage: string;
  
  constructor(
    message: string, 
    ciPlatform: string, 
    stage: string,
    context: Partial<PipelineErrorContext> = {}
  ) {
    super(message, {
      severity: 'medium',
      recoverable: true,
      shouldRetry: false,
      recoverySuggestions: [
        `Check ${ciPlatform} configuration`,
        'Verify CI environment variables',
        'Check CI worker permissions',
        'Review CI pipeline logs'
      ],
      data: { ciPlatform, stage },
      ...context
    });
    this.ciPlatform = ciPlatform;
    this.stage = stage;
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecoveryStrategy {
  /**
   * Attempt to recover from a recoverable error
   */
  static async attemptRecovery(error: PipelineError): Promise<boolean> {
    if (!error.context.recoverable) {
      return false;
    }
    
    try {
      // Implement specific recovery strategies based on error type
      if (error instanceof FileSystemError) {
        return await this.recoverFileSystemError(error);
      }
      
      if (error instanceof NetworkError) {
        return await this.recoverNetworkError(error);
      }
      
      if (error instanceof DependencyError) {
        return await this.recoverDependencyError(error);
      }
      
      if (error instanceof ResourceConstraintError) {
        return await this.recoverResourceConstraintError(error);
      }
      
      return false;
    } catch (recoveryError) {
      console.error('Error recovery failed:', recoveryError);
      return false;
    }
  }
  
  private static async recoverFileSystemError(_error: FileSystemError): Promise<boolean> {
    // Implement file system error recovery
    // e.g., create missing directories, retry file operations
    return false; // Placeholder
  }
  
  private static async recoverNetworkError(_error: NetworkError): Promise<boolean> {
    // Implement network error recovery
    // e.g., wait and retry, use fallback endpoints
    return false; // Placeholder
  }
  
  private static async recoverDependencyError(_error: DependencyError): Promise<boolean> {
    // Implement dependency error recovery
    // e.g., reinstall dependencies, use fallback versions
    return false; // Placeholder
  }
  
  private static async recoverResourceConstraintError(error: ResourceConstraintError): Promise<boolean> {
    // Implement resource constraint recovery
    // e.g., trigger garbage collection, free up resources
    if (error.resource === 'memory' && global.gc) {
      global.gc();
      return true;
    }
    return false;
  }
}

/**
 * Error aggregator for collecting multiple errors
 */
export class ErrorAggregator {
  private errors: PipelineError[] = [];
  
  add(error: PipelineError): void {
    this.errors.push(error);
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  hasRecoverableErrors(): boolean {
    return this.errors.some(error => error.context.recoverable);
  }
  
  getCriticalErrors(): PipelineError[] {
    return this.errors.filter(error => error.context.severity === 'critical');
  }
  
  getRecoverableErrors(): PipelineError[] {
    return this.errors.filter(error => error.context.recoverable);
  }
  
  getAllErrors(): readonly PipelineError[] {
    return [...this.errors];
  }
  
  clear(): void {
    this.errors = [];
  }
  
  toJSON(): Record<string, unknown> {
    return {
      count: this.errors.length,
      errors: this.errors.map(error => error.toJSON())
    };
  }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Create appropriate error from unknown error
   */
  static fromUnknown(error: unknown, context: Partial<PipelineErrorContext> = {}): PipelineError {
    if (error instanceof PipelineError) {
      return error;
    }
    
    if (error instanceof Error) {
      // Create a concrete implementation instead of abstract class
      return new BuildStepError(error.message, 'unknown_step', {
        ...context,
        stack: error.stack
      });
    }
    
    if (typeof error === 'string') {
      return new BuildStepError(error, 'unknown_step', context);
    }
    
    return new BuildStepError('Unknown error occurred', 'unknown_step', {
      ...context,
      data: { originalError: error }
    });
  }
  
  /**
   * Check if error is retryable based on its properties
   */
  static isRetryable(error: PipelineError, currentAttempt: number): boolean {
    return (
      error.context.shouldRetry && 
      currentAttempt < error.context.maxRetries &&
      error.context.recoverable
    );
  }
  
  /**
   * Get retry delay for an error
   */
  static getRetryDelay(error: PipelineError, attempt: number): number {
    // Exponential backoff: base delay * (2^attempt)
    return error.context.retryDelay * Math.pow(2, attempt);
  }
  
  /**
   * Create error summary for reporting
   */
  static createErrorSummary(errors: PipelineError[]): Record<string, unknown> {
    return {
      total: errors.length,
      critical: errors.filter(e => e.context.severity === 'critical').length,
      high: errors.filter(e => e.context.severity === 'high').length,
      medium: errors.filter(e => e.context.severity === 'medium').length,
      low: errors.filter(e => e.context.severity === 'low').length,
      recoverable: errors.filter(e => e.context.recoverable).length,
      retryable: errors.filter(e => e.context.shouldRetry).length,
      types: [...new Set(errors.map(e => e.constructor.name))]
    };
  }
}

// Export aliases for backward compatibility (defined after class declarations)
export const BuildError = BuildStepError;
export const ConfigError = ConfigurationError;
