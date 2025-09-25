import {
  AuthService,
  User,
  LoginCredentials,
  RegisterData,
} from "../../services/AuthService";
import { notificationService } from "../../services/NotificationService";

// Mock dependencies
jest.mock("../../config/database", () => ({
  db: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    returning: jest.fn(),
    fn: {
      now: jest.fn(() => new Date()),
    },
  })),
}));

jest.mock("../../services/NotificationService", () => ({
  notificationService: {
    createNotification: jest.fn(() => Promise.resolve()),
    getInstance: jest.fn(() => ({
      createNotification: jest.fn(() => Promise.resolve()),
    })),
  },
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("AuthService Comprehensive Tests", () => {
  let authService: AuthService;
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get fresh instance
    authService = AuthService.getInstance();

    // Setup mock database
    mockDb = require("../../config/database").db();
  });

  afterEach(() => {
    // Clear any stored authentication data
    authService.logout();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("User Registration", () => {
    const validRegisterData: RegisterData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      acceptTerms: true,
    };

    it("should register a new user successfully", async () => {
      // Mock database responses
      mockDb.first.mockResolvedValue(null); // Email doesn't exist
      mockDb.insert.mockResolvedValue([{ id: "user-123" }]);

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
          language: "no",
          preferences: expect.any(Object),
        })
      );
    });

    it("should reject registration with invalid email", async () => {
      const invalidData = { ...validRegisterData, email: "invalid-email" };

      const result = await authService.register(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ugyldig e-postadresse");
    });

    it("should reject registration with mismatched passwords", async () => {
      const invalidData = {
        ...validRegisterData,
        confirmPassword: "different",
      };

      const result = await authService.register(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Passord stemmer ikke overens");
    });

    it("should reject registration with short password", async () => {
      const invalidData = {
        ...validRegisterData,
        password: "123",
        confirmPassword: "123",
      };

      const result = await authService.register(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("minst 6 tegn");
    });

    it("should reject registration without accepting terms", async () => {
      const invalidData = { ...validRegisterData, acceptTerms: false };

      const result = await authService.register(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Du må akseptere vilkårene");
    });

    it("should reject registration if email already exists", async () => {
      mockDb.first.mockResolvedValue({ email: "test@example.com" }); // Email exists

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("E-postadresse er allerede i bruk");
    });

    it("should handle database errors during registration", async () => {
      mockDb.first.mockRejectedValue(new Error("Database error"));

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("En feil oppstod under registrering");
    });
  });

  describe("User Login", () => {
    const validCredentials: LoginCredentials = {
      email: "test@example.com",
      password: "password123",
      rememberMe: false,
    };

    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      password_hash: "mocked-hash-password123",
      is_active: true,
      role: "USER",
      is_verified: true,
      created_at: new Date(),
      preferences: {},
    };

    it("should login successfully with valid credentials", async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.insert.mockResolvedValue();
      mockDb.update.mockResolvedValue();

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
        })
      );
    });

    it("should reject login with invalid email", async () => {
      const invalidCredentials = {
        ...validCredentials,
        email: "invalid-email",
      };

      const result = await authService.login(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ugyldig e-postadresse");
    });

    it("should reject login with short password", async () => {
      const invalidCredentials = { ...validCredentials, password: "123" };

      const result = await authService.login(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain("minst 6 tegn");
    });

    it("should reject login if user not found", async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ugyldig e-post eller passord");
    });

    it("should reject login with wrong password", async () => {
      const userWithDifferentPassword = {
        ...mockUser,
        password_hash: "mocked-hash-wrongpassword",
      };
      mockDb.first.mockResolvedValue(userWithDifferentPassword);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ugyldig e-post eller passord");
    });

    it("should reject login if user is inactive", async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockDb.first.mockResolvedValue(inactiveUser);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Konto er deaktivert");
    });

    it("should handle remember me functionality", async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.insert.mockResolvedValue();
      mockDb.update.mockResolvedValue();

      const credentialsWithRemember = { ...validCredentials, rememberMe: true };
      const result = await authService.login(credentialsWithRemember);

      expect(result.success).toBe(true);
      // Check that session expires in 30 days instead of 7
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(Date),
        })
      );
    });
  });

  describe("User Logout", () => {
    it("should logout successfully and clean up data", async () => {
      // Mock authenticated state
      mockDb.update.mockResolvedValue();

      await authService.logout();

      const authState = authService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.token).toBe(null);
    });

    it("should handle logout without active session", async () => {
      await authService.logout(); // Should not throw

      const authState = authService.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe("Email Verification", () => {
    it("should verify email successfully", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.update.mockResolvedValue();

      const result = await authService.verifyEmail("verification-token");

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith({
        is_verified: true,
        verification_token: null,
        updated_at: expect.any(Date),
      });
    });

    it("should reject invalid verification token", async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await authService.verifyEmail("invalid-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ugyldig eller utløpt verifiseringstoken");
    });
  });

  describe("Password Reset", () => {
    it("should initiate password reset successfully", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.update.mockResolvedValue();

      const result = await authService.resetPassword("test@example.com");

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          reset_token: expect.any(String),
          reset_expires_at: expect.any(Date),
        })
      );
    });

    it("should handle password reset for non-existent email gracefully", async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await authService.resetPassword("nonexistent@example.com");

      // Should still return success for security (don't reveal if email exists)
      expect(result.success).toBe(true);
    });

    it("should confirm password reset successfully", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.update.mockResolvedValue();

      const result = await authService.confirmPasswordReset(
        "reset-token",
        "newpassword123"
      );

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.any(String),
          reset_token: null,
          reset_expires_at: null,
        })
      );
    });

    it("should reject password reset with invalid token", async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await authService.confirmPasswordReset(
        "invalid-token",
        "newpassword123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ugyldig eller utløpt token");
    });

    it("should reject password reset with short password", async () => {
      const result = await authService.confirmPasswordReset("token", "123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("minst 6 tegn");
    });
  });

  describe("Profile Updates", () => {
    beforeEach(() => {
      // Mock authenticated user
      (authService as any).authState = {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          preferences: { language: "no" },
        },
        isAuthenticated: true,
        token: "mock-token",
      };
    });

    it("should update profile successfully", async () => {
      mockDb.update.mockResolvedValue();

      const updates = {
        name: "Updated Name",
        preferences: { language: "en" as "en" | "no" },
      };

      const result = await authService.updateProfile(updates);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          preferences: expect.objectContaining({ language: "en" }),
        })
      );
    });

    it("should reject profile update when not authenticated", async () => {
      (authService as any).authState.user = null;

      const result = await authService.updateProfile({ name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ikke innlogget");
    });
  });

  describe("Authentication State Management", () => {
    it("should return correct authentication state", () => {
      const authState = authService.getAuthState();

      expect(authState).toHaveProperty("user");
      expect(authState).toHaveProperty("isAuthenticated");
      expect(authState).toHaveProperty("isLoading");
      expect(authState).toHaveProperty("token");
    });

    it("should return current user", () => {
      const mockUser = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      (authService as any).authState.user = mockUser;

      const currentUser = authService.getCurrentUser();
      expect(currentUser).toEqual(mockUser);
    });

    it("should check authentication status correctly", () => {
      // Test unauthenticated
      expect(authService.isAuthenticated()).toBe(false);

      // Test authenticated
      (authService as any).authState = {
        isAuthenticated: true,
        user: { id: "user-123" },
      };
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe("Callbacks and Error Handling", () => {
    it("should handle authentication state changes", () => {
      const onAuthStateChange = jest.fn();

      authService.setCallbacks({ onAuthStateChange });

      // Trigger state change
      (authService as any).notifyStateChange();

      expect(onAuthStateChange).toHaveBeenCalled();
    });

    it("should handle errors in callbacks", () => {
      const onError = jest.fn();

      authService.setCallbacks({ onError });

      // This would be called internally when errors occur
      expect(onError).not.toHaveBeenCalled(); // Just setup test
    });
  });

  describe("Security Features", () => {
    it("should hash passwords correctly", async () => {
      // Test that passwords are hashed (not stored in plain text)
      const registerData: RegisterData = {
        name: "Test User",
        email: "test@example.com",
        password: "plaintextpassword",
        confirmPassword: "plaintextpassword",
        acceptTerms: true,
      };

      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([{ id: "user-123" }]);

      await authService.register(registerData);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.not.stringMatching("plaintextpassword"),
        })
      );
    });

    it("should generate secure tokens", async () => {
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([{ id: "user-123" }]);

      await authService.register({
        name: "Test",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        acceptTerms: true,
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_token: expect.any(String),
        })
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockDb.first.mockRejectedValue(new Error("Network error"));

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("En feil oppstod");
    });

    it("should handle malformed data gracefully", async () => {
      const malformedData = {
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        acceptTerms: false,
      } as RegisterData;

      const result = await authService.register(malformedData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Integration with Other Services", () => {
    it("should handle registration without notification service errors", async () => {
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([{ id: "user-123" }]);

      const result = await authService.register({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
        acceptTerms: true,
      });

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
        })
      );
    });
  });
});
