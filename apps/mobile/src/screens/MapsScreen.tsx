/**
 * Maps Screen - Enterprise Edition
 * Google Maps integration with trail visualization and GPS tracking
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
  // Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  Marker,
  Polyline,
  Region,
  PROVIDER_GOOGLE,
  // AnimatedRegion,
} from "react-native-maps";
import * as Location from "expo-location";
// import { useAuth } from "../providers/AuthProvider"; // Available for future use
import { ApiServices } from "../services/api";
import type { Trail, TrackPoint } from "../services/api/TrailService";
import type { GeneratedStory } from "../services/ai";
import { aiServiceManager } from "../services/ai";
import { locationContextService } from "../services/location/LocationContextService";
import { Logger, PerformanceMonitor } from "../core/utils";
import StoryMarkerCluster from "../components/maps/StoryMarkerCluster";
import { ThemeConfig } from "../core/config";
import { getFontWeight } from "../core/theme/utils";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

interface MapState {
  region: Region | null;
  userLocation: Location.LocationObject | null;
  trails: Trail[];
  selectedTrail: Trail | null;
  trackPoints: TrackPoint[];
  isLoading: boolean;
  error: string | null;
  mapType: "standard" | "satellite" | "hybrid" | "terrain";
  showUserLocation: boolean;
  followUser: boolean;
  // AI integration
  nearbyStories: GeneratedStory[];
  isLoadingStories: boolean;
  showStoryMarkers: boolean;
}

type LoadingState = "idle" | "loading" | "error" | "success";

export function MapsScreen(): React.ReactElement {
  // Authentication context (currently not used but available for future features)
  // const authContext = useAuth();
  const [mapState, setMapState] = useState<MapState>({
    region: null,
    userLocation: null,
    trails: [],
    selectedTrail: null,
    trackPoints: [],
    isLoading: true,
    error: null,
    mapType: "standard",
    showUserLocation: true,
    followUser: false,
    nearbyStories: [],
    isLoadingStories: false,
    showStoryMarkers: true,
  });
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  const logger = useMemo(() => new Logger("MapsScreen"), []);
  const mapRef = useRef<MapView>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null
  );
  // Use singleton aiServiceManager instance
  // const animatedRegionRef = useRef<AnimatedRegion | null>(null);

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    try {
      logger.info("Requesting location permission for maps");

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        throw new Error("Location permission not granted");
      }

      setLocationPermission(true);
      logger.info("Location permission granted for maps");
    } catch (err) {
      const errorMessage = (err as Error).message;
      setMapState((prev) => ({ ...prev, error: errorMessage }));
      setLocationPermission(false);
      logger.error(
        "Location permission denied for maps",
        undefined,
        err as Error
      );

      Alert.alert(
        "Location Permission Required",
        "Maps require location access to show your position and nearby trails.",
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

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    if (!locationPermission) return null;

    try {
      logger.info("Getting current location");

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setMapState((prev) => ({ ...prev, userLocation: location }));

      // Set initial region
      if (!mapState.region) {
        const region: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };
        setMapState((prev) => ({ ...prev, region }));
      }

      logger.info("Current location obtained", {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return location;
    } catch (err) {
      logger.error("Failed to get current location", undefined, err as Error);
      return null;
    }
  }, [locationPermission, mapState.region, logger]);

  // Start location tracking
  const startLocationTracking = useCallback(async () => {
    if (!locationPermission) return;

    try {
      logger.info("Starting location tracking for maps");

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          setMapState((prev) => ({ ...prev, userLocation: location }));

          // Follow user if enabled
          if (mapState.followUser && mapRef.current) {
            const region: Region = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            };
            mapRef.current.animateToRegion(region, 1000);
          }
        }
      );

      locationSubscriptionRef.current = subscription;
      logger.info("Location tracking started for maps");
    } catch (err) {
      logger.error(
        "Failed to start location tracking",
        undefined,
        err as Error
      );
    }
  }, [locationPermission, mapState.followUser, logger]);

  // Load trails from API
  const loadTrails = useCallback(async () => {
    try {
      logger.info("Loading trails for maps");
      setLoadingState("loading");

      const response = await ApiServices.trails.getTrails({
        limit: 50,
        includeTrackPoints: false, // Load track points separately for selected trail
      });

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to load trails");
      }

      setMapState((prev) => ({
        ...prev,
        trails: response.data || [],
        isLoading: false,
        error: null,
      }));
      setLoadingState("success");

      logger.info("Trails loaded successfully", {
        count: response.data?.length || 0,
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      setMapState((prev) => ({
        ...prev,
        trails: [],
        isLoading: false,
        error: errorMessage,
      }));
      setLoadingState("error");
      logger.error("Failed to load trails", undefined, err as Error);
    }
  }, [logger]);

  // Load track points for selected trail
  const loadTrackPoints = useCallback(
    async (trailId: string) => {
      try {
        logger.info("Loading track points for trail", { trailId });

        const response = await ApiServices.trails.getTrackPoints(trailId);

        if (!response.success) {
          throw new Error(
            response.error?.message || "Failed to load track points"
          );
        }

        setMapState((prev) => ({
          ...prev,
          trackPoints: response.data || [],
        }));

        // Fit map to trail bounds
        if (response.data && response.data.length > 0 && mapRef.current) {
          const coordinates = response.data.map((tp) => ({
            latitude: tp.coordinate.latitude,
            longitude: tp.coordinate.longitude,
          }));

          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }

        logger.info("Track points loaded successfully", {
          count: response.data?.length || 0,
        });
      } catch (err) {
        logger.error("Failed to load track points", undefined, err as Error);
      }
    },
    [logger]
  );

  // Handle trail selection
  const selectTrail = useCallback(
    (trail: Trail) => {
      logger.info("Trail selected", {
        trailId: trail.id,
        trailName: trail.name,
      });

      setMapState((prev) => ({
        ...prev,
        selectedTrail: trail,
        trackPoints: [],
      }));

      loadTrackPoints(trail.id);

      // Track selection
      PerformanceMonitor.trackCustomMetric(
        "trail_selected_on_map",
        1,
        "count",
        undefined,
        {
          trailId: trail.id,
          trailName: trail.name,
        }
      );
    },
    [loadTrackPoints, logger]
  );

  // Deselect trail
  const deselectTrail = useCallback(() => {
    logger.info("Trail deselected");

    setMapState((prev) => ({
      ...prev,
      selectedTrail: null,
      trackPoints: [],
    }));
  }, [logger]);

  // Center on user location
  const centerOnUser = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      const location = await getCurrentLocation();
      if (location) {
        const region: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };

        mapRef.current.animateToRegion(region, 1000);
        logger.info("Map centered on user location");
      }
    } catch (err) {
      logger.error("Failed to center on user", undefined, err as Error);
    }
  }, [getCurrentLocation, logger]);

  // Toggle map type
  const toggleMapType = useCallback(() => {
    const mapTypes: MapState["mapType"][] = [
      "standard",
      "satellite",
      "hybrid",
      "terrain",
    ];
    const currentIndex = mapTypes.indexOf(mapState.mapType);
    const nextIndex = (currentIndex + 1) % mapTypes.length;
    const nextMapType = mapTypes[nextIndex];

    setMapState((prev) => ({ ...prev, mapType: nextMapType }));
    logger.info("Map type changed", { newType: nextMapType });
  }, [mapState.mapType, logger]);

  // Toggle user location following
  const toggleFollowUser = useCallback(() => {
    const newFollowUser = !mapState.followUser;
    setMapState((prev) => ({ ...prev, followUser: newFollowUser }));
    logger.info("Follow user toggled", { enabled: newFollowUser });
  }, [mapState.followUser, logger]);

  // Generate AI story for current location
  const generateLocationStory = useCallback(async (
    latitude: number,
    longitude: number,
    trail?: Trail
  ) => {
    try {
      setMapState(prev => ({ ...prev, isLoadingStories: true }));
      logger.info("Generating location story", { latitude, longitude, trailId: trail?.id });

      // Build location context
      const locationContext = await locationContextService.buildLocationContext(
        latitude,
        longitude,
        trail,
        trail ? mapState.trackPoints : undefined
      );

      // Get suggested user preferences based on location
      const enrichment = await locationContextService.getLocationEnrichment(latitude, longitude).catch(() => ({
        address: 'Ukjent lokasjon',
        nearbyPlaces: [],
        historicalContext: 'Et vakkert sted i Norge',
        culturalContext: 'Norsk natur og kultur',
        localTerminology: ['fjell', 'skog', 'natur'],
        region: { municipality: 'Ukjent', county: 'Ukjent', country: 'Norge' }
      }));
      const userPreferences = locationContextService.getSuggestedPreferences(enrichment.region);

      // Generate story
      const result = await aiServiceManager.generateStory(
        locationContext,
        userPreferences
      );
      const story = result.story;

      // Add to nearby stories
      setMapState(prev => ({
        ...prev,
        nearbyStories: [story, ...prev.nearbyStories].slice(0, 10), // Keep max 10 stories
        isLoadingStories: false
      }));

      logger.info("Location story generated successfully", { storyId: story.id, fromCache: result.fromCache });
      return story;
    } catch (error) {
      logger.error("Failed to generate location story", undefined, error as Error);
      setMapState(prev => ({ ...prev, isLoadingStories: false }));
      throw error;
    }
  }, [aiServiceManager, locationContextService, logger, mapState.trackPoints]);

  // Load nearby stories for current region
  /* const loadNearbyStories = useCallback(async (region: Region) => { // Temporarily disabled
    try {
      setMapState(prev => ({ ...prev, isLoadingStories: true }));
      logger.info("Loading nearby stories", { region });

      // Get cached stories from location cache
      const locationStories = await aiServiceManager.findNearbyStories(
        region.latitude,
        region.longitude,
        5000, // 5km radius
        20    // max 20 stories
      );
      
      // Convert to GeneratedStory format
      const nearbyStories: GeneratedStory[] = locationStories.map(cached => cached.story);
      
      setMapState(prev => ({
        ...prev,
        nearbyStories,
        isLoadingStories: false
      }));

      logger.info("Nearby stories loaded", { count: nearbyStories.length });
    } catch (error) {
      logger.error("Failed to load nearby stories", undefined, error as Error);
      setMapState(prev => ({ ...prev, isLoadingStories: false }));
    }
  }, [aiServiceManager, logger]); */

  // Toggle story markers visibility
  const toggleStoryMarkers = useCallback(() => {
    const newShowStoryMarkers = !mapState.showStoryMarkers;
    setMapState(prev => ({ ...prev, showStoryMarkers: newShowStoryMarkers }));
    logger.info("Story markers toggled", { enabled: newShowStoryMarkers });
  }, [mapState.showStoryMarkers, logger]);

  // Handle long press on map to generate story
  const onMapLongPress = useCallback(async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    Alert.alert(
      "Generer historie",
      "Vil du generere en AI-historie for denne lokasjonen?",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Generer",
          onPress: () => generateLocationStory(latitude, longitude)
        }
      ]
    );
  }, [generateLocationStory]);

  // Handle story marker press
  const handleStoryMarkerPress = useCallback((story: GeneratedStory) => {
    Alert.alert(
      story.title || "AI-historie",
      story.content,
      [
        { text: "Lukk", style: "cancel" },
        {
          text: "Spill av",
          onPress: async () => {
            try {
              await aiServiceManager.playStoryAudio(story.id);
            } catch (error) {
              logger.error("Failed to play story audio", undefined, error as Error);
              Alert.alert("Feil", "Kunne ikke spille av historien");
            }
          }
        }
      ]
    );
  }, [aiServiceManager, logger]);

  // Handle story cluster press
  const handleStoryClusterPress = useCallback((stories: GeneratedStory[]) => {
    const storyTitles = stories.map((story, index) => 
      `${index + 1}. ${story.title || 'Uten tittel'}`
    ).join('\n');
    
    Alert.alert(
      `${stories.length} historier i området`,
      `Historier:\n\n${storyTitles}`,
      [
        { text: "Lukk", style: "cancel" },
        {
          text: "Spill første",
          onPress: async () => {
            try {
              await aiServiceManager.playStoryAudio(stories[0].id);
            } catch (error) {
              logger.error("Failed to play clustered story audio", undefined, error as Error);
              Alert.alert("Feil", "Kunne ikke spille av historien");
            }
          }
        }
      ]
    );
  }, [aiServiceManager, logger]);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        await requestLocationPermission();
        await getCurrentLocation();
        await loadTrails();
        await startLocationTracking();
      } catch (err) {
        logger.error("Failed to initialize map", undefined, err as Error);
      }
    };

    initializeMap();
  }, [
    getCurrentLocation,
    loadTrails,
    logger,
    requestLocationPermission,
    startLocationTracking,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  // Handle map region change
  const onRegionChange = useCallback((region: Region) => {
    setMapState((prev) => ({ ...prev, region }));
  }, []);

  // Handle marker press
  const onMarkerPress = useCallback(
    (trail: Trail) => {
      selectTrail(trail);
    },
    [selectTrail]
  );

  // Render trail markers
  const renderTrailMarkers = () => {
    return mapState.trails.map((trail) => {
      // Use first track point as marker position
      if (!trail.trackPoints || trail.trackPoints.length === 0) {
        return null;
      }

      const firstPoint = trail.trackPoints[0];

      return (
        <Marker
          key={trail.id}
          coordinate={{
            latitude: firstPoint.coordinate.latitude,
            longitude: firstPoint.coordinate.longitude,
          }}
          title={trail.name}
          description={trail.description || "Trail"}
          onPress={() => onMarkerPress(trail)}
          pinColor={
            mapState.selectedTrail?.id === trail.id ? "#ef4444" : "#3b82f6"
          }
        />
      );
    });
  };

  // Render trail polyline
  const renderTrailPolyline = () => {
    if (!mapState.selectedTrail || mapState.trackPoints.length === 0) {
      return null;
    }

    const coordinates = mapState.trackPoints.map((tp) => ({
      latitude: tp.coordinate.latitude,
      longitude: tp.coordinate.longitude,
    }));

    return (
      <Polyline
        coordinates={coordinates}
        strokeColor="#3b82f6"
        strokeWidth={4}
        lineJoin="round"
        lineCap="round"
      />
    );
  };

  // Render story markers with clustering
  const renderStoryMarkers = () => {
    if (!mapState.showStoryMarkers || mapState.nearbyStories.length === 0) {
      return null;
    }

    return (
      <StoryMarkerCluster
        stories={mapState.nearbyStories}
        onStoryPress={handleStoryMarkerPress}
        onClusterPress={handleStoryClusterPress}
        clusterRadius={300} // 300 meters clustering radius
        minClusterSize={2}
      />
    );
  };

  // Loading state
  if (loadingState === "loading" || !locationPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ThemeConfig.primaryColor} />
          <Text style={styles.loadingText}>
            {!locationPermission
              ? "Requesting location access..."
              : "Loading map..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (loadingState === "error" && mapState.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Map Error</Text>
          <Text style={styles.errorText}>{mapState.error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setLoadingState("loading");
              loadTrails();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={
            mapState.region || {
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            }
          }
          onRegionChange={onRegionChange}
          onLongPress={onMapLongPress}
          showsUserLocation={mapState.showUserLocation}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          mapType={mapState.mapType}
          toolbarEnabled={false}
          loadingEnabled={true}
          loadingIndicatorColor={ThemeConfig.primaryColor}
          loadingBackgroundColor="#f8fafc"
        >
          {renderTrailMarkers()}
          {renderTrailPolyline()}
          {renderStoryMarkers()}
        </MapView>

        {/* Map Controls */}
        <View style={styles.controlsContainer}>
          {/* Map Type Toggle */}
          <Pressable style={styles.controlButton} onPress={toggleMapType}>
            <Text style={styles.controlButtonText}>
              {mapState.mapType === "standard" && "🗺️"}
              {mapState.mapType === "satellite" && "🛰️"}
              {mapState.mapType === "hybrid" && "🌍"}
              {mapState.mapType === "terrain" && "🏔️"}
            </Text>
          </Pressable>

          {/* Center on User */}
          <Pressable style={styles.controlButton} onPress={centerOnUser}>
            <Text style={styles.controlButtonText}>📍</Text>
          </Pressable>

          {/* Follow User Toggle */}
          <Pressable
            style={[
              styles.controlButton,
              mapState.followUser && styles.activeControlButton,
            ]}
            onPress={toggleFollowUser}
          >
            <Text style={styles.controlButtonText}>🎯</Text>
          </Pressable>

          {/* Story Markers Toggle */}
          <Pressable
            style={[
              styles.controlButton,
              mapState.showStoryMarkers && styles.activeControlButton,
            ]}
            onPress={toggleStoryMarkers}
          >
            <Text style={styles.controlButtonText}>📖</Text>
          </Pressable>

          {/* Generate Story for Current Location */}
          {mapState.userLocation && (
            <Pressable
              style={[
                styles.controlButton,
                mapState.isLoadingStories && styles.loadingControlButton,
              ]}
              onPress={() => generateLocationStory(
                mapState.userLocation!.coords.latitude,
                mapState.userLocation!.coords.longitude
              )}
              disabled={mapState.isLoadingStories}
            >
              <Text style={styles.controlButtonText}>
                {mapState.isLoadingStories ? "⏳" : "✨"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Trail Info Panel */}
        {mapState.selectedTrail && (
          <View style={styles.trailInfoPanel}>
            <View style={styles.trailInfoHeader}>
              <View style={styles.trailInfoTitle}>
                <Text style={styles.trailName}>
                  {mapState.selectedTrail.name}
                </Text>
                <Text style={styles.trailDescription}>
                  {mapState.selectedTrail.description || "No description"}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={deselectTrail}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.trailStats}>
              <View style={styles.trailStat}>
                <Text style={styles.trailStatValue}>
                  {mapState.trackPoints.length}
                </Text>
                <Text style={styles.trailStatLabel}>Points</Text>
              </View>

              <View style={styles.trailStat}>
                <Text style={styles.trailStatValue}>
                  {mapState.selectedTrail.isPublic ? "Public" : "Private"}
                </Text>
                <Text style={styles.trailStatLabel}>Visibility</Text>
              </View>

              <View style={styles.trailStat}>
                <Text style={styles.trailStatValue}>
                  {new Date(
                    mapState.selectedTrail.createdAt
                  ).toLocaleDateString()}
                </Text>
                <Text style={styles.trailStatLabel}>Created</Text>
              </View>
            </View>
          </View>
        )}

        {/* Loading Overlay */}
        {mapState.isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={ThemeConfig.primaryColor} />
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
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  loadingText: {
    marginTop: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  errorTitle: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.errorColor,
    marginBottom: ThemeConfig.spacing.sm,
  },
  errorText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
    marginBottom: ThemeConfig.spacing.lg,
  },
  retryButton: {
    backgroundColor: ThemeConfig.primaryColor,
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.xl,
    borderRadius: 12,
  },
  retryText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
  },
  controlsContainer: {
    position: "absolute",
    top: ThemeConfig.spacing.lg,
    right: ThemeConfig.spacing.lg,
    flexDirection: "column",
  },
  controlButton: {
    width: 48,
    height: 48,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeControlButton: {
    backgroundColor: ThemeConfig.primaryColor,
  },
  loadingControlButton: {
    backgroundColor: "#f3f4f6",
    opacity: 0.7,
  },
  controlButtonText: {
    fontSize: 20,
  },
  trailInfoPanel: {
    position: "absolute",
    bottom: ThemeConfig.spacing.lg,
    left: ThemeConfig.spacing.lg,
    right: ThemeConfig.spacing.lg,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: ThemeConfig.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  trailInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ThemeConfig.spacing.md,
  },
  trailInfoTitle: {
    flex: 1,
    marginRight: ThemeConfig.spacing.md,
  },
  trailName: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.xs,
  },
  trailDescription: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: ThemeConfig.secondaryColor,
  },
  trailStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  trailStat: {
    alignItems: "center",
  },
  trailStatValue: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.primaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  trailStatLabel: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
