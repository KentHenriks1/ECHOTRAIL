/**
 * Enterprise Authentication Provider
 * Integrates with backend API and provides auth context
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { ApiServices } from "../services/api";
import type {
  User,
  LoginCredentials,
} from "../services/api/PostgRESTAuthAdapter";
import type {
  RegisterData,
  UserUpdateData,
} from "../services/api/AuthService";
import type { AuthConfig } from "../core/config/types";
import { Logger } from "../core/utils";

interface AuthContextValue {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth actions
  login: (_credentials: LoginCredentials) => Promise<void>;
  register: (_data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (_data: UserUpdateData) => Promise<void>;
  refreshTokens: () => Promise<void>;

  // Permissions
  hasPermission: (_permission: string) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  config: AuthConfig;
  children: React.ReactNode;
}

/**
 * Hook for basic auth actions (login/register/logout)
 */
const useBasicAuthActions = (
  setUser: (_user: User | null) => void,
  setIsLoading: (_loading: boolean) => void,
  logger: Logger
) => {
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      logger.info("Login attempt", { email: credentials.email });
      setIsLoading(true);

      try {
        const response = await ApiServices.auth.login(credentials);

        if (response.success && response.data) {
          setUser(response.data.user);
          logger.info("Login successful", { userId: response.data.user.id });
        } else {
          throw new Error(response.error?.message || "Login failed");
        }
      } catch (error) {
        logger.error(
          "Login failed",
          { email: credentials.email },
          error as Error
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [logger, setUser, setIsLoading]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      logger.info("Registration attempt", { email: data.email });
      setIsLoading(true);

      try {
        const response = await ApiServices.auth.register(data);

        if (response.success && response.data) {
          setUser(response.data.user);
          logger.info("Registration successful", {
            userId: response.data.user.id,
          });
        } else {
          throw new Error(response.error?.message || "Registration failed");
        }
      } catch (error) {
        logger.error(
          "Registration failed",
          { email: data.email },
          error as Error
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [logger, setUser, setIsLoading]
  );

  const logout = useCallback(async () => {
    logger.info("Logout initiated");
    setIsLoading(true);

    try {
      await ApiServices.auth.logout();
      setUser(null);
      logger.info("Logout completed");
    } catch (error) {
      // Even if server logout fails, clear local state
      setUser(null);
      logger.error(
        "Logout error (local state cleared)",
        undefined,
        error as Error
      );
    } finally {
      setIsLoading(false);
    }
  }, [logger, setUser, setIsLoading]);

  return { login, register, logout };
};

/**
 * Hook for user actions and token refresh
 */
const useUserActions = (
  user: User | null,
  setUser: (_user: User | null) => void,
  setIsLoading: (_loading: boolean) => void,
  logger: Logger
) => {
  const updateUser = useCallback(
    async (data: UserUpdateData) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      logger.info("Updating user profile", { userId: user.id });
      setIsLoading(true);

      try {
        const response = await ApiServices.auth.updateProfile(data);

        if (response.success && response.data) {
          setUser(response.data);
          logger.info("User profile updated", { userId: response.data.id });
        } else {
          throw new Error(response.error?.message || "Profile update failed");
        }
      } catch (error) {
        logger.error(
          "Profile update failed",
          { userId: user.id },
          error as Error
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user, logger, setUser, setIsLoading]
  );

  const refreshTokens = useCallback(async () => {
    logger.debug("Refreshing authentication tokens");

    try {
      const response = await ApiServices.auth.refreshAuthToken();

      if (response.success) {
        logger.info("Tokens refreshed successfully");
        // User remains the same, just tokens are refreshed
      } else {
        throw new Error(response.error?.message || "Token refresh failed");
      }
    } catch (error) {
      // Clear auth state on refresh failure
      setUser(null);
      logger.error("Token refresh failed", undefined, error as Error);
      throw error;
    }
  }, [logger, setUser]);

  return { updateUser, refreshTokens };
};

/**
 * Hook for permission checking
 */
const usePermissions = () => {
  const hasPermission = useCallback((_permission: string) => {
    // Simple role-based permission check for now
    // In production, implement proper permission system
    return true; // Placeholder implementation
  }, []);

  return { hasPermission };
};

/**
 * Hook for authentication initialization
 */
const useAuthInitialization = (
  setUser: (_user: User | null) => void,
  setIsLoading: (_loading: boolean) => void,
  logger: Logger
) => {
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        logger.info("Initializing authentication provider");
        setIsLoading(true);

        // Initialize API services
        await ApiServices.initialize();

        // Get current user if tokens exist
        const userResponse = await ApiServices.auth.getCurrentUser();
        if (userResponse.success && userResponse.data && isMounted) {
          setUser(userResponse.data);
          logger.info("User authenticated from stored tokens", {
            userId: userResponse.data.id,
          });
        }
      } catch (error) {
        logger.error(
          "Failed to initialize authentication",
          undefined,
          error as Error
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [logger, setUser, setIsLoading]);
};

export function AuthProvider({
  children,
}: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logger = useMemo(() => new Logger("AuthProvider"), []);

  // Initialize authentication
  useAuthInitialization(setUser, setIsLoading, logger);

  // Auth action hooks
  const basicActions = useBasicAuthActions(setUser, setIsLoading, logger);
  const userActions = useUserActions(user, setUser, setIsLoading, logger);
  const permissions = usePermissions();

  // Context value
  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    ...basicActions,
    ...userActions,
    ...permissions,
    isAdmin: user?.role === "ADMIN",
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
