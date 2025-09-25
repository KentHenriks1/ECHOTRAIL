/**
 * AuthService Tests - Enterprise Edition
 * Comprehensive testing of authentication service
 */

import { AuthService } from "../../../services/api/AuthService";
import { ApiClient } from "../../../services/api/ApiClient";
// import { Logger } from "../../../core/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock dependencies
jest.mock("../../../core/utils/Logger");
jest.mock("../../../core/utils/PerformanceMonitor");
jest.mock("../../../core/utils/ErrorHandler");
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Use fake timers to prevent hanging
jest.useFakeTimers();

describe("AuthService", () => {
  let authService: AuthService;
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

    // Clear AsyncStorage and reset mocks
    await AsyncStorage.clear();
    jest.clearAllMocks();

    // Create AuthService with mocked dependencies
    authService = new AuthService(mockApiClient);
  });

  afterEach(async () => {
    // Clean up any timers in AuthService
    if (authService && typeof authService.dispose === "function") {
      authService.dispose();
    }

    // Clear all mocks
    jest.clearAllMocks();

    // Clear any remaining timers
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  describe("login", () => {
    it("should login successfully with email and password", async () => {
      // Arrange
      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      const mockResponse = {
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
      expect(result.data?.tokens).toEqual(mockTokens);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/auth/login",
        credentials
      );
      expect(mockApiClient.setAuthTokens).toHaveBeenCalledWith(mockTokens);

      // Verify tokens were stored
      const storedTokens = await AsyncStorage.getItem("auth_tokens");
      expect(storedTokens).not.toBeNull();
      expect(JSON.parse(storedTokens!)).toEqual(mockTokens);
    });

    it("should handle invalid credentials", async () => {
      // Arrange
      const credentials = {
        email: "wrong@example.com",
        password: "wrongpassword",
      };

      const mockResponse = {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
      expect(mockApiClient.setAuthTokens).not.toHaveBeenCalled();

      // Verify no tokens were stored
      const storedTokens = await AsyncStorage.getItem("auth_tokens");
      expect(storedTokens).toBeNull();
    });

    it("should handle network errors during login", async () => {
      // Arrange
      const credentials = {
        email: "test@example.com",
        password: "password123",
      };
      const networkError = new Error("Network error");
      mockApiClient.post.mockRejectedValue(networkError);

      // Act & Assert
      await expect(authService.login(credentials)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      // Arrange
      const userData = {
        email: "newuser@example.com",
        password: "password123",
        name: "New User",
      };

      const mockResponse = {
        success: true,
        data: {
          user: { ...mockUser, ...userData },
          tokens: mockTokens,
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(userData.email);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/auth/register",
        userData
      );
      expect(mockApiClient.setAuthTokens).toHaveBeenCalledWith(mockTokens);
    });

    it("should handle email already exists error", async () => {
      // Arrange
      const userData = {
        email: "existing@example.com",
        password: "password123",
        name: "Existing User",
      };

      const mockResponse = {
        success: false,
        error: { code: "EMAIL_EXISTS", message: "Email already registered" },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMAIL_EXISTS");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: { message: "Logged out successfully" },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.logout();

      // Assert
      expect(result.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith("/auth/logout");
      expect(mockApiClient.clearAuthTokens).toHaveBeenCalled();

      // Verify tokens were removed from storage
      const storedTokens = await AsyncStorage.getItem("auth_tokens");
      expect(storedTokens).toBeNull();
    });

    it("should clear local data even if API call fails", async () => {
      // Arrange
      const networkError = new Error("Network error");
      mockApiClient.post.mockRejectedValue(networkError);

      // Act & Assert
      await expect(authService.logout()).rejects.toThrow("Network error");

      // Should still clear local data despite API failure
      expect(mockApiClient.clearAuthTokens).toHaveBeenCalled();

      // Verify tokens were still removed from storage despite API error
      const storedTokens = await AsyncStorage.getItem("auth_tokens");
      expect(storedTokens).toBeNull();
    });
  });

  describe("refreshToken", () => {
    it("should refresh tokens successfully", async () => {
      // Arrange
      // Store tokens in AsyncStorage so refreshTokens can find them
      await AsyncStorage.setItem("auth_tokens", JSON.stringify(mockTokens));

      const newTokens = {
        ...mockTokens,
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      const mockResponse = {
        success: true,
        data: {
          user: mockUser,
          tokens: newTokens,
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.refreshTokens();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.tokens).toEqual(newTokens);
      expect(mockApiClient.post).toHaveBeenCalledWith("/auth/refresh", {
        refreshToken: mockTokens.refreshToken,
      });
      expect(mockApiClient.setAuthTokens).toHaveBeenCalledWith(newTokens);

      // Verify new tokens were stored
      const storedTokens = await AsyncStorage.getItem("auth_tokens");
      expect(JSON.parse(storedTokens!)).toEqual(newTokens);
    });

    it("should handle invalid refresh token", async () => {
      // Arrange
      // Store tokens in AsyncStorage so refreshTokens can find them
      await AsyncStorage.setItem("auth_tokens", JSON.stringify(mockTokens));

      const mockResponse = {
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Refresh token expired",
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.refreshTokens();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_REFRESH_TOKEN");
      expect(mockApiClient.setAuthTokens).not.toHaveBeenCalled();

      // Verify tokens were cleared due to refresh failure
      const storedTokens = await AsyncStorage.getItem("auth_tokens");
      expect(storedTokens).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("should get current user successfully", async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: mockUser,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockApiClient.get).toHaveBeenCalledWith("/users/me");
    });

    it("should handle unauthorized access", async () => {
      // Arrange
      const mockResponse = {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Token expired" },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      // Arrange
      const updateData = {
        name: "Updated Name",
        preferences: {
          units: "imperial" as const,
        },
      };

      const updatedUser = { ...mockUser, ...updateData };
      const mockResponse = {
        success: true,
        data: updatedUser,
      };
      mockApiClient.put.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.updateUser(updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(mockApiClient.put).toHaveBeenCalledWith("/users/me", updateData);
    });

    it("should handle validation errors", async () => {
      // Arrange
      const invalidData = {
        name: "", // Invalid empty name
      };

      const mockResponse = {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name cannot be empty" },
      };
      mockApiClient.put.mockResolvedValue(mockResponse);

      // Act
      const result = await authService.updateUser(invalidData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});
