// intelligentTheme.tsx - EchoTrail's Intelligent Design System
// Adapts theme based on user context, movement mode, and environmental factors

import { Theme } from "./index";
import { MovementMode } from "../services/intelligence/SpeedDetector";
import { ContextualEnvironment } from "../services/intelligence/ContextAnalyzer";

// Enhanced color palette with semantic meaning
export const colorTokens = {
  // Primary exploration palette
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981", // Primary emerald
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },

  // Adventure amber palette
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b", // Secondary amber
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },

  // Neutral grays for balance
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },

  // Semantic colors
  success: {
    light: "#22c55e",
    dark: "#16a34a",
  },
  warning: {
    light: "#f59e0b",
    dark: "#d97706",
  },
  error: {
    light: "#ef4444",
    dark: "#dc2626",
  },
  info: {
    light: "#3b82f6",
    dark: "#2563eb",
  },
};

// Typography system with optimal reading sizes
export const typographyTokens = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
  },
};

// Spacing system based on 4px grid
export const spacingTokens = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

// Movement-based theme adaptations
export const movementAdaptations = {
  DRIVING: {
    // High contrast, larger touch targets
    colors: {
      primaryOverride: colorTokens.emerald[400], // Brighter for visibility
      textSize: "lg",
      buttonMinHeight: 56, // Larger touch targets
    },
    interaction: {
      hapticFeedback: "heavy",
      animationDuration: 150, // Faster feedback
    },
    layout: {
      spacing: "loose", // More spacing between elements
      borderRadius: "lg", // Larger radius for easier interaction
    },
  },
  WALKING: {
    // Balanced design for comfortable viewing
    colors: {
      primaryOverride: null,
      textSize: "base",
      buttonMinHeight: 44,
    },
    interaction: {
      hapticFeedback: "medium",
      animationDuration: 200,
    },
    layout: {
      spacing: "normal",
      borderRadius: "md",
    },
  },
  CYCLING: {
    // Quick glance optimization
    colors: {
      primaryOverride: colorTokens.emerald[500],
      textSize: "lg",
      buttonMinHeight: 48,
    },
    interaction: {
      hapticFeedback: "medium",
      animationDuration: 180,
    },
    layout: {
      spacing: "comfortable",
      borderRadius: "md",
    },
  },
  STATIONARY: {
    // Detailed, immersive design
    colors: {
      primaryOverride: null,
      textSize: "base",
      buttonMinHeight: 40,
    },
    interaction: {
      hapticFeedback: "light",
      animationDuration: 250, // Smooth animations
    },
    layout: {
      spacing: "compact",
      borderRadius: "sm",
    },
  },
};

// Context-aware theme adaptation
export interface IntelligentThemeConfig {
  context?: ContextualEnvironment;
  userPreferences?: {
    reduceMotion?: boolean;
    highContrast?: boolean;
    textScale?: number;
  };
}

export const createIntelligentTheme = (
  mode: "light" | "dark",
  config?: IntelligentThemeConfig
): Theme => {
  const { context, userPreferences } = config || {};
  const movementMode = context?.movement.movementMode || "STATIONARY";
  const attentionLevel = context?.attentionLevel || "MEDIUM";
  const timeOfDay = context?.timeOfDay || "MIDDAY";

  // Base theme colors
  const isLight = mode === "light";
  const baseColors = {
    primary: isLight ? colorTokens.emerald[600] : colorTokens.emerald[500],
    secondary: colorTokens.amber[500],
    surface: isLight ? "#ffffff" : colorTokens.slate[800],
    background: isLight ? colorTokens.slate[50] : colorTokens.slate[900],
    text: isLight ? colorTokens.slate[900] : colorTokens.slate[50],
    textSecondary: isLight ? colorTokens.slate[600] : colorTokens.slate[300],
    border: isLight ? colorTokens.slate[200] : colorTokens.slate[600],
    error: isLight ? colorTokens.error.light : colorTokens.error.dark,
    warning: isLight ? colorTokens.warning.light : colorTokens.warning.dark,
    success: isLight ? colorTokens.success.light : colorTokens.success.dark,
    info: isLight ? colorTokens.info.light : colorTokens.info.dark,
  };

  // Apply movement-based adaptations
  const movementConfig = movementAdaptations[movementMode];
  const adaptedColors = {
    ...baseColors,
    ...(movementConfig.colors.primaryOverride && {
      primary: movementConfig.colors.primaryOverride,
    }),
  };

  // Time-based adaptations
  const timeAdaptations = getTimeBasedAdaptations(timeOfDay, isLight);

  // Attention-based adaptations
  const attentionAdaptations = getAttentionBasedAdaptations(attentionLevel);

  // Create final theme
  const theme: Theme = {
    colors: {
      ...adaptedColors,
      ...timeAdaptations.colors,

      // Extended semantic colors
      accent: isLight ? colorTokens.emerald[500] : colorTokens.emerald[400],
      muted: isLight ? colorTokens.slate[100] : colorTokens.slate[800],
      highlight: isLight ? colorTokens.amber[100] : colorTokens.amber[900],

      // Card colors
      card: isLight ? "#ffffff" : colorTokens.slate[800],
      cardBorder: isLight ? colorTokens.slate[200] : colorTokens.slate[700],

      // Destructive colors
      destructive: isLight ? colorTokens.error.light : colorTokens.error.dark,
      destructiveBackground: isLight ? "#fef2f2" : "#1f1415",

      // Foreground variants
      foreground: isLight ? colorTokens.slate[900] : colorTokens.slate[50],
      mutedForeground: isLight
        ? colorTokens.slate[500]
        : colorTokens.slate[400],
    },

    typography: {
      fontSize: {
        ...Object.fromEntries(
          Object.entries(typographyTokens.fontSizes).map(([key, value]) => [
            key,
            Math.round(value * (userPreferences?.textScale || 1)),
          ])
        ),
        // Legacy support
        _xs: Math.round(
          typographyTokens.fontSizes.xs * (userPreferences?.textScale || 1)
        ),
        _sm: Math.round(
          typographyTokens.fontSizes.sm * (userPreferences?.textScale || 1)
        ),
        _md: Math.round(
          typographyTokens.fontSizes.base * (userPreferences?.textScale || 1)
        ),
        _lg: Math.round(
          typographyTokens.fontSizes.lg * (userPreferences?.textScale || 1)
        ),
        _xl: Math.round(
          typographyTokens.fontSizes.xl * (userPreferences?.textScale || 1)
        ),
        _xxl: Math.round(
          typographyTokens.fontSizes["2xl"] * (userPreferences?.textScale || 1)
        ),
        _xxxl: Math.round(
          typographyTokens.fontSizes["3xl"] * (userPreferences?.textScale || 1)
        ),
      },
      fontFamily: {
        regular: "System",
        medium: "System",
        semiBold: "System",
        bold: "System",
      },
      lineHeight: typographyTokens.lineHeights,
    },

    spacing: {
      ...Object.fromEntries(
        Object.entries(spacingTokens).map(([key, value]) => [key, value])
      ),
      // Legacy support
      xs: spacingTokens[1],
      sm: spacingTokens[2],
      md: spacingTokens[3],
      lg: spacingTokens[4],
      xl: spacingTokens[5],
      xxl: spacingTokens[6],
      xxxl: spacingTokens[8],
      xxxxl: spacingTokens[12],
      _xs: spacingTokens[1],
      _sm: spacingTokens[2],
      _md: spacingTokens[3],
      _lg: spacingTokens[4],
      _xl: spacingTokens[6],
    },

    borderRadius: {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      xxl: 24,
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
        shadowOpacity: userPreferences?.highContrast ? 0.15 : 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      md: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: userPreferences?.highContrast ? 0.2 : 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
      lg: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: userPreferences?.highContrast ? 0.25 : 0.15,
        shadowRadius: 25,
        elevation: 8,
      },
    },
  };

  return theme;
};

// Time-based theme adaptations
function getTimeBasedAdaptations(timeOfDay: string, isLight: boolean) {
  const adaptations: any = { colors: {} };

  switch (timeOfDay) {
    case "NIGHT":
      // Warmer, easier on eyes
      adaptations.colors = {
        background: isLight ? colorTokens.slate[50] : "#0a0a0a",
        surface: isLight ? "#fefefe" : "#111111",
      };
      break;
    case "DAWN":
    case "EVENING":
      // Softer contrast
      adaptations.colors = {
        primary: isLight ? colorTokens.emerald[500] : colorTokens.emerald[400],
      };
      break;
    default:
      // Standard daylight colors
      break;
  }

  return adaptations;
}

// Attention-based adaptations
function getAttentionBasedAdaptations(attentionLevel: string) {
  const adaptations: any = {};

  switch (attentionLevel) {
    case "LOW":
      // Simplified, high contrast
      adaptations.simplifiedLayout = true;
      adaptations.highContrast = true;
      break;
    case "HIGH":
      // Rich, detailed interface
      adaptations.detailedInterface = true;
      break;
    default:
      // Balanced interface
      break;
  }

  return adaptations;
}

// Animation configurations based on user context
export const getAnimationConfig = (
  movementMode: MovementMode,
  reduceMotion: boolean = false
) => {
  if (reduceMotion) {
    return {
      duration: 0,
      useNativeDriver: false,
    };
  }

  const baseConfig = movementAdaptations[movementMode];

  return {
    duration: baseConfig.interaction.animationDuration,
    useNativeDriver: true,
    tension: movementMode === "DRIVING" ? 400 : 300,
    friction: movementMode === "STATIONARY" ? 40 : 35,
  };
};

// Haptic feedback configurations
export const getHapticConfig = (movementMode: MovementMode) => {
  return movementAdaptations[movementMode].interaction.hapticFeedback;
};

export default createIntelligentTheme;
