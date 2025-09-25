/**
 * Authentication Service for EchoTrail
 * Full integration with backend API and Stack Auth
 */

import { ApiClient, ApiResponse, AuthTokens } from "./ApiClient";
// import { AppConfig } from "../../core/config";
import { Logger, ErrorHandler } from "../../core/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types matching our backend API schema
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatar?: string;
  readonly role: "USER" | "ADMIN" | "user" | "admin"; // Support both cases
  readonly preferences: {
    readonly units: "metric" | "imperial";
    readonly language: "en" | "nb";
    readonly mapStyle: string;
    readonly privacyLevel: "public" | "friends" | "private";
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface AuthResponse {
  readonly success: boolean;
  readonly user: User;
  readonly tokens: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresIn: number;
  };
}

export interface UserUpdateData {
  readonly name?: string;
  readonly avatar?: string;
  readonly preferences?: Partial<User["preferences"]>;
}

/**
 * Enterprise Authentication Service
 */
export class AuthService {
  private readonly apiClient: ApiClient;
  private readonly logger: Logger;
  private currentUser: User | null = null;
  private refreshTokenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.logger = new Logger("AuthService");
  }

  /**
   * Initialize authentication service
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing authentication service");

    try {
      // Try to restore tokens from storage
      const storedTokens = await this.getStoredTokens();
      if (storedTokens) {
        this.apiClient.setAuthTokens(storedTokens);

        // Validate tokens and get user
        const userResult = await this.getCurrentUser();
        if (userResult.success && userResult.data) {
          this.currentUser = userResult.data;
          this.setupTokenRefresh(storedTokens.expiresIn);
          this.logger.info("Authentication restored from storage");
        } else {
          // Clear invalid tokens
          await this.clearStoredTokens();
        }
      }
    } catch (error) {
      this.logger.error(
        "Failed to initialize authentication",
        undefined,
        error as Error
      );
      await this.clearStoredTokens();
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    this.logger.info("User registration attempt", { email: data.email });

    try {
      const response = await this.apiClient.post<AuthResponse>(
        "/auth/register",
        data
      );

      if (response.success && response.data) {
        await this.handleSuccessfulAuth(response.data);
        this.logger.info("User registration successful", {
          userId: response.data.user.id,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleAuthError(
        error as Error,
        { action: "register" },
        { email: data.email }
      );
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<AuthResponse>> {
    this.logger.info("User login attempt", { email: credentials.email });

    try {
      const response = await this.apiClient.post<AuthResponse>(
        "/auth/login",
        credentials
      );

      if (response.success && response.data) {
        await this.handleSuccessfulAuth(response.data);
        this.logger.info("User login successful", {
          userId: response.data.user.id,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleAuthError(
        error as Error,
        { action: "login" },
        { email: credentials.email }
      );
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    this.logger.info("User logout initiated");

    try {
      const response = await this.apiClient.post<void>("/auth/logout");

      await this.handleLogout();
      this.logger.info("User logout completed");

      return response;
    } catch (error) {
      // Even if logout fails on server, clear local auth
      await this.handleLogout();

      await ErrorHandler.handleAuthError(error as Error, {
        action: "logout",
        userId: this.currentUser?.id,
      });

      throw error;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<ApiResponse<AuthResponse>> {
    this.logger.debug("Refreshing authentication tokens");

    try {
      const storedTokens = await this.getStoredTokens();
      if (!storedTokens?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await this.apiClient.post<AuthResponse>(
        "/auth/refresh",
        {
          refreshToken: storedTokens.refreshToken,
        }
      );

      if (response.success && response.data) {
        await this.handleSuccessfulAuth(response.data);
        this.logger.info("Tokens refreshed successfully");
      } else {
        // If refresh fails, clear local auth data
        await this.handleLogout();
        this.logger.warn("Token refresh failed, clearing local auth data");
      }

      return response;
    } catch (error) {
      // Clear auth if refresh fails
      await this.handleLogout();

      await ErrorHandler.handleAuthError(error as Error, {
        action: "refresh",
        userId: this.currentUser?.id,
      });

      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await this.apiClient.get<User>("/users/me");

      if (response.success && response.data) {
        this.currentUser = response.data;
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleAuthError(error as Error, {
        action: "refresh",
        userId: this.currentUser?.id,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(data: UserUpdateData): Promise<ApiResponse<User>> {
    this.logger.info("Updating user profile", { userId: this.currentUser?.id });

    try {
      const response = await this.apiClient.put<User>("/users/me", data);

      if (response.success && response.data) {
        this.currentUser = response.data;
        this.logger.info("User profile updated successfully");
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleAuthError(error as Error, {
        action: "refresh",
        userId: this.currentUser?.id,
      });
      throw error;
    }
  }

  /**
   * Handle successful authentication
   */
  private async handleSuccessfulAuth(authData: AuthResponse): Promise<void> {
    // Set current user
    this.currentUser = authData.user;

    // Set API client tokens
    this.apiClient.setAuthTokens(authData.tokens);

    // Store tokens securely
    await this.storeTokens(authData.tokens);

    // Setup token refresh
    this.setupTokenRefresh(authData.tokens.expiresIn);
  }

  /**
   * Handle logout (clear all auth data)
   */
  private async handleLogout(): Promise<void> {
    // Clear current user
    this.currentUser = null;

    // Clear API client tokens
    this.apiClient.clearAuthTokens();

    // Clear stored tokens
    await this.clearStoredTokens();

    // Clear token refresh timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(expiresIn: number): void {
    // Clear existing timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    // Set up refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000; // Convert to ms, subtract 5 minutes

    if (refreshTime > 0) {
      this.refreshTokenTimer = setTimeout(async () => {
        try {
          await this.refreshTokens();
        } catch (error) {
          this.logger.error(
            "Automatic token refresh failed",
            undefined,
            error as Error
          );
          // Force logout on refresh failure
          await this.handleLogout();
        }
      }, refreshTime);

      this.logger.debug("Token refresh scheduled", {
        refreshIn: refreshTime / 1000,
      });
    }
  }

  /**
   * Token storage methods
   */
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem("auth_tokens", JSON.stringify(tokens));
      this.logger.debug("Tokens stored successfully");
    } catch (error) {
      this.logger.error(
        "Failed to store authentication tokens",
        undefined,
        error as Error
      );
      // Re-throw the error to make failures visible in tests
      throw error;
    }
  }

  private async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const stored = await AsyncStorage.getItem("auth_tokens");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      this.logger.error(
        "Failed to retrieve stored tokens",
        undefined,
        error as Error
      );
      return null;
    }
  }

  private async clearStoredTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem("auth_tokens");
      this.logger.debug("Stored tokens cleared successfully");
    } catch (error) {
      this.logger.error(
        "Failed to clear stored tokens",
        undefined,
        error as Error
      );
      // Re-throw the error to make failures visible
      throw error;
    }
  }

  /**
   * Getters for current auth state
   */
  get user(): User | null {
    return this.currentUser;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === "admin" || this.currentUser?.role === "ADMIN";
  }

  /**
   * Check if current user has specific permission
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Admin has all permissions
    if (this.currentUser.role === "admin" || this.currentUser.role === "ADMIN") {
      return true;
    }

    // Add specific permission checks here based on your needs
    const userPermissions = [
      "read_own_trails",
      "create_trails",
      "update_own_trails",
      "delete_own_trails",
    ];

    return userPermissions.includes(permission);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }
  }
}
