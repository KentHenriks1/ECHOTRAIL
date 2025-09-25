import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { logger } from "../utils/logger";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MapView } from "../components/maps/MapView";
import {
  ModernButton,
  ModernCard,
  ProgressIndicator,
} from "../components/modern";
import { Trail } from "../types/Trail";
import { useTheme } from "../hooks/useTheme";
import { BlurView } from "expo-blur";

interface TrailDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      trail: Trail;
    };
  };
}

export const TrailDetailsScreen: React.FC<TrailDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const { trail } = route.params;
  const { colors, isDark } = useTheme();
  const theme = {
    colors,
    _dark: isDark,
    typography: {
      fontSize: {
        _xs: 12,
        _sm: 14,
        _md: 16,
        _lg: 18,
        _xl: 20,
        _xxl: 24,
        _xxxl: 32,
      },
      fontFamily: {
        regular: "System",
        medium: "System",
        semiBold: "System",
        bold: "System",
      },
    },
    spacing: {
      _xs: 4,
      _sm: 8,
      _md: 16,
      _lg: 24,
      _xl: 32,
    },
    borderRadius: {
      _sm: 4,
      _md: 8,
      _lg: 16,
      _xl: 24,
    },
  }; // Backward compatibility wrapper
  const styles = createStyles(theme);
  const [isStartingTrail, setIsStartingTrail] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const mapHeight = screenHeight * 0.4;

  useEffect(() => {
    // Animate header opacity based on scroll
    const listener = scrollY.addListener(({ value }) => {
      const opacity = Math.min(value / 200, 1);
      headerOpacity.setValue(opacity);
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY, headerOpacity]);

  const getDifficultyInfo = (difficulty: Trail["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return {
          color: "#22c55e",
          text: "Lett",
          icon: "trending-flat" as const,
          description: "Enkel sti for alle",
        };
      case "moderate":
        return {
          color: "#f59e0b",
          text: "Moderat",
          icon: "trending-up" as const,
          description: "Krever noe erfaring",
        };
      case "hard":
        return {
          color: "#ef4444",
          text: "Vanskelig",
          icon: "keyboard-double-arrow-up" as const,
          description: "For erfarne vandrere",
        };
      case "extreme":
        return {
          color: "#8b5cf6",
          text: "Ekstrem",
          icon: "warning" as const,
          description: "Kun for eksperter",
        };
      default:
        return {
          color: theme.colors.primary,
          text: "Ukjent",
          icon: "help" as const,
          description: "",
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
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins} min`;
    }
    return `${hours}t ${mins}min`;
  };

  const handleStartTrail = async () => {
    setIsStartingTrail(true);

    try {
      // Simulate preparation (location check, permissions, etc.)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate to active trail screen
      navigation.navigate("ActiveTrail", { trail });
    } catch (error) {
      logger.error("Error starting trail:", error);
    } finally {
      setIsStartingTrail(false);
    }
  };

  const difficultyInfo = getDifficultyInfo(trail.difficulty);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme._dark ? "light" : "dark"} />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <BlurView
          intensity={theme._dark ? 80 : 95}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {trail.name}
          </Text>
          <TouchableOpacity onPress={() => logger.debug("Share trail")}>
            <MaterialIcons name="share" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Map Section */}
        <View style={[styles.mapContainer, { height: mapHeight }]}>
          <MapView
            theme={theme}
            trails={[trail]}
            showUserLocation={false}
            style={styles.map}
          />

          {/* Map overlay with back button */}
          <View style={styles.mapOverlay}>
            <TouchableOpacity
              style={[
                styles.mapButton,
                { backgroundColor: theme.colors.background },
              ]}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mapButton,
                { backgroundColor: theme.colors.background },
              ]}
              onPress={() => setShowFullMap(true)}
            >
              <MaterialIcons
                name="fullscreen"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <ModernCard theme={theme} variant="elevated" style={styles.titleCard}>
            <LinearGradient
              colors={[
                `${theme.colors.primary}15`,
                `${theme.colors.secondary}10`,
              ]}
              style={styles.titleGradient}
            >
              <View style={styles.titleHeader}>
                <View style={styles.categoryContainer}>
                  <MaterialIcons
                    name={getCategoryIcon(trail.category)}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: theme.colors.primary },
                    ]}
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
                    size={16}
                    color="white"
                  />
                  <Text style={styles.difficultyText}>
                    {difficultyInfo.text}
                  </Text>
                </View>
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>
                {trail.name}
              </Text>

              <Text
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              >
                {difficultyInfo.description}
              </Text>
            </LinearGradient>
          </ModernCard>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <ModernCard theme={theme} variant="glass" style={styles.statCard}>
              <MaterialIcons
                name="straighten"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatDistance(trail.distance)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Distanse
              </Text>
            </ModernCard>

            <ModernCard theme={theme} variant="glass" style={styles.statCard}>
              <MaterialIcons
                name="schedule"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatDuration(trail.estimatedDuration)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Estimert tid
              </Text>
            </ModernCard>

            <ModernCard theme={theme} variant="glass" style={styles.statCard}>
              <MaterialIcons
                name="trending-up"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {trail.elevationGain}m
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Høydestigning
              </Text>
            </ModernCard>

            <ModernCard theme={theme} variant="glass" style={styles.statCard}>
              <MaterialIcons name="star" size={24} color="#f59e0b" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {trail.rating.toFixed(1)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Vurdering
              </Text>
            </ModernCard>
          </View>

          {/* Description */}
          <ModernCard
            theme={theme}
            variant="default"
            style={styles.descriptionCard}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Om denne stien
            </Text>
            <Text
              style={[
                styles.description,
                { color: theme.colors.textSecondary },
              ]}
            >
              {trail.description}
            </Text>
          </ModernCard>

          {/* Audio Guide Points */}
          {trail.audioGuidePoints.length > 0 && (
            <ModernCard
              theme={theme}
              variant="default"
              style={styles.audioCard}
            >
              <View style={styles.audioHeader}>
                <MaterialIcons
                  name="volume-up"
                  size={24}
                  color={theme.colors.secondary}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text, marginLeft: 8 },
                  ]}
                >
                  Lydguide
                </Text>
              </View>
              <Text
                style={[
                  styles.audioDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Denne stien har {trail.audioGuidePoints.length} lydguide-punkter
                som vil spilles av automatisk når du passerer dem.
              </Text>

              {/* Audio points list */}
              <View style={styles.audioPointsList}>
                {trail.audioGuidePoints.slice(0, 3).map((point, index) => (
                  <View key={point.id} style={styles.audioPoint}>
                    <View
                      style={[
                        styles.audioPointNumber,
                        { backgroundColor: theme.colors.secondary },
                      ]}
                    >
                      <Text style={styles.audioPointNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.audioPointTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {point.title}
                    </Text>
                  </View>
                ))}
                {trail.audioGuidePoints.length > 3 && (
                  <Text
                    style={[
                      styles.morePointsText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    +{trail.audioGuidePoints.length - 3} flere punkter
                  </Text>
                )}
              </View>
            </ModernCard>
          )}

          {/* Start Trail Button */}
          <View style={styles.startSection}>
            {isStartingTrail && (
              <ProgressIndicator
                progress={0.7}
                label="Forbereder sti..."
                style={styles.progressIndicator}
              />
            )}

            <ModernButton
              theme={theme}
              title={isStartingTrail ? "Starter..." : "Start sti"}
              onPress={handleStartTrail}
              variant="primary"
              size="large"
              disabled={isStartingTrail}
              icon={isStartingTrail ? undefined : "play-arrow"}
              style={styles.startButton}
            />

            <Text
              style={[styles.startHint, { color: theme.colors.textSecondary }]}
            >
              Sørg for at du har god GPS-dekning og nok batteri før du starter
            </Text>
          </View>

          {/* Bottom spacing */}
          <View style={styles.height} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: Platform.OS === "ios" ? 88 : 64,
      paddingTop: Platform.OS === "ios" ? 44 : 0,
    },
    headerContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      marginHorizontal: 16,
    },
    scrollView: {
      flex: 1,
    },
    mapContainer: {
      position: "relative",
    },
    map: {
      flex: 1,
    },
    mapOverlay: {
      position: "absolute",
      top: Platform.OS === "ios" ? 54 : 20,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    mapButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    content: {
      padding: 16,
    },
    titleCard: {
      marginBottom: 16,
      overflow: "hidden",
    },
    titleGradient: {
      padding: 20,
    },
    titleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    categoryContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "500",
      marginLeft: 6,
    },
    difficultyBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
    },
    difficultyText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 4,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      lineHeight: 30,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 16,
      gap: 8,
    },
    statCard: {
      flex: 1,
      minWidth: "45%",
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700",
      marginTop: 8,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      textAlign: "center",
    },
    descriptionCard: {
      padding: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      lineHeight: 22,
    },
    audioCard: {
      padding: 20,
      marginBottom: 16,
    },
    audioHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    audioDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    audioPointsList: {
      gap: 12,
    },
    audioPoint: {
      flexDirection: "row",
      alignItems: "center",
    },
    audioPointNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    audioPointNumberText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
    },
    audioPointTitle: {
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    morePointsText: {
      fontSize: 12,
      fontStyle: "italic",
      marginLeft: 36,
    },
    startSection: {
      marginTop: 8,
    },
    progressIndicator: {
      marginBottom: 16,
    },
    startButton: {
      marginBottom: 12,
    },
    startHint: {
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
    },
    height: {
      height: 100,
    },
  });

export default TrailDetailsScreen;
