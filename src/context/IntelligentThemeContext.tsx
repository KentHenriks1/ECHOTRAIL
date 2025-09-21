// IntelligentThemeContext.tsx - Context-aware theme provider for EchoTrail
// Integrates intelligent theme adaptation with user context and preferences

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme } from "../ui";
import {
  createIntelligentTheme,
  IntelligentThemeConfig,
  getAnimationConfig,
  getHapticConfig,
} from "../ui/intelligentTheme";
import { MovementMode } from "../services/intelligence/SpeedDetector";
import { ContextualEnvironment } from "../services/intelligence/ContextAnalyzer";

// Theme preferences storage keys
const THEME_STORAGE_KEY = "@EchoTrail/theme_mode";
const USER_PREFERENCES_KEY = "@EchoTrail/user_preferences";

// User preferences interface
export interface UserThemePreferences {
  reduceMotion?: boolean;
  highContrast?: boolean;
  textScale?: number;
  forceDarkMode?: boolean;
  forceLightMode?: boolean;
}

// Theme context interface
interface IntelligentThemeContextType {
  theme: Theme;
  themeMode: "light" | "dark" | "system";
  isDark: boolean;
  userPreferences: UserThemePreferences;
  context?: ContextualEnvironment;

  // Theme controls
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  updateUserPreferences: (preferences: Partial<UserThemePreferences>) => void;
  updateContext: (context: ContextualEnvironment) => void;

  // Intelligent helpers
  getAnimationSettings: () => {
    duration: number;
    useNativeDriver: boolean;
    tension?: number;
    friction?: number;
  };
  getHapticSettings: () => string;

  // Accessibility
  isReducedMotion: boolean;
  isHighContrast: boolean;
  currentMovementMode: MovementMode;
}

// Default user preferences
const defaultUserPreferences: UserThemePreferences = {
  reduceMotion: false,
  highContrast: false,
  textScale: 1.0,
  forceDarkMode: false,
  forceLightMode: false,
};

// Create context
const IntelligentThemeContext = createContext<
  IntelligentThemeContextType | undefined
>(undefined);

// Theme provider props
interface IntelligentThemeProviderProps {
  children: ReactNode;
  initialContext?: ContextualEnvironment;
}

// Main theme provider component
export const IntelligentThemeProvider: React.FC<
  IntelligentThemeProviderProps
> = ({ children, initialContext }) => {
  const [themeMode, setThemeModeState] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [userPreferences, setUserPreferences] = useState<UserThemePreferences>(
    defaultUserPreferences
  );
  const [context, setContext] = useState<ContextualEnvironment | undefined>(
    initialContext
  );
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine effective theme mode
  const getEffectiveThemeMode = (): "light" | "dark" => {
    if (userPreferences.forceDarkMode) return "dark";
    if (userPreferences.forceLightMode) return "light";
    if (themeMode === "system") return systemTheme;
    return themeMode;
  };

  const effectiveMode = getEffectiveThemeMode();
  const isDark = effectiveMode === "dark";

  // Create intelligent theme configuration
  const themeConfig: IntelligentThemeConfig = {
    context,
    userPreferences: {
      reduceMotion: userPreferences.reduceMotion,
      highContrast: userPreferences.highContrast,
      textScale: userPreferences.textScale,
    },
  };

  // Generate current theme
  const theme = createIntelligentTheme(effectiveMode, themeConfig);

  // Current movement mode for easy access
  const currentMovementMode = context?.movement.movementMode || "STATIONARY";

  // Load saved preferences on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        // Load theme mode
        const savedThemeMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          savedThemeMode &&
          ["light", "dark", "system"].includes(savedThemeMode)
        ) {
          setThemeModeState(savedThemeMode as "light" | "dark" | "system");
        }

        // Load user preferences
        const savedPreferences =
          await AsyncStorage.getItem(USER_PREFERENCES_KEY);
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          setUserPreferences({
            ...defaultUserPreferences,
            ...parsedPreferences,
          });
        }

        setIsLoaded(true);
      } catch (error) {
        console.warn("Failed to load theme settings:", error);
        setIsLoaded(true);
      }
    };

    loadSavedSettings();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme === "dark" ? "dark" : "light");
    });

    // Set initial system theme
    const initialScheme = Appearance.getColorScheme();
    setSystemTheme(initialScheme === "dark" ? "dark" : "light");

    return () => subscription?.remove();
  }, []);

  // Save theme mode when changed
  const setThemeMode = async (mode: "light" | "dark" | "system") => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn("Failed to save theme mode:", error);
    }
  };

  // Update user preferences
  const updateUserPreferences = async (
    newPreferences: Partial<UserThemePreferences>
  ) => {
    try {
      const updatedPreferences = { ...userPreferences, ...newPreferences };
      setUserPreferences(updatedPreferences);
      await AsyncStorage.setItem(
        USER_PREFERENCES_KEY,
        JSON.stringify(updatedPreferences)
      );
    } catch (error) {
      console.warn("Failed to save user preferences:", error);
    }
  };

  // Update context
  const updateContext = (newContext: ContextualEnvironment) => {
    setContext(newContext);
  };

  // Get animation settings based on current context
  const getAnimationSettings = () => {
    return getAnimationConfig(
      currentMovementMode,
      userPreferences.reduceMotion
    );
  };

  // Get haptic settings based on current context
  const getHapticSettings = () => {
    return getHapticConfig(currentMovementMode);
  };

  // Context value
  const contextValue: IntelligentThemeContextType = {
    theme,
    themeMode,
    isDark,
    userPreferences,
    context,

    // Controls
    setThemeMode,
    updateUserPreferences,
    updateContext,

    // Intelligent helpers
    getAnimationSettings,
    getHapticSettings,

    // Accessibility flags
    isReducedMotion: userPreferences.reduceMotion || false,
    isHighContrast: userPreferences.highContrast || false,
    currentMovementMode,
  };

  // Don't render until settings are loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <IntelligentThemeContext.Provider value={contextValue}>
      {children}
    </IntelligentThemeContext.Provider>
  );
};

// Hook to use theme context
export const useIntelligentTheme = (): IntelligentThemeContextType => {
  const context = useContext(IntelligentThemeContext);
  if (!context) {
    throw new Error(
      "useIntelligentTheme must be used within an IntelligentThemeProvider"
    );
  }
  return context;
};

// Hook for getting intelligent animation config
export const useIntelligentAnimation = () => {
  const { getAnimationSettings, isReducedMotion } = useIntelligentTheme();
  return {
    ...getAnimationSettings(),
    isReducedMotion,
  };
};

// Hook for getting intelligent haptic config
export const useIntelligentHaptic = () => {
  const { getHapticSettings, currentMovementMode } = useIntelligentTheme();
  return {
    hapticType: getHapticSettings(),
    movementMode: currentMovementMode,
  };
};

// Hook for adaptive UI behavior
export const useAdaptiveUI = () => {
  const {
    theme,
    context,
    currentMovementMode,
    isHighContrast,
    userPreferences,
  } = useIntelligentTheme();

  const adaptiveProps = {
    // Touch target sizing based on movement
    minTouchTarget:
      currentMovementMode === "DRIVING"
        ? 56
        : currentMovementMode === "CYCLING"
          ? 48
          : 44,

    // Spacing based on movement and attention
    adaptiveSpacing:
      context?.attentionLevel === "LOW"
        ? "loose"
        : context?.attentionLevel === "HIGH"
          ? "compact"
          : "normal",

    // Text sizing
    adaptiveTextScale: userPreferences.textScale || 1.0,

    // Contrast adjustments
    highContrastMode: isHighContrast,

    // Color adaptations based on time and environment
    timeBasedColors: context?.timeOfDay === "NIGHT",
  };

  return {
    theme,
    context,
    currentMovementMode,
    adaptiveProps,

    // Helper functions
    getAdaptiveColor: (lightColor: string, darkColor: string) =>
      theme.colors.foreground === lightColor ? lightColor : darkColor,

    getAdaptiveSize: (baseSize: number) =>
      Math.round(baseSize * (userPreferences.textScale || 1.0)),
  };
};

export default IntelligentThemeProvider;
