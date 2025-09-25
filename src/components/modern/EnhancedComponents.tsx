import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Theme } from "../../ui";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width: screenWidth } = Dimensions.get("window");

// Enhanced Card with glassmorphism effect
interface GlassCardProps {
  children: React.ReactNode;
  theme: Theme;
  style?: ViewStyle;
  blurIntensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  theme,
  style,
  blurIntensity = 30,
}) => {
  return (
    <View style={[styles.glassCardContainer, style]}>
      <BlurView
        intensity={blurIntensity}
        style={[styles.glassCard, { borderColor: theme.colors.border }]}
      >
        {children}
      </BlurView>
    </View>
  );
};

// Enhanced Gradient Button
interface GradientButtonProps {
  title: string;
  onPress: () => void;
  theme: Theme;
  variant?: "primary" | "secondary" | "nature" | "gold";
  size?: "small" | "medium" | "large";
  icon?: keyof typeof MaterialIcons.glyphMap;
  disabled?: boolean;
  style?: ViewStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  theme,
  variant = "primary",
  size = "medium",
  icon,
  disabled = false,
  style,
}) => {
  const gradientColors = getGradientColors(variant, theme);
  const buttonStyles = getGradientButtonStyles(theme, size, disabled);

  return (
    <TouchableOpacity
      style={[buttonStyles.container, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={buttonStyles.gradient}
      >
        <View style={buttonStyles.content}>
          {icon && (
            <MaterialIcons
              name={icon}
              size={buttonStyles.iconSize}
              color={buttonStyles.text.color}
              style={buttonStyles.icon}
            />
          )}
          <Text style={buttonStyles.text}>{title}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Nature-inspired Hero Card
interface HeroCardProps {
  title: string;
  subtitle?: string;
  description: string;
  theme: Theme;
  onPress?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  backgroundType?: "forest" | "treasure" | "trail" | "mystery";
}

export const HeroCard: React.FC<HeroCardProps> = ({
  title,
  subtitle,
  description,
  theme,
  onPress,
  icon = "explore",
  backgroundType = "forest",
}) => {
  const gradientColors = getHeroGradientColors(backgroundType, theme);

  return (
    <TouchableOpacity
      style={styles.heroCardContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroIcon}>
            <MaterialIcons name={icon} size={32} color="#ffffff" />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: "#ffffff" }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.heroSubtitle, { color: "#ffffff" }]}>
                {subtitle}
              </Text>
            )}
            <Text style={[styles.heroDescription, { color: "#ffffff" }]}>
              {description}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Enhanced Status Badge
interface StatusBadgeProps {
  status: "active" | "completed" | "paused" | "new";
  theme: Theme;
  size?: "small" | "medium" | "large";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  theme,
  size = "medium",
}) => {
  const badgeStyles = getStatusBadgeStyles(status, theme, size);

  return (
    <View style={badgeStyles.container}>
      <Text style={badgeStyles.text}>
        {status === "active" && "🟢 Aktiv"}
        {status === "completed" && "✅ Fullført"}
        {status === "paused" && "⏸️ Pauset"}
        {status === "new" && "🆕 Ny"}
      </Text>
    </View>
  );
};

// Floating Action Button with nature theme
interface FloatingActionButtonProps {
  onPress: () => void;
  theme: Theme;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: "primary" | "secondary";
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  theme,
  icon = "add",
  variant = "primary",
}) => {
  const fabColors: [string, string] =
    variant === "primary"
      ? [theme.colors.primary, theme.colors.secondary]
      : [theme.colors.secondary, theme.colors.primary];

  return (
    <TouchableOpacity
      style={styles.fabContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={fabColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <MaterialIcons name={icon} size={28} color="#ffffff" />
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Helper functions
const getGradientColors = (variant: string, theme: Theme): [string, string] => {
  switch (variant) {
    case "nature":
      return [theme.colors.primary, theme.colors.success];
    case "gold":
      return [theme.colors.secondary, theme.colors.warning];
    case "secondary":
      return [
        theme.colors.secondary,
        theme.colors.accent || theme.colors.primary,
      ];
    default:
      return [theme.colors.primary, theme.colors.secondary];
  }
};

const getHeroGradientColors = (
  backgroundType: string,
  theme: Theme
): [string, string, string] => {
  switch (backgroundType) {
    case "treasure":
      return ["#b8860b", "#ffd700", "#b8860b"];
    case "trail":
      return [theme.colors.primary, theme.colors.success, theme.colors.primary];
    case "mystery":
      return ["#4a148c", "#7b1fa2", "#4a148c"];
    default: // forest
      return [theme.colors.primary, "#228b22", theme.colors.primary];
  }
};

const getGradientButtonStyles = (
  theme: Theme,
  size: string,
  disabled: boolean
) => {
  const sizes = {
    small: { height: 36, paddingHorizontal: 16, fontSize: 14, iconSize: 16 },
    medium: { height: 48, paddingHorizontal: 20, fontSize: 16, iconSize: 20 },
    large: { height: 56, paddingHorizontal: 24, fontSize: 18, iconSize: 24 },
  };

  const sizeConfig = sizes[size as keyof typeof sizes];

  return {
    container: {
      height: sizeConfig.height,
      borderRadius: theme.borderRadius._lg,
      overflow: "hidden" as const,
      opacity: disabled ? 0.6 : 1,
      ...theme.shadows?.md,
    },
    gradient: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    content: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: sizeConfig.paddingHorizontal,
    },
    text: {
      fontSize: sizeConfig.fontSize,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: "#ffffff",
    },
    icon: {
      marginRight: 8,
    },
    iconSize: sizeConfig.iconSize,
  };
};

const getStatusBadgeStyles = (status: string, theme: Theme, size: string) => {
  const colors = {
    active: theme.colors.success,
    completed: theme.colors.primary,
    paused: theme.colors.warning,
    new: theme.colors.secondary,
  };

  const sizes = {
    small: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
    medium: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
    large: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 16 },
  };

  const sizeConfig = sizes[size as keyof typeof sizes];
  const color = colors[status as keyof typeof colors] || theme.colors.primary;

  return {
    container: {
      backgroundColor: `${color}20`,
      borderColor: color,
      borderWidth: 1,
      borderRadius: theme.borderRadius.full || 20,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      paddingVertical: sizeConfig.paddingVertical,
    },
    text: {
      fontSize: sizeConfig.fontSize,
      fontFamily: theme.typography.fontFamily.medium,
      color: color,
    },
  };
};

const styles = StyleSheet.create({
  glassCardContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  heroCardContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 8,
  },
  heroGradient: {
    padding: 20,
    minHeight: 120,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});
