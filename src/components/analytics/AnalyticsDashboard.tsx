import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { logger } from "../../utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import AnalyticsManager, {
  UserMetrics,
  PredictiveInsights,
  PerformanceTrends,
  SessionAnalytics,
} from "../../services/AnalyticsManager";
import { useTheme } from "../../context/ThemeContext";
import { Trail } from "../../types/Trail";

interface AnalyticsDashboardProps {
  availableTrails: Trail[];
  onTrailSelect?: (trailId: string) => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: number; // percentage change
}

const { width } = Dimensions.get("window");

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  color,
  trend,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={24} color={color} />
        {trend !== undefined && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend >= 0 ? "trending-up" : "trending-down"}
              size={16}
              color={trend >= 0 ? "#4CAF50" : "#F44336"}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend >= 0 ? "#4CAF50" : "#F44336" },
              ]}
            >
              {Math.abs(trend).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>
        {value}
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </Text>
      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
};

interface AchievementBadgeProps {
  achievement: SessionAnalytics["achievements"][0];
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement }) => {
  const { colors } = useTheme();

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case "distance":
        return "walk";
      case "time":
        return "time";
      case "elevation":
        return "trending-up";
      case "streak":
        return "flame";
      case "exploration":
        return "compass";
      default:
        return "trophy";
    }
  };

  return (
    <View
      style={[styles.achievementBadge, { backgroundColor: colors.primary }]}
    >
      <Ionicons
        name={getAchievementIcon(achievement.type)}
        size={20}
        color="white"
      />
      <Text style={styles.achievementName}>{achievement.name}</Text>
    </View>
  );
};

interface RecommendationCardProps {
  recommendation: PredictiveInsights["recommendedTrails"][0];
  trail: Trail | undefined;
  onSelect: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  trail,
  onSelect,
}) => {
  const { colors } = useTheme();

  if (!trail) return null;

  return (
    <TouchableOpacity
      style={[styles.recommendationCard, { backgroundColor: colors.surface }]}
      onPress={onSelect}
    >
      <LinearGradient
        colors={[`${colors.primary}20`, `${colors.primary}10`]}
        style={styles.recommendationGradient}
      >
        <View style={styles.recommendationHeader}>
          <Text style={[styles.recommendationTitle, { color: colors.text }]}>
            {trail.name}
          </Text>
          <View style={styles.scoreContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={[styles.scoreText, { color: colors.text }]}>
              {recommendation.score}/100
            </Text>
          </View>
        </View>

        <View style={styles.trailInfo}>
          <View style={styles.trailInfoItem}>
            <Ionicons name="walk" size={16} color={colors.textSecondary} />
            <Text
              style={[styles.trailInfoText, { color: colors.textSecondary }]}
            >
              {(trail.distance / 1000).toFixed(1)} km
            </Text>
          </View>
          <View style={styles.trailInfoItem}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text
              style={[styles.trailInfoText, { color: colors.textSecondary }]}
            >
              {trail.estimatedDuration} min
            </Text>
          </View>
          <View style={styles.trailInfoItem}>
            <Ionicons
              name={
                trail.difficulty === "easy"
                  ? "leaf"
                  : trail.difficulty === "moderate"
                    ? "fitness"
                    : "flame"
              }
              size={16}
              color={
                trail.difficulty === "easy"
                  ? "#4CAF50"
                  : trail.difficulty === "moderate"
                    ? "#FF9800"
                    : "#F44336"
              }
            />
            <Text
              style={[styles.trailInfoText, { color: colors.textSecondary }]}
            >
              {trail.difficulty}
            </Text>
          </View>
        </View>

        <View style={styles.reasoningContainer}>
          {recommendation.reasoning.slice(0, 2).map((reason, index) => (
            <Text
              key={index}
              style={[styles.reasoningText, { color: colors.textSecondary }]}
            >
              • {reason}
            </Text>
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  availableTrails,
  onTrailSelect,
}) => {
  const { colors } = useTheme();
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [insights, setInsights] = useState<PredictiveInsights | null>(null);
  const [trends, setTrends] = useState<PerformanceTrends | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionAnalytics | null>(
    null
  );
  const [selectedPeriod, setSelectedPeriod] =
    useState<PerformanceTrends["period"]>("month");
  const [loading, setLoading] = useState(true);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      await AnalyticsManager.initialize();

      const metrics = AnalyticsManager.getUserMetrics();
      const predictiveInsights =
        await AnalyticsManager.generateInsights(availableTrails);
      const performanceTrends =
        await AnalyticsManager.getPerformanceTrends(selectedPeriod);
      const session = AnalyticsManager.getCurrentSession();

      setUserMetrics(metrics);
      setInsights(predictiveInsights);
      setTrends(performanceTrends);
      setCurrentSession(session);
    } catch (error) {
      logger.error("Failed to load analytics data:", error);
      Alert.alert("Feil", "Kunne ikke laste analysedata");
    } finally {
      setLoading(false);
    }
  }, [availableTrails, selectedPeriod]);

  useFocusEffect(
    React.useCallback(() => {
      loadAnalyticsData();
    }, [loadAnalyticsData])
  );

  const formatDistance = (distance: number): string => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)}`;
    }
    return `${Math.round(distance)}`;
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
    return kmh.toFixed(1);
  };

  const exportData = async () => {
    try {
      const data = await AnalyticsManager.exportAnalyticsData();
      // Here you would typically implement a share dialog or file save
      Alert.alert("Eksport fullført", "Dine analysedata er klare for eksport");
      logger.debug("Analytics data exported:", `${data.substring(0, 200)}...`);
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke eksportere data");
    }
  };

  const clearData = async () => {
    Alert.alert(
      "Slett alle data",
      "Er du sikker på at du vil slette alle dine analysedata? Dette kan ikke angres.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            try {
              await AnalyticsManager.clearAllData();
              await loadAnalyticsData();
              Alert.alert("Slettet", "Alle analysedata har blitt slettet");
            } catch (error) {
              Alert.alert("Feil", "Kunne ikke slette data");
            }
          },
        },
      ]
    );
  };

  if (loading || !userMetrics) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Laster analysedata...
        </Text>
      </View>
    );
  }

  const recentAchievements = currentSession?.achievements || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Dine Statistikker
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={exportData}
          >
            <Ionicons name="share" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.error }]}
            onPress={clearData}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <MetricCard
          title="Fullførte stier"
          value={userMetrics.totalTrailsCompleted}
          icon="map"
          color={colors.primary}
          trend={trends?.metrics.distanceTrend}
        />
        <MetricCard
          title="Total distanse"
          value={formatDistance(userMetrics.totalDistance)}
          unit=" km"
          icon="walk"
          color="#4CAF50"
          trend={trends?.metrics.distanceTrend}
        />
        <MetricCard
          title="Total tid"
          value={formatTime(userMetrics.totalTime)}
          icon="time"
          color="#FF9800"
        />
        <MetricCard
          title="Gj.snittshastighet"
          value={formatSpeed(userMetrics.averageSpeed)}
          unit=" km/h"
          icon="speedometer"
          color="#9C27B0"
          trend={trends?.metrics.speedTrend}
        />
      </View>

      {/* Current Session */}
      {currentSession && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Pågående økt
          </Text>
          <View style={styles.sessionInfo}>
            <View style={styles.sessionStat}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.sessionStatText, { color: colors.text }]}>
                {formatTime(currentSession.metrics.activeTime / 1000)}
              </Text>
            </View>
            {currentSession.metrics.steps && (
              <View style={styles.sessionStat}>
                <Ionicons name="footsteps" size={20} color={colors.primary} />
                <Text style={[styles.sessionStatText, { color: colors.text }]}>
                  {currentSession.metrics.steps.toLocaleString()} skritt
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Nylige prestasjoner
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.achievementsContainer}>
              {recentAchievements.map((achievement, index) => (
                <AchievementBadge key={index} achievement={achievement} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Performance Trends */}
      {trends && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Ytelsestrend
            </Text>
            <View style={styles.periodSelector}>
              {(["week", "month", "quarter", "year"] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === period
                        ? { color: "white" }
                        : { color: colors.textSecondary },
                    ]}
                  >
                    {period === "week"
                      ? "Uke"
                      : period === "month"
                        ? "Måned"
                        : period === "quarter"
                          ? "Kvartal"
                          : "År"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.trendsGrid}>
            <View style={styles.trendItem}>
              <Text
                style={[styles.trendLabel, { color: colors.textSecondary }]}
              >
                Konsistens
              </Text>
              <View style={styles.trendBar}>
                <View
                  style={[
                    styles.trendBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${trends.metrics.consistencyScore}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.trendValue, { color: colors.text }]}>
                {trends.metrics.consistencyScore}/100
              </Text>
            </View>
          </View>

          {trends.insights.length > 0 && (
            <View style={styles.insightsContainer}>
              <Text style={[styles.insightsTitle, { color: colors.text }]}>
                Innsikt
              </Text>
              {trends.insights.map((insight, index) => (
                <Text
                  key={index}
                  style={[styles.insightText, { color: colors.textSecondary }]}
                >
                  • {insight}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Trail Recommendations */}
      {insights && insights.recommendedTrails.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Anbefalte stier
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.recommendationsContainer}>
              {insights.recommendedTrails.map((recommendation) => {
                const trail = availableTrails.find(
                  (t) => t.id === recommendation.trailId
                );
                return (
                  <RecommendationCard
                    key={recommendation.trailId}
                    recommendation={recommendation}
                    trail={trail}
                    onSelect={() => onTrailSelect?.(recommendation.trailId)}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Insights and Tips */}
      {insights && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Personlige anbefalinger
          </Text>

          {/* Optimal Start Time */}
          <View style={styles.insightItem}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>
                Optimal starttid: {insights.optimalStartTime.hour}:00
              </Text>
              <Text
                style={[
                  styles.insightDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {insights.optimalStartTime.reasoning}
              </Text>
            </View>
          </View>

          {/* Preparation Tips */}
          {insights.preparationTips.length > 0 && (
            <View style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>
                  Forberedelsestips
                </Text>
                {insights.preparationTips.map((tip, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.insightDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    • {tip}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Risk Factors */}
          {insights.riskFactors.length > 0 && (
            <View style={styles.insightItem}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>
                  Risikovurdering
                </Text>
                {insights.riskFactors.map((risk, index) => (
                  <View key={index} style={styles.riskItem}>
                    <Text
                      style={[
                        styles.riskFactor,
                        {
                          color:
                            risk.severity === "high"
                              ? "#F44336"
                              : risk.severity === "medium"
                                ? "#FF9800"
                                : "#4CAF50",
                        },
                      ]}
                    >
                      {risk.factor} ({risk.severity})
                    </Text>
                    <Text
                      style={[
                        styles.riskMitigation,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {risk.mitigation}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: "normal",
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sessionInfo: {
    flexDirection: "row",
    gap: 20,
  },
  sessionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionStatText: {
    fontSize: 16,
    fontWeight: "600",
  },
  achievementsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  achievementName: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  trendsGrid: {
    gap: 16,
  },
  trendItem: {
    gap: 8,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  trendBar: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  trendBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  insightsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationsContainer: {
    flexDirection: "row",
    gap: 16,
    paddingRight: 20,
  },
  recommendationCard: {
    width: 280,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recommendationGradient: {
    padding: 16,
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trailInfo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  trailInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trailInfoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  reasoningContainer: {
    gap: 4,
  },
  reasoningText: {
    fontSize: 12,
    lineHeight: 16,
  },
  insightItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  insightContent: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  riskItem: {
    marginVertical: 4,
  },
  riskFactor: {
    fontSize: 14,
    fontWeight: "600",
  },
  riskMitigation: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  bottomPadding: {
    height: 20,
  },
});

export default AnalyticsDashboard;
