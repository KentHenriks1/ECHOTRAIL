/**
 * PostgREST Authentication Adapter
 * Simple auth adapter that bypasses traditional JWT auth for demo purposes
 * In production, integrate with proper JWT validation service
 */

import { ApiClient, ApiResponse } from "./ApiClient";
import { Logger } from "../../core/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatar?: string;
  readonly role: "USER" | "ADMIN";
  readonly preferences: any;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface AuthResponse {
  readonly success: boolean;
  readonly user: User;
  readonly token: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly expiresAt: string;
}

export interface TokenRefreshResponse {
  readonly success: boolean;
  readonly token: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly expiresAt: string;
}

/**
 * PostgREST Auth Adapter - Demo Implementation
 * For production, replace with proper JWT auth service
 */
export class PostgRESTAuthAdapter {
  private readonly apiClient: ApiClient;
  private readonly logger: Logger;
  private currentUser: User | null = null;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshTimeoutId: NodeJS.Timeout | null = null;

  // Demo JWT token for PostgREST (in production, get from auth service)
  private readonly demoToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbnltb3VzIiwiZXhwIjoxNzI2OTY2ODAwfQ.demo-token-for-postgrest-auth";
  
  // Storage keys
  private static readonly AUTH_TOKEN_KEY = "auth_token";
  private static readonly REFRESH_TOKEN_KEY = "refresh_token";
  private static readonly CURRENT_USER_KEY = "current_user";
  private static readonly TOKEN_EXPIRES_AT_KEY = "token_expires_at";

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.logger = new Logger("PostgRESTAuthAdapter");
  }

  /**
   * Demo login - finds user in database and returns auth token
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    this.logger.info("Login attempt", { email: credentials.email });

    try {
      // Query PostgREST for user by email
      const userResponse = await this.apiClient.request<User[]>({
        method: "GET",
        url: `/users?email=eq.${credentials.email}`,
        headers: {
          'Authorization': `Bearer ${this.demoToken}`,
        },
      });

      if (!userResponse.success || !userResponse.data || userResponse.data.length === 0) {
        return {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        };
      }

      const user = userResponse.data[0];
      
      // For demo purposes, accept any password
      // In production, verify password hash

      // Generate tokens with proper expiry
      const expiresIn = 86400; // 24 hours
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const accessToken = this.generateDemoToken(expiresAt);
      const newRefreshToken = this.generateDemoRefreshToken();
      
      // Store auth state
      this.authToken = accessToken;
      this.refreshToken = newRefreshToken;
      this.tokenExpiresAt = expiresAt;
      this.currentUser = user;
      
      // Set tokens on API client for future requests
      this.apiClient.setAuthTokens({
        accessToken: accessToken,
        refreshToken: newRefreshToken,
        expiresIn: expiresIn,
      });

      // Store tokens and user in AsyncStorage
      await this.storeTokens({
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString(),
      });
      await AsyncStorage.setItem(PostgRESTAuthAdapter.CURRENT_USER_KEY, JSON.stringify(user));
      
      // Schedule automatic token refresh
      this.scheduleTokenRefresh();

      this.logger.info("Login successful", { userId: user.id });

      return {
        success: true,
        data: {
          success: true,
          user: user,
          token: accessToken,
          refreshToken: newRefreshToken,
          expiresIn: expiresIn,
          expiresAt: expiresAt.toISOString(),
        },
      };

    } catch (error) {
      this.logger.error("Login failed", undefined, error as Error);
      return {
        success: false,
        error: {
          code: "LOGIN_ERROR",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Demo register - creates new user in database
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse<AuthResponse>> {
    this.logger.info("Registration attempt", { email: data.email });

    try {
      // Create new user in PostgREST
      const newUserResponse = await this.apiClient.request<User>({
        method: "POST",
        url: "/users",
        headers: {
          'Authorization': `Bearer ${this.demoToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        data: {
          email: data.email,
          name: data.name,
          passwordHash: "hashed-" + data.password, // In production, hash properly
          role: "USER",
          preferences: JSON.stringify({}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      if (!newUserResponse.success || !newUserResponse.data) {
        return {
          success: false,
          error: {
            code: "REGISTRATION_ERROR",
            message: "Failed to create user",
          },
        };
      }

      const user = Array.isArray(newUserResponse.data) 
        ? newUserResponse.data[0] 
        : newUserResponse.data;

      // Generate tokens with proper expiry
      const expiresIn = 86400; // 24 hours
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const accessToken = this.generateDemoToken(expiresAt);
      const newRefreshToken = this.generateDemoRefreshToken();
      
      // Store auth state
      this.authToken = accessToken;
      this.refreshToken = newRefreshToken;
      this.tokenExpiresAt = expiresAt;
      this.currentUser = user;
      
      this.apiClient.setAuthTokens({
        accessToken: accessToken,
        refreshToken: newRefreshToken,
        expiresIn: expiresIn,
      });

      // Store tokens and user in AsyncStorage
      await this.storeTokens({
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString(),
      });
      await AsyncStorage.setItem(PostgRESTAuthAdapter.CURRENT_USER_KEY, JSON.stringify(user));
      
      // Schedule automatic token refresh
      this.scheduleTokenRefresh();

      this.logger.info("Registration successful", { userId: user.id });

      return {
        success: true,
        data: {
          success: true,
          user: user,
          token: accessToken,
          refreshToken: newRefreshToken,
          expiresIn: expiresIn,
          expiresAt: expiresAt.toISOString(),
        },
      };

    } catch (error) {
      this.logger.error("Registration failed", undefined, error as Error);
      return {
        success: false,
        error: {
          code: "REGISTRATION_ERROR",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      // Cancel scheduled refresh
      if (this.refreshTimeoutId) {
        clearTimeout(this.refreshTimeoutId);
        this.refreshTimeoutId = null;
      }
      
      // Clear local state
      this.currentUser = null;
      this.authToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = null;
      this.apiClient.clearAuthTokens();

      // Clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(PostgRESTAuthAdapter.AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(PostgRESTAuthAdapter.REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(PostgRESTAuthAdapter.CURRENT_USER_KEY),
        AsyncStorage.removeItem(PostgRESTAuthAdapter.TOKEN_EXPIRES_AT_KEY),
      ]);

      this.logger.info("Logout successful");

      return {
        success: true,
      };

    } catch (error) {
      this.logger.error("Logout failed", undefined, error as Error);
      return {
        success: false,
        error: {
          code: "LOGOUT_ERROR",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Refresh auth token
   */
  async refreshAuthToken(): Promise<ApiResponse<TokenRefreshResponse>> {
    this.logger.info("Refreshing auth token");

    try {
      if (!this.refreshToken) {
        return {
          success: false,
          error: {
            code: "NO_REFRESH_TOKEN",
            message: "No refresh token available",
          },
        };
      }

      // In production, call your auth service to refresh token
      // For demo, generate new tokens with extended expiry
      const newExpiresIn = 86400; // 24 hours
      const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000);
      const newToken = this.generateDemoToken(newExpiresAt);
      const newRefreshToken = this.generateDemoRefreshToken();

      // Update local state
      this.authToken = newToken;
      this.refreshToken = newRefreshToken;
      this.tokenExpiresAt = newExpiresAt;

      // Update API client
      this.apiClient.setAuthTokens({
        accessToken: newToken,
        refreshToken: newRefreshToken,
        expiresIn: newExpiresIn,
      });

      // Store in AsyncStorage
      await this.storeTokens({
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt.toISOString(),
      });

      // Schedule next refresh
      this.scheduleTokenRefresh();

      this.logger.info("Token refreshed successfully");

      return {
        success: true,
        data: {
          success: true,
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: newExpiresIn,
          expiresAt: newExpiresAt.toISOString(),
        },
      };

    } catch (error) {
      this.logger.error("Token refresh failed", undefined, error as Error);
      // If refresh fails, logout user
      await this.logout();
      return {
        success: false,
        error: {
          code: "REFRESH_FAILED",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Check if token needs refresh
   */
  private needsTokenRefresh(): boolean {
    if (!this.tokenExpiresAt) return false;
    
    // Refresh if token expires in less than 5 minutes
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes in ms
    return (this.tokenExpiresAt.getTime() - Date.now()) < refreshThreshold;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    // Clear existing timeout
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }

    if (!this.tokenExpiresAt) return;

    // Schedule refresh 5 minutes before expiry
    const refreshTime = this.tokenExpiresAt.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeoutId = setTimeout(() => {
        this.refreshAuthToken().catch(error => {
          this.logger.error("Scheduled token refresh failed", undefined, error);
        });
      }, refreshTime);
    }
  }

  /**
   * Generate demo JWT token with expiry
   */
  private generateDemoToken(expiresAt: Date): string {
    // In production, this would come from your auth service
    const payload = {
      role: "authenticated",
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
      userId: this.currentUser?.id,
    };
    
    // This is a demo token - in production, use proper JWT signing
    return `${this.demoToken}.${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  }

  /**
   * Generate demo refresh token
   */
  private generateDemoRefreshToken(): string {
    // In production, this would be a secure random token
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store tokens in AsyncStorage
   */
  private async storeTokens(data: {
    token: string;
    refreshToken: string;
    expiresAt: string;
  }): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(PostgRESTAuthAdapter.AUTH_TOKEN_KEY, data.token),
      AsyncStorage.setItem(PostgRESTAuthAdapter.REFRESH_TOKEN_KEY, data.refreshToken),
      AsyncStorage.setItem(PostgRESTAuthAdapter.TOKEN_EXPIRES_AT_KEY, data.expiresAt),
    ]);
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (this.currentUser) {
      return {
        success: true,
        data: this.currentUser,
      };
    }

    try {
      // Try to restore from AsyncStorage
      const [storedUser, storedToken, storedRefreshToken, storedExpiresAt] = await Promise.all([
        AsyncStorage.getItem(PostgRESTAuthAdapter.CURRENT_USER_KEY),
        AsyncStorage.getItem(PostgRESTAuthAdapter.AUTH_TOKEN_KEY),
        AsyncStorage.getItem(PostgRESTAuthAdapter.REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(PostgRESTAuthAdapter.TOKEN_EXPIRES_AT_KEY),
      ]);

      if (storedUser && storedToken && storedRefreshToken && storedExpiresAt) {
        this.currentUser = JSON.parse(storedUser);
        this.authToken = storedToken;
        this.refreshToken = storedRefreshToken;
        this.tokenExpiresAt = new Date(storedExpiresAt);
        
        // Check if token is expired
        if (this.tokenExpiresAt.getTime() <= Date.now()) {
          this.logger.info("Stored token is expired, attempting refresh");
          const refreshResult = await this.refreshAuthToken();
          if (!refreshResult.success) {
            return {
              success: false,
              error: {
                code: "TOKEN_EXPIRED",
                message: "Token expired and refresh failed",
              },
            };
          }
        } else {
          // Set tokens on API client
          this.apiClient.setAuthTokens({
            accessToken: storedToken,
            refreshToken: storedRefreshToken,
            expiresIn: Math.floor((this.tokenExpiresAt.getTime() - Date.now()) / 1000),
          });
          
          // Schedule refresh if needed
          this.scheduleTokenRefresh();
          
          // Auto-refresh if close to expiry
          if (this.needsTokenRefresh()) {
            this.refreshAuthToken().catch(error => {
              this.logger.error("Background token refresh failed", undefined, error);
            });
          }
        }

        return {
          success: true,
          data: this.currentUser!,
        };
      }

      return {
        success: false,
        error: {
          code: "NOT_AUTHENTICATED",
          message: "No authenticated user found",
        },
      };

    } catch (error) {
      this.logger.error("Failed to get current user", undefined, error as Error);
      return {
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Check if user is authenticated with valid tokens
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && 
           this.authToken !== null && 
           this.refreshToken !== null &&
           this.tokenExpiresAt !== null &&
           this.tokenExpiresAt.getTime() > Date.now();
  }
  
  /**
   * Check if session is still valid (not expired)
   */
  isSessionValid(): boolean {
    return this.tokenExpiresAt !== null && this.tokenExpiresAt.getTime() > Date.now();
  }
  
  /**
   * Get time until token expires (in minutes)
   */
  getTokenExpiryMinutes(): number | null {
    if (!this.tokenExpiresAt) return null;
    const diffMs = this.tokenExpiresAt.getTime() - Date.now();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    this.logger.info("Password reset requested", { email });
    
    try {
      // Check if user exists
      const userResponse = await this.apiClient.request<User[]>({
        method: "GET",
        url: `/users?email=eq.${email}`,
        headers: {
          'Authorization': `Bearer ${this.demoToken}`,
        },
      });
      
      if (!userResponse.success || !userResponse.data || userResponse.data.length === 0) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          data: {
            message: "If an account with that email exists, a password reset link has been sent.",
          },
        };
      }
      
      // In production, send actual reset email
      // For demo, just return success message
      this.logger.info("Password reset email sent (demo)", { email });
      
      return {
        success: true,
        data: {
          message: "If an account with that email exists, a password reset link has been sent.",
        },
      };
      
    } catch (error) {
      this.logger.error("Password reset request failed", undefined, error as Error);
      return {
        success: false,
        error: {
          code: "RESET_ERROR",
          message: (error as Error).message,
        },
      };
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<{
    name: string;
    email: string;
    preferences: any;
  }>): Promise<ApiResponse<User>> {
    this.logger.info("Profile update requested", { userId: this.currentUser?.id });
    
    if (!this.currentUser) {
      return {
        success: false,
        error: {
          code: "NOT_AUTHENTICATED",
          message: "Must be authenticated to update profile",
        },
      };
    }
    
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      if (updates.preferences) {
        updateData.preferences = JSON.stringify(updates.preferences);
      }
      
      const updateResponse = await this.apiClient.request<User>({
        method: "PATCH",
        url: `/users?id=eq.${this.currentUser.id}`,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        data: updateData,
      });
      
      if (!updateResponse.success || !updateResponse.data) {
        return {
          success: false,
          error: {
            code: "UPDATE_ERROR",
            message: "Failed to update profile",
          },
        };
      }
      
      const updatedUser = Array.isArray(updateResponse.data) 
        ? updateResponse.data[0] 
        : updateResponse.data;
      
      // Update local user state
      this.currentUser = updatedUser;
      await AsyncStorage.setItem(PostgRESTAuthAdapter.CURRENT_USER_KEY, JSON.stringify(updatedUser));
      
      this.logger.info("Profile updated successfully", { userId: updatedUser.id });
      
      return {
        success: true,
        data: updatedUser,
      };
      
    } catch (error) {
      this.logger.error("Profile update failed", undefined, error as Error);
      return {
        success: false,
        error: {
          code: "UPDATE_ERROR",
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Initialize auth from stored state
   */
  async initialize(): Promise<void> {
    try {
      const result = await this.getCurrentUser();
      if (result.success) {
        this.logger.info("Auth initialized from stored state");
      }
    } catch (error) {
      this.logger.error("Failed to initialize auth", undefined, error as Error);
    }
  }
}