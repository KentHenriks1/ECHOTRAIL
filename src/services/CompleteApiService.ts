import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { logger } from "../utils/logger";
import { authService } from "./AuthService";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableCaching: boolean;
}

export class CompleteApiService {
  private static instance: CompleteApiService;
  private config: ApiConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  private constructor() {
    this.config = {
      baseUrl: this.getSecureApiUrl(),
      timeout: 30000,
      retryAttempts: 3,
      enableCaching: true,
    };
    this.cache = new Map();
  }

  /**
   * Get secure API URL from configuration
   */
  private getSecureApiUrl(): string {
    // Use environment variable or secure fallback
    return process.env.EXPO_PUBLIC_API_URL || "https://api.echotrail.app";
  }

  static getInstance(): CompleteApiService {
    if (!CompleteApiService.instance) {
      CompleteApiService.instance = new CompleteApiService();
    }
    return CompleteApiService.instance;
  }

  /**
   * Configure API settings
   */
  configure(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get authorization headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const user = authService.getCurrentUser();
    const token = await AsyncStorage.getItem("@echotrail:auth_token");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (user) {
      headers["X-User-ID"] = user.id;
    }

    return headers;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(method: string, url: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : "";
    return `${method}:${url}:${paramsStr}`;
  }

  /**
   * Check cache for data
   */
  private getCachedData(cacheKey: string): any | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache response data
   */
  private setCachedData(
    cacheKey: string,
    data: any,
    ttl: number = 300000
  ): void {
    if (!this.config.enableCaching) return;

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: {
      useCache?: boolean;
      cacheTtl?: number;
      timeout?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      useCache = method === "GET",
      cacheTtl = 300000, // 5 minutes
      timeout = this.config.timeout,
      headers: customHeaders = {},
    } = options;

    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = this.getCacheKey(method, endpoint, data);

    // Check cache for GET requests
    if (useCache && method === "GET") {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return { success: true, data: cachedData };
      }
    }

    const authHeaders = await this.getAuthHeaders();
    const requestHeaders = { ...authHeaders, ...customHeaders };

    let lastError: any;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        logger.debug(`${method} ${url} (attempt ${attempt})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestInit: RequestInit = {
          method,
          headers: requestHeaders,
          signal: controller.signal,
        };

        if (data && method !== "GET") {
          requestInit.body = JSON.stringify(data);
        }

        const response = await fetch(url, requestInit);
        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseData: any;

        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch {
          responseData = { message: responseText };
        }

        if (!response.ok) {
          const error = {
            status: response.status,
            message: responseData.message || response.statusText,
            data: responseData,
          };

          // Don't retry on certain status codes
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              error: error.message,
              data: error as T,
            };
          }

          throw error;
        }

        // Cache successful GET responses
        if (useCache && method === "GET") {
          this.setCachedData(cacheKey, responseData, cacheTtl);
        }

        logger.debug(`${method} ${url} completed successfully`);
        return { success: true, data: responseData };
      } catch (error: any) {
        lastError = error;
        logger.warn(`${method} ${url} failed (attempt ${attempt}):`, error);

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(
      `${method} ${url} failed after ${this.config.retryAttempts} attempts:`,
      lastError
    );
    return {
      success: false,
      error: lastError?.message || "Network error",
      data: lastError as T,
    };
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    options?: {
      useCache?: boolean;
      cacheTtl?: number;
      timeout?: number;
    }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>("GET", endpoint, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>("POST", endpoint, data, options);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>("PUT", endpoint, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>("PATCH", endpoint, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options?: {
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>("DELETE", endpoint, undefined, options);
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    endpoint: string,
    filePath: string,
    fieldName: string = "file",
    additionalData?: Record<string, any>,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse> {
    try {
      logger.debug(`Uploading file: ${filePath} to ${endpoint}`);

      // Read file info
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      const authHeaders = await this.getAuthHeaders();
      const url = `${this.config.baseUrl}${endpoint}`;

      // Create form data
      const formData = new FormData();

      // Add file
      formData.append(fieldName, {
        uri: filePath,
        type: "application/octet-stream",
        name: filePath.split("/").pop() || "file",
      } as any);

      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(
            key,
            typeof value === "string" ? value : JSON.stringify(value)
          );
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(responseData.message || response.statusText);
      }

      logger.debug(`File upload completed: ${filePath}`);
      return { success: true, data: responseData };
    } catch (error: any) {
      logger.error("File upload failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Download file
   */
  async downloadFile(
    url: string,
    destinationPath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<{ localPath: string }>> {
    try {
      logger.debug(`Downloading file from ${url} to ${destinationPath}`);

      const authHeaders = await this.getAuthHeaders();

      const downloadResult = await FileSystem.downloadAsync(
        url,
        destinationPath,
        {
          headers: authHeaders,
        }
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      logger.debug(`File downloaded successfully: ${destinationPath}`);
      return {
        success: true,
        data: { localPath: destinationPath },
      };
    } catch (error: any) {
      logger.error("File download failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<
    ApiResponse<{ status: string; version: string; timestamp: number }>
  > {
    return this.get("/health", { useCache: false, timeout: 5000 });
  }

  /**
   * User Authentication APIs
   */

  async login(
    email: string,
    password: string
  ): Promise<
    ApiResponse<{
      user: any;
      token: string;
      refreshToken: string;
    }>
  > {
    return this.post("/auth/login", { email, password });
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.post("/auth/register", userData);
  }

  async refreshToken(refreshToken: string): Promise<
    ApiResponse<{
      token: string;
      refreshToken: string;
    }>
  > {
    return this.post("/auth/refresh", { refreshToken });
  }

  async logout(): Promise<ApiResponse> {
    return this.post("/auth/logout");
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    return this.post("/auth/verify-email", { token });
  }

  async resetPassword(email: string): Promise<ApiResponse> {
    return this.post("/auth/reset-password", { email });
  }

  async confirmPasswordReset(
    token: string,
    password: string
  ): Promise<ApiResponse> {
    return this.post("/auth/confirm-reset", { token, password });
  }

  /**
   * User Profile APIs
   */

  async getUserProfile(userId?: string): Promise<ApiResponse<any>> {
    const endpoint = userId ? `/users/${userId}` : "/user/profile";
    return this.get(endpoint);
  }

  async updateUserProfile(updates: any): Promise<ApiResponse<any>> {
    return this.put("/user/profile", updates);
  }

  async uploadProfileImage(
    imagePath: string
  ): Promise<ApiResponse<{ imageUrl: string }>> {
    return this.uploadFile("/user/profile/image", imagePath, "image");
  }

  /**
   * Trail APIs
   */

  async getTrails(params?: {
    page?: number;
    limit?: number;
    search?: string;
    public?: boolean;
  }): Promise<ApiResponse<{ trails: any[]; pagination: any }>> {
    const queryString = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return this.get(`/trails${queryString}`);
  }

  async getTrail(trailId: string): Promise<ApiResponse<any>> {
    return this.get(`/trails/${trailId}`);
  }

  async createTrail(trailData: any): Promise<ApiResponse<any>> {
    return this.post("/trails", trailData);
  }

  async updateTrail(trailId: string, updates: any): Promise<ApiResponse<any>> {
    return this.put(`/trails/${trailId}`, updates);
  }

  async deleteTrail(trailId: string): Promise<ApiResponse> {
    return this.delete(`/trails/${trailId}`);
  }

  async getTrailTrackPoints(trailId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/trails/${trailId}/track-points`);
  }

  async addTrackPoints(
    trailId: string,
    trackPoints: any[]
  ): Promise<ApiResponse> {
    return this.post(`/trails/${trailId}/track-points`, { trackPoints });
  }

  /**
   * Media APIs
   */

  async uploadTrailMedia(
    trailId: string,
    mediaPath: string,
    mediaType: "PHOTO" | "VIDEO" | "AUDIO",
    metadata?: any
  ): Promise<ApiResponse<any>> {
    return this.uploadFile("/media/upload", mediaPath, "media", {
      trailId,
      mediaType,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  async getTrailMedia(trailId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/trails/${trailId}/media`);
  }

  async deleteMedia(mediaId: string): Promise<ApiResponse> {
    return this.delete(`/media/${mediaId}`);
  }

  /**
   * Discovery APIs
   */

  async getPublicTrails(params?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    difficulty?: string;
    type?: string;
  }): Promise<ApiResponse<any[]>> {
    const queryString = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return this.get(`/discover/trails${queryString}`);
  }

  async getPointsOfInterest(params: {
    latitude: number;
    longitude: number;
    radius?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryString = "?" + new URLSearchParams(params as any).toString();
    return this.get(`/discover/poi${queryString}`);
  }

  /**
   * Sync APIs
   */

  async syncData(syncData: {
    trails?: any[];
    trackPoints?: any[];
    media?: any[];
    lastSyncTimestamp?: string;
  }): Promise<
    ApiResponse<{
      conflicts: any[];
      updates: any[];
      timestamp: string;
    }>
  > {
    return this.post("/sync", syncData);
  }

  async resolveConflict(
    conflictId: string,
    resolution: any
  ): Promise<ApiResponse> {
    return this.post(`/sync/conflicts/${conflictId}/resolve`, resolution);
  }

  /**
   * Utility methods
   */

  clearCache(): void {
    this.cache.clear();
    logger.info("API cache cleared");
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Batch operations
   */

  async batchRequest<T>(
    requests: Array<{
      method: "GET" | "POST" | "PUT" | "DELETE";
      endpoint: string;
      data?: any;
    }>
  ): Promise<ApiResponse<T[]>> {
    return this.post("/batch", { requests });
  }

  /**
   * WebSocket connection for real-time updates
   */

  connectWebSocket(
    onMessage: (data: any) => void,
    onError?: (error: any) => void
  ): WebSocket | null {
    try {
      const wsUrl = this.config.baseUrl.replace(/^https?/, "ws") + "/ws";
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          logger.error("WebSocket message parsing error:", error);
        }
      };

      ws.onerror = (error) => {
        logger.error("WebSocket error:", error);
        onError?.(error);
      };

      ws.onopen = () => {
        logger.info("WebSocket connected");
      };

      ws.onclose = () => {
        logger.info("WebSocket disconnected");
      };

      return ws;
    } catch (error) {
      logger.error("WebSocket connection failed:", error);
      onError?.(error);
      return null;
    }
  }
}

export const completeApiService = CompleteApiService.getInstance();
