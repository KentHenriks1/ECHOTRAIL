import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { db } from "../config/database";
import { logger } from "../utils/logger";
import { notificationService } from "./NotificationService";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "PREMIUM" | "ADMIN";
  isVerified: boolean;
  profileImageUrl?: string;
  preferences: {
    language: "en" | "no";
    units: "metric" | "imperial";
    privacy: {
      shareLocation: boolean;
      publicProfile: boolean;
    };
  };
  subscription: {
    status: "FREE" | "PREMIUM" | "ENTERPRISE";
    expiresAt?: Date;
  };
  stats: {
    totalDistance: number;
    totalTrails: number;
    joinedAt: Date;
    lastActivity?: Date;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthCallbacks {
  onAuthStateChange?: (state: AuthState) => void;
  onError?: (error: string) => void;
}

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    token: null,
  };
  private callbacks: AuthCallbacks = {};

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication state from stored data
   */
  private async initializeAuth(): Promise<void> {
    this.authState.isLoading = true;
    this.notifyStateChange();

    try {
      const token = await AsyncStorage.getItem("@echotrail:auth_token");
      const userData = await AsyncStorage.getItem("@echotrail:user_data");

      if (token && userData) {
        const user = JSON.parse(userData);

        // Verify token is still valid
        const isValid = await this.verifyToken(token);
        if (isValid) {
          this.authState = {
            user,
            isAuthenticated: true,
            isLoading: false,
            token,
          };

          // Update last activity
          await this.updateLastActivity();

          logger.info("User authenticated from stored token");
        } else {
          // Token expired, clear stored data
          await this.clearStoredAuth();
        }
      }
    } catch (error) {
      logger.error("Error initializing auth:", error);
      await this.clearStoredAuth();
    }

    this.authState.isLoading = false;
    this.notifyStateChange();
  }

  /**
   * Set authentication callbacks
   */
  setCallbacks(callbacks: AuthCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true;
    this.notifyStateChange();

    try {
      // Validate input
      if (!this.validateEmail(credentials.email)) {
        return { success: false, error: "Ugyldig e-postadresse" };
      }

      if (!credentials.password || credentials.password.length < 6) {
        return { success: false, error: "Passord må være minst 6 tegn" };
      }

      // Hash password for comparison
      const passwordHash = await this.hashPassword(credentials.password);

      // Find user in database
      const user = await db("users")
        .where("email", credentials.email.toLowerCase())
        .first();

      if (!user) {
        return { success: false, error: "Ugyldig e-post eller passord" };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(
        credentials.password,
        user.password_hash
      );
      if (!isValidPassword) {
        return { success: false, error: "Ugyldig e-post eller passord" };
      }

      // Check if user is active
      if (!user.is_active) {
        return { success: false, error: "Konto er deaktivert" };
      }

      // Generate session token
      const token = await this.generateSessionToken();
      const expiresAt = new Date(
        Date.now() + (credentials.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000
      );

      // Create session in database
      await db("user_sessions").insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
        device_info: await this.getDeviceInfo(),
      });

      // Update last login
      await db("users").where("id", user.id).update({
        last_login_at: db.fn.now(),
        last_activity_at: db.fn.now(),
      });

      // Create user object
      const userData = await this.createUserObject(user);

      // Store authentication data
      if (credentials.rememberMe) {
        await AsyncStorage.setItem("@echotrail:auth_token", token);
        await AsyncStorage.setItem(
          "@echotrail:user_data",
          JSON.stringify(userData)
        );
      }

      // Update auth state
      this.authState = {
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        token,
      };

      this.notifyStateChange();
      logger.info(`User ${user.email} logged in successfully`);

      return { success: true };
    } catch (error) {
      logger.error("Login error:", error);
      this.authState.isLoading = false;
      this.notifyStateChange();

      return {
        success: false,
        error: "En feil oppstod under innlogging. Prøv igjen.",
      };
    }
  }

  /**
   * Register new user
   */
  async register(
    data: RegisterData
  ): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true;
    this.notifyStateChange();

    try {
      // Validate input
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Check if email already exists
      const existingUser = await db("users")
        .where("email", data.email.toLowerCase())
        .first();

      if (existingUser) {
        return { success: false, error: "E-postadresse er allerede i bruk" };
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Generate verification token
      const verificationToken = await this.generateVerificationToken();

      // Create user in database
      const [userId] = await db("users")
        .insert({
          name: data.name.trim(),
          email: data.email.toLowerCase(),
          password_hash: passwordHash,
          verification_token: verificationToken,
          language: "no", // Default to Norwegian
          preferences: {
            language: "no",
            units: "metric",
            privacy: {
              shareLocation: false,
              publicProfile: false,
            },
          },
        })
        .returning("id");

      // Send verification email (mock implementation)
      await this.sendVerificationEmail(data.email, verificationToken);

      // Send welcome notification
      await notificationService.scheduleNotification(
        {
          type: "system_update",
          title: "Velkommen til EchoTrail!",
          body: "Din konto er opprettet. Sjekk e-posten din for å verifisere kontoen.",
          data: { userId: userId.id, notificationType: "WELCOME" },
        },
        new Date()
      );

      logger.info(`New user registered: ${data.email}`);

      return { success: true };
    } catch (error) {
      logger.error("Registration error:", error);
      return {
        success: false,
        error: "En feil oppstod under registrering. Prøv igjen.",
      };
    } finally {
      this.authState.isLoading = false;
      this.notifyStateChange();
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Invalidate session in database
      if (this.authState.token) {
        await db("user_sessions")
          .where("token", this.authState.token)
          .update({ is_active: false });
      }

      // Clear stored authentication data
      await this.clearStoredAuth();

      // Reset auth state
      this.authState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null,
      };

      this.notifyStateChange();
      logger.info("User logged out successfully");
    } catch (error) {
      logger.error("Logout error:", error);
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db("users")
        .where("verification_token", token)
        .where("is_verified", false)
        .first();

      if (!user) {
        return {
          success: false,
          error: "Ugyldig eller utløpt verifiseringstoken",
        };
      }

      // Update user as verified
      await db("users").where("id", user.id).update({
        is_verified: true,
        verification_token: null,
        updated_at: db.fn.now(),
      });

      // Send verification success notification
      await notificationService.scheduleNotification(
        {
          type: "system_update",
          title: "E-post verifisert!",
          body: "Din konto er nå fullstendig aktivert.",
          data: { userId: user.id, notificationType: "VERIFICATION_SUCCESS" },
        },
        new Date()
      );

      logger.info(`Email verified for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error("Email verification error:", error);
      return {
        success: false,
        error: "En feil oppstod under verifisering.",
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await db("users")
        .where("email", email.toLowerCase())
        .where("is_active", true)
        .first();

      if (!user) {
        // Don't reveal if email exists for security
        return { success: true };
      }

      // Generate reset token
      const resetToken = await this.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await db("users").where("id", user.id).update({
        reset_token: resetToken,
        reset_expires_at: expiresAt,
        updated_at: db.fn.now(),
      });

      // Send reset email (mock implementation)
      await this.sendResetPasswordEmail(email, resetToken);

      logger.info(`Password reset requested for: ${email}`);
      return { success: true };
    } catch (error) {
      logger.error("Password reset error:", error);
      return {
        success: false,
        error: "En feil oppstod. Prøv igjen.",
      };
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (newPassword.length < 6) {
        return { success: false, error: "Passord må være minst 6 tegn" };
      }

      const user = await db("users")
        .where("reset_token", token)
        .where("reset_expires_at", ">", db.fn.now())
        .first();

      if (!user) {
        return { success: false, error: "Ugyldig eller utløpt token" };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update user password
      await db("users").where("id", user.id).update({
        password_hash: passwordHash,
        reset_token: null,
        reset_expires_at: null,
        updated_at: db.fn.now(),
      });

      // Invalidate all existing sessions
      await db("user_sessions")
        .where("user_id", user.id)
        .update({ is_active: false });

      logger.info(`Password reset completed for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error("Password reset confirmation error:", error);
      return {
        success: false,
        error: "En feil oppstod. Prøv igjen.",
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    updates: Partial<{
      name: string;
      preferences: Partial<User["preferences"]>;
      profileImageUrl: string;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.authState.user) {
      return { success: false, error: "Ikke innlogget" };
    }

    try {
      const updateData: any = {};

      if (updates.name) {
        updateData.name = updates.name.trim();
      }

      if (updates.profileImageUrl) {
        updateData.profile_image_url = updates.profileImageUrl;
      }

      if (updates.preferences) {
        const currentPreferences = this.authState.user.preferences;
        updateData.preferences = {
          ...currentPreferences,
          ...updates.preferences,
        };
      }

      updateData.updated_at = db.fn.now();

      // Update in database
      await db("users").where("id", this.authState.user.id).update(updateData);

      // Update local state with proper type handling
      if (updates.preferences) {
        this.authState.user = {
          ...this.authState.user,
          name: updates.name || this.authState.user.name,
          profileImageUrl:
            updates.profileImageUrl || this.authState.user.profileImageUrl,
          preferences: {
            ...this.authState.user.preferences,
            ...updates.preferences,
          },
        };
      } else {
        this.authState.user = {
          ...this.authState.user,
          name: updates.name || this.authState.user.name,
          profileImageUrl:
            updates.profileImageUrl || this.authState.user.profileImageUrl,
        };
      }

      // Update stored user data
      await AsyncStorage.setItem(
        "@echotrail:user_data",
        JSON.stringify(this.authState.user)
      );

      this.notifyStateChange();
      logger.info(`Profile updated for user: ${this.authState.user.email}`);

      return { success: true };
    } catch (error) {
      logger.error("Profile update error:", error);
      return {
        success: false,
        error: "En feil oppstod under oppdatering.",
      };
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authState.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.user;
  }

  // Private helper methods

  private notifyStateChange(): void {
    this.callbacks.onAuthStateChange?.(this.authState);
  }

  private async hashPassword(password: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + "echotrail_salt"
    );
  }

  private async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  private async generateSessionToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return randomBytes.reduce(
      (hex, byte) => hex + byte.toString(16).padStart(2, "0"),
      ""
    );
  }

  private async generateVerificationToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return randomBytes.reduce(
      (hex, byte) => hex + byte.toString(16).padStart(2, "0"),
      ""
    );
  }

  private async generateResetToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return randomBytes.reduce(
      (hex, byte) => hex + byte.toString(16).padStart(2, "0"),
      ""
    );
  }

  private async verifyToken(token: string): Promise<boolean> {
    try {
      const session = await db("user_sessions")
        .where("token", token)
        .where("is_active", true)
        .where("expires_at", ">", db.fn.now())
        .first();

      return !!session;
    } catch (error) {
      logger.error("Token verification error:", error);
      return false;
    }
  }

  private async updateLastActivity(): Promise<void> {
    if (!this.authState.user) return;

    try {
      await db("users")
        .where("id", this.authState.user.id)
        .update({ last_activity_at: db.fn.now() });

      if (this.authState.token) {
        await db("user_sessions")
          .where("token", this.authState.token)
          .update({ last_used_at: db.fn.now() });
      }
    } catch (error) {
      logger.error("Error updating last activity:", error);
    }
  }

  private async clearStoredAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      "@echotrail:auth_token",
      "@echotrail:user_data",
    ]);
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateRegistrationData(data: RegisterData): {
    isValid: boolean;
    error?: string;
  } {
    if (!data.name || data.name.trim().length < 2) {
      return { isValid: false, error: "Navn må være minst 2 tegn" };
    }

    if (!this.validateEmail(data.email)) {
      return { isValid: false, error: "Ugyldig e-postadresse" };
    }

    if (!data.password || data.password.length < 6) {
      return { isValid: false, error: "Passord må være minst 6 tegn" };
    }

    if (data.password !== data.confirmPassword) {
      return { isValid: false, error: "Passord stemmer ikke overens" };
    }

    if (!data.acceptTerms) {
      return { isValid: false, error: "Du må akseptere vilkårene" };
    }

    return { isValid: true };
  }

  private async createUserObject(dbUser: any): Promise<User> {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      isVerified: dbUser.is_verified,
      profileImageUrl: dbUser.profile_image_url,
      preferences: dbUser.preferences || {
        language: "no",
        units: "metric",
        privacy: {
          shareLocation: false,
          publicProfile: false,
        },
      },
      subscription: {
        status: dbUser.subscription_status,
        expiresAt: dbUser.subscription_expires_at
          ? new Date(dbUser.subscription_expires_at)
          : undefined,
      },
      stats: {
        totalDistance: dbUser.total_distance || 0,
        totalTrails: dbUser.total_trails || 0,
        joinedAt: new Date(dbUser.created_at),
        lastActivity: dbUser.last_activity_at
          ? new Date(dbUser.last_activity_at)
          : undefined,
      },
    };
  }

  private async getDeviceInfo(): Promise<object> {
    // Mock device info - in a real app this would get actual device information
    return {
      platform: "mobile",
      version: "1.0.0",
    };
  }

  private async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<void> {
    // Mock email sending - in a real app this would integrate with email service
    logger.info(`Verification email sent to ${email} with token: ${token}`);
  }

  private async sendResetPasswordEmail(
    email: string,
    token: string
  ): Promise<void> {
    // Mock email sending - in a real app this would integrate with email service
    logger.info(`Password reset email sent to ${email} with token: ${token}`);
  }
}

export const authService = AuthService.getInstance();
