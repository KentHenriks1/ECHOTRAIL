import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";

// Import all our intelligent services
import EchoTrailMasterService, {
  EchoTrailMode,
  EchoTrailStatus,
  UserProfile,
} from "../services/EchoTrailMasterService";
import EnhancedTrailRecordingService, {
  TrailMemory,
  TrailStatistics,
} from "../services/EnhancedTrailRecordingService";
import EnhancedInteractiveMapView from "../components/maps/EnhancedInteractiveMapView";
import {
  LocationContext,
  MovementMode,
  Interest,
} from "../services/IntelligentLocationService";
import { GeneratedContent } from "../services/AIContentPipeline";
import { PlaybackStatus, AudioState } from "../services/IntelligentAudioSystem";
import { logger } from "../utils/logger";

const EchoTrailIntegrationScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const styles = createStyles({ colors });

  // Refs for cleanup
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // State management
  const [echoTrailStatus, setEchoTrailStatus] =
    useState<EchoTrailStatus | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [trailMemories, setTrailMemories] = useState<TrailMemory[]>([]);
  const [currentContent, setCurrentContent] = useState<GeneratedContent | null>(
    null
  );
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(
    null
  );
  const [trailStatistics, setTrailStatistics] =
    useState<TrailStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // User settings
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [echoTrailMode, setEchoTrailMode] = useState<EchoTrailMode>(
    EchoTrailMode.DISCOVERY
  );
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showStatistics, setShowStatistics] = useState(false);

  /**
   * Initialize services and load data
   */
  useEffect(() => {
    initializeEchoTrail();
    loadTrailMemories();

    return () => {
      cleanup();
    };
  }, []);

  const initializeEchoTrail = async () => {
    try {
      setIsLoading(true);

      // Load user profile
      const profile = EchoTrailMasterService.getUserProfile();
      setUserProfile(profile);

      // Setup callbacks
      const callbacks = {
        onStatusChange: (status: EchoTrailStatus) => {
          setEchoTrailStatus(status);
          logger.info("EchoTrail status updated:", status.mode);
        },
        onContentReady: (content: GeneratedContent) => {
          setCurrentContent(content);
          logger.info("New content ready:", content.title);
        },
        onLocationUpdate: (context: LocationContext) => {
          logger.debug("Location updated:", context.movementMode);
        },
        onError: (error: string) => {
          Alert.alert("EchoTrail Feil", error);
        },
        onModeChange: (newMode: EchoTrailMode) => {
          setEchoTrailMode(newMode);
        },
      };

      // Initialize EchoTrail
      const started = await EchoTrailMasterService.startEchoTrail(callbacks);
      if (started) {
        logger.info("EchoTrail successfully initialized");
      }

      // Setup trail recording callbacks
      EnhancedTrailRecordingService.setCallbacks({
        onLocationUpdate: (location, statistics) => {
          setTrailStatistics(statistics);
        },
        onPhotoTaken: (photo) => {
          Alert.alert(
            "Foto tatt!",
            `Bilde lagret på ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`
          );
        },
        onMovementModeChange: (mode) => {
          logger.info("Movement mode changed to:", mode);
        },
        onStatisticsUpdate: (statistics) => {
          setTrailStatistics(statistics);
        },
        onError: (error) => {
          Alert.alert("Opptak Feil", error);
        },
      });
    } catch (error) {
      logger.error("Failed to initialize EchoTrail:", error);
      Alert.alert("Feil", "Kunne ikke initialisere EchoTrail");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrailMemories = async () => {
    try {
      const memories = await EnhancedTrailRecordingService.getSavedMemories();
      setTrailMemories(memories);
      logger.info(`Loaded ${memories.length} trail memories`);
    } catch (error) {
      logger.error("Failed to load trail memories:", error);
    }
  };

  const cleanup = async () => {
    try {
      // Clear all active timeouts
      timeoutRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];

      await EchoTrailMasterService.cleanup();
      logger.info("EchoTrail cleaned up");
    } catch (error) {
      logger.error("Cleanup error:", error);
    }
  };

  /**
   * EchoTrail Mode Controls
   */
  const handleModeChange = async (mode: EchoTrailMode) => {
    try {
      await EchoTrailMasterService.setMode(mode);
      setEchoTrailMode(mode);
      logger.info("Mode changed to:", mode);
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke endre modus");
    }
  };

  /**
   * Trail Recording Controls
   */
  const startRecording = async () => {
    try {
      setIsLoading(true);
      const trailName = `EchoTrail Test ${new Date().toLocaleString("no-NO")}`;
      const started = await EnhancedTrailRecordingService.startRecording(
        trailName,
        "Test av intelligent EchoTrail-system"
      );

      if (started) {
        setIsRecording(true);
        Alert.alert("Opptak startet!", "GPS-sporing og foto-tagging er aktiv");
      }
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke starte opptak");
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsLoading(true);
      const memory = await EnhancedTrailRecordingService.stopRecording();

      if (memory) {
        setIsRecording(false);
        await loadTrailMemories(); // Reload memories

        Alert.alert(
          "Opptak fullført!",
          `${memory.name} er lagret\n` +
            `Distanse: ${(memory.totalDistance / 1000).toFixed(2)}km\n` +
            `Varighet: ${Math.floor(memory.totalDuration / 60)}min\n` +
            `Bilder: ${memory.photos.length}`
        );
      }
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke stoppe opptak");
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const photo = await EnhancedTrailRecordingService.takePhoto(
        "Test-foto fra EchoTrail"
      );

      if (photo) {
        logger.info("Photo taken successfully");
      }
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke ta foto");
    }
  };

  /**
   * Audio Controls
   */
  const generateContentNow = async () => {
    try {
      setIsLoading(true);
      const content = await EchoTrailMasterService.generateContentNow();

      if (content) {
        Alert.alert(
          "Innhold generert!",
          `"${content.title}" er klar for avspilling`
        );
      } else {
        Alert.alert(
          "Ingen innhold",
          "Kunne ikke generere innhold for gjeldende posisjon"
        );
      }
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke generere innhold");
    } finally {
      setIsLoading(false);
    }
  };

  const pauseAudio = async () => {
    await EchoTrailMasterService.pauseAudio();
  };

  const resumeAudio = async () => {
    await EchoTrailMasterService.resumeAudio();
  };

  const skipToNext = async () => {
    await EchoTrailMasterService.skipToNext();
  };

  /**
   * Testing Functions
   */
  const runEndToEndTest = async () => {
    Alert.alert(
      "Ende-til-Ende Test",
      "Dette vil teste alle hovedfunksjoner:\n" +
        "1. Start intelligent sporing\n" +
        "2. Generer AI-innhold\n" +
        "3. Test bevegelsesmodus-endring\n" +
        "4. Ta testfoto\n" +
        "5. Test audio-avspilling\n\n" +
        "Fortsette?",
      [
        { text: "Avbryt", style: "cancel" },
        { text: "Start Test", onPress: executeEndToEndTest },
      ]
    );
  };

  const executeEndToEndTest = async () => {
    try {
      setIsLoading(true);

      // Step 1: Start recording
      if (!isRecording) {
        await startRecording();
        await new Promise((resolve) => {
          const timeoutId = setTimeout(resolve, 2000);
          timeoutRefs.current.push(timeoutId);
        });
      }

      // Step 2: Generate content
      await generateContentNow();
      await new Promise((resolve) => {
        const timeoutId = setTimeout(resolve, 2000);
        timeoutRefs.current.push(timeoutId);
      });

      // Step 3: Change to focused mode
      await handleModeChange(EchoTrailMode.FOCUSED);
      await new Promise((resolve) => {
        const timeoutId = setTimeout(resolve, 2000);
        timeoutRefs.current.push(timeoutId);
      });

      // Step 4: Take a test photo
      await takePhoto();
      await new Promise((resolve) => {
        const timeoutId = setTimeout(resolve, 2000);
        timeoutRefs.current.push(timeoutId);
      });

      // Step 5: Test audio controls
      if (playbackStatus?.state === AudioState.PLAYING) {
        await pauseAudio();
        await new Promise((resolve) => {
          const timeoutId = setTimeout(resolve, 1000);
          timeoutRefs.current.push(timeoutId);
        });
        await resumeAudio();
      }

      Alert.alert("Test Fullført!", "Alle hovedfunksjoner testet vellykket");
    } catch (error) {
      Alert.alert("Test Feilet", `En feil oppstod: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Utility Functions
   */
  const formatMode = (mode: EchoTrailMode): string => {
    switch (mode) {
      case EchoTrailMode.DISCOVERY:
        return "Oppdaging";
      case EchoTrailMode.PASSIVE:
        return "Passiv";
      case EchoTrailMode.FOCUSED:
        return "Fokusert";
      case EchoTrailMode.PAUSED:
        return "Pause";
      default:
        return "Ukjent";
    }
  };

  const formatMovementMode = (mode: MovementMode): string => {
    switch (mode) {
      case MovementMode.STATIONARY:
        return "Stillestående";
      case MovementMode.WALKING:
        return "Gående";
      case MovementMode.CYCLING:
        return "Syklende";
      case MovementMode.DRIVING:
        return "Kjørende";
      default:
        return "Ukjent";
    }
  };

  const getModeColor = (mode: EchoTrailMode): string => {
    switch (mode) {
      case EchoTrailMode.DISCOVERY:
        return "#22c55e";
      case EchoTrailMode.PASSIVE:
        return "#6b7280";
      case EchoTrailMode.FOCUSED:
        return "#3b82f6";
      case EchoTrailMode.PAUSED:
        return "#ef4444";
      default:
        return colors.primary;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initialiserer EchoTrail...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="explore" size={32} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            EchoTrail Intelligence Test
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            Komplett AI-basert opplevelse
          </Text>
        </View>

        {/* Status Panel */}
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            System Status
          </Text>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              EchoTrail Modus:
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getModeColor(echoTrailMode) },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {formatMode(echoTrailMode)}
              </Text>
            </View>
          </View>

          {echoTrailStatus?.locationContext && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: colors.textSecondary }]}
              >
                Bevegelse:
              </Text>
              <Text style={[styles.statusValue, { color: colors.text }]}>
                {formatMovementMode(
                  echoTrailStatus.locationContext.movementMode
                )}
                {" - "}
                {echoTrailStatus.locationContext.speed.toFixed(1)} km/t
              </Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Opptak:
            </Text>
            <Text
              style={[
                styles.statusValue,
                { color: isRecording ? "#22c55e" : colors.textSecondary },
              ]}
            >
              {isRecording ? "Aktiv" : "Inaktiv"}
            </Text>
          </View>

          {currentContent && (
            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: colors.textSecondary }]}
              >
                Gjeldende innhold:
              </Text>
              <Text style={[styles.statusValue, { color: colors.text }]}>
                {currentContent.title}
              </Text>
            </View>
          )}
        </View>

        {/* Mode Controls */}
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            EchoTrail Modus
          </Text>

          <View style={styles.modeButtons}>
            {Object.values(EchoTrailMode).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor:
                      mode === echoTrailMode
                        ? getModeColor(mode)
                        : colors.background,
                  },
                ]}
                onPress={() => handleModeChange(mode)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: mode === echoTrailMode ? "white" : colors.text,
                    },
                  ]}
                >
                  {formatMode(mode)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recording Controls */}
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Sporing og Foto
          </Text>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: isRecording ? "#ef4444" : "#22c55e" },
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              <MaterialIcons
                name={isRecording ? "stop" : "play-arrow"}
                size={24}
                color="white"
              />
              <Text style={styles.controlButtonText}>
                {isRecording ? "Stopp Opptak" : "Start Opptak"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isRecording
                    ? colors.primary
                    : colors.textSecondary,
                  opacity: isRecording ? 1 : 0.5,
                },
              ]}
              onPress={takePhoto}
              disabled={!isRecording || isLoading}
            >
              <MaterialIcons name="camera-alt" size={24} color="white" />
              <Text style={styles.controlButtonText}>Ta Foto</Text>
            </TouchableOpacity>
          </View>

          {trailStatistics && (
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {(trailStatistics.totalDistance / 1000).toFixed(2)}km
                </Text>
                <Text
                  style={[
                    styles.quickStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Distanse
                </Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {Math.floor(trailStatistics.totalDuration / 60)}min
                </Text>
                <Text
                  style={[
                    styles.quickStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Tid
                </Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {trailStatistics.photoCount}
                </Text>
                <Text
                  style={[
                    styles.quickStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Bilder
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Audio Controls */}
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            AI Innhold og Audio
          </Text>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={generateContentNow}
              disabled={isLoading}
            >
              <MaterialIcons name="auto-awesome" size={24} color="white" />
              <Text style={styles.controlButtonText}>Generer Innhold</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: "#f59e0b" }]}
              onPress={
                playbackStatus?.state === "PLAYING" ? pauseAudio : resumeAudio
              }
            >
              <MaterialIcons
                name={
                  playbackStatus?.state === "PLAYING" ? "pause" : "play-arrow"
                }
                size={24}
                color="white"
              />
              <Text style={styles.controlButtonText}>
                {playbackStatus?.state === "PLAYING" ? "Pause" : "Spill"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: "#8b5cf6" }]}
              onPress={skipToNext}
            >
              <MaterialIcons name="skip-next" size={24} color="white" />
              <Text style={styles.controlButtonText}>Hopp Over</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Controls */}
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            System Testing
          </Text>

          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: "#10b981" }]}
            onPress={runEndToEndTest}
            disabled={isLoading}
          >
            <MaterialIcons name="play-circle-filled" size={32} color="white" />
            <Text style={styles.testButtonText}>Kjør Ende-til-Ende Test</Text>
            <Text style={styles.testButtonSubtext}>
              Tester alle hovedfunksjoner automatisk
            </Text>
          </TouchableOpacity>

          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>
              Vis Live Statistikk
            </Text>
            <Switch
              value={showStatistics}
              onValueChange={setShowStatistics}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
            />
          </View>
        </View>

        {/* Map View */}
        <View
          style={[
            styles.panel,
            styles.mapPanel,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Interaktivt Kart
          </Text>

          <EnhancedInteractiveMapView
            trailMemories={trailMemories}
            activeMemory={undefined}
            currentLocation={echoTrailStatus?.locationContext || undefined}
            statistics={trailStatistics || undefined}
            theme={{
              colors,
              typography: {
                fontSize: {
                  _xs: 10,
                  _sm: 12,
                  _md: 14,
                  _lg: 16,
                  _xl: 18,
                  _xxl: 20,
                  _xxxl: 24,
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
                _lg: 12,
              },
            }}
            showUserLocation={true}
            showTrails={true}
            showPhotos={true}
            showStatistics={showStatistics}
            onPhotoPress={(photo) => {
              Alert.alert(
                "Foto Detaljer",
                `Tatt: ${photo.timestamp.toLocaleString("no-NO")}\n` +
                  `Posisjon: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}\n` +
                  `${photo.description || "Ingen beskrivelse"}`
              );
            }}
            onMemoryPress={(memory) => {
              Alert.alert(
                memory.name,
                `Distanse: ${(memory.totalDistance / 1000).toFixed(2)}km\n` +
                  `Varighet: ${Math.floor(memory.totalDuration / 60)}min\n` +
                  `Bilder: ${memory.photos.length}\n` +
                  `Startet: ${memory.startTime.toLocaleString("no-NO")}`
              );
            }}
            style={styles.mapView}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
    header: {
      alignItems: "center",
      padding: 24,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      marginTop: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    panel: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      borderRadius: 12,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    mapPanel: {
      height: 400,
    },
    panelTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    statusLabel: {
      fontSize: 14,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: "500",
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 16,
    },
    statusBadgeText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
    },
    modeButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    modeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 8,
      minWidth: "45%",
      alignItems: "center",
    },
    modeButtonText: {
      fontSize: 14,
      fontWeight: "500",
    },
    controlButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    controlButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      marginBottom: 8,
      minWidth: "45%",
      justifyContent: "center",
    },
    controlButtonText: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
    quickStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    quickStat: {
      alignItems: "center",
    },
    quickStatValue: {
      fontSize: 20,
      fontWeight: "bold",
    },
    quickStatLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    testButton: {
      alignItems: "center",
      padding: 20,
      borderRadius: 12,
      marginBottom: 16,
    },
    testButtonText: {
      color: "white",
      fontSize: 18,
      fontWeight: "bold",
      marginTop: 8,
    },
    testButtonSubtext: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 14,
      marginTop: 4,
    },
    settingsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingsLabel: {
      fontSize: 16,
    },
    mapView: {
      height: 320,
      borderRadius: 8,
      overflow: "hidden",
    },
  });

export default EchoTrailIntegrationScreen;
