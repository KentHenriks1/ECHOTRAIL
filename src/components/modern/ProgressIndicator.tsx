import React from "react";
import { View, Text, StyleSheet, ViewStyle, Animated } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface ProgressIndicatorProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  style?: ViewStyle;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  size = 40,
  strokeWidth = 4,
  color,
  label,
  style,
}) => {
  const { colors } = useTheme();
  const progressColor = color || colors.primary;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View
        style={[
          styles.progressBar,
          {
            width: size,
            height: strokeWidth,
            backgroundColor: colors.border,
            borderRadius: strokeWidth / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              height: strokeWidth,
              backgroundColor: progressColor,
              borderRadius: strokeWidth / 2,
            },
          ]}
        />
      </View>
      {label && (
        <Text
          style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressBar: {
    position: "relative",
    overflow: "hidden",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  label: {
    fontSize: 12,
    textAlign: "center",
  },
});

export default ProgressIndicator;
