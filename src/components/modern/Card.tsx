import React from "react";
import { View, StyleSheet, ViewStyle, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Theme } from "../../ui";
import {
  useAdaptiveUI,
  useIntelligentAnimation,
  useIntelligentHaptic,
} from "../../context/IntelligentThemeContext";
import * as Haptics from "expo-haptics";

interface CardProps {
  children: React.ReactNode;
  theme?: Theme; // Optional now since we can get it from context
  variant?: "default" | "elevated" | "gradient" | "glass" | "interactive";
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

export const ModernCard: React.FC<CardProps> = ({
  children,
  theme: propTheme,
  variant = "default",
  style,
  onPress,
  disabled = false,
  testID,
}) => {
  const { theme: contextTheme, adaptiveProps } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const { hapticType } = useIntelligentHaptic();

  const theme = propTheme || contextTheme;
  const styles = createStyles(theme, adaptiveProps);
  const isInteractive = variant === "interactive" || !!onPress;

  const handlePress = async () => {
    if (!onPress || disabled) return;

    // Intelligent haptic feedback
    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    } as const;

    if (!animationConfig.isReducedMotion && hapticType in hapticMap) {
      await Haptics.impactAsync(
        hapticMap[hapticType as keyof typeof hapticMap]
      );
    }

    onPress();
  };

  if (variant === "gradient") {
    const gradientComponent = (
      <LinearGradient
        colors={[`${theme.colors.primary}10`, `${theme.colors.secondary}05`]}
        style={[styles.baseCard, styles.gradientCard, style]}
      >
        {children}
      </LinearGradient>
    );

    return isInteractive ? (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        testID={testID}
        style={({ pressed }) => [
          pressed && !animationConfig.isReducedMotion && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {gradientComponent}
      </Pressable>
    ) : (
      gradientComponent
    );
  }

  const cardStyle = getCardStyle(theme, variant, adaptiveProps);

  const cardComponent = (
    <View style={[styles.baseCard, cardStyle, style]}>{children}</View>
  );

  return isInteractive ? (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        pressed && !animationConfig.isReducedMotion && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {cardComponent}
    </Pressable>
  ) : (
    cardComponent
  );
};

const getCardStyle = (theme: Theme, variant: string, adaptiveProps: any) => {
  const baseStyle = {
    backgroundColor: theme.colors.surface,
  };

  switch (variant) {
    case "elevated":
      return {
        ...baseStyle,
        ...(theme.shadows?.md || {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: adaptiveProps.highContrastMode ? 0.15 : 0.1,
          shadowRadius: 8,
          elevation: 8,
        }),
      };
    case "glass":
      return {
        backgroundColor: `${theme.colors.surface}CC`,
        backdropFilter: "blur(10px)",
        borderWidth: 1,
        borderColor: `${theme.colors.border}40`,
      };
    case "interactive":
      return {
        ...baseStyle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...(theme.shadows?.sm || {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }),
      };
    default:
      return {
        ...baseStyle,
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
  }
};

const createStyles = (theme: Theme, adaptiveProps: any) =>
  StyleSheet.create({
    baseCard: {
      borderRadius: theme.borderRadius?.md || 12,
      padding: theme.spacing?.md || 16,
      // Adaptive spacing based on context
      ...(adaptiveProps.adaptiveSpacing === "loose" && {
        padding: theme.spacing?.lg || 20,
      }),
      ...(adaptiveProps.adaptiveSpacing === "compact" && {
        padding: theme.spacing?.sm || 12,
      }),
      // Minimum touch target for interactive cards
      ...(adaptiveProps.minTouchTarget > 44 && {
        minHeight: adaptiveProps.minTouchTarget,
      }),
    },
    gradientCard: {
      borderWidth: 1,
      borderColor: "transparent",
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.5,
    },
  });
