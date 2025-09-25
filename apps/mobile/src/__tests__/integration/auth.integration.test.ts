/**
 * Authentication Integration Tests
 * End-to-end authentication flow testing
 */

import { AuthService } from "../../services/api/AuthService";
import { ApiClient } from "../../services/api/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../../providers/AuthProvider";
import { renderHook, act } from "@testing-library/react-hooks";
import { ApiServices } from "../../services/api";
import React from "react";

// Mock dependencies
jest.mock("../../core/utils/Logger");
jest.mock("../../core/utils/PerformanceMonitor");
jest.mock("../../core/utils/ErrorHandler", () => ({
  ErrorHandler: {
    handleApiError: jest.fn().mockResolvedValue({
      action: "retry",
      delay: 1000,
      maxRetries: 3,
    }),
    handleAuthError: jest.fn(),
    handleNetworkError: jest.fn().mockResolvedValue({
      action: "retry",
      delay: 1000,
      maxRetries: 3,
    }),
  },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../../services/database/DatabaseSyncService");

// Mock ApiServices to prevent real HTTP calls
jest.mock("../../services/api", () => ({
  ApiServices: {
    auth: {
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      getCurrentUser: jest.fn(),
      refreshTokens: jest.fn(),
      updateUser: jest.fn(),
    },
    trails: {
      getTrails: jest.fn(),
      getTrail: jest.fn(),
      createTrail: jest.fn(),
      updateTrail: jest.fn(),
      deleteTrail: jest.fn(),
    },
  },
}));

// Mock AppConfig to prevent validation errors
jest.mock("../../core/config", () => ({
  AppConfig: {
    name: "EchoTrail",
    version: "1.0.0",
    buildNumber: "1",
    environment: "development",
    debugMode: true,
    api: {
      baseUrl: "http://localhost:3001",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheTimeout: 300000,
      enableMocking: false,
      mockDelay: 1000,
    },
    database: {
      name: "echotrail",
      version: 1,
      enableEncryption: false,
      enableBackup: false,
      syncInterval: 30000,
      conflictResolution: "client",
      remote: {
        url: "postgresql://test",
        project: "test",
        branch: "main",
        apiUrl: "http://localhost:3001",
      },
    },
    auth: {
      provider: "stack",
      projectId: "test-project-id",
      jwksUrl: "https://api.stack-auth.com/.well-known/jwks.json",
      enableBiometrics: false,
      sessionTimeout: 1800000,
      tokenRefreshThreshold: 300000,
    },
    features: {
      aiStories: true,
      locationTracking: true,
      offlineMaps: true,
      socialFeatures: true,
      notifications: true,
      advancedAnalytics: false,
      enterpriseAuth: false,
      performanceMonitoring: true,
      crashReporting: false,
      betaFeatures: false,
    },
    monitoring: {
      enableCrashReporting: false,
      enablePerformanceMonitoring: true,
      enableAnalytics: false,
      sampleRate: 1.0,
      enableUserFeedback: false,
      enableSessionReplay: false,
    },
    maps: {
      provider: "google",
      googleMapsApiKey: "test-key",
      mapboxAccessToken: "test-token",
      defaultZoom: 15,
      maxZoom: 20,
      minZoom: 1,
      searchRadius: 5000,
      enableOffline: true,
      enableTerrain: true,
      enableSatellite: true,
    },
    ai: {
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-3.5-turbo",
      maxTokens: 1000,
      temperature: 0.7,
      enableTTS: true,
      voiceSettings: {
        voice: "alloy",
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
        enableSsml: false,
      },
      enableStoryGeneration: true,
      storyMaxLength: 500,
    },
  },
}));
describe("Authentication Integration", () => {
  let mockApiClient: jest.Mocked<ApiClient>;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    avatar: undefined,
    role: "user" as const,
    preferences: {
      units: "metric" as const,
      language: "en" as const,
      mapStyle: "standard",
      privacyLevel: "public" as const,
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockTokens = {
    accessToken: "access-token-123",
    refreshToken: "refresh-token-123",
    expiresIn: 3600,
  };

  beforeEach(async () => {
    // Create mock ApiClient
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      setAuthTokens: jest.fn(),
      clearAuthTokens: jest.fn(),
    } as any;

    // Setup ApiServices mocks
    (ApiServices.auth.login as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser, tokens: mockTokens },
    });

    (ApiServices.auth.logout as jest.Mock).mockResolvedValue({
      success: true,
      data: { message: "Logged out successfully" },
    });

    (ApiServices.auth.getCurrentUser as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
    });

    // Clear AsyncStorage and reset mocks
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Authentication Flow", () => {
    it("should handle complete login -> get user -> logout flow", async () => {
      // Mock successful login
      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, tokens: mockTokens },
      });

      // Mock successful getCurrentUser
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      // Mock successful logout
      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { message: "Logged out successfully" },
      });

      const authService = new AuthService(mockApiClient);

      // Step 1: Login
      const loginResult = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(loginResult.success).toBe(true);
      expect(mockApiClient.setAuthTokens).toHaveBeenCalledWith(mockTokens);

      // Verify tokens were stored
      const storedTokensAfterLogin = await AsyncStorage.getItem("auth_tokens");
      expect(JSON.parse(storedTokensAfterLogin!)).toEqual(mockTokens);

      // Step 2: Get current user
      const userResult = await authService.getCurrentUser();
      expect(userResult.success).toBe(true);
      expect(userResult.data).toEqual(mockUser);

      // Step 3: Logout
      const logoutResult = await authService.logout();
      expect(logoutResult.success).toBe(true);
      expect(mockApiClient.clearAuthTokens).toHaveBeenCalled();

      // Verify tokens were removed
      const storedTokensAfterLogout = await AsyncStorage.getItem("auth_tokens");
      expect(storedTokensAfterLogout).toBeNull();
    });

    it("should handle token refresh flow", async () => {
      // Store tokens in AsyncStorage for refresh test
      await AsyncStorage.setItem("auth_tokens", JSON.stringify(mockTokens));

      // Mock expired token error
      mockApiClient.get.mockResolvedValueOnce({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Token expired" },
      });

      // Mock successful token refresh
      const newTokens = {
        ...mockTokens,
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: newTokens,
        },
      });

      // Mock successful retry with new token
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      const authService = new AuthService(mockApiClient);

      // Step 1: Initial request fails with expired token
      const initialResult = await authService.getCurrentUser();
      expect(initialResult.success).toBe(false);
      expect(initialResult.error?.code).toBe("UNAUTHORIZED");

      // Step 2: Refresh token
      const refreshResult = await authService.refreshTokens();
      expect(refreshResult.success).toBe(true);
      expect(mockApiClient.setAuthTokens).toHaveBeenCalledWith(newTokens);

      // Step 3: Retry original request with new token
      const retryResult = await authService.getCurrentUser();
      expect(retryResult.success).toBe(true);
      expect(retryResult.data).toEqual(mockUser);
    });
  });

  describe("AuthProvider Integration", () => {
    const mockAuthConfig = {
      provider: "stack" as const,
      projectId: "test-project-id",
      jwksUrl: "https://api.stack-auth.com/.well-known/jwks.json",
      enableBiometrics: true,
      sessionTimeout: 30,
      tokenRefreshThreshold: 5,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, { config: mockAuthConfig, children });

    it("should handle login state changes", async () => {
      // Mock successful login
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { user: mockUser, tokens: mockTokens },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper,
      });

      // Initial state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // Perform login
      await act(async () => {
        await result.current.login({
          email: "test@example.com",
          password: "password123",
        });
      });

      // Check updated state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it("should handle logout state changes", async () => {
      // First, setup a successful login to establish authenticated state
      (ApiServices.auth.login as jest.Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, tokens: mockTokens },
      });

      // Mock successful logout
      (ApiServices.auth.logout as jest.Mock).mockResolvedValue({
        success: true,
        data: { message: "Logged out successfully" },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First login to establish authenticated state
      await act(async () => {
        await result.current.login({
          email: "test@example.com",
          password: "password123",
        });
      });

      // Verify we're authenticated
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);

      // Now perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Check updated state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe("Error Recovery Scenarios", () => {
    it("should handle network failures with retry logic", async () => {
      const authService = new AuthService(mockApiClient);

      // First attempt fails
      mockApiClient.post.mockRejectedValueOnce(new Error("Network error"));

      // Second attempt succeeds
      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, tokens: mockTokens },
      });

      // First login attempt should fail
      await expect(
        authService.login({
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Network error");

      // Second attempt should succeed
      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
    });

    it("should handle session persistence across app restarts", async () => {
      // Store tokens in AsyncStorage for the test
      await AsyncStorage.setItem("auth_tokens", JSON.stringify(mockTokens));

      // Mock successful session validation
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const authService = new AuthService(mockApiClient);

      // Validate stored session
      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });
  });

  describe("Security Scenarios", () => {
    it("should handle concurrent login attempts", async () => {
      const authService = new AuthService(mockApiClient);

      // Mock successful login
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { user: mockUser, tokens: mockTokens },
      });

      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      // Perform concurrent login attempts
      const [result1, result2, result3] = await Promise.all([
        authService.login(credentials),
        authService.login(credentials),
        authService.login(credentials),
      ]);

      // All should succeed (idempotent)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // Should have made 3 API calls
      expect(mockApiClient.post).toHaveBeenCalledTimes(3);
    });

    it("should handle token expiration edge cases", async () => {
      const authService = new AuthService(mockApiClient);

      // Mock token expiration during operation
      mockApiClient.get
        .mockResolvedValueOnce({
          success: true,
          data: mockUser,
        })
        .mockResolvedValueOnce({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        });

      // First call succeeds
      const result1 = await authService.getCurrentUser();
      expect(result1.success).toBe(true);

      // Second call fails due to token expiration
      const result2 = await authService.getCurrentUser();
      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Data Persistence", () => {
    it("should maintain user data consistency", async () => {
      const authService = new AuthService(mockApiClient);

      // Mock successful login
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: { user: mockUser, tokens: mockTokens },
      });

      // Mock successful profile update
      const updatedUser = { ...mockUser, name: "Updated Name" };
      mockApiClient.put.mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      // Login first
      await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      // Update profile
      const updateResult = await authService.updateUser({
        name: "Updated Name",
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe("Updated Name");

      // Note: AuthService doesn't store user data separately, only tokens
    });
  });
});
