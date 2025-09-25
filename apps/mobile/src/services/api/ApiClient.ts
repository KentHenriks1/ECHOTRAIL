/**
 * Enterprise API Client for EchoTrail
 * Complete REST client with caching, retries, and offline support
 */

import { AppConfig } from "../../core/config";
import { Logger, ErrorHandler, PerformanceMonitor } from "../../core/utils";
// import type { ErrorCategory } from "../../core/utils/ErrorHandler";

export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly enableCaching: boolean;
  readonly cacheTimeout: number;
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly meta?: {
    readonly pagination?: {
      readonly page: number;
      readonly limit: number;
      readonly total: number;
      readonly totalPages: number;
    };
    readonly timestamp: string;
    readonly requestId: string;
  };
}

export interface RequestConfig {
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  readonly url: string;
  readonly data?: unknown;
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, unknown>;
  readonly timeout?: number;
  readonly retries?: number;
  readonly cache?: boolean;
  readonly cacheTimeout?: number;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

/**
 * Enterprise API Client with comprehensive features
 */
export class ApiClient {
  private readonly config: ApiConfig;
  private readonly logger: Logger;
  private authTokens: AuthTokens | null = null;
  private readonly cache = new Map<
    string,
    { data: unknown; timestamp: number }
  >();

  constructor(config: ApiConfig) {
    this.config = config;
    this.logger = new Logger("ApiClient");
  }

  /**
   * Set authentication tokens
   */
  setAuthTokens(tokens: AuthTokens): void {
    this.authTokens = tokens;
    this.logger.info("Authentication tokens updated");
  }

  /**
   * Clear authentication tokens
   */
  clearAuthTokens(): void {
    this.authTokens = null;
    this.logger.info("Authentication tokens cleared");
  }

  /**
   * Generic request method with full error handling and performance tracking
   */
  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = performance.now();

    this.logger.debug("API request started", {
      requestId,
      method: config.method,
      url: config.url,
      params: config.params,
    });

    // Check cache first
    if (
      config.method === "GET" &&
      config.cache !== false &&
      this.config.enableCaching
    ) {
      const cached = this.getFromCache(config.url, config.params);
      if (cached) {
        this.logger.debug("Cache hit", { requestId, url: config.url });
        return { success: true, data: cached as T };
      }
    }

    try {
      const response = await this.executeRequest<T>(config, requestId);
      const duration = performance.now() - startTime;

      // Track performance
      PerformanceMonitor.trackApiCall(
        config.url,
        config.method,
        duration,
        response.success ? 200 : 400
      );

      this.logger.apiCall(
        config.method,
        config.url,
        response.success ? 200 : 400,
        duration,
        { requestId }
      );

      // Cache successful GET requests
      if (
        config.method === "GET" &&
        response.success &&
        this.config.enableCaching
      ) {
        this.setCache(config.url, config.params, response.data);
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Handle and track errors
      const recovery = await ErrorHandler.handleNetworkError(
        error as Error,
        { url: config.url, method: config.method },
        { requestId, duration }
      );

      PerformanceMonitor.trackApiCall(
        config.url,
        config.method,
        duration,
        500,
        { error: true, recovery: recovery.action }
      );

      // Return structured error response
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: (error as Error).message,
          details: { requestId, duration, recovery },
        },
      };
    }
  }

  /**
   * Execute the actual HTTP request with retries
   */
  private async executeRequest<T>(
    config: RequestConfig,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const maxRetries = config.retries ?? this.config.retryAttempts;
    let lastError: Error | null = null;

    // Retries need sequential execution for proper backoff
    // eslint-disable-next-line no-await-in-loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.delay(delay);
          this.logger.info(`Retry attempt ${attempt}`, {
            requestId,
            url: config.url,
          });
        }

        const response = await this.performHttpRequest<T>(config, requestId);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (!this.shouldRetry(error as Error, attempt, maxRetries)) {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Perform the actual HTTP request
   */
  private async performHttpRequest<T>(
    config: RequestConfig,
    requestId: string
  ): Promise<ApiResponse<T>> {
    // Build URL with query parameters
    const url = this.buildUrl(config.url, config.params);

    // Build headers
    const headers = this.buildHeaders(config.headers, requestId);

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, config.timeout ?? this.config.timeout);

    // Create fetch configuration
    const fetchConfig: RequestInit = {
      method: config.method,
      headers,
      signal: abortController.signal,
    };

    // Add body for non-GET requests
    if (config.data && config.method !== "GET") {
      fetchConfig.body = JSON.stringify(config.data);
    }

    try {
      // Execute request
      const response = await fetch(url, fetchConfig);

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Continue with response processing...
      return await this.processResponse<T>(response);
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Process successful HTTP response
   */
  private async processResponse<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    // Parse response
    const responseData = await response.json();

    // Validate response structure
    if (!this.isValidApiResponse(responseData)) {
      throw new Error("Invalid API response format");
    }

    return responseData as ApiResponse<T>;
  }

  /**
   * Build complete URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const baseUrl = this.config.baseUrl.endsWith("/")
      ? this.config.baseUrl.slice(0, -1)
      : this.config.baseUrl;

    const url = endpoint.startsWith("/")
      ? `${baseUrl}${endpoint}`
      : `${baseUrl}/${endpoint}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Build request headers including authentication
   */
  private buildHeaders(
    customHeaders?: Record<string, string>,
    requestId?: string
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Request-ID": requestId || this.generateRequestId(),
      "X-App-Version": AppConfig.version,
      "X-Platform": "mobile",
      ...customHeaders,
    };

    // Add authentication header
    if (this.authTokens?.accessToken) {
      headers.Authorization = `Bearer ${this.authTokens.accessToken}`;
    }

    return headers;
  }

  /**
   * Check if response has valid API structure
   */
  private isValidApiResponse(data: unknown): boolean {
    if (typeof data !== "object" || data === null) {
      return false;
    }

    const response = data as Record<string, unknown>;
    return typeof response.success === "boolean";
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(
    error: Error,
    attempt: number,
    maxRetries: number
  ): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Don't retry on certain errors
    const nonRetryableErrors = [
      "AbortError",
      "TypeError", // Network offline
      "401", // Unauthorized
      "403", // Forbidden
      "404", // Not found
    ];

    return !nonRetryableErrors.some(
      (errorType) =>
        error.name.includes(errorType) || error.message.includes(errorType)
    );
  }

  /**
   * Cache management
   */
  private getCacheKey(url: string, params?: Record<string, unknown>): string {
    const paramString = params ? JSON.stringify(params) : "";
    return `${url}:${paramString}`;
  }

  private getFromCache(
    url: string,
    params?: Record<string, unknown>
  ): unknown | null {
    const key = this.getCacheKey(url, params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(
    url: string,
    params: Record<string, unknown> | undefined,
    data: unknown
  ): void {
    const key = this.getCacheKey(url, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheTimeout) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
    this.logger.debug("Cache cleanup completed", {
      removedEntries: expiredKeys.length,
    });
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get<T>(
    url: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", url, params });
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", url, data });
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PUT", url, data });
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "DELETE", url });
  }

  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PATCH", url, data });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info("All caches cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
