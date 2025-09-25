import React, { useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Theme } from "../../ui";
import {
  useAdaptiveUI,
  useIntelligentAnimation,
  useIntelligentHaptic,
} from "../../context/IntelligentThemeContext";

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  theme?: Theme; // Optional now since we can get it from context
  variant?:
    | "primary"
    | "secondary"
    | "gradient"
    | "glass"
    | "danger"
    | "adaptive";
  size?: "small" | "medium" | "large" | "adaptive";
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  loadingText?: string;
  hapticFeedback?: boolean;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  theme: propTheme,
  variant = "primary",
  size = "medium",
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
  loadingText = "Laster...",
  hapticFeedback = true,
}) => {
  const { theme: contextTheme, adaptiveProps } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const { hapticType } = useIntelligentHaptic();

  const theme = propTheme || contextTheme;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Determine effective variant and size based on context
  const effectiveVariant =
    variant === "adaptive"
      ? adaptiveProps.highContrastMode
        ? "secondary"
        : "primary"
      : variant;
  const effectiveSize =
    size === "adaptive"
      ? adaptiveProps.minTouchTarget > 50
        ? "large"
        : "medium"
      : size;

  const handlePressIn = () => {
    if (animationConfig.isReducedMotion) return;

    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: animationConfig.tension || 300,
      friction: animationConfig.friction || 35,
    }).start();
  };

  const handlePressOut = () => {
    if (animationConfig.isReducedMotion) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: animationConfig.tension || 300,
      friction: animationConfig.friction || 35,
    }).start();
  };

  const handlePress = async () => {
    if (disabled || loading) return;

    // Intelligent haptic feedback
    if (hapticFeedback && !animationConfig.isReducedMotion) {
      const hapticMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      } as const;

      if (hapticType in hapticMap) {
        await Haptics.impactAsync(
          hapticMap[hapticType as keyof typeof hapticMap]
        );
      }
    }

    onPress();
  };

  const buttonStyles = getButtonStyles(
    theme,
    effectiveVariant,
    effectiveSize,
    disabled,
    adaptiveProps
  );

  if (effectiveVariant === "gradient") {
    return (
      <Animated.View
        style={[
          {},
          animationConfig.isReducedMotion
            ? {}
            : { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled || loading}
          activeOpacity={0.9}
          style={[style]}
          testID={testID}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
          accessibilityLabel={title}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={buttonStyles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={buttonStyles.text.color}
                style={buttonStyles._icon}
              />
            ) : (
              icon && (
                <MaterialIcons
                  name={icon}
                  size={buttonStyles.iconSize}
                  color={buttonStyles.text.color}
                  style={buttonStyles._icon}
                />
              )
            )}
            <Text style={buttonStyles.text}>
              {loading ? loadingText : title}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {},
        animationConfig.isReducedMotion
          ? {}
          : { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={[buttonStyles.container, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={buttonStyles.text.color}
            style={buttonStyles._icon}
          />
        ) : (
          icon && (
            <MaterialIcons
              name={icon}
              size={buttonStyles.iconSize}
              color={buttonStyles.text.color}
              style={buttonStyles._icon}
            />
          )
        )}
        <Text style={buttonStyles.text}>{loading ? loadingText : title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getButtonStyles = (
  theme: Theme,
  variant: string,
  size: string,
  disabled: boolean,
  adaptiveProps: any
) => {
  // Size configurations
  const sizeConfig = {
    small: {
      paddingVertical: theme.spacing._sm,
      paddingHorizontal: theme.spacing._md,
      fontSize: theme.typography.fontSize._sm,
      _iconSize: 16,
    },
    medium: {
      paddingVertical: theme.spacing._md,
      paddingHorizontal: theme.spacing._lg,
      fontSize: theme.typography.fontSize._md,
      _iconSize: 20,
    },
    large: {
      paddingVertical: theme.spacing._lg,
      paddingHorizontal: theme.spacing._xl,
      fontSize: theme.typography.fontSize._lg,
      _iconSize: 24,
    },
  };

  const config = sizeConfig[size as keyof typeof sizeConfig];

  const baseContainer: ViewStyle = {
    paddingVertical: config.paddingVertical,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    opacity: disabled ? 0.6 : 1,
    minHeight: Math.max(48, adaptiveProps.minTouchTarget || 48),
  };

  const baseText = {
    fontSize: config.fontSize,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: "600" as const,
  };

  const baseIcon = {
    marginRight: theme.spacing._sm,
  };

  switch (variant) {
    case "secondary":
      return {
        container: {
          ...baseContainer,
          backgroundColor: theme.colors.surface,
          borderWidth: 2,
          borderColor: theme.colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        },
        text: {
          ...baseText,
          color: theme.colors.text,
        },
        _icon: baseIcon,
        iconSize: config._iconSize,
      };

    case "glass":
      return {
        container: {
          ...baseContainer,
          backgroundColor: `${theme.colors.surface}CC`,
          borderWidth: 1,
          borderColor: `${theme.colors.border}60`,
          backdropFilter: "blur(10px)",
        },
        text: {
          ...baseText,
          color: theme.colors.text,
        },
        _icon: baseIcon,
        iconSize: config._iconSize,
      };

    case "danger":
      return {
        container: {
          ...baseContainer,
          backgroundColor: theme.colors.error,
          shadowColor: theme.colors.error,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        text: {
          ...baseText,
          color: theme.colors.surface,
        },
        _icon: baseIcon,
        iconSize: config._iconSize,
      };

    default: // primary
      return {
        container: {
          ...baseContainer,
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        text: {
          ...baseText,
          color: theme.colors.surface,
        },
        _icon: baseIcon,
        iconSize: config._iconSize,
      };
  }
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    transformStyle: {
      // Base transform style
    },
  });
