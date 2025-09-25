// AdaptiveComponents.tsx - Context-aware UI components for EchoTrail
// Components that intelligently adapt their behavior based on movement mode, attention level, and environmental context

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  Dimensions,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  useAdaptiveUI,
  useIntelligentAnimation,
  useIntelligentHaptic,
} from "../../context/IntelligentThemeContext";
import { MovementMode } from "../../services/intelligence/SpeedDetector";
import { ContextualEnvironment } from "../../services/intelligence/ContextAnalyzer";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Smart Button that adapts based on movement mode
interface AdaptiveButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "smart";
  icon?: keyof typeof MaterialIcons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const AdaptiveButton: React.FC<AdaptiveButtonProps> = ({
  title,
  onPress,
  variant = "smart",
  icon,
  disabled = false,
  loading = false,
  style,
  testID,
}) => {
  const { theme, adaptiveProps, currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const { hapticType } = useIntelligentHaptic();

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Smart variant logic based on movement mode
  const getSmartVariant = () => {
    if (variant !== "smart") return variant;

    switch (currentMovementMode) {
      case "DRIVING":
        return "primary"; // High contrast, clear action
      case "CYCLING":
        return "secondary"; // Quick glance friendly
      case "WALKING":
        return "primary"; // Standard interaction
      case "STATIONARY":
        return "primary"; // Full feature set
      default:
        return "primary";
    }
  };

  const effectiveVariant = getSmartVariant();

  const handlePressIn = () => {
    if (animationConfig.isReducedMotion || disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 35,
    }).start();
  };

  const handlePressOut = () => {
    if (animationConfig.isReducedMotion || disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 35,
    }).start();
  };

  const handlePress = async () => {
    if (disabled || loading) return;

    // Enhanced haptic feedback for driving mode
    if (hapticType && !animationConfig.isReducedMotion) {
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

  const styles = createAdaptiveButtonStyles(
    theme,
    adaptiveProps,
    effectiveVariant,
    currentMovementMode
  );

  return (
    <Animated.View
      style={[
        !animationConfig.isReducedMotion && {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[styles.container, disabled && styles.disabled]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        accessibilityLabel={title}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={styles.iconSize as number}
            color={styles.text.color as string}
            style={styles.icon}
          />
        )}
        <Text style={styles.text} numberOfLines={1}>
          {loading ? "Venter..." : title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Attention-aware notification component
interface AdaptiveNotificationProps {
  message: string;
  type: "info" | "success" | "warning" | "error";
  onDismiss?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
  actionButton?: {
    title: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const AdaptiveNotification: React.FC<AdaptiveNotificationProps> = ({
  message,
  type,
  onDismiss,
  autoHide = true,
  hideDelay = 4000,
  actionButton,
  style,
}) => {
  const { theme, adaptiveProps, context, currentMovementMode } =
    useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Show animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: animationConfig.isReducedMotion ? 0 : 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 35,
      }),
    ]).start();

    // Auto hide based on attention level and movement mode
    if (autoHide) {
      const adaptiveDelay = getAdaptiveDelay();
      const timer = setTimeout(() => {
        handleDismiss();
      }, adaptiveDelay);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAdaptiveDelay = () => {
    let delay = hideDelay;

    // Longer display for driving mode (safety-critical)
    if (currentMovementMode === "DRIVING") {
      delay *= 2;
    }

    // Adjust based on attention level
    if (context?.attentionLevel === "LOW") {
      delay *= 1.5;
    } else if (context?.attentionLevel === "HIGH") {
      delay *= 0.8;
    }

    return delay;
  };

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: animationConfig.isReducedMotion ? 0 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: animationConfig.isReducedMotion ? 0 : 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const styles = createNotificationStyles(theme, adaptiveProps, type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <MaterialIcons
          name={styles.iconName}
          size={adaptiveProps.minTouchTarget > 50 ? 28 : 24}
          color={styles.iconColor}
          style={styles.icon}
        />

        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>

        {onDismiss && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={20} color={styles.text.color} />
          </TouchableOpacity>
        )}
      </View>

      {actionButton && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={actionButton.onPress}
        >
          <Text style={styles.actionText}>{actionButton.title}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// Context-aware quick actions panel
interface QuickActionsProps {
  actions: Array<{
    id: string;
    title: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    priority?: "low" | "medium" | "high";
    contextRelevant?: boolean;
  }>;
  maxVisible?: number;
  style?: ViewStyle;
}

export const AdaptiveQuickActions: React.FC<QuickActionsProps> = ({
  actions,
  maxVisible,
  style,
}) => {
  const { theme, adaptiveProps, currentMovementMode } = useAdaptiveUI();
  const [expandedView, setExpandedView] = useState(false);

  // Smart filtering and prioritization based on context
  const getVisibleActions = () => {
    let filteredActions = [...actions];

    // Prioritize context-relevant actions
    filteredActions.sort((a, b) => {
      if (a.contextRelevant && !b.contextRelevant) return -1;
      if (!a.contextRelevant && b.contextRelevant) return 1;

      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (
        priorityOrder[b.priority || "medium"] -
        priorityOrder[a.priority || "medium"]
      );
    });

    // Adaptive max visible based on movement mode
    const adaptiveMax = maxVisible || getAdaptiveMaxActions();

    if (!expandedView && filteredActions.length > adaptiveMax) {
      return filteredActions.slice(0, adaptiveMax);
    }

    return filteredActions;
  };

  const getAdaptiveMaxActions = () => {
    switch (currentMovementMode) {
      case "DRIVING":
        return 3; // Minimal, safety-focused
      case "CYCLING":
        return 4; // Quick access
      case "WALKING":
        return 6; // Comfortable interaction
      case "STATIONARY":
        return 8; // Full feature set
      default:
        return 5;
    }
  };

  const visibleActions = getVisibleActions();
  const hasMoreActions =
    !expandedView && actions.length > getAdaptiveMaxActions();

  const styles = createQuickActionsStyles(
    theme,
    adaptiveProps,
    currentMovementMode
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {visibleActions.map((action, index) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionItem}
            onPress={action.onPress}
            accessibilityLabel={action.title}
            accessibilityRole="button"
          >
            <View style={styles.actionIconContainer}>
              <MaterialIcons
                name={action.icon}
                size={styles.actionIconSize as number}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.actionText} numberOfLines={2}>
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}

        {hasMoreActions && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setExpandedView(true)}
            accessibilityLabel="Vis flere handlinger"
            accessibilityRole="button"
          >
            <MaterialIcons
              name="more-horiz"
              size={styles.actionIconSize as number}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.moreText}>Mer</Text>
          </TouchableOpacity>
        )}
      </View>

      {expandedView && (
        <TouchableOpacity
          style={styles.collapseButton}
          onPress={() => setExpandedView(false)}
          accessibilityLabel="Skjul handlinger"
          accessibilityRole="button"
        >
          <MaterialIcons
            name="keyboard-arrow-up"
            size={24}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.collapseText}>Skjul</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Movement-aware status indicator
interface AdaptiveStatusIndicatorProps {
  status: "active" | "inactive" | "warning" | "error";
  label: string;
  description?: string;
  showPulse?: boolean;
  style?: ViewStyle;
}

export const AdaptiveStatusIndicator: React.FC<
  AdaptiveStatusIndicatorProps
> = ({ status, label, description, showPulse = true, style }) => {
  const { theme, adaptiveProps, currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showPulse && !animationConfig.isReducedMotion) {
      const createPulseAnimation = () => {
        return Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]);
      };

      Animated.loop(createPulseAnimation()).start();
    }
  }, [showPulse, animationConfig.isReducedMotion, pulseAnim]);

  const getStatusColor = () => {
    switch (status) {
      case "active":
        return theme.colors.success;
      case "warning":
        return theme.colors.warning;
      case "error":
        return theme.colors.error;
      case "inactive":
      default:
        return theme.colors.textSecondary;
    }
  };

  const styles = createStatusStyles(theme, adaptiveProps, currentMovementMode);
  const statusColor = getStatusColor();

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: statusColor },
          showPulse &&
            !animationConfig.isReducedMotion && {
              transform: [{ scale: pulseAnim }],
            },
        ]}
      />

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {description && currentMovementMode === "STATIONARY" && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </View>
  );
};

// Style creators
const createAdaptiveButtonStyles = (
  theme: any,
  adaptiveProps: any,
  variant: string,
  movementMode: MovementMode
) => {
  const baseSize = adaptiveProps.minTouchTarget || 48;
  const fontSize =
    movementMode === "DRIVING"
      ? theme.typography.fontSize.lg
      : theme.typography.fontSize.base;

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.surface,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    danger: {
      backgroundColor: theme.colors.error,
      color: theme.colors.surface,
    },
  };

  const currentVariant =
    variantStyles[variant as keyof typeof variantStyles] ||
    variantStyles.primary;

  const iconSize = movementMode === "DRIVING" ? 28 : 24;

  return {
    container: StyleSheet.create({
      main: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        minHeight: Math.max(baseSize, 44),
        paddingHorizontal: theme.spacing?.md || 16,
        paddingVertical: theme.spacing?.sm || 8,
        borderRadius: theme.borderRadius?.md || 8,
        ...currentVariant,
      },
    }).main,
    disabled: {
      opacity: 0.5,
    },
    text: {
      fontSize,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: currentVariant.color,
      textAlign: "center" as const,
    },
    icon: {
      marginRight: theme.spacing?.sm || 8,
    },
    iconSize,
  };
};

const createNotificationStyles = (
  theme: any,
  adaptiveProps: any,
  type: string
) => {
  const typeConfig = {
    info: { icon: "info", color: theme.colors.info },
    success: { icon: "check-circle", color: theme.colors.success },
    warning: { icon: "warning", color: theme.colors.warning },
    error: { icon: "error", color: theme.colors.error },
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.info;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius?.md || 8,
      padding: theme.spacing?.md || 16,
      marginHorizontal: theme.spacing?.md || 16,
      marginVertical: theme.spacing?.sm || 8,
      borderLeftWidth: 4,
      borderLeftColor: config.color,
      ...(theme.shadows?.md || {}),
    },
    content: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    icon: {
      marginRight: theme.spacing?.sm || 8,
      marginTop: 2,
    },
    iconName: config.icon as any,
    iconColor: config.color,
    message: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      lineHeight:
        theme.typography.lineHeight.normal * theme.typography.fontSize.base,
    },
    dismissButton: {
      padding: 4,
      marginLeft: theme.spacing?.sm || 8,
    },
    actionButton: {
      marginTop: theme.spacing?.sm || 8,
      padding: theme.spacing?.sm || 8,
      backgroundColor: config.color,
      borderRadius: theme.borderRadius?.sm || 4,
      alignSelf: "flex-start",
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.surface,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    text: { color: theme.colors.text },
  });
};

const createQuickActionsStyles = (
  theme: any,
  adaptiveProps: any,
  movementMode: MovementMode
) => {
  const itemsPerRow =
    movementMode === "DRIVING" ? 3 : movementMode === "STATIONARY" ? 4 : 3;
  const itemSize =
    (screenWidth -
      (theme.spacing?.md || 16) * 2 -
      (theme.spacing?.sm || 8) * (itemsPerRow - 1)) /
    itemsPerRow;
  const actionIconSize = movementMode === "DRIVING" ? 28 : 24;

  return {
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius?.md || 8,
      padding: theme.spacing?.md || 16,
    },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
    },
    actionItem: {
      width: itemSize,
      alignItems: "center" as const,
      paddingVertical: theme.spacing?.md || 16,
      marginBottom: theme.spacing?.sm || 8,
    },
    actionIconContainer: {
      width: adaptiveProps.minTouchTarget || 48,
      height: adaptiveProps.minTouchTarget || 48,
      borderRadius: (adaptiveProps.minTouchTarget || 48) / 2,
      backgroundColor: theme.colors.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: theme.spacing?.sm || 8,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      textAlign: "center" as const,
      fontFamily: theme.typography.fontFamily.medium,
    },
    moreButton: {
      width: itemSize,
      alignItems: "center" as const,
      paddingVertical: theme.spacing?.md || 16,
      marginBottom: theme.spacing?.sm || 8,
    },
    moreText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center" as const,
      marginTop: theme.spacing?.sm || 8,
    },
    collapseButton: {
      alignItems: "center" as const,
      paddingVertical: theme.spacing?.sm || 8,
      marginTop: theme.spacing?.sm || 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    collapseText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    actionIconSize,
  };
};

const createStatusStyles = (
  theme: any,
  adaptiveProps: any,
  movementMode: MovementMode
) => {
  const indicatorSize = movementMode === "DRIVING" ? 16 : 12;

  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing?.sm || 8,
    },
    indicator: {
      width: indicatorSize,
      height: indicatorSize,
      borderRadius: indicatorSize / 2,
      marginRight: theme.spacing?.sm || 8,
    },
    content: {
      flex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.medium,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
};

export default {
  AdaptiveButton,
  AdaptiveNotification,
  AdaptiveQuickActions,
  AdaptiveStatusIndicator,
};
