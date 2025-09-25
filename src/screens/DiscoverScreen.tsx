import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { createModernTheme } from "../ui/modernTheme";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { logger, silentError } from "../utils/logger";
import { Theme } from "../ui";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
// Audio functionality simplified for demo
import AIStoryService from "../services/AIStoryService";
import OpenAITTSService from "../services/OpenAITTSService";
import EchoTrailSoundService from "../services/EchoTrailSoundService";
import { OpenAISetup } from "../components/OpenAISetup";
import OpenAISettings from "../components/settings/OpenAISettings";
import { GoogleMapView } from "../components/maps/GoogleMapView";
import { TrailCard, TrailSearch } from "../components/trails";
import { trailService } from "../services/TrailService";
import { Trail } from "../types/Trail"; // Use local Trail type instead
import { mockTrails } from "../data/mockTrails";

// Define Story interface locally since it's not exported from TrailService
interface Story {
  id: string;
  title: string;
  content: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  category?: string;
}
import {
  filterTrails,
  createDefaultFilters,
  TrailWithDistance,
  TrailFilters,
} from "../utils/trailUtils";
import {
  ModernCard,
  ModernButton,
  InterestCard,
  LinearProgress,
  StatusIndicator,
} from "../components/modern";
import {
  GradientButton,
  HeroCard,
  StatusBadge,
  GlassCard,
} from "../components/modern/EnhancedComponents";

interface Interest {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  selected: boolean;
}

interface StoryContent {
  title: string;
  _content: string;
  backgroundMusic: string;
  _duration: number;
  location?: { latitude: number; longitude: number };
  metadata?: Record<string, unknown>;
}

export function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const theme = createModernTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isListening, setIsListening] = useState(false);
  const [currentStory, setCurrentStory] = useState<StoryContent | null>(null);
  const [backgroundSound, setBackgroundSound] = useState<any | null>(null);
  const [showOpenAISetup, setShowOpenAISetup] = useState(false);
  const [showOpenAISettings, setShowOpenAISettings] = useState(false);
  const [useOpenAITTS, setUseOpenAITTS] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [currentVoice, setCurrentVoice] = useState<string>("alloy");
  const [trails, setTrails] = useState<Trail[]>([]);
  const [showMapView, setShowMapView] = useState(false);
  const [nearbyTrails, setNearbyTrails] = useState<Trail[]>([]);
  const [showTrailSearch, setShowTrailSearch] = useState(false);
  const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [interests, setInterests] = useState<Interest[]>([
    { id: "history", name: "Historie", icon: "history-edu", selected: false },
    { id: "nature", name: "Natur", icon: "nature", selected: false },
    { id: "culture", name: "Kultur", icon: "theater-comedy", selected: false },
    { id: "legends", name: "Sagn", icon: "auto-stories", selected: false },
    {
      id: "architecture",
      name: "Arkitektur",
      icon: "architecture",
      selected: false,
    },
    { id: "mystery", name: "Mysterier", icon: "help-outline", selected: false },
  ]);

  const checkOpenAITTSAvailability = async () => {
    try {
      const isAvailable = await OpenAITTSService.isAvailable();
      setUseOpenAITTS(isAvailable);

      if (isAvailable) {
        const voice = await OpenAITTSService.getPreferredVoice();
        setCurrentVoice(voice || "alloy");
      }
    } catch (error) {
      silentError(error);
    }
  };

  // Production-safe OpenAI TTS initialization
  const initializeOpenAITTS = async () => {
    try {
      // In production, API key should come from secure storage or environment
      // For development, this will be loaded from a secure configuration
      const isAvailable = await OpenAITTSService.isAvailable();
      if (isAvailable) {
        logger.info("OpenAI TTS service is available");
      } else {
        logger.warn("OpenAI TTS service not available - using fallback");
      }
    } catch (error) {
      logger.error("Failed to initialize OpenAI TTS:", error);
      // Fallback to system TTS
      setUseOpenAITTS(false);
    }
  };

  const updateTrailsData = useCallback(
    async (userLocation: Location.LocationObject) => {
      const userPos = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      };

      // Get trails near user location using TrailService
      const nearbyTrailsFromService = await trailService.getTrailsNearLocation(
        userPos,
        10
      ); // 10km radius
      setNearbyTrails(nearbyTrailsFromService);
      setFilteredTrails(nearbyTrailsFromService);
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const initializeScreen = async () => {
      try {
        // Get location permission with cancellation support
        await getLocationPermission();
        if (!isMounted) return;

        // Initialize OpenAI TTS with cancellation support
        await initializeOpenAITTS();
        if (!isMounted) return;

        // Load trails from TrailService
        const availableTrails = mockTrails; // Use mock trails for now
        if (isMounted) {
          setTrails(availableTrails);
        }

        // Play EchoTrail signature welcome sound
        try {
          await EchoTrailSoundService.playWelcomeSound();
        } catch (error) {
          if (isMounted) {
            logger.error("Failed to play welcome sound:", error);
          }
        }
      } catch (error) {
        if (isMounted && !abortController.signal.aborted) {
          logger.error("Screen initialization error:", error);
        }
      }
    };

    initializeScreen();

    return () => {
      isMounted = false;
      abortController.abort();

      if (backgroundSound) {
        // Clean up background sound
        backgroundSound.stopAsync?.().catch(() => {});
        backgroundSound.unloadAsync?.().catch(() => {});
      }
    };
  }, [backgroundSound]);

  useEffect(() => {
    if (location) {
      updateTrailsData(location);
    }
  }, [location, updateTrailsData]);

  useEffect(() => {
    if (location) {
      updateTrailsData(location);
    }
  }, [location, updateTrailsData]);

  const handleTrailPress = (trail: Trail) => {
    // Navigate to trail details - would use navigation.navigate in real app
    logger.debug("Navigate to trail:", trail.name);
    Alert.alert("Trail valgt", `Du valgte: ${trail.name}`);
  };

  const handleStartTrail = (trail: Trail) => {
    Alert.alert("Start trail", `Vil du starte ${trail.name}?`, [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Start",
        onPress: () => logger.debug("Starting trail:", trail.name),
      },
    ]);
  };

  const handleTrailSelect = (trail: Trail) => {
    logger.debug("Trail selected:", trail.name);
    Alert.alert("Trail valgt", `Du valgte: ${trail.name}`);
  };

  const handleStoryPress = async (story: Story) => {
    setSelectedStory(story);
    logger.debug("Story selected:", story.title);

    // Play the story using TTS
    if (useOpenAITTS) {
      try {
        const voice = await OpenAITTSService.getPreferredVoice();
        await OpenAITTSService.speakText(story.content, { voice, speed: 0.8 });
      } catch (error) {
        logger.error("OpenAI TTS failed:", error);
        Speech.speak(story.content, { language: "nb-NO" });
      }
    } else {
      Speech.speak(story.content, { language: "nb-NO" });
    }
  };

  const toggleTrailSearch = () => {
    setShowTrailSearch(!showTrailSearch);
  };

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Tillatelsesfeil",
          "EchoTrail trenger tilgang til posisjon for å kunne fortelle stedsspesifikke historier."
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      silentError(error);
    }
  };

  const toggleInterest = (interestId: string) => {
    setInterests((prevInterests) =>
      prevInterests.map((interest) =>
        interest.id === interestId
          ? { ...interest, selected: !interest.selected }
          : interest
      )
    );
  };

  const startAIGuide = async () => {
    if (!location) {
      Alert.alert(
        "Posisjon ikke funnet",
        "Vi trenger din posisjon for å kunne fortelle stedsspesifikke historier."
      );
      return;
    }

    const selectedInterests = interests.filter((i) => i.selected);
    if (selectedInterests.length === 0) {
      Alert.alert(
        "Velg interesser",
        "Velg minst ett interesseområde for å få personaliserte historier."
      );
      return;
    }

    setIsListening(true);

    // Generate story based on location and interests
    const story = await generateStoryForLocation(location, selectedInterests);
    setCurrentStory(story);

    // Start background music
    await playBackgroundMusic(story.backgroundMusic);

    // Start TTS narration
    if (useOpenAITTS) {
      try {
        const voice = await OpenAITTSService.getPreferredVoice();
        await OpenAITTSService.speakText(
          story._content,
          {
            voice,
            speed: 0.8,
          },
          {
            onStart: () => logger.debug("Started OpenAI TTS"),
            onProgress: (progress) => setTtsProgress(progress),
            onComplete: () => {
              setIsListening(false);
              stopBackgroundMusic();
              setTtsProgress(0);
            },
            onError: (error) => {
              logger.error("OpenAI TTS Error:", error);
              // Fallback to system TTS
              startSystemTTS(story._content);
            },
          }
        );
      } catch (error) {
        logger.error("OpenAI TTS failed, falling back to system TTS:", error);
        startSystemTTS(story._content);
      }
    } else {
      startSystemTTS(story._content);
    }
  };

  const generateStoryForLocation = async (
    location: Location.LocationObject,
    selectedInterests: Interest[]
  ): Promise<StoryContent> => {
    try {
      // Use the AI Story Service to generate personalized stories
      const aiStory = await AIStoryService.generateStory(
        location,
        selectedInterests
      );

      // Save the story to history
      await AIStoryService.saveToHistory(aiStory);

      // Ensure the story has a title property
      return {
        title: aiStory._title || "AI-generert historie",
        ...aiStory,
      };
    } catch (error) {
      logger.error("Error generating AI story:", error);

      // Fallback to simple story if AI service fails
      const { latitude, longitude } = location.coords;
      return {
        title: "Oppdagelsesreise",
        _content: `Du befinner deg nå på koordinatene ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Dette stedet har sine egne unike historier og hemmeligheter som venter på å bli oppdaget. Ta deg tid til å utforske omgivelsene og la deg inspirere av alt du ser og hører.`,
        backgroundMusic: "ambient",
        _duration: 120,
        location: {
          latitude,
          longitude,
        },
        metadata: {
          difficulty: "Lett",
          theme: selectedInterests[0]?.id || "general",
          historicalAccuracy: "N/A",
        },
      };
    }
  };

  const playBackgroundMusic = async (musicType: string) => {
    try {
      // In a real app, you would have actual music files
      // For now, we'll just simulate background music
      logger.debug(`Playing ${musicType} background music`);
    } catch (error) {
      silentError(error);
    }
  };

  const stopBackgroundMusic = async () => {
    try {
      if (backgroundSound) {
        await backgroundSound.stopAsync();
        await backgroundSound.unloadAsync();
        setBackgroundSound(null);
      }
    } catch (error) {
      silentError(error);
    }
  };

  const startSystemTTS = async (content: string) => {
    await Speech.speak(content, {
      language: "nb-NO",
      pitch: 1.0,
      rate: 0.8,
      onStart: () => logger.debug("Started system TTS"),
      onDone: () => {
        setIsListening(false);
        stopBackgroundMusic();
      },
      onError: (error) => {
        logger.error("System TTS Error:", error);
        setIsListening(false);
        stopBackgroundMusic();
      },
    });
  };

  const stopAIGuide = async () => {
    if (useOpenAITTS) {
      await OpenAITTSService.stopAudio();
    } else {
      Speech.stop();
    }
    setIsListening(false);
    setCurrentStory(null);
    setTtsProgress(0);
    await stopBackgroundMusic();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.background,
          theme.colors.muted || theme.colors.surface,
        ]}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Modern Hero Header */}
          <View style={styles.heroSection}>
            <HeroCard
              title="Oppdag med AI"
              subtitle="Kunstig intelligens som guide"
              description="La avansert AI guide deg gjennom stedets fascinerende hemmeligheter og historier"
              theme={theme}
              icon="auto-awesome"
              backgroundType="mystery"
              onPress={() => logger.debug("Hero card pressed")}
            />
          </View>

          {/* Location Status Card */}
          <View style={styles.section}>
            <GlassCard theme={theme} style={styles.locationGlassCard}>
              <View style={styles.locationHeader}>
                <MaterialIcons
                  name="location-on"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.locationTitle}>Din posisjon</Text>
                <StatusBadge
                  status={location ? "active" : "paused"}
                  theme={theme}
                  size="small"
                />
              </View>
              <Text style={styles.locationText}>
                {location
                  ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                  : "Henter posisjon..."}
              </Text>
              {!location && (
                <StatusIndicator status="loading" theme={theme} size={16} />
              )}
            </GlassCard>
          </View>

          {/* Enhanced Interests Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithIcon}>
              <MaterialIcons
                name="interests"
                size={24}
                color={theme.colors.secondary}
              />
              <Text style={styles.sectionTitle}>Velg dine interesser</Text>
              <StatusBadge status="new" theme={theme} size="small" />
            </View>
            <GlassCard theme={theme} style={styles.interestsContainer}>
              <View style={styles.interestsGrid}>
                {interests.map((interest) => (
                  <InterestCard
                    key={interest.id}
                    interest={interest}
                    theme={theme}
                    onToggle={toggleInterest}
                  />
                ))}
              </View>
            </GlassCard>
          </View>

          {/* Trails Section */}
          {location && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Stier</Text>
                <View style={styles.trailControls}>
                  <TouchableOpacity
                    onPress={toggleTrailSearch}
                    style={[
                      styles.controlButton,
                      { backgroundColor: `${theme.colors.secondary}15` },
                    ]}
                  >
                    <MaterialIcons
                      name={showTrailSearch ? "search-off" : "search"}
                      size={20}
                      color={theme.colors.secondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowMapView(!showMapView)}
                    style={[
                      styles.controlButton,
                      { backgroundColor: `${theme.colors.primary}15` },
                    ]}
                  >
                    <MaterialIcons
                      name={showMapView ? "list" : "map"}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Trail Search */}
              {showTrailSearch && (
                <ModernCard theme={theme} style={styles.searchCard}>
                  <Text style={styles.searchTitle}>Søk i trails</Text>
                  <Text style={styles.searchSubtitle}>
                    {filteredTrails.length} trails funnet i nærheten
                  </Text>
                </ModernCard>
              )}

              {/* Map View */}
              {showMapView && (
                <ModernCard
                  theme={theme}
                  variant="elevated"
                  style={styles.mapCard}
                >
                  <GoogleMapView
                    showUserLocation={true}
                    showTrails={false}
                    style={styles.mapContainer}
                    initialLocation={
                      location
                        ? [location.coords.longitude, location.coords.latitude]
                        : undefined
                    }
                  />
                </ModernCard>
              )}

              {/* Trails List */}
              <View style={styles.trailsList}>
                {(showTrailSearch ? filteredTrails : nearbyTrails).length >
                0 ? (
                  (showTrailSearch ? filteredTrails : nearbyTrails).map(
                    (trail) => (
                      <ModernCard
                        key={trail.id}
                        theme={theme}
                        style={styles.trailCard}
                      >
                        <TouchableOpacity
                          onPress={() => handleTrailSelect(trail)}
                          style={styles.trailCardContent}
                        >
                          <View style={styles.trailHeader}>
                            <Text style={styles.trailName}>{trail.name}</Text>
                            <View
                              style={[
                                styles.difficultyBadge,
                                {
                                  backgroundColor:
                                    trail.difficulty === "easy"
                                      ? theme.colors.success
                                      : trail.difficulty === "moderate"
                                        ? theme.colors.warning
                                        : theme.colors.error,
                                },
                              ]}
                            >
                              <Text style={styles.difficultyText}>
                                {trail.difficulty === "easy"
                                  ? "Lett"
                                  : trail.difficulty === "moderate"
                                    ? "Moderat"
                                    : "Vanskelig"}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.trailDescription}>
                            {trail.description}
                          </Text>

                          <View style={styles.trailMeta}>
                            <View style={styles.trailMetaItem}>
                              <MaterialIcons
                                name="straighten"
                                size={16}
                                color={theme.colors.textSecondary}
                              />
                              <Text style={styles.trailMetaText}>
                                {(trail.distance / 1000).toFixed(1)} km
                              </Text>
                            </View>

                            {trail.estimatedDuration && (
                              <View style={styles.trailMetaItem}>
                                <MaterialIcons
                                  name="schedule"
                                  size={16}
                                  color={theme.colors.textSecondary}
                                />
                                <Text style={styles.trailMetaText}>
                                  {trail.estimatedDuration} min
                                </Text>
                              </View>
                            )}

                            {trail.audioGuidePoints &&
                              trail.audioGuidePoints.length > 0 && (
                                <View style={styles.trailMetaItem}>
                                  <MaterialIcons
                                    name="auto-stories"
                                    size={16}
                                    color={theme.colors.secondary}
                                  />
                                  <Text style={styles.trailMetaText}>
                                    {trail.audioGuidePoints.length} historier
                                  </Text>
                                </View>
                              )}
                          </View>
                        </TouchableOpacity>
                      </ModernCard>
                    )
                  )
                ) : (
                  <ModernCard
                    theme={theme}
                    variant="default"
                    style={styles.noTrailsCard}
                  >
                    <MaterialIcons
                      name="explore-off"
                      size={48}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.noTrailsText}>
                      {showTrailSearch
                        ? "Ingen stier matcher søket"
                        : "Ingen stier funnet i nærheten"}
                    </Text>
                    <Text style={styles.noTrailsSubtext}>
                      {showTrailSearch
                        ? "Prøv å justere søkefiltrene eller utvid søkeområdet"
                        : "Prøv å endre posisjon eller bruk søkefunksjonen"}
                    </Text>
                  </ModernCard>
                )}
              </View>
            </View>
          )}

          {/* Enhanced Story Display */}
          {currentStory && (
            <View style={styles.section}>
              <HeroCard
                title={currentStory.title}
                subtitle={isListening ? "Forteller..." : "Fullført"}
                description={currentStory._content.substring(0, 100) + "..."}
                theme={theme}
                icon={isListening ? "volume-up" : "check-circle"}
                backgroundType="treasure"
                onPress={() => logger.debug("Story card pressed")}
              />
              {useOpenAITTS && ttsProgress > 0 && ttsProgress < 100 && (
                <LinearProgress
                  progress={ttsProgress}
                  theme={theme}
                  height={8}
                  gradient={true}
                  style={styles.progressBar}
                />
              )}
            </View>
          )}

          {/* Enhanced Action Buttons */}
          <View style={styles.actionSection}>
            <View style={styles.actionGrid}>
              {!isListening ? (
                <GradientButton
                  title="Start AI-guide"
                  onPress={startAIGuide}
                  theme={theme}
                  variant="primary"
                  size="large"
                  icon="play-arrow"
                  disabled={!location}
                  style={styles.primaryAction}
                />
              ) : (
                <GradientButton
                  title="Stopp AI-guide"
                  onPress={stopAIGuide}
                  theme={theme}
                  variant="secondary"
                  size="large"
                  icon="stop"
                  style={styles.primaryAction}
                />
              )}
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.quickActionGrid}>
              <GradientButton
                title="Innstillinger"
                onPress={() => setShowOpenAISettings(true)}
                theme={theme}
                variant="gold"
                size="medium"
                icon="settings"
                style={styles.quickAction}
              />

              <GradientButton
                title={useOpenAITTS ? "OpenAI TTS" : "System TTS"}
                onPress={() => setShowOpenAISettings(true)}
                theme={theme}
                variant={useOpenAITTS ? "nature" : "secondary"}
                size="medium"
                icon="record-voice-over"
                style={styles.quickAction}
              />
            </View>
          </View>

          {/* Enhanced Features Section */}
          <View style={styles.section}>
            <GlassCard theme={theme} style={styles.featuresContainer}>
              <View style={styles.featureHeader}>
                <MaterialIcons
                  name="auto-awesome"
                  size={28}
                  color={theme.colors.secondary}
                />
                <Text style={styles.featuresTitle}>EchoTrail Funksjoner</Text>
              </View>

              <View style={styles.featuresList}>
                <View style={styles.feature}>
                  <MaterialIcons
                    name="gps-fixed"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.featureText}>
                    Stedsspesifikke historier basert på GPS
                  </Text>
                </View>

                <View style={styles.feature}>
                  <MaterialIcons
                    name="record-voice-over"
                    size={24}
                    color={
                      useOpenAITTS ? theme.colors.success : theme.colors.warning
                    }
                  />
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureText}>
                      {useOpenAITTS ? "🎤 OpenAI TTS" : "⚠️ System TTS"}
                    </Text>
                    <Text style={styles.featureSubtext}>
                      {useOpenAITTS
                        ? `${currentVoice} stemme • HD kvalitet`
                        : "Trykk innstillinger for høykvalitet"}
                    </Text>
                  </View>
                </View>

                <View style={styles.feature}>
                  <MaterialIcons
                    name="music-note"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.featureText}>
                    Atmosfærisk bakgrunnsmusikk
                  </Text>
                </View>

                <View style={styles.feature}>
                  <MaterialIcons
                    name="psychology"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.featureText}>
                    AI-personalisert innhold
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Modals */}
      <OpenAISetup
        visible={showOpenAISetup}
        onClose={() => setShowOpenAISetup(false)}
        onApiKeySet={() => {
          setUseOpenAITTS(true);
          checkOpenAITTSAvailability();
          Alert.alert(
            "Suksess",
            "OpenAI TTS er nå aktivert! Du får høykvalitets AI-stemmer."
          );
        }}
      />

      <Modal
        visible={showOpenAISettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <OpenAISettings
          onClose={() => {
            setShowOpenAISettings(false);
            checkOpenAITTSAvailability();
          }}
        />
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl || 32,
    },
    heroSection: {
      paddingHorizontal: theme.spacing._lg,
      paddingTop: theme.spacing._xl,
      paddingBottom: theme.spacing._lg,
    },
    locationGlassCard: {
      marginBottom: theme.spacing._sm,
    },
    locationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing._sm,
    },
    locationTitle: {
      fontSize: theme.typography.fontSize._md,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      flex: 1,
      marginLeft: theme.spacing._sm,
    },
    locationText: {
      fontSize: theme.typography.fontSize._sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    section: {
      paddingHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing._md,
    },
    sectionHeaderWithIcon: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing._md,
    },
    interestsContainer: {
      padding: theme.spacing._sm,
    },
    interestsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    actionSection: {
      paddingHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._xl,
    },
    actionGrid: {
      marginBottom: theme.spacing._md,
    },
    primaryAction: {
      marginBottom: theme.spacing._sm,
    },
    quickActionGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing._sm,
    },
    quickAction: {
      flex: 1,
    },
    // Interest cards now handled by InterestCard component
    storyCard: {
      marginHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._lg,
    },
    storyTitle: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing._md,
    },
    audioControls: {
      flexDirection: "row",
      alignItems: "center",
    },
    audioInfo: {
      flex: 1,
      marginLeft: theme.spacing._sm,
    },
    audioStatus: {
      fontSize: theme.typography.fontSize._md,
      color: theme.colors.text,
    },
    actionContainer: {
      paddingHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._xl,
    },
    featuresContainer: {
      padding: theme.spacing._sm,
    },
    featureHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing._lg,
    },
    featuresTitle: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginLeft: theme.spacing._sm,
      flex: 1,
    },
    featuresList: {
      gap: theme.spacing._md,
    },
    feature: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing._sm,
    },
    featureText: {
      fontSize: theme.typography.fontSize._md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginLeft: theme.spacing._sm,
      flex: 1,
    },
    featureTextContainer: {
      flex: 1,
      marginLeft: theme.spacing._sm,
    },
    featureSubtext: {
      fontSize: theme.typography.fontSize._sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    progressBar: {
      marginTop: theme.spacing._sm,
      marginHorizontal: theme.spacing._lg,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing._md,
    },
    trailControls: {
      flexDirection: "row",
      gap: theme.spacing._sm,
    },
    controlButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    mapCard: {
      marginBottom: theme.spacing._lg,
      overflow: "hidden",
      height: 300,
    },
    mapContainer: {
      width: "100%",
      height: "100%",
    },
    trailsList: {
      gap: theme.spacing._sm,
    },
    noTrailsCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing._xl,
    },
    noTrailsText: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: theme.spacing._md,
      marginBottom: theme.spacing._sm,
    },
    noTrailsSubtext: {
      fontSize: theme.typography.fontSize._sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    searchCard: {
      marginBottom: theme.spacing._md,
      padding: theme.spacing._md,
    },
    searchTitle: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing._xs,
    },
    searchSubtitle: {
      fontSize: theme.typography.fontSize._sm,
      color: theme.colors.textSecondary,
    },
    trailCard: {
      marginBottom: theme.spacing._sm,
    },
    trailCardContent: {
      padding: theme.spacing._md,
    },
    trailHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing._sm,
    },
    trailName: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.spacing._sm,
    },
    difficultyBadge: {
      paddingHorizontal: theme.spacing._sm,
      paddingVertical: theme.spacing._xs,
      borderRadius: theme.borderRadius._sm,
    },
    difficultyText: {
      fontSize: theme.typography.fontSize._xs,
      fontFamily: theme.typography.fontFamily.medium,
      color: "white",
    },
    trailDescription: {
      fontSize: theme.typography.fontSize._sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing._md,
      lineHeight: 18,
    },
    trailMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing._md,
    },
    trailMetaItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    trailMetaText: {
      fontSize: theme.typography.fontSize._xs,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing._xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });

export default DiscoverScreen;
