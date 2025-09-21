import { Theme } from "./index";
import { MovementMode } from "../services/intelligence/SpeedDetector";
import { ContextualEnvironment } from "../services/intelligence/ContextAnalyzer";

export const createModernTheme = (mode: "light" | "dark"): Theme => {
  const lightTheme: Theme = {
    colors: {
      // EchoTrail 2025 Nature & Adventure palette
      primary: "#0f6b47", // Deep Emerald - represents exploration and nature
      secondary: "#f59e0b", // Golden Amber - represents discoveries and stories
      surface: "#ffffff",
      background: "#f8fffe", // Very light mint white
      text: "#0c1710", // Deep forest text
      textSecondary: "#4b6355", // Muted forest green
      border: "#e0f2e9", // Light mint border
      error: "#dc2626", // Modern red
      warning: "#d97706", // Warm amber warning
      success: "#059669", // Fresh success green

      // EchoTrail extended modern palette
      accent: "#7c3aed", // Violet accent for highlights
      muted: "#f0fdfa", // Barely-there mint
      highlight: "#fef3c7", // Warm highlight cream

      // New 2025 semantic colors
      foreground: "#0c1710",
      mutedForeground: "#6b7280",
      destructive: "#dc2626",
      destructiveBackground: "#fef2f2",
      card: "#ffffff",
      cardBorder: "#e5e7eb",
    },
    typography: {
      fontSize: {
        xs: 11,
        sm: 13,
        base: 15,
        lg: 17,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        // Legacy support
        _xs: 11,
        _sm: 13,
        _md: 15,
        _lg: 17,
        _xl: 20,
        _xxl: 24,
        _xxxl: 32,
      },
      fontFamily: {
        regular: "System",
        medium: "System",
        semiBold: "System",
        bold: "System",
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
        loose: 2.0,
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      xxxxl: 48,
      // Legacy support
      _xs: 4,
      _sm: 8,
      _md: 12,
      _lg: 16,
      _xl: 24,
    },
    borderRadius: {
      xs: 2,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
      xxl: 16,
      full: 9999,
      // Legacy support
      _sm: 4,
      _md: 8,
      _lg: 12,
    },
    shadows: {
      sm: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      md: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
      lg: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 8,
      },
    },
  };

  const darkTheme: Theme = {
    ...lightTheme,
    colors: {
      // EchoTrail 2025 Dark mode - Modern adventure theme
      primary: "#10b981", // Bright emerald for visibility
      secondary: "#f59e0b", // Bright amber for contrast
      surface: "#111827", // Modern dark surface
      background: "#030712", // Deep dark background
      text: "#f9fafb", // Pure white text
      textSecondary: "#9ca3af", // Modern gray secondary
      border: "#374151", // Subtle border
      error: "#ef4444", // Modern error red
      warning: "#f59e0b", // Amber warning
      success: "#22c55e", // Fresh success green

      // Extended dark palette
      accent: "#8b5cf6", // Purple accent for dark mode
      muted: "#1f2937", // Dark muted background
      highlight: "#451a03", // Dark highlight

      // New 2025 dark semantic colors
      foreground: "#f9fafb",
      mutedForeground: "#6b7280",
      destructive: "#ef4444",
      destructiveBackground: "#1f1415",
      card: "#1f2937",
      cardBorder: "#374151",
    },
  };

  return mode === "dark" ? darkTheme : lightTheme;
};

// Animation presets
export const animations = {
  spring: {
    _tension: 300,
    _friction: 35,
  },
  timing: {
    _duration: 300,
    _useNativeDriver: true,
  },
  scale: {
    pressIn: 0.96,
    _pressOut: 1,
  },
};

// Component variants
export const variants = {
  button: {
    sizes: {
      small: { height: 36, paddingHorizontal: 16 },
      medium: { height: 44, paddingHorizontal: 20 },
      large: { height: 52, paddingHorizontal: 24 },
    },
    styles: {
      primary: (theme: Theme) => ({
        backgroundColor: theme.colors.primary,
        color: theme.colors.surface,
      }),
      gradient: (theme: Theme) => ({
        background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
      }),
    },
  },
  card: {
    variants: {
      default: (theme: Theme) => ({
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius._lg,
        ...theme.shadows?.md,
      }),
      elevated: (theme: Theme) => ({
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius._lg,
        ...theme.shadows?.lg,
      }),
    },
  },
};
