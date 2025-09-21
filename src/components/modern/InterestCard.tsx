import React, { useRef, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Theme } from "../../ui";

interface InterestCardProps {
  interest: {
    id: string;
    name: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    selected: boolean;
  };
  theme: Theme;
  onToggle: (id: string) => void;
}

export const InterestCard: React.FC<InterestCardProps> = ({
  interest,
  theme,
  onToggle,
}) => {
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (interest.selected) {
      // Animate icon when selected
      Animated.sequence([
        Animated.timing(iconScaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [interest.selected, iconScaleAnim]);

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle(interest.id);
  };

  if (interest.selected) {
    return (
      <Animated.View
        style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
      >
        <TouchableOpacity onPress={handlePress} style={styles.touchable}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={styles.selectedCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={styles.transformStyle}>
              <MaterialIcons
                name={interest.icon}
                size={32}
                color={theme.colors.surface}
              />
            </Animated.View>
            <Text
              style={[styles.selectedText, { color: theme.colors.surface }]}
            >
              {interest.name}
            </Text>

            {/* Selection indicator */}
            <Animated.View
              style={[
                styles.selectionBadge,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <MaterialIcons
                name="check"
                size={16}
                color={theme.colors.primary}
              />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity onPress={handlePress} style={styles.touchable}>
        <Animated.View
          style={[
            styles.defaultCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              ...theme.shadows?.sm,
            },
          ]}
        >
          <Animated.View style={styles.transformStyle}>
            <MaterialIcons
              name={interest.icon}
              size={32}
              color={theme.colors.primary}
            />
          </Animated.View>
          <Text style={[styles.defaultText, { color: theme.colors.text }]}>
            {interest.name}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      width: "48%",
      marginBottom: 12,
    },
    touchable: {
      borderRadius: 16,
    },
    defaultCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 2,
      minHeight: 100,
    },
    selectedCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 16,
      minHeight: 100,
      position: "relative",
    },
    defaultText: {
      fontSize: 14,
      fontWeight: "500",
      marginTop: 8,
      textAlign: "center",
    },
    selectedText: {
      fontSize: 14,
      fontWeight: "600",
      marginTop: 8,
      textAlign: "center",
    },
    selectionBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    transformStyle: {
      transform: [{ scale: 1 }],
    },
  });
