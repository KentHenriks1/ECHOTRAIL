import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Theme } from "../../ui";

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  theme: Theme;
  showText?: boolean;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  theme,
  showText = true,
  color = theme.colors.primary,
}) => {
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circleRef = useRef<any>(null);

  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      <svg width={size} height={size} style={styles.circularSvg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth="4"
          fill="none"
        />
        {/* Note: SVG circles would need react-native-svg for proper implementation */}
        {/* This is a simplified version using View for demonstration */}
        <Animated.View
          style={[
            {
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              borderWidth: 4,
              borderColor: color,
              position: "absolute",
              top: 5,
              left: 5,
            },
          ]}
        />
      </svg>
      {showText && (
        <View style={styles.circularText}>
          <Text style={[styles.progressText, { color: theme.colors.text }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
    </View>
  );
};

interface LinearProgressProps {
  progress: number; // 0-100
  theme: Theme;
  height?: number;
  animated?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress,
  theme,
  height = 8,
  animated = true,
  gradient = false,
  style,
}) => {
  const styles = createStyles(theme);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(progress);
    }
  }, [progress, animated, animatedWidth]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.linearContainer, { height }, style]}>
      <View
        style={[
          styles.linearBackground,
          { backgroundColor: theme.colors.border },
        ]}
      />
      {gradient ? (
        <Animated.View
          style={[styles.linearProgress, { width: widthInterpolated }]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBar}
          />
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.linearProgress,
            {
              backgroundColor: theme.colors.primary,
              width: widthInterpolated,
            },
          ]}
        />
      )}
    </View>
  );
};

interface WaveProgressProps {
  progress: number; // 0-100
  theme: Theme;
  height?: number;
  animated?: boolean;
}

export const WaveProgress: React.FC<WaveProgressProps> = ({
  progress,
  theme,
  height = 60,
  animated = true,
}) => {
  const styles = createStyles(theme);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wave animation
    if (animated && progress > 0 && progress < 100) {
      const wave = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      wave.start();
      return () => wave.stop();
    }
    return undefined;
  }, [progress, animated, waveAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const progressHeight = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, height],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.waveContainer, { height }]}>
      <View style={styles.waveBackground} />
      <Animated.View
        style={[
          styles.waveProgress,
          {
            height: progressHeight,
            backgroundColor: `${theme.colors.primary}80`,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.wave,
            {
              transform: [{ translateX }],
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

interface StatusIndicatorProps {
  status: "idle" | "loading" | "success" | "error";
  theme: Theme;
  size?: number;
  text?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  theme,
  size = 24,
  text,
}) => {
  const styles = createStyles(theme);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "loading") {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    }
    return undefined;
  }, [status, spinAnim]);

  useEffect(() => {
    if (status === "success" || status === "error") {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return undefined;
  }, [status, scaleAnim]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getIconAndColor = () => {
    switch (status) {
      case "loading":
        return { icon: "refresh" as const, color: theme.colors.primary };
      case "success":
        return { icon: "check-circle" as const, color: theme.colors.success };
      case "error":
        return { icon: "error" as const, color: theme.colors.error };
      default:
        return {
          icon: "radio-button-unchecked" as const,
          color: theme.colors.textSecondary,
        };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <View style={styles.statusContainer}>
      <Animated.View
        style={[
          {
            transform: [
              { rotate: status === "loading" ? rotation : "0deg" },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <MaterialIcons name={icon} size={size} color={color} />
      </Animated.View>
      {text && (
        <Text style={[styles.statusText, { color: theme.colors.text }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    circularContainer: {
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    circularSvg: {
      position: "absolute",
    },
    circularText: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
    },
    progressText: {
      fontSize: 14,
      fontWeight: "600",
    },
    linearContainer: {
      width: "100%",
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
    },
    linearBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    linearProgress: {
      height: "100%",
      borderRadius: 10,
    },
    gradientBar: {
      flex: 1,
      borderRadius: 10,
    },
    waveContainer: {
      width: "100%",
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
      backgroundColor: "#f0f0f0",
    },
    waveBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    waveProgress: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: 10,
    },
    wave: {
      position: "absolute",
      top: -5,
      left: 0,
      right: -20,
      height: 10,
      borderRadius: 10,
      opacity: 0.6,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statusText: {
      fontSize: 14,
      fontWeight: "500",
    },
  });
