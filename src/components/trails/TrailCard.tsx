import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Trail } from "../../types/Trail";
import { Theme } from "../../ui";
import { ModernCard } from "../modern";

interface TrailCardProps {
  trail: Trail;
  theme: Theme;
  onPress?: () => void;
  onStartTrail?: () => void;
  showDistance?: boolean;
  userDistance?: number; // in meters
  compact?: boolean;
}

export const TrailCard: React.FC<TrailCardProps> = ({
  trail,
  theme,
  onPress,
  onStartTrail,
  showDistance = false,
  userDistance,
  compact = false,
}) => {
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  const getDifficultyInfo = (difficulty: Trail["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return {
          color: "#22c55e",
          text: "Lett",
          icon: "trending-flat" as const,
        };
      case "moderate":
        return {
          color: "#f59e0b",
          text: "Moderat",
          icon: "trending-up" as const,
        };
      case "hard":
        return {
          color: "#ef4444",
          text: "Vanskelig",
          icon: "keyboard-double-arrow-up" as const,
        };
      case "extreme":
        return { color: "#8b5cf6", text: "Ekstrem", icon: "warning" as const };
      default:
        return {
          color: theme.colors.primary,
          text: "Ukjent",
          icon: "help" as const,
        };
    }
  };

  const getCategoryIcon = (
    category: Trail["category"]
  ): keyof typeof MaterialIcons.glyphMap => {
    switch (category) {
      case "hiking":
        return "hiking";
      case "walking":
        return "directions-walk";
      case "cycling":
        return "directions-bike";
      case "cultural":
        return "museum";
      case "historical":
        return "history";
      case "nature":
        return "nature";
      default:
        return "place";
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}min`;
    }
    return `${hours}t ${mins}min`;
  };

  const difficultyInfo = getDifficultyInfo(trail.difficulty);

  if (compact) {
    return (
      <Animated.View style={styles.transformStyle}>
        <TouchableOpacity onPress={handlePress}>
          <ModernCard
            theme={theme}
            variant="default"
            style={styles.compactCard}
          >
            <View style={styles.compactContent}>
              <View style={styles.compactHeader}>
                <MaterialIcons
                  name={getCategoryIcon(trail.category)}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.compactTitle, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {trail.name}
                </Text>
                <View
                  style={[
                    styles.compactDifficulty,
                    { backgroundColor: `${difficultyInfo.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={difficultyInfo.icon}
                    size={12}
                    color={difficultyInfo.color}
                  />
                </View>
              </View>

              <View style={styles.compactMeta}>
                <Text
                  style={[
                    styles.compactMetaText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {formatDistance(trail.distance)} •{" "}
                  {formatDuration(trail.estimatedDuration)}
                </Text>
                {showDistance && userDistance && (
                  <Text
                    style={[
                      styles.compactMetaText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {formatDistance(userDistance)} unna
                  </Text>
                )}
              </View>
            </View>
          </ModernCard>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.transformStyle}>
      <TouchableOpacity onPress={handlePress}>
        <ModernCard theme={theme} variant="elevated" style={styles.card}>
          {/* Header with gradient */}
          <LinearGradient
            colors={[
              `${theme.colors.primary}20`,
              `${theme.colors.secondary}10`,
            ]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerTop}>
              <View style={styles.categoryBadge}>
                <MaterialIcons
                  name={getCategoryIcon(trail.category)}
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.categoryText, { color: theme.colors.primary }]}
                >
                  {`${trail.category.charAt(0).toUpperCase()}${trail.category.slice(1)}`}
                </Text>
              </View>

              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: difficultyInfo.color },
                ]}
              >
                <MaterialIcons
                  name={difficultyInfo.icon}
                  size={14}
                  color="white"
                />
                <Text style={styles.difficultyText}>{difficultyInfo.text}</Text>
              </View>
            </View>

            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {trail.name}
            </Text>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text
              style={[
                styles.description,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {trail.description}
            </Text>

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <MaterialIcons
                  name="straighten"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={[styles.statText, { color: theme.colors.text }]}>
                  {formatDistance(trail.distance)}
                </Text>
              </View>

              <View style={styles.stat}>
                <MaterialIcons
                  name="schedule"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={[styles.statText, { color: theme.colors.text }]}>
                  {formatDuration(trail.estimatedDuration)}
                </Text>
              </View>

              <View style={styles.stat}>
                <MaterialIcons
                  name="trending-up"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={[styles.statText, { color: theme.colors.text }]}>
                  {trail.elevationGain}m
                </Text>
              </View>

              <View style={styles.stat}>
                <MaterialIcons name="star" size={16} color="#f59e0b" />
                <Text style={[styles.statText, { color: theme.colors.text }]}>
                  {trail.rating.toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Distance to user */}
            {showDistance && userDistance && (
              <View style={styles.distanceContainer}>
                <MaterialIcons
                  name="my-location"
                  size={14}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.distanceText, { color: theme.colors.primary }]}
                >
                  {formatDistance(userDistance)} fra din posisjon
                </Text>
              </View>
            )}

            {/* Audio guide indicator */}
            {trail.audioGuidePoints.length > 0 && (
              <View style={styles.audioGuideContainer}>
                <MaterialIcons
                  name="volume-up"
                  size={14}
                  color={theme.colors.secondary}
                />
                <Text
                  style={[
                    styles.audioGuideText,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {trail.audioGuidePoints.length} lydguide-punkter
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          {onStartTrail && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={onStartTrail}
              >
                <MaterialIcons name="play-arrow" size={16} color="white" />
                <Text style={styles.startButtonText}>Start sti</Text>
              </TouchableOpacity>
            </View>
          )}
        </ModernCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      marginBottom: 16,
      overflow: "hidden",
    },
    compactCard: {
      marginBottom: 8,
    },
    compactContent: {
      padding: 12,
    },
    compactHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    compactTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
      marginRight: 8,
    },
    compactDifficulty: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    compactMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    compactMetaText: {
      fontSize: 12,
    },
    header: {
      padding: 16,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.9)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 4,
    },
    difficultyBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    difficultyText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
    },
    content: {
      padding: 16,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    stats: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    stat: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    statText: {
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 4,
    },
    distanceContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    distanceText: {
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 4,
    },
    audioGuideContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    audioGuideText: {
      fontSize: 12,
      fontWeight: "500",
      marginLeft: 4,
    },
    actions: {
      padding: 16,
      paddingTop: 0,
    },
    startButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    startButtonText: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 4,
    },
    transformStyle: {
      transform: [{ scale: 1 }],
    },
  });
