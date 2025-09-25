import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { logger } from "../utils/logger";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Trail } from "../types/Trail";
import { useTheme } from "../hooks/useTheme";
import {
  ModernCard,
  ModernButton,
  ProgressIndicator,
} from "../components/modern";
import { MapView } from "../components/maps/MapView";
import GPXService, { TrackingSession } from "../services/GPXService";
import AudioGuideService, {
  AudioGuideState,
} from "../services/AudioGuideService";
import { formatDistance } from "../utils/trailUtils";

interface ActiveTrailScreenProps {
  navigation: any;
  route: {
    params: {
      trail: Trail;
    };
  };
}

export const ActiveTrailScreen: React.FC<ActiveTrailScreenProps> = ({
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
  const [trackingSession, setTrackingSession] =
    useState<TrackingSession | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [audioGuideState, setAudioGuideState] =
    useState<AudioGuideState | null>(null);
  const [audioGuideEnabled, setAudioGuideEnabled] = useState(
    trail.audioGuidePoints.length > 0
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sessionCheckInterval = useRef<number | null>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  useEffect(() => {
    // Start pulsing animation for tracking indicator
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(pulse);
    };

    pulse();

    // Periodically check for session updates and audio guide state
    sessionCheckInterval.current = setInterval(() => {
      const currentSession = GPXService.getCurrentSession();
      setTrackingSession(currentSession);

      const audioState = AudioGuideService.getState();
      setAudioGuideState(audioState);
    }, 1000);

    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
      pulseAnim.stopAnimation();
    };
  }, [pulseAnim]);

  const startTracking = async () => {
    setIsStarting(true);

    try {
      const sessionId = await GPXService.startTracking(
        trail.name,
        trail.id,
        `Sporing av ${trail.name} - ${trail.description}`
      );

      const session = GPXService.getCurrentSession();
      setTrackingSession(session);

      // Initialize audio guide if enabled
      if (audioGuideEnabled && trail.audioGuidePoints.length > 0) {
        try {
          await AudioGuideService.initializeForTrail(trail);
          await AudioGuideService.startLocationMonitoring();
          logger.debug("Audio guide initialized and monitoring started");
        } catch (error) {
          logger.error("Failed to initialize audio guide:", error);
        }
      }

      logger.debug("Started tracking session:", sessionId);
    } catch (error) {
      logger.error("Failed to start tracking:", error);
      Alert.alert(
        "Feil ved oppstart",
        "Kunne ikke starte sporing. Sjekk at GPS er aktivert og prøv igjen.",
        [{ text: "OK" }]
      );
    } finally {
      setIsStarting(false);
    }
  };

  const pauseTracking = () => {
    if (trackingSession?.isActive && !trackingSession.isPaused) {
      GPXService.pauseTracking();
    } else if (trackingSession?.isActive && trackingSession.isPaused) {
      GPXService.resumeTracking();
    }
  };

  const finishTracking = async () => {
    Alert.alert(
      "Avslutt sporing",
      "Er du sikker på at du vil avslutte sporingen? Dette vil lagre ruten din.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Avslutt",
          style: "destructive",
          onPress: async () => {
            setIsFinishing(true);

            try {
              const completedTrack = await GPXService.stopTracking();

              // Stop audio guide
              if (audioGuideEnabled) {
                await AudioGuideService.stop();
              }

              if (completedTrack) {
                // Show completion summary
                navigation.navigate("TrackingSummary", {
                  _track: completedTrack,
                });
              } else {
                navigation.goBack();
              }
            } catch (error) {
              logger.error("Error finishing tracking:", error);
              Alert.alert("Feil", "Kunne ikke avslutte sporingen korrekt.");
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ]
    );
  };

  const formatSpeed = (speedMs: number): string => {
    const kmh = speedMs * 3.6;
    return `${kmh.toFixed(1)} km/t`;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAudioGuide = async () => {
    if (!audioGuideEnabled) {
      // Enable audio guide
      try {
        await AudioGuideService.initializeForTrail(trail);
        if (trackingSession?.isActive) {
          await AudioGuideService.startLocationMonitoring();
        }
        setAudioGuideEnabled(true);
      } catch (error) {
        Alert.alert("Feil", "Kunne ikke aktivere lydguide.");
      }
    } else {
      // Disable audio guide
      await AudioGuideService.stop();
      setAudioGuideEnabled(false);
    }
  };

  const skipCurrentAudioPoint = async () => {
    if (audioGuideState?._isPlaying) {
      await AudioGuideService.skip();
    }
  };

  const getAudioGuideProgress = () => {
    return AudioGuideService.getProgress();
  };

  const getTrackingStatus = (): {
    text: string;
    color: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  } => {
    if (!trackingSession) {
      return {
        text: "Ikke startet",
        color: theme.colors.textSecondary,
        icon: "radio-button-unchecked",
      };
    }

    if (trackingSession.isPaused) {
      return { text: "Pause", color: "#f59e0b", icon: "pause-circle-filled" };
    }

    if (trackingSession.isActive) {
      return { text: "Sporer", color: "#22c55e", icon: "gps-fixed" };
    }

    return {
      text: "Fullført",
      color: theme.colors.primary,
      icon: "check-circle",
    };
  };

  const status = getTrackingStatus();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme._dark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.headerButton,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text
            style={[styles.trailName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {trail.name}
          </Text>
          <View style={styles.statusContainer}>
            <Animated.View
              style={[
                styles.statusIndicator,
                {
                  transform: [
                    {
                      scale:
                        trackingSession?.isActive && !trackingSession?.isPaused
                          ? pulseAnim
                          : 1,
                    },
                  ],
                },
              ]}
            >
              <MaterialIcons
                name={status.icon}
                size={12}
                color={status.color}
              />
            </Animated.View>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          {trail.audioGuidePoints.length > 0 && (
            <TouchableOpacity
              onPress={toggleAudioGuide}
              style={[
                styles.headerButton,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <MaterialIcons
                name={audioGuideEnabled ? "volume-up" : "volume-off"}
                size={20}
                color={
                  audioGuideEnabled
                    ? theme.colors.secondary
                    : theme.colors.textSecondary
                }
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowMap(!showMap)}
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
            ]}
          >
            <MaterialIcons
              name={showMap ? "list" : "map"}
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Section */}
      {showMap && (
        <View style={[styles.mapContainer, { height: screenHeight * 0.4 }]}>
          <MapView
            theme={theme}
            trails={[trail]}
            style={styles.map}
            showUserLocation={true}
            followUser={trackingSession?.isActive || false}
          />
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <ModernCard theme={theme} variant="glass" style={styles.statCard}>
            <MaterialIcons
              name="straighten"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trackingSession
                ? formatDistance(trackingSession.statistics.totalDistance)
                : "0m"}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
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
              {trackingSession
                ? formatTime(trackingSession.statistics.totalTime)
                : "00:00"}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Tid
            </Text>
          </ModernCard>

          <ModernCard theme={theme} variant="glass" style={styles.statCard}>
            <MaterialIcons
              name="speed"
              size={24}
              color={theme.colors.secondary}
            />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trackingSession
                ? formatSpeed(trackingSession.statistics.currentSpeed)
                : "0 km/t"}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Hastighet
            </Text>
          </ModernCard>

          <ModernCard theme={theme} variant="glass" style={styles.statCard}>
            <MaterialIcons name="trending-up" size={24} color="#f59e0b" />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trackingSession
                ? `${Math.round(trackingSession.statistics.elevationGain)}m`
                : "0m"}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Stigning
            </Text>
          </ModernCard>
        </View>
      </View>

      {/* Trail Progress */}
      {trackingSession && (
        <ModernCard
          theme={theme}
          variant="elevated"
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
              Fremgang på sti
            </Text>
            <Text
              style={[
                styles.progressPercentage,
                { color: theme.colors.primary },
              ]}
            >
              {Math.min(
                Math.round(
                  (trackingSession.statistics.totalDistance / trail.distance) *
                    100
                ),
                100
              )}
              %
            </Text>
          </View>

          <ProgressIndicator
            progress={Math.min(
              trackingSession.statistics.totalDistance / trail.distance,
              1
            )}
            size={200}
            strokeWidth={8}
          />

          <View style={styles.progressDetails}>
            <Text
              style={[
                styles.progressText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {formatDistance(trackingSession.statistics.totalDistance)} av{" "}
              {formatDistance(trail.distance)}
            </Text>
            <Text
              style={[
                styles.progressText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Gjenstående:{" "}
              {formatDistance(
                Math.max(
                  0,
                  trail.distance - trackingSession.statistics.totalDistance
                )
              )}
            </Text>
          </View>
        </ModernCard>
      )}

      {/* Audio Guide Progress */}
      {audioGuideEnabled && trail.audioGuidePoints.length > 0 && (
        <ModernCard
          theme={theme}
          variant="elevated"
          style={styles.audioGuideCard}
        >
          <View style={styles.audioGuideHeader}>
            <MaterialIcons
              name="volume-up"
              size={20}
              color={theme.colors.secondary}
            />
            <Text
              style={[styles.audioGuideTitle, { color: theme.colors.text }]}
            >
              Lydguide
            </Text>
            {audioGuideState?._isPlaying && (
              <TouchableOpacity
                onPress={skipCurrentAudioPoint}
                style={styles.skipButton}
              >
                <MaterialIcons
                  name="skip-next"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {audioGuideState?.currentPoint && (
            <View style={styles.currentAudioPoint}>
              <Text
                style={[
                  styles.audioPointTitle,
                  { color: theme.colors.primary },
                ]}
              >
                🎵 {audioGuideState.currentPoint.title}
              </Text>
              {audioGuideState._isPlaying && (
                <View style={styles.playingIndicator}>
                  <Animated.View
                    style={[
                      styles.playingDot,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.playingText,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Spiller av...
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.audioGuideProgress}>
            <Text
              style={[
                styles.audioProgressText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {getAudioGuideProgress().completed} av{" "}
              {getAudioGuideProgress().total} lydpunkter fullført
            </Text>
            <ProgressIndicator
              progress={getAudioGuideProgress().percentage / 100}
              size={200}
              strokeWidth={4}
            />
          </View>
        </ModernCard>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!trackingSession ? (
          <ModernButton
            theme={theme}
            title={isStarting ? "Starter..." : "Start sporing"}
            onPress={startTracking}
            variant="primary"
            size="large"
            icon={isStarting ? undefined : "play-arrow"}
            disabled={isStarting}
            style={styles.controlButton}
          />
        ) : (
          <View style={styles.activeControls}>
            <ModernButton
              theme={theme}
              title={trackingSession.isPaused ? "Fortsett" : "Pause"}
              onPress={pauseTracking}
              variant={trackingSession.isPaused ? "primary" : "secondary"}
              size="medium"
              icon={trackingSession.isPaused ? "play-arrow" : "pause"}
              style={styles.controlButton}
            />

            <ModernButton
              theme={theme}
              title={isFinishing ? "Avslutter..." : "Avslutt"}
              onPress={finishTracking}
              variant="danger"
              size="medium"
              icon={isFinishing ? undefined : "stop"}
              disabled={isFinishing}
              style={styles.controlButton}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.1)",
    },
    headerButton: {
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
    headerTitle: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: 12,
    },
    headerButtons: {
      flexDirection: "row",
      gap: 8,
    },
    trailName: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 4,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusIndicator: {
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "500",
    },
    mapContainer: {
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      overflow: "hidden",
    },
    map: {
      flex: 1,
    },
    statsContainer: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
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
    progressCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 20,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: "600",
    },
    progressPercentage: {
      fontSize: 18,
      fontWeight: "700",
    },
    progressBar: {
      marginBottom: 12,
    },
    progressDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressText: {
      fontSize: 12,
    },
    controlsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    activeControls: {
      flexDirection: "row",
      gap: 12,
    },
    controlButton: {
      flex: 1,
    },
    audioGuideCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
    },
    audioGuideHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    audioGuideTitle: {
      fontSize: 16,
      fontWeight: "600",
      flex: 1,
      marginLeft: 8,
    },
    skipButton: {
      padding: 4,
    },
    currentAudioPoint: {
      marginBottom: 12,
    },
    audioPointTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 4,
    },
    playingIndicator: {
      flexDirection: "row",
      alignItems: "center",
    },
    playingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#22c55e",
      marginRight: 6,
    },
    playingText: {
      fontSize: 12,
      fontStyle: "italic",
    },
    audioGuideProgress: {
      gap: 4,
    },
    audioProgressText: {
      fontSize: 12,
    },
    audioProgressBar: {
      marginTop: 4,
    },
  });

export default ActiveTrailScreen;
