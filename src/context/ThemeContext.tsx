import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

export interface ThemeColors {
  primary: string;
  secondary: string;
  surface: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  currentTheme: "light" | "dark" | "system";
}

const lightColors: ThemeColors = {
  primary: "#2563EB",
  secondary: "#64748B",
  surface: "#FFFFFF",
  background: "#F8FAFC",
  text: "#1E293B",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  error: "#DC2626",
  warning: "#D97706",
  success: "#059669",
  info: "#0284C7",
};

const darkColors: ThemeColors = {
  primary: "#3B82F6",
  secondary: "#94A3B8",
  surface: "#1E293B",
  background: "#0F172A",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  border: "#334155",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#06B6D4",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark" | "system">(
    "system"
  );

  const getEffectiveTheme = (): "light" | "dark" => {
    if (currentTheme === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }
    return currentTheme;
  };

  const isDark = getEffectiveTheme() === "dark";
  const colors = isDark ? darkColors : lightColors;

  const loadThemeFromStorage = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("app_theme");
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setCurrentTheme(savedTheme as "light" | "dark" | "system");
      }
    } catch (error) {
      // Silently fail - not critical for app functionality
    }
  }, []);

  const saveThemeToStorage = useCallback(async () => {
    try {
      await AsyncStorage.setItem("app_theme", currentTheme);
    } catch (error) {
      // Silently fail - not critical for app functionality
    }
  }, [currentTheme]);

  const toggleTheme = () => {
    const effectiveTheme = getEffectiveTheme();
    setCurrentTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  const setTheme = (theme: "light" | "dark" | "system") => {
    setCurrentTheme(theme);
  };

  const value: ThemeContextType = {
    isDark,
    colors,
    toggleTheme,
    setTheme,
    currentTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
