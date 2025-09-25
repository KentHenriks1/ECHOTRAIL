/**
 * Enterprise Error Handler for EchoTrail
 * Comprehensive error handling, reporting, and recovery system
 */

import React from "react";
import { Logger } from "./Logger";

export type ErrorCategory =
  | "network"
  | "database"
  | "authentication"
  | "validation"
  | "permission"
  | "ui"
  | "performance"
  | "unknown";

export interface ErrorReport {
  readonly id: string;
  readonly timestamp: string;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly stack?: string;
  readonly metadata: Record<string, unknown>;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly device: {
    readonly platform: string;
    readonly version: string;
    readonly model?: string;
  };
  readonly app: {
    readonly version: string;
    readonly buildNumber: string;
    readonly environment: string;
  };
  readonly context: {
    readonly screen?: string;
    readonly action?: string;
    readonly additionalData?: Record<string, unknown>;
  };
}

export interface ErrorConfig {
  readonly enableGlobalHandler: boolean;
  readonly enableFallbackUI: boolean;
  readonly enableErrorReporting: boolean;
  readonly enableUserFeedback: boolean;
  readonly excludedErrors: string[];
  readonly maxErrorLogs: number;
  readonly reportingEndpoint?: string;
  readonly enableStackTrace: boolean;
  readonly enableAutoRetry: boolean;
  readonly maxRetryAttempts: number;
}

export interface ErrorRecoveryStrategy {
  readonly canRecover: boolean;
  readonly action: "retry" | "fallback" | "redirect" | "reload" | "none";
  readonly message?: string;
  readonly fallbackComponent?: React.ComponentType;
  readonly fallbackData?: unknown;
}

// Default error configuration
const DEFAULT_ERROR_CONFIG: ErrorConfig = {
  enableGlobalHandler: true,
  enableFallbackUI: true,
  enableErrorReporting: !__DEV__,
  enableUserFeedback: true,
  excludedErrors: ["Network request failed", "AbortError", "TimeoutError"],
  maxErrorLogs: 100,
  reportingEndpoint: process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT,
  enableStackTrace: true,
  enableAutoRetry: false,
  maxRetryAttempts: 3,
};

/**
 * Enterprise Error Handler Class
 * Provides comprehensive error handling and reporting
 */
export class ErrorHandler {
  private static config: ErrorConfig = DEFAULT_ERROR_CONFIG;
  private static logger = new Logger("ErrorHandler");
  private static errorBuffer: ErrorReport[] = [];
  private static retryAttempts = new Map<string, number>();

  /**
   * Configure global error handler
   */
  static configure(config: Partial<ErrorConfig>): void {
    ErrorHandler.config = { ...DEFAULT_ERROR_CONFIG, ...config };

    if (ErrorHandler.config.enableGlobalHandler) {
      ErrorHandler.setupGlobalHandlers();
    }
  }

  /**
   * Handle an error with full context
   */
  static async handleError(
    error: Error,
    category: ErrorCategory = "unknown",
    context?: Record<string, unknown>
  ): Promise<ErrorRecoveryStrategy> {
    const errorReport = ErrorHandler.createErrorReport(
      error,
      category,
      context
    );

    // Add to error buffer
    ErrorHandler.addToBuffer(errorReport);

    // Log the error
    ErrorHandler.logger.error(
      "Error handled",
      {
        category,
        message: error.message,
        context,
      },
      error
    );

    // Report to external service if enabled
    if (ErrorHandler.config.enableErrorReporting) {
      await ErrorHandler.reportError(errorReport);
    }

    // Determine recovery strategy
    const strategy = ErrorHandler.determineRecoveryStrategy(error, category);

    // Execute recovery if possible
    if (strategy.canRecover && ErrorHandler.config.enableAutoRetry) {
      await ErrorHandler.executeRecovery(error, strategy);
    }

    return strategy;
  }

  /**
   * Handle network errors specifically
   */
  static async handleNetworkError(
    error: Error,
    request: {
      url: string;
      method: string;
      headers?: Record<string, string>;
    },
    context?: Record<string, unknown>
  ): Promise<ErrorRecoveryStrategy> {
    const networkContext = {
      ...context,
      url: request.url,
      method: request.method,
      timestamp: Date.now(),
    };

    return ErrorHandler.handleError(error, "network", networkContext);
  }

  /**
   * Handle database errors specifically
   */
  static async handleDatabaseError(
    error: Error,
    operation: string,
    context?: Record<string, unknown>
  ): Promise<ErrorRecoveryStrategy> {
    const dbContext = {
      ...context,
      operation,
      timestamp: Date.now(),
    };

    return ErrorHandler.handleError(error, "database", dbContext);
  }

  /**
   * Handle authentication errors
   */
  static async handleAuthError(
    error: Error,
    authContext: {
      action: "login" | "logout" | "refresh" | "register";
      userId?: string;
    },
    context?: Record<string, unknown>
  ): Promise<ErrorRecoveryStrategy> {
    const authFullContext = {
      ...context,
      ...authContext,
      timestamp: Date.now(),
    };

    return ErrorHandler.handleError(error, "authentication", authFullContext);
  }

  /**
   * Create structured error report
   */
  private static createErrorReport(
    error: Error,
    category: ErrorCategory,
    context?: Record<string, unknown>
  ): ErrorReport {
    return {
      id: ErrorHandler.generateErrorId(),
      timestamp: new Date().toISOString(),
      category,
      message: error.message,
      stack: ErrorHandler.config.enableStackTrace ? error.stack : undefined,
      metadata: {
        name: error.name,
        cause: (error as any).cause,
        ...ErrorHandler.sanitizeMetadata(context),
      },
      userId: ErrorHandler.getCurrentUserId(),
      sessionId: ErrorHandler.getCurrentSessionId(),
      device: {
        platform: ErrorHandler.getPlatform(),
        version: ErrorHandler.getPlatformVersion(),
        model: ErrorHandler.getDeviceModel(),
      },
      app: {
        version: process.env.EXPO_PUBLIC_APP_VERSION || "2.0.0",
        buildNumber: process.env.EXPO_PUBLIC_BUILD_NUMBER || "1",
        environment: __DEV__ ? "development" : "production",
      },
      context: {
        screen: ErrorHandler.getCurrentScreen(),
        action: ErrorHandler.getCurrentAction(),
        additionalData: context,
      },
    };
  }

  /**
   * Determine appropriate recovery strategy
   */
  private static determineRecoveryStrategy(
    error: Error,
    category: ErrorCategory
  ): ErrorRecoveryStrategy {
    // Network errors - retry strategy
    if (category === "network") {
      return {
        canRecover: true,
        action: "retry",
        message: "Network error occurred. Retrying...",
      };
    }

    // Authentication errors - redirect to login
    if (category === "authentication") {
      return {
        canRecover: true,
        action: "redirect",
        message: "Authentication expired. Please log in again.",
      };
    }

    // Database errors - fallback to cache
    if (category === "database") {
      return {
        canRecover: true,
        action: "fallback",
        message: "Loading from cache...",
      };
    }

    // Validation errors - show user message
    if (category === "validation") {
      return {
        canRecover: false,
        action: "none",
        message: error.message,
      };
    }

    // Default strategy - fallback UI
    return {
      canRecover: true,
      action: "fallback",
      message: "Something went wrong. Please try again.",
    };
  }

  /**
   * Execute recovery strategy
   */
  private static async executeRecovery(
    error: Error,
    strategy: ErrorRecoveryStrategy
  ): Promise<void> {
    const errorKey = `${error.name}_${error.message}`;
    const attempts = ErrorHandler.retryAttempts.get(errorKey) || 0;

    if (attempts >= ErrorHandler.config.maxRetryAttempts) {
      ErrorHandler.logger.warn("Max retry attempts reached", {
        errorKey,
        attempts,
      });
      return;
    }

    ErrorHandler.retryAttempts.set(errorKey, attempts + 1);

    switch (strategy.action) {
      case "retry":
        // Implement retry logic based on context
        await ErrorHandler.executeRetry(error);
        break;
      case "fallback":
        // Load fallback data or show fallback UI
        ErrorHandler.executeFallback(error);
        break;
      case "redirect":
        // Navigate to appropriate screen
        ErrorHandler.executeRedirect(error);
        break;
      case "reload":
        // Reload current screen or app
        ErrorHandler.executeReload(error);
        break;
      default:
        // No recovery action
        break;
    }
  }

  /**
   * Execute retry logic
   */
  private static async executeRetry(_error: Error): Promise<void> {
    ErrorHandler.logger.info("Executing error recovery: retry");
    // Note: Actual retry logic would depend on the context
    // This would typically re-execute the failed operation
  }

  /**
   * Execute fallback logic
   */
  private static executeFallback(_error: Error): void {
    ErrorHandler.logger.info("Executing error recovery: fallback");
    // Note: This would show fallback UI or load cached data
  }

  /**
   * Execute redirect logic
   */
  private static executeRedirect(_error: Error): void {
    ErrorHandler.logger.info("Executing error recovery: redirect");
    // Note: This would navigate to appropriate screen
  }

  /**
   * Execute reload logic
   */
  private static executeReload(_error: Error): void {
    ErrorHandler.logger.info("Executing error recovery: reload");
    // Note: This would reload the current screen or restart app
  }

  /**
   * Report error to external service
   */
  private static async reportError(errorReport: ErrorReport): Promise<void> {
    if (!ErrorHandler.config.reportingEndpoint) return;

    try {
      await fetch(ErrorHandler.config.reportingEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
      });
    } catch (reportError) {
      ErrorHandler.logger.warn("Failed to report error to external service", {
        originalError: errorReport.message,
        reportingError: (reportError as Error).message,
      });
    }
  }

  /**
   * Setup global error handlers
   */
  private static setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof global !== "undefined") {
      // Use ErrorUtils if available (React Native environment)
      if (typeof (global as any).ErrorUtils !== "undefined") {
        const originalHandler = (
          global as any
        ).ErrorUtils?.getGlobalHandler?.();

        (global as any).ErrorUtils?.setGlobalHandler?.(
          async (error: Error, isFatal: boolean) => {
            await ErrorHandler.handleError(error, "unknown", { isFatal });

            // Call original handler if it exists
            if (originalHandler && typeof originalHandler === "function") {
              originalHandler(error, isFatal);
            }
          }
        );
      }
    }
  }

  /**
   * Add error to buffer
   */
  private static addToBuffer(errorReport: ErrorReport): void {
    ErrorHandler.errorBuffer.push(errorReport);

    // Trim buffer if needed
    if (ErrorHandler.errorBuffer.length > ErrorHandler.config.maxErrorLogs) {
      ErrorHandler.errorBuffer = ErrorHandler.errorBuffer.slice(
        -ErrorHandler.config.maxErrorLogs
      );
    }
  }

  /**
   * Utility methods for error context
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getCurrentUserId(): string | undefined {
    // Note: Would get from auth context
    return undefined;
  }

  private static getCurrentSessionId(): string | undefined {
    // Note: Would get from session manager
    return undefined;
  }

  private static getPlatform(): string {
    return process.env.EXPO_PLATFORM || "unknown";
  }

  private static getPlatformVersion(): string {
    return process.env.EXPO_PLATFORM_VERSION || "unknown";
  }

  private static getDeviceModel(): string | undefined {
    // Note: Would get from device info
    return undefined;
  }

  private static getCurrentScreen(): string | undefined {
    // Note: Would get from navigation state
    return undefined;
  }

  private static getCurrentAction(): string | undefined {
    // Note: Would get from current user action context
    return undefined;
  }

  private static sanitizeMetadata(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> {
    if (!metadata) return {};

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      "password",
      "token",
      "apiKey",
      "secret",
      "key",
      "auth",
    ];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sensitiveKey) =>
        lowerKey.includes(sensitiveKey)
      );

      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get all error reports
   */
  static getAllErrors(): ErrorReport[] {
    return [...ErrorHandler.errorBuffer];
  }

  /**
   * Get filtered error reports
   */
  static getFilteredErrors(
    category?: ErrorCategory,
    since?: Date
  ): ErrorReport[] {
    return ErrorHandler.errorBuffer.filter((report) => {
      if (category && report.category !== category) return false;
      if (since && new Date(report.timestamp) < since) return false;
      return true;
    });
  }

  /**
   * Clear all error reports
   */
  static clearErrors(): void {
    ErrorHandler.errorBuffer = [];
    ErrorHandler.retryAttempts.clear();
  }

  /**
   * Export error reports as JSON
   */
  static exportErrors(): string {
    return JSON.stringify(ErrorHandler.errorBuffer, null, 2);
  }
}
