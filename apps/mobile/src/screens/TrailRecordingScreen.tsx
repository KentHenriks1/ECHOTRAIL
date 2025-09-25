/**
 * Trail Recording Screen - Enterprise Edition
 * Real-time GPS tracking with comprehensive recording features
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useAuth } from "../providers/AuthProvider";
import { ApiServices } from "../services/api";
import type { TrackPointInput } from "../services/api/TrailService";
import { Logger, PerformanceMonitor } from "../core/utils";
import { ThemeConfig, AppConfig } from "../core/config";
import { getFontWeight } from "../core/theme/utils";
import type { GeneratedStory } from "../services/ai";
import { aiServiceManager } from "../services/ai";
import { locationContextService } from "../services/location/LocationContextService";
import { Audio } from "expo-av";

interface RecordingStats {
  distance: number;
  duration: number;
  currentSpeed: number;
  avgSpeed: number;
  maxSpeed: number;
  trackPoints: TrackPointInput[];
}

type RecordingState = "idle" | "recording" | "paused" | "stopping" | "saving";

export function TrailRecordingScreen(): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [stats, setStats] = useState<RecordingStats>({
    distance: 0,
    duration: 0,
    currentSpeed: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    trackPoints: [],
  });
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trailName, setTrailName] = useState<string>("");
  const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState<boolean>(false);
  const [currentAudio, setCurrentAudio] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const logger = useMemo(() => new Logger("TrailRecordingScreen"), []);
  // Use singleton aiServiceManager instance
  const startTimeRef = useRef<number>(0);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Calculate distance between two points using Haversine formula
  const calculateDistanceBetweenPoints = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    []
  );

  // Calculate total distance from track points
  const calculateTotalDistance = useCallback(
    (trackPoints: TrackPointInput[]): number => {
      if (trackPoints.length < 2) return 0;

      let totalDistance = 0;
      for (let i = 1; i < trackPoints.length; i++) {
        const prev = trackPoints[i - 1];
        const curr = trackPoints[i];
        const distance = calculateDistanceBetweenPoints(
          prev.coordinate.latitude,
          prev.coordinate.longitude,
          curr.coordinate.latitude,
          curr.coordinate.longitude
        );
        totalDistance += distance;
      }
      return totalDistance;
    },
    [calculateDistanceBetweenPoints]
  );

  // Save recording
  const saveRecording = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert("Authentication Required", "Please log in to save trails");
      return;
    }

    if (stats.trackPoints.length === 0) {
      Alert.alert("No Data", "No track points to save");
      return;
    }

    try {
      logger.info("Saving trail recording", {
        trackPointCount: stats.trackPoints.length,
        distance: stats.distance,
        duration: stats.duration,
      });
      setRecordingState("saving");

      // Create trail
      const trailName = `Trail ${new Date().toLocaleDateString()}`;
      const createResponse = await ApiServices.trails.createTrail({
        name: trailName,
        description: `Recorded trail with ${stats.trackPoints.length} track points`,
        isPublic: false,
      });

      if (!createResponse.success || !createResponse.data) {
        throw new Error(
          createResponse.error?.message || "Failed to create trail"
        );
      }

      const trail = createResponse.data;

      // Upload track points in batches
      await ApiServices.trails.batchUploadTrackPoints(
        trail.id,
        stats.trackPoints,
        100 // batch size
      );

      // Track performance
      PerformanceMonitor.trackCustomMetric(
        "trail_save",
        stats.trackPoints.length,
        "count",
        undefined,
        {
          distance: stats.distance,
          duration: stats.duration,
          trailId: trail.id,
        }
      );

      setRecordingState("idle");
      logger.info("Trail saved successfully", { trailId: trail.id });

      Alert.alert(
        "Trail Saved!",
        `Your trail "${trailName}" has been saved successfully.`,
        [{ text: "OK", style: "default" }]
      );

      // Reset stats
      setStats({
        distance: 0,
        duration: 0,
        currentSpeed: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        trackPoints: [],
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setRecordingState("idle");
      logger.error("Failed to save trail", undefined, err as Error);

      Alert.alert("Save Failed", `Failed to save trail: ${errorMessage}`, [
        { text: "OK", style: "default" },
      ]);
    }
  }, [isAuthenticated, stats, logger]);

  // Generate AI story for current trail
  const generateTrailStory = useCallback(async () => {
    if (!AppConfig.features.aiStories) {
      Alert.alert(
        "AI Stories Disabled", 
        "AI story generation is not enabled in this version."
      );
      return;
    }

    if (stats.trackPoints.length === 0) {
      Alert.alert(
        "No Trail Data", 
        "Start recording a trail to generate an AI-powered story about your route."
      );
      return;
    }

    try {
      setIsGeneratingStory(true);
      logger.info("Generating AI story for trail", {
        trackPointCount: stats.trackPoints.length,
        distance: stats.distance,
      });

      // Get first track point for location context
      const firstPoint = stats.trackPoints[0];
      if (!firstPoint) {
        throw new Error('No track points available');
      }

      // Create temporary trail object for location context
      const temporaryTrail = {
        id: `temp-${Date.now()}`,
        name: trailName || `Trail ${new Date().toLocaleDateString()}`,
        description: `Recorded trail with ${stats.trackPoints.length} points`,
        userId: 'temp-user', // Temporary user ID for type compliance
        metadata: {
          distance: stats.distance,
          duration: stats.duration,
          avgSpeed: stats.avgSpeed,
          maxSpeed: stats.maxSpeed,
          elevationGain: 0,
          elevationLoss: 0,
        },
        trackPoints: stats.trackPoints.map(tp => ({
          id: `temp-${tp.timestamp}`,
          coordinate: tp.coordinate,
          timestamp: tp.timestamp,
          accuracy: tp.accuracy,
          altitude: tp.altitude,
          speed: tp.speed,
          heading: tp.heading,
          createdAt: tp.timestamp,
        })),
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Build rich location context
      const locationContext = await locationContextService.buildLocationContext(
        firstPoint.coordinate.latitude,
        firstPoint.coordinate.longitude,
        temporaryTrail,
        stats.trackPoints.map(tp => ({
          id: `temp-${tp.timestamp}`,
          coordinate: tp.coordinate,
          timestamp: tp.timestamp,
          accuracy: tp.accuracy,
          altitude: tp.altitude,
          speed: tp.speed,
          heading: tp.heading,
          createdAt: tp.timestamp,
        }))
      );

      // Get location-aware user preferences
      const enrichment = await locationContextService.getLocationEnrichment(
        firstPoint.coordinate.latitude,
        firstPoint.coordinate.longitude
      ).catch(() => ({
        address: 'Ukjent lokasjon',
        nearbyPlaces: [],
        historicalContext: 'Et vakkert sted i Norge',
        culturalContext: 'Norsk natur og kultur',
        localTerminology: ['fjell', 'skog', 'natur'],
        region: { municipality: 'Ukjent', county: 'Ukjent', country: 'Norge' }
      }));

      const preferences = locationContextService.getSuggestedPreferences(enrichment.region);

      // Generate story with AI service
      const result = await aiServiceManager.generateStory(
        locationContext,
        preferences
      );
      const story = result.story;

      setGeneratedStory(story);
      logger.info("AI story generated successfully", {
        title: story.title,
        hasAudio: !!story.audioUrl,
        cost: story.cost?.estimatedCost,
        fromCache: result.fromCache,
      });

      Alert.alert(
        "🎭 AI Story Generated!",
        `"${story.title}"\n\nYour trail has been transformed into an engaging story. ${story.audioUrl ? 'Tap "Play Story" to listen!' : 'Audio generation is being processed.'}`,
        [{ text: "Amazing!", style: "default" }]
      );

    } catch (error) {
      logger.error("Failed to generate AI story", undefined, error as Error);
      Alert.alert(
        "Story Generation Failed",
        "Could not generate an AI story for this trail. Please check your internet connection and try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setIsGeneratingStory(false);
    }
  }, [stats, trailName, logger, aiServiceManager, locationContextService]);

  // Play generated story audio
  const playGeneratedStory = useCallback(async () => {
    if (!generatedStory?.id) {
      Alert.alert("No Story", "No story is available to play.");
      return;
    }

    try {
      if (currentAudio) {
        await currentAudio.unloadAsync();
        setCurrentAudio(null);
      }

      setIsPlayingAudio(true);
      await aiServiceManager.playStoryAudio(generatedStory.id);
      
      logger.info("Playing AI-generated story audio");
    } catch (error) {
      logger.error("Failed to play story audio", undefined, error as Error);
      setIsPlayingAudio(false);
      Alert.alert("Playback Error", "Could not play the story audio.");
    }
  }, [generatedStory, currentAudio, logger, aiServiceManager]);

  // Stop audio playback
  const stopStoryAudio = useCallback(async () => {
    if (currentAudio) {
      await currentAudio.stopAsync();
      await currentAudio.unloadAsync();
      setCurrentAudio(null);
    }
    setIsPlayingAudio(false);
  }, [currentAudio]);

  // Discard recording
  const discardRecording = useCallback(() => {
    logger.info("Discarding trail recording");
    
    // Clean up audio if playing
    if (currentAudio) {
      currentAudio.unloadAsync();
      setCurrentAudio(null);
    }
    
    setStats({
      distance: 0,
      duration: 0,
      currentSpeed: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      trackPoints: [],
    });
    setRecordingState("idle");
    
    // Reset AI-related states
    setGeneratedStory(null);
    setIsGeneratingStory(false);
    setIsPlayingAudio(false);
    startTimeRef.current = 0;
  }, [logger]);

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    try {
      logger.info("Requesting location permission");

      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        throw new Error("Location permission not granted");
      }

      // Request background permission for continuous tracking
      if (Platform.OS === "android") {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== "granted") {
          Alert.alert(
            "Background Location",
            "For best tracking accuracy, please enable background location access in settings."
          );
        }
      }

      setLocationPermission(true);
      setError(null);
      logger.info("Location permission granted");
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setLocationPermission(false);
      logger.error("Location permission denied", undefined, err as Error);

      Alert.alert(
        "Location Permission Required",
        "EchoTrail needs location access to record your trails. Please enable location permissions in settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Settings",
            onPress: () =>
              Alert.alert(
                "Settings",
                "Please enable location permissions in device settings."
              ),
          },
        ]
      );
    }
  }, [logger]);

  // Initialize location permission
  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground
        if (recordingState === "recording") {
          logger.info("App returned to foreground during recording");
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        if (recordingState === "recording") {
          logger.info("App went to background during recording");
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription?.remove();
  }, [recordingState, logger]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!locationPermission) {
      await requestLocationPermission();
      return;
    }

    try {
      logger.info("Starting trail recording");
      setRecordingState("recording");
      startTimeRef.current = Date.now();

      // Reset stats
      setStats({
        distance: 0,
        duration: 0,
        currentSpeed: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        trackPoints: [],
      });

      // Start location tracking
      const locationOptions: Location.LocationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000, // Update every second
        distanceInterval: 1, // Update every meter
      };

      const subscription = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          const trackPoint: TrackPointInput = {
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            timestamp: new Date(location.timestamp).toISOString(),
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
          };

          setStats((prevStats) => {
            const newTrackPoints = [...prevStats.trackPoints, trackPoint];
            const newDistance = calculateTotalDistance(newTrackPoints);
            const currentTime = Date.now();
            const newDuration = (currentTime - startTimeRef.current) / 1000;
            const newAvgSpeed = newDuration > 0 ? newDistance / newDuration : 0;
            const currentSpeed = trackPoint.speed || 0;
            const newMaxSpeed = Math.max(prevStats.maxSpeed, currentSpeed);

            return {
              distance: newDistance,
              duration: newDuration,
              currentSpeed,
              avgSpeed: newAvgSpeed,
              maxSpeed: newMaxSpeed,
              trackPoints: newTrackPoints,
            };
          });
        }
      );

      locationSubscriptionRef.current = subscription;

      // Start duration timer
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current > 0) {
          const currentTime = Date.now();
          const duration = (currentTime - startTimeRef.current) / 1000;

          setStats((prevStats) => ({
            ...prevStats,
            duration,
            avgSpeed:
              prevStats.distance > 0 ? prevStats.distance / duration : 0,
          }));
        }
      }, 1000);

      logger.info("Trail recording started successfully");
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setRecordingState("idle");
      logger.error("Failed to start recording", undefined, err as Error);

      Alert.alert(
        "Recording Error",
        `Failed to start recording: ${errorMessage}`,
        [{ text: "OK", style: "default" }]
      );
    }
  }, [
    locationPermission,
    requestLocationPermission,
    logger,
    calculateTotalDistance,
  ]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    logger.info("Pausing trail recording");
    setRecordingState("paused");

    // Stop location updates
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    // Stop timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [logger]);

  // Resume recording
  const resumeRecording = useCallback(async () => {
    logger.info("Resuming trail recording");
    setRecordingState("recording");

    // Resume location tracking
    const locationOptions: Location.LocationOptions = {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 1,
    };

    try {
      const subscription = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          const trackPoint: TrackPointInput = {
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            timestamp: new Date(location.timestamp).toISOString(),
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
          };

          setStats((prevStats) => {
            const newTrackPoints = [...prevStats.trackPoints, trackPoint];
            const newDistance = calculateTotalDistance(newTrackPoints);
            const currentSpeed = trackPoint.speed || 0;
            const newMaxSpeed = Math.max(prevStats.maxSpeed, currentSpeed);

            return {
              ...prevStats,
              distance: newDistance,
              currentSpeed,
              maxSpeed: newMaxSpeed,
              trackPoints: newTrackPoints,
            };
          });
        }
      );

      locationSubscriptionRef.current = subscription;

      // Resume timer
      intervalRef.current = setInterval(() => {
        setStats((prevStats) => {
          const duration = prevStats.duration + 1;
          return {
            ...prevStats,
            duration,
            avgSpeed:
              prevStats.distance > 0 ? prevStats.distance / duration : 0,
          };
        });
      }, 1000);
    } catch (err) {
      logger.error("Failed to resume recording", undefined, err as Error);
      Alert.alert("Resume Error", "Failed to resume recording");
    }
  }, [logger, calculateTotalDistance]);

  // Stop recording
  const stopRecording = useCallback(() => {
    logger.info("Stopping trail recording");
    setRecordingState("stopping");

    // Stop location updates
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    // Stop timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Prompt for trail name if not provided
    if (!trailName.trim()) {
      const defaultName = `Trail ${new Date().toLocaleDateString()}`;
      setTrailName(defaultName);
    }

    setRecordingState("idle");

    // Show save options
    Alert.alert("Recording Stopped", "Would you like to save this trail?", [
      {
        text: "Discard",
        style: "destructive",
        onPress: () => discardRecording(),
      },
      {
        text: "Save",
        style: "default",
        onPress: () => saveRecording(),
      },
    ]);
  }, [discardRecording, logger, saveRecording, trailName]);

  // Format functions
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
  };

  const formatSpeed = (metersPerSecond: number): string => {
    const kmPerHour = metersPerSecond * 3.6;
    return `${kmPerHour.toFixed(1)} km/h`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Permission not granted
  if (!locationPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Location Permission Required</Text>
          <Text style={styles.subtitle}>
            EchoTrail needs location access to record your trails.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Recording Status */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              recordingState === "recording" && styles.recording,
              recordingState === "paused" && styles.paused,
            ]}
          />
          <Text style={styles.statusText}>
            {recordingState === "recording" && "Recording"}
            {recordingState === "paused" && "Paused"}
            {recordingState === "idle" && "Ready to Record"}
            {recordingState === "stopping" && "Stopping..."}
            {recordingState === "saving" && "Saving..."}
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>
              {formatDistance(stats.distance)}
            </Text>
            <Text style={styles.mainStatLabel}>Distance</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatDuration(stats.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatSpeed(stats.currentSpeed)}
              </Text>
              <Text style={styles.statLabel}>Current Speed</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatSpeed(stats.avgSpeed)}
              </Text>
              <Text style={styles.statLabel}>Avg Speed</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatSpeed(stats.maxSpeed)}
              </Text>
              <Text style={styles.statLabel}>Max Speed</Text>
            </View>
          </View>

          <View style={styles.trackPointsInfo}>
            <Text style={styles.trackPointsText}>
              📍 {stats.trackPoints.length} track points recorded
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {recordingState === "idle" && (
            <Pressable
              style={[styles.controlButton, styles.startButton]}
              onPress={startRecording}
            >
              <Text style={styles.startButtonText}>🎯 Start Recording</Text>
            </Pressable>
          )}

          {recordingState === "recording" && (
            <>
              <Pressable
                style={[styles.controlButton, styles.pauseButton]}
                onPress={pauseRecording}
              >
                <Text style={styles.pauseButtonText}>⏸️ Pause</Text>
              </Pressable>
              <Pressable
                style={[styles.controlButton, styles.stopButton]}
                onPress={stopRecording}
              >
                <Text style={styles.stopButtonText}>⏹️ Stop</Text>
              </Pressable>
            </>
          )}

          {recordingState === "paused" && (
            <>
              <Pressable
                style={[styles.controlButton, styles.resumeButton]}
                onPress={resumeRecording}
              >
                <Text style={styles.resumeButtonText}>▶️ Resume</Text>
              </Pressable>
              <Pressable
                style={[styles.controlButton, styles.stopButton]}
                onPress={stopRecording}
              >
                <Text style={styles.stopButtonText}>⏹️ Stop</Text>
              </Pressable>
            </>
          )}

          {(recordingState === "stopping" || recordingState === "saving") && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={ThemeConfig.primaryColor}
              />
              <Text style={styles.loadingText}>
                {recordingState === "stopping"
                  ? "Stopping recording..."
                  : "Saving trail..."}
              </Text>
            </View>
          )}
        </View>

        {/* AI Story Controls */}
        {AppConfig.features.aiStories && recordingState === "idle" && stats.trackPoints.length > 0 && (
          <View style={styles.aiControlsContainer}>
            <Text style={styles.aiControlsTitle}>🤖 AI Story Generation</Text>
            
            {!generatedStory && (
              <Pressable
                style={[
                  styles.controlButton,
                  styles.aiGenerateButton,
                  isGeneratingStory && styles.disabledButton,
                ]}
                onPress={generateTrailStory}
                disabled={isGeneratingStory}
              >
                {isGeneratingStory ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.aiGenerateButtonText}>Generating Story...</Text>
                  </>
                ) : (
                  <Text style={styles.aiGenerateButtonText}>✨ Generate AI Story</Text>
                )}
              </Pressable>
            )}
            
            {generatedStory && (
              <View style={styles.storyContainer}>
                <Text style={styles.storyTitle}>"{generatedStory.title}"</Text>
                <Text style={styles.storyPreview}>
                  {generatedStory.content.substring(0, 150)}...
                </Text>
                
                <View style={styles.storyControls}>
                  {generatedStory.audioUrl && (
                    <Pressable
                      style={[
                        styles.controlButton,
                        styles.playStoryButton,
                        isPlayingAudio && styles.playingButton,
                      ]}
                      onPress={isPlayingAudio ? stopStoryAudio : playGeneratedStory}
                    >
                      <Text style={styles.playStoryButtonText}>
                        {isPlayingAudio ? "⏹️ Stop Story" : "🔊 Play Story"}
                      </Text>
                    </Pressable>
                  )}
                  
                  <Pressable
                    style={[styles.controlButton, styles.regenerateButton]}
                    onPress={() => {
                      setGeneratedStory(null);
                      generateTrailStory();
                    }}
                    disabled={isGeneratingStory}
                  >
                    <Text style={styles.regenerateButtonText}>🔄 New Story</Text>
                  </Pressable>
                </View>
                
                {generatedStory.cost && (
                  <Text style={styles.costInfo}>
                    Generated with {generatedStory.cost.tokens} tokens
                    {generatedStory.cost.estimatedCost > 0 && 
                      ` (≈$${generatedStory.cost.estimatedCost.toFixed(4)})`
                    }
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {recordingState === "idle" && stats.trackPoints.length > 0 && (
          <View style={styles.actionButtonsContainer}>
            <Pressable
              style={[styles.controlButton, styles.saveButton]}
              onPress={saveRecording}
            >
              <Text style={styles.saveButtonText}>💾 Save Trail</Text>
            </Pressable>
            
            <Pressable
              style={[styles.controlButton, styles.discardButton]}
              onPress={discardRecording}
            >
              <Text style={styles.discardButtonText}>🗑️ Discard</Text>
            </Pressable>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => setError(null)}
            >
              <Text style={styles.retryText}>Dismiss</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: ThemeConfig.spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  title: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    textAlign: "center",
    marginBottom: ThemeConfig.spacing.sm,
  },
  subtitle: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
    marginBottom: ThemeConfig.spacing.xl,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ThemeConfig.spacing.xl,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#94a3b8",
    marginRight: ThemeConfig.spacing.sm,
  },
  recording: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  paused: {
    backgroundColor: "#f59e0b",
  },
  statusText: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
    color: "#1e293b",
  },
  statsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  mainStat: {
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.xl,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.primaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  mainStatLabel: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    color: ThemeConfig.secondaryColor,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: ThemeConfig.spacing.lg,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    padding: ThemeConfig.spacing.md,
    borderRadius: 12,
    marginBottom: ThemeConfig.spacing.sm,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.xs,
  },
  statLabel: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  trackPointsInfo: {
    alignItems: "center",
  },
  trackPointsText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
  },
  controlsContainer: {
    paddingVertical: ThemeConfig.spacing.lg,
  },
  controlButton: {
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.lg,
    borderRadius: 12,
    marginBottom: ThemeConfig.spacing.sm,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: ThemeConfig.primaryColor,
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.xl,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
  startButton: {
    backgroundColor: "#059669",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
  pauseButton: {
    backgroundColor: "#f59e0b",
  },
  pauseButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
  resumeButton: {
    backgroundColor: "#059669",
  },
  resumeButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
  stopButton: {
    backgroundColor: "#ef4444",
  },
  stopButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: ThemeConfig.spacing.lg,
  },
  loadingText: {
    marginTop: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: ThemeConfig.errorColor,
    marginTop: ThemeConfig.spacing.md,
  },
  errorText: {
    color: ThemeConfig.errorColor,
    fontSize: ThemeConfig.typography.fontSize.md,
    marginBottom: ThemeConfig.spacing.sm,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: ThemeConfig.spacing.xs,
    paddingHorizontal: ThemeConfig.spacing.sm,
    backgroundColor: ThemeConfig.errorColor,
    borderRadius: 6,
  },
  retryText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.sm,
    fontWeight: getFontWeight("medium"),
  },
  
  // AI Story Controls Styles
  aiControlsContainer: {
    backgroundColor: "#f0f9ff",
    padding: ThemeConfig.spacing.lg,
    borderRadius: 12,
    marginTop: ThemeConfig.spacing.lg,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  aiControlsTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("bold"),
    color: "#1e3a8a",
    textAlign: "center",
    marginBottom: ThemeConfig.spacing.md,
  },
  aiGenerateButton: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  aiGenerateButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
    opacity: 0.7,
  },
  storyContainer: {
    backgroundColor: "#ffffff",
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    marginTop: ThemeConfig.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  storyTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    textAlign: "center",
    marginBottom: ThemeConfig.spacing.sm,
  },
  storyPreview: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: "#475569",
    lineHeight: 20,
    marginBottom: ThemeConfig.spacing.md,
  },
  storyControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: ThemeConfig.spacing.sm,
  },
  playStoryButton: {
    backgroundColor: "#059669",
    flex: 1,
    marginRight: ThemeConfig.spacing.xs,
  },
  playStoryButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.sm,
    fontWeight: getFontWeight("medium"),
  },
  playingButton: {
    backgroundColor: "#dc2626",
  },
  regenerateButton: {
    backgroundColor: "#f59e0b",
    flex: 1,
    marginLeft: ThemeConfig.spacing.xs,
  },
  regenerateButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.sm,
    fontWeight: getFontWeight("medium"),
  },
  costInfo: {
    fontSize: ThemeConfig.typography.fontSize.xs,
    color: "#64748b",
    textAlign: "center",
    fontStyle: "italic",
  },
  
  // Action Buttons Styles
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: ThemeConfig.spacing.lg,
  },
  saveButton: {
    backgroundColor: "#059669",
    flex: 1,
    marginRight: ThemeConfig.spacing.xs,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
  discardButton: {
    backgroundColor: "#dc2626",
    flex: 1,
    marginLeft: ThemeConfig.spacing.xs,
  },
  discardButtonText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
  },
});
