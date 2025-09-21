// 🍿 Expo Snack Demo - ModernButton (Clean Version)
// Kopier denne koden til https://snack.expo.dev
// Kompatibel med Expo Snack miljø

import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

// Mock theme for Snack compatibility
const mockTheme = {
  colors: {
    primary: "#007AFF",
    secondary: "#6C757D",
    success: "#28A745",
    warning: "#FFC107",
    danger: "#DC3545",
    background: "#FFFFFF",
    surface: "#F8F9FA",
    text: "#000000",
    textSecondary: "#6C757D",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "small" | "medium" | "large";
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
}

const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  icon,
  loading = false,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 35,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 35,
    }).start();
  };

  const getButtonStyles = () => {
    const baseStyles = {
      container: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: 12,
        paddingVertical: size === "small" ? 8 : size === "large" ? 16 : 12,
        paddingHorizontal: size === "small" ? 12 : size === "large" ? 24 : 18,
        minHeight: size === "small" ? 32 : size === "large" ? 48 : 40,
        opacity: disabled ? 0.6 : 1,
      },
      text: {
        fontSize: size === "small" ? 14 : size === "large" ? 18 : 16,
        fontWeight: "600" as const,
        marginLeft: icon ? 8 : 0,
      },
      iconSize: size === "small" ? 16 : size === "large" ? 24 : 20,
    };

    const variantColors = {
      primary: { bg: mockTheme.colors.primary, text: "#FFFFFF" },
      secondary: { bg: mockTheme.colors.secondary, text: "#FFFFFF" },
      success: { bg: mockTheme.colors.success, text: "#FFFFFF" },
      warning: { bg: mockTheme.colors.warning, text: "#000000" },
      danger: { bg: mockTheme.colors.danger, text: "#FFFFFF" },
    };

    const colors = variantColors[variant];

    return {
      container: {
        ...baseStyles.container,
        backgroundColor: colors.bg,
      },
      text: {
        ...baseStyles.text,
        color: colors.text,
      },
      iconSize: baseStyles.iconSize,
    };
  };

  const buttonStyles = getButtonStyles();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={buttonStyles.container}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator size="small" color={buttonStyles.text.color} />
        ) : (
          icon && (
            <MaterialIcons
              name={icon}
              size={buttonStyles.iconSize}
              color={buttonStyles.text.color}
            />
          )
        )}
        <Text style={buttonStyles.text}>{loading ? "Laster..." : title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Demo App
export default function App() {
  const handlePress = (buttonName: string) => {
    console.log(`${buttonName} trykket!`);
    alert(`${buttonName} trykket!`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🍿 EchoTrail ModernButton Demo</Text>
      <Text style={styles.subtitle}>
        Test alle varianter og størrelser av ModernButton komponenten
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Varianter</Text>

        <ModernButton
          title="Primary Button"
          onPress={() => handlePress("Primary")}
          variant="primary"
          icon="hiking"
        />

        <ModernButton
          title="Secondary Button"
          onPress={() => handlePress("Secondary")}
          variant="secondary"
          icon="map"
        />

        <ModernButton
          title="Success Button"
          onPress={() => handlePress("Success")}
          variant="success"
          icon="check-circle"
        />

        <ModernButton
          title="Warning Button"
          onPress={() => handlePress("Warning")}
          variant="warning"
          icon="warning"
        />

        <ModernButton
          title="Danger Button"
          onPress={() => handlePress("Danger")}
          variant="danger"
          icon="delete"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Størrelser</Text>

        <ModernButton
          title="Small Button"
          onPress={() => handlePress("Small")}
          size="small"
          icon="place"
        />

        <ModernButton
          title="Medium Button"
          onPress={() => handlePress("Medium")}
          size="medium"
          icon="explore"
        />

        <ModernButton
          title="Large Button"
          onPress={() => handlePress("Large")}
          size="large"
          icon="terrain"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>States</Text>

        <ModernButton
          title="Loading Button"
          onPress={() => handlePress("Loading")}
          loading={true}
          variant="primary"
        />

        <ModernButton
          title="Disabled Button"
          onPress={() => handlePress("Disabled")}
          disabled={true}
          variant="secondary"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🏔️ EchoTrail - AI-drevet historiefortelling for norske fjell
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mockTheme.colors.background,
  },
  content: {
    padding: mockTheme.spacing.md,
    paddingBottom: mockTheme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: mockTheme.colors.text,
    marginBottom: mockTheme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: mockTheme.colors.textSecondary,
    marginBottom: mockTheme.spacing.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: mockTheme.spacing.lg,
    gap: mockTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: mockTheme.colors.text,
    marginBottom: mockTheme.spacing.sm,
  },
  footer: {
    marginTop: mockTheme.spacing.xl,
    padding: mockTheme.spacing.md,
    backgroundColor: mockTheme.colors.surface,
    borderRadius: 12,
  },
  footerText: {
    textAlign: "center",
    color: mockTheme.colors.textSecondary,
    fontStyle: "italic",
  },
});
