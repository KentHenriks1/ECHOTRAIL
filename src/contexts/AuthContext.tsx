import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  _name: string;
  _email: string;
  _role?: "admin" | "user";
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (_email: string, _password: string) => Promise<void>;
  register: (_email: string, _password: string, _name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Show login screen
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRefs = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Skip auth check for demo
    setIsLoading(false);

    // Cleanup timeouts on unmount
    return () => {
      timeoutRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, []);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    // Simulate login - check if admin
    const timeoutId = setTimeout(() => {
      const isAdmin = email === "kent@zentric.no";
      setUser({
        id: isAdmin ? "admin-user" : "demo-user",
        _name: isAdmin ? "Kent (Admin)" : "Demo Bruker",
        _email: email,
        _role: isAdmin ? "admin" : "user",
      });
      setIsAuthenticated(true);
      setIsLoading(false);

      // Remove from timeout refs
      const index = timeoutRefs.current.indexOf(timeoutId);
      if (index > -1) {
        timeoutRefs.current.splice(index, 1);
      }
    }, 1000);
    timeoutRefs.current.push(timeoutId);
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    // Simulate registration
    const timeoutId = setTimeout(() => {
      setUser({
        id: "demo-user",
        _name: name,
        _email: email,
      });
      setIsAuthenticated(true);
      setIsLoading(false);

      // Remove from timeout refs
      const index = timeoutRefs.current.indexOf(timeoutId);
      if (index > -1) {
        timeoutRefs.current.splice(index, 1);
      }
    }, 1000);
    timeoutRefs.current.push(timeoutId);
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const refreshUserData = async () => {
    // No-op for demo
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
