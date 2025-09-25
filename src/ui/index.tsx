import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

// Enhanced Theme interface with 2025 standards
export interface Theme {
  colors: {
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
    // Extended colors
    accent?: string;
    muted?: string;
    highlight?: string;
    // New 2025 semantic colors
    foreground?: string;
    mutedForeground?: string;
    destructive?: string;
    destructiveBackground?: string;
    card?: string;
    cardBorder?: string;
  };
  typography: {
    fontSize: {
      // Modern 2025 standards
      xs?: number;
      sm?: number;
      base?: number;
      lg?: number;
      xl?: number;
      xxl?: number;
      xxxl?: number;
      // Legacy support
      _xs: number;
      _sm: number;
      _md: number;
      _lg: number;
      _xl: number;
      _xxl: number;
      _xxxl: number;
    };
    fontFamily: {
      regular: string;
      medium: string;
      semiBold: string;
      bold: string;
    };
    lineHeight?: {
      tight: number;
      normal: number;
      relaxed: number;
      loose: number;
    };
  };
  spacing: {
    // Modern 2025 standards
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
    xxxl?: number;
    xxxxl?: number;
    // Legacy support
    _xs: number;
    _sm: number;
    _md: number;
    _lg: number;
    _xl: number;
  };
  borderRadius: {
    // Modern 2025 standards
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
    full?: number;
    // Legacy support
    _sm: number;
    _md: number;
    _lg: number;
  };
  shadows?: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

// Button component
interface ButtonProps {
  title: string;
  onPress: () => void;
  theme: Theme;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  theme,
  variant = "primary",
  disabled = false,
  style,
}) => {
  const buttonStyles = getButtonStyles(theme, variant, disabled);

  return (
    <TouchableOpacity
      style={[buttonStyles.container, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={buttonStyles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const getButtonStyles = (theme: Theme, variant: string, disabled: boolean) => {
  const baseContainer: ViewStyle = {
    paddingVertical: theme.spacing._md,
    paddingHorizontal: theme.spacing._lg,
    borderRadius: theme.borderRadius._md,
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.6 : 1,
  };

  const baseText: TextStyle = {
    fontSize: theme.typography.fontSize._md,
    fontFamily: theme.typography.fontFamily.medium,
  };

  switch (variant) {
    case "secondary":
      return StyleSheet.create({
        container: {
          ...baseContainer,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        text: {
          ...baseText,
          color: theme.colors.text,
        },
      });
    case "outline":
      return StyleSheet.create({
        container: {
          ...baseContainer,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: theme.colors.primary,
        },
        text: {
          ...baseText,
          color: theme.colors.primary,
        },
      });
    case "ghost":
      return StyleSheet.create({
        container: {
          ...baseContainer,
          backgroundColor: "transparent",
        },
        text: {
          ...baseText,
          color: theme.colors.primary,
        },
      });
    default: // primary
      return StyleSheet.create({
        container: {
          ...baseContainer,
          backgroundColor: theme.colors.primary,
        },
        text: {
          ...baseText,
          color: theme.colors.surface,
        },
      });
  }
};

// Enhanced theme creation function
export const createTheme = (mode: "light" | "dark"): Theme => {
  const lightTheme: Theme = {
    colors: {
      primary: "#0f6b47",
      secondary: "#f59e0b",
      surface: "#ffffff",
      background: "#f8fffe",
      text: "#0c1710",
      textSecondary: "#4b6355",
      border: "#e0f2e9",
      error: "#dc2626",
      warning: "#d97706",
      success: "#059669",
      accent: "#7c3aed",
      muted: "#f0fdfa",
      highlight: "#fef3c7",
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
        _xs: 12,
        _sm: 14,
        _md: 16,
        _lg: 18,
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
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
        loose: 1.8,
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
      primary: "#10b981",
      secondary: "#f59e0b",
      surface: "#111827",
      background: "#030712",
      text: "#f9fafb",
      textSecondary: "#9ca3af",
      border: "#374151",
      error: "#ef4444",
      warning: "#f59e0b",
      success: "#22c55e",
      accent: "#8b5cf6",
      muted: "#1f2937",
      highlight: "#451a03",
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
