/**
 * API Services Factory
 * Central place to create and configure all API services
 */

import { AppConfig } from "../../core/config";
import { ApiClient } from "./ApiClient";
import { AuthService } from "./AuthService";
import { PostgRESTAuthAdapter } from "./PostgRESTAuthAdapter";
import { TrailService } from "./TrailService";
import { aiServiceManager } from "../ai";

// Create singleton API client instance
const apiClient = new ApiClient(AppConfig.api);

// Create service instances
const authService = new AuthService(apiClient);
const postgrestAuthAdapter = new PostgRESTAuthAdapter(apiClient);
const trailService = new TrailService(apiClient);
// AI Service Manager provides unified access to all AI services

/**
 * API Services Factory
 * Provides configured service instances
 */
export class ApiServices {
  /**
   * Get authentication service (PostgREST adapter)
   */
  static get auth(): PostgRESTAuthAdapter {
    return postgrestAuthAdapter;
  }

  /**
   * Get legacy authentication service
   */
  static get legacyAuth(): AuthService {
    return authService;
  }

  /**
   * Get trail service
   */
  static get trails(): TrailService {
    return trailService;
  }

  /**
   * Get AI service manager for story generation, caching, feedback, and performance
   */
  static get ai() {
    return aiServiceManager;
  }

  /**
   * Get raw API client (for custom requests)
   */
  static get client(): ApiClient {
    return apiClient;
  }

  /**
   * Initialize all services
   */
  static async initialize(): Promise<void> {
    await postgrestAuthAdapter.initialize();
  }

  /**
   * Clean up all services
   */
  static dispose(): void {
    authService.dispose();
  }
}

// Export individual services for direct import
export { apiClient, authService, postgrestAuthAdapter, trailService, aiServiceManager };

// Export types
export type * from "./ApiClient";
export type * from "./TrailService";
// Auth types from PostgRESTAuthAdapter (primary auth service)
export type {
  User,
  LoginCredentials,
  AuthResponse,
  TokenRefreshResponse
} from "./PostgRESTAuthAdapter";
