/**
 * Enterprise Logger System for EchoTrail
 * Advanced logging with multiple levels, outputs, and integrations
 */

import { Platform } from "react-native";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly category: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
  readonly stack?: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

export interface LoggerConfig {
  readonly minLevel: LogLevel;
  readonly enableConsole: boolean;
  readonly enableFile: boolean;
  readonly enableRemote: boolean;
  readonly maxFileSize: number;
  readonly maxLogEntries: number;
  readonly enableStackTrace: boolean;
  readonly enablePerformanceMetrics: boolean;
  readonly remoteEndpoint?: string;
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: __DEV__ ? "debug" : "info",
  enableConsole: true,
  enableFile: !__DEV__,
  enableRemote: !__DEV__,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxLogEntries: 10000,
  enableStackTrace: true,
  enablePerformanceMetrics: __DEV__,
  remoteEndpoint: process.env.EXPO_PUBLIC_LOG_ENDPOINT,
};

/**
 * Enterprise Logger Class
 * Provides comprehensive logging capabilities with multiple outputs
 */
export class Logger {
  private readonly category: string;
  private readonly config: LoggerConfig;
  private readonly sessionId: string;
  private static logBuffer: LogEntry[] = [];
  private static _config: LoggerConfig = DEFAULT_CONFIG;

  constructor(category: string, config: Partial<LoggerConfig> = {}) {
    this.category = category;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
  }

  /**
   * Configure global logger settings
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger._config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get global logger configuration
   */
  static getConfig(): LoggerConfig {
    return Logger._config;
  }

  /**
   * Debug level logging - development only
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  /**
   * Info level logging - general information
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  /**
   * Warning level logging - potential issues
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  /**
   * Error level logging - recoverable errors
   */
  error(message: string, data?: Record<string, unknown>, error?: Error): void {
    const logData = {
      ...data,
      stack: error?.stack,
      name: error?.name,
      errorMessage: error?.message,
    };
    this.log("error", message, logData, error?.stack);
  }

  /**
   * Fatal level logging - critical errors
   */
  fatal(message: string, data?: Record<string, unknown>, error?: Error): void {
    const logData = {
      ...data,
      stack: error?.stack,
      name: error?.name,
      errorMessage: error?.message,
    };
    this.log("fatal", message, logData, error?.stack);
  }

  /**
   * Performance logging with timing metrics
   */
  performance(
    operationName: string,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    if (!this.config.enablePerformanceMetrics) return;

    const perfData = {
      ...data,
      operationName,
      duration,
      timestamp: Date.now(),
      platform: Platform.OS,
    };

    this.log(
      "info",
      `Performance: ${operationName} took ${duration}ms`,
      perfData
    );
  }

  /**
   * Log user actions for analytics and debugging
   */
  userAction(
    action: string,
    screen: string,
    data?: Record<string, unknown>
  ): void {
    const actionData = {
      ...data,
      action,
      screen,
      platform: Platform.OS,
      timestamp: Date.now(),
    };

    this.log("info", `User Action: ${action} on ${screen}`, actionData);
  }

  /**
   * Log API requests and responses
   */
  apiCall(
    method: string,
    url: string,
    status: number,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    const apiData = {
      ...data,
      method,
      url,
      status,
      duration,
      success: status >= 200 && status < 300,
    };

    const level: LogLevel = status >= 400 ? "error" : "info";
    this.log(
      level,
      `API ${method} ${url} - ${status} (${duration}ms)`,
      apiData
    );
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    stack?: string
  ): void {
    // Check if log level meets minimum threshold
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: this.category,
      message,
      data: this.sanitizeData(data),
      stack,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
    };

    // Add to buffer
    Logger.logBuffer.push(entry);

    // Trim buffer if needed
    if (Logger.logBuffer.length > this.config.maxLogEntries) {
      Logger.logBuffer = Logger.logBuffer.slice(-this.config.maxLogEntries);
    }

    // Output to various destinations
    this.outputToConsole(entry);
    this.outputToFile(entry);
    this.outputToRemote(entry);
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(message, entry.data);
        break;
      case "info":
         
        console.info(message, entry.data);
        break;
      case "warn":
         
        console.warn(message, entry.data);
        break;
      case "error":
      case "fatal":
         
        console.error(message, entry.data, entry.stack);
        break;
    }
  }

  /**
   * Output log entry to file (implementation would use file system)
   */
  private outputToFile(_entry: LogEntry): void {
    if (!this.config.enableFile) return;

    // Note: In a real implementation, this would write to a file
    // using react-native-fs or expo-file-system
    // For now, we'll just store in memory buffer
  }

  /**
   * Output log entry to remote logging service
   */
  private async outputToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      // Note: In a real implementation, this would send to a logging service
      // like Sentry, LogRocket, or custom endpoint
      await fetch(this.config.remoteEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Avoid infinite logging loops by using direct console output
      // This is intentionally a console statement to prevent recursive logging
       
      console.warn("Failed to send log to remote service:", error);
    }
  }

  /**
   * Sanitize log data to remove sensitive information
   */
  private sanitizeData(
    data?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sensitiveKeys = [
      "password",
      "token",
      "apiKey",
      "secret",
      "key",
      "auth",
    ];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sensitiveKey) =>
        lowerKey.includes(sensitiveKey)
      );

      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user ID from authentication context
   */
  private getCurrentUserId(): string | undefined {
    // Note: In a real implementation, this would get the user ID
    // from the authentication context or store
    return undefined;
  }

  /**
   * Get all log entries (for debugging or export)
   */
  static getAllLogs(): LogEntry[] {
    return [...Logger.logBuffer];
  }

  /**
   * Get filtered log entries
   */
  static getFilteredLogs(
    level?: LogLevel,
    category?: string,
    since?: Date
  ): LogEntry[] {
    return Logger.logBuffer.filter((entry) => {
      if (level && entry.level !== level) return false;
      if (category && entry.category !== category) return false;
      if (since && new Date(entry.timestamp) < since) return false;
      return true;
    });
  }

  /**
   * Clear all logs
   */
  static clearLogs(): void {
    Logger.logBuffer = [];
  }

  /**
   * Export logs as JSON string
   */
  static exportLogs(): string {
    return JSON.stringify(Logger.logBuffer, null, 2);
  }

  /**
   * Performance measurement utility
   */
  static async time<T>(
    operationName: string,
    operation: () => Promise<T>,
    logger?: Logger
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (logger) {
        logger.performance(operationName, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (logger) {
        logger.performance(operationName, duration, { error: true });
        logger.error(
          `Operation ${operationName} failed`,
          { duration },
          error as Error
        );
      }

      throw error;
    }
  }

  // Global static logger instance for convenience methods
  private static defaultLogger = new Logger('Global');

  /**
   * Static convenience method for info logging
   */
  static info(message: string, data?: unknown): void {
    const normalizedData = Logger.normalizeData(data);
    Logger.defaultLogger.info(message, normalizedData);
  }

  /**
   * Static convenience method for warning logging
   */
  static warn(message: string, data?: unknown): void {
    const normalizedData = Logger.normalizeData(data);
    Logger.defaultLogger.warn(message, normalizedData);
  }

  /**
   * Static convenience method for error logging
   */
  static error(message: string, dataOrError?: unknown, error?: Error): void {
    // Handle different parameter patterns
    let data: Record<string, unknown> | undefined;
    let actualError: Error | undefined = error;

    if (dataOrError instanceof Error) {
      actualError = dataOrError;
      data = undefined;
    } else {
      data = Logger.normalizeData(dataOrError);
    }

    Logger.defaultLogger.error(message, data, actualError);
  }

  /**
   * Static convenience method for debug logging
   */
  static debug(message: string, data?: unknown): void {
    const normalizedData = Logger.normalizeData(data);
    Logger.defaultLogger.debug(message, normalizedData);
  }

  /**
   * Static convenience method for fatal logging
   */
  static fatal(message: string, dataOrError?: unknown, error?: Error): void {
    // Handle different parameter patterns
    let data: Record<string, unknown> | undefined;
    let actualError: Error | undefined = error;

    if (dataOrError instanceof Error) {
      actualError = dataOrError;
      data = undefined;
    } else {
      data = Logger.normalizeData(dataOrError);
    }

    Logger.defaultLogger.fatal(message, data, actualError);
  }

  /**
   * Normalize various data types to Record<string, unknown> or undefined
   */
  private static normalizeData(data: unknown): Record<string, unknown> | undefined {
    if (data === null || data === undefined) {
      return undefined;
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    if (Array.isArray(data)) {
      return { items: data };
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return { value: data };
    }

    // For any other type, convert to string representation
    return { value: String(data) };
  }
}
