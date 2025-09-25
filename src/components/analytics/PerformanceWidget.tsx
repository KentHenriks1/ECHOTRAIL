import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { logger } from "../../utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import AnalyticsManager, { UserMetrics } from "../../services/AnalyticsManager";
import { useTheme } from "../../context/ThemeContext";

interface PerformanceWidgetProps {
  onPress?: () => void;
  showTrend?: boolean;
}

const { width } = Dimensions.get("window");

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({
  onPress,
  showTrend = true,
}) => {
  const { colors } = useTheme();
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      await AnalyticsManager.initialize();
      const metrics = AnalyticsManager.getUserMetrics();
      setUserMetrics(metrics);
    } catch (error) {
      logger.warn("Failed to load metrics for widget:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)} km`;
    }
    return `${Math.round(distance)} m`;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}t ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSpeed = (speed: number): string => {
    const kmh = speed * 3.6;
    return `${kmh.toFixed(1)} km/t`;
  };

  if (loading || !userMetrics) {
    return (
      <TouchableOpacity
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.surface },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Laster statistikk...
        </Text>
      </TouchableOpacity>
    );
  }

  // Show different content based on user activity
  const hasActivity = userMetrics.totalTrailsCompleted > 0;

  if (!hasActivity) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }]}
        onPress={onPress}
      >
        <LinearGradient
          colors={[`${colors.primary}20`, `${colors.primary}10`]}
          style={styles.gradient}
        >
          <View style={styles.emptyStateContainer}>
            <Ionicons name="stats-chart" size={32} color={colors.primary} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              Start din første tur!
            </Text>
            <Text
              style={[
                styles.emptyStateSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Se progresjon og statistikk her
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={[`${colors.primary}15`, `${colors.primary}05`]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="stats-chart" size={20} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              Din progresjon
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textSecondary}
          />
        </View>

        <View style={styles.statsGrid}>
          {/* Trails completed */}
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {userMetrics.totalTrailsCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Stier
            </Text>
          </View>

          {/* Total distance */}
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDistance(userMetrics.totalDistance)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Distanse
            </Text>
          </View>

          {/* Average speed */}
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatSpeed(userMetrics.averageSpeed)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Gj.snitt
            </Text>
          </View>
        </View>

        {showTrend && userMetrics.totalTrailsCompleted >= 3 && (
          <View style={styles.trendContainer}>
            <View style={styles.trendItem}>
              <Ionicons name="trending-up" size={14} color="#4CAF50" />
              <Text style={[styles.trendText, { color: colors.textSecondary }]}>
                {userMetrics.averageTrailRating > 0
                  ? `${userMetrics.averageTrailRating.toFixed(1)} ★ gjennomsnittsvurdering`
                  : "Fortsett den gode trenden!"}
              </Text>
            </View>
          </View>
        )}

        {/* Quick insight */}
        <View style={styles.insightContainer}>
          <Text style={[styles.insightText, { color: colors.textSecondary }]}>
            {userMetrics.preferredDifficulty === "easy" &&
              "Du liker lette stier 🌿"}
            {userMetrics.preferredDifficulty === "moderate" &&
              "Du takler moderate utfordringer 🏃‍♂️"}
            {userMetrics.preferredDifficulty === "hard" &&
              "Du elsker krevende stier ⛰️"}
            {userMetrics.preferredDifficulty === "extreme" &&
              "Du er en erfaren eventyrer 🔥"}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  trendContainer: {
    marginBottom: 12,
  },
  trendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  insightContainer: {
    alignItems: "center",
  },
  insightText: {
    fontSize: 12,
    fontWeight: "500",
    fontStyle: "italic",
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
});

export default PerformanceWidget;
