import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { logger } from "../../utils/logger";
import {
  TrailMemory,
  TrailPhoto,
  VisualTrailSegment,
  TrailStatistics,
} from "../../services/EnhancedTrailRecordingService";
import {
  LocationContext,
  MovementMode,
} from "../../services/IntelligentLocationService";
import { Theme } from "../../ui";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Mock region interface for compatibility
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface PhotoBubbleProps {
  photo: TrailPhoto;
  onPress: () => void;
  theme: Theme;
  scale?: number;
}

const PhotoBubble: React.FC<PhotoBubbleProps> = ({
  photo,
  onPress,
  theme,
  scale = 1,
}) => {
  const styles = createStyles(theme);
  return (
    <TouchableOpacity
      style={[
        styles.photoBubble,
        {
          backgroundColor: theme.colors.surface,
          transform: [{ scale }],
        },
      ]}
      onPress={onPress}
    >
      <Image
        source={{ uri: photo.uri }}
        style={styles.photoBubbleImage}
        resizeMode="cover"
      />
      <View
        style={[
          styles.photoBubbleBadge,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <MaterialIcons name="camera-alt" size={12} color="white" />
      </View>
    </TouchableOpacity>
  );
};

interface TrailSegmentProps {
  segment: VisualTrailSegment;
  theme: Theme;
  isActive?: boolean;
}

const TrailSegmentOverlay: React.FC<TrailSegmentProps> = ({
  segment,
  theme,
  isActive = false,
}) => {
  const styles = createStyles(theme);
  const getMovementIcon = (mode: MovementMode) => {
    switch (mode) {
      case MovementMode.WALKING:
        return "directions-walk";
      case MovementMode.CYCLING:
        return "directions-bike";
      case MovementMode.DRIVING:
        return "directions-car";
      case MovementMode.STATIONARY:
        return "place";
      default:
        return "place";
    }
  };

  return (
    <View style={styles.segmentOverlay}>
      <View
        style={[
          styles.segmentLine,
          {
            backgroundColor: segment.color,
            opacity: isActive ? 1.0 : 0.7,
            height: isActive ? 4 : 2,
          },
        ]}
      />

      {/* Start point marker */}
      <View style={[styles.segmentMarker, { backgroundColor: segment.color }]}>
        <MaterialIcons
          name={getMovementIcon(segment.movementMode)}
          size={16}
          color="white"
        />
      </View>
    </View>
  );
};

interface StatsOverlayProps {
  statistics: TrailStatistics;
  currentLocation?: LocationContext;
  theme: Theme;
  isVisible: boolean;
  onToggle: () => void;
}

const StatsOverlay: React.FC<StatsOverlayProps> = ({
  statistics,
  currentLocation,
  theme,
  isVisible,
  onToggle,
}) => {
  const styles = createStyles(theme);
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatSpeed = (kmh: number): string => {
    return `${kmh.toFixed(1)} km/t`;
  };

  const getMovementModeColor = (mode: MovementMode): string => {
    switch (mode) {
      case MovementMode.STATIONARY:
        return "#ef4444";
      case MovementMode.WALKING:
        return "#22c55e";
      case MovementMode.CYCLING:
        return "#3b82f6";
      case MovementMode.DRIVING:
        return "#f59e0b";
      default:
        return theme.colors.primary;
    }
  };

  const getMovementModeIcon = (mode: MovementMode) => {
    switch (mode) {
      case MovementMode.STATIONARY:
        return "place";
      case MovementMode.WALKING:
        return "directions-walk";
      case MovementMode.CYCLING:
        return "directions-bike";
      case MovementMode.DRIVING:
        return "directions-car";
      default:
        return "place";
    }
  };

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={[
          styles.statsToggleButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={onToggle}
      >
        <MaterialIcons name="timeline" size={20} color="white" />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.statsOverlay, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.statsHeader}>
        <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
          Live Statistikk
        </Text>
        <TouchableOpacity onPress={onToggle}>
          <MaterialIcons
            name="close"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.statsContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        <View style={styles.statsSection}>
          <View style={styles.currentStatusCard}>
            <View
              style={[
                styles.movementModeIndicator,
                {
                  backgroundColor: getMovementModeColor(
                    statistics.currentMovementMode
                  ),
                },
              ]}
            >
              <MaterialIcons
                name={getMovementModeIcon(statistics.currentMovementMode)}
                size={24}
                color="white"
              />
            </View>
            <View style={styles.currentStatusText}>
              <Text style={[styles.currentMode, { color: theme.colors.text }]}>
                {statistics.currentMovementMode.toLowerCase()}
              </Text>
              <Text
                style={[
                  styles.currentSpeed,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {formatSpeed(statistics.currentSpeed)}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Statistics */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialIcons
                name="straighten"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Distanse
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatDistance(statistics.totalDistance)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <MaterialIcons
                name="timer"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Tid
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatTime(statistics.totalDuration)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <MaterialIcons
                name="speed"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Snitt
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatSpeed(statistics.averageSpeed)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <MaterialIcons
                name="trending-up"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Maks
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatSpeed(statistics.maxSpeed)}
              </Text>
            </View>
          </View>
        </View>

        {/* Elevation */}
        {(statistics.elevationGain > 0 || statistics.elevationLoss > 0) && (
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Høydemeter
            </Text>
            <View style={styles.elevationStats}>
              <View style={styles.elevationItem}>
                <MaterialIcons
                  name="keyboard-arrow-up"
                  size={16}
                  color="#22c55e"
                />
                <Text
                  style={[
                    styles.elevationLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Stigning
                </Text>
                <Text
                  style={[styles.elevationValue, { color: theme.colors.text }]}
                >
                  {Math.round(statistics.elevationGain)}m
                </Text>
              </View>
              <View style={styles.elevationItem}>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={16}
                  color="#ef4444"
                />
                <Text
                  style={[
                    styles.elevationLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Nedgang
                </Text>
                <Text
                  style={[styles.elevationValue, { color: theme.colors.text }]}
                >
                  {Math.round(statistics.elevationLoss)}m
                </Text>
              </View>
            </View>
            {statistics.currentElevation && (
              <Text
                style={[
                  styles.currentElevation,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Nåværende: {Math.round(statistics.currentElevation)}m
              </Text>
            )}
          </View>
        )}

        {/* Movement Breakdown */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Aktivitet
          </Text>
          <View style={styles.movementBreakdown}>
            {statistics.walkingTime > 0 && (
              <View style={styles.movementItem}>
                <View
                  style={[styles.movementDot, { backgroundColor: "#22c55e" }]}
                />
                <Text
                  style={[
                    styles.movementLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Gåing
                </Text>
                <Text
                  style={[styles.movementTime, { color: theme.colors.text }]}
                >
                  {formatTime(statistics.walkingTime)}
                </Text>
              </View>
            )}
            {statistics.cyclingTime > 0 && (
              <View style={styles.movementItem}>
                <View
                  style={[styles.movementDot, { backgroundColor: "#3b82f6" }]}
                />
                <Text
                  style={[
                    styles.movementLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Sykling
                </Text>
                <Text
                  style={[styles.movementTime, { color: theme.colors.text }]}
                >
                  {formatTime(statistics.cyclingTime)}
                </Text>
              </View>
            )}
            {statistics.drivingTime > 0 && (
              <View style={styles.movementItem}>
                <View
                  style={[styles.movementDot, { backgroundColor: "#f59e0b" }]}
                />
                <Text
                  style={[
                    styles.movementLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Kjøring
                </Text>
                <Text
                  style={[styles.movementTime, { color: theme.colors.text }]}
                >
                  {formatTime(statistics.drivingTime)}
                </Text>
              </View>
            )}
            {statistics.stationaryTime > 0 && (
              <View style={styles.movementItem}>
                <View
                  style={[styles.movementDot, { backgroundColor: "#ef4444" }]}
                />
                <Text
                  style={[
                    styles.movementLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Pause
                </Text>
                <Text
                  style={[styles.movementTime, { color: theme.colors.text }]}
                >
                  {formatTime(statistics.stationaryTime)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Photos */}
        {statistics.photoCount > 0 && (
          <View style={styles.statsSection}>
            <View style={styles.photoStats}>
              <MaterialIcons
                name="camera-alt"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.photoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Bilder tatt
              </Text>
              <Text style={[styles.photoCount, { color: theme.colors.text }]}>
                {statistics.photoCount}
              </Text>
            </View>
          </View>
        )}

        {/* GPS Info */}
        {currentLocation && (
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              GPS Info
            </Text>
            <View style={styles.gpsInfo}>
              <Text
                style={[styles.gpsLabel, { color: theme.colors.textSecondary }]}
              >
                Nøyaktighet: {Math.round(currentLocation.accuracy)}m
              </Text>
              <Text
                style={[
                  styles.gpsCoords,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {currentLocation.currentLocation.coords.latitude.toFixed(6)},{" "}
                {currentLocation.currentLocation.coords.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

interface EnhancedInteractiveMapViewProps {
  trailMemories: TrailMemory[];
  activeMemory?: TrailMemory;
  currentLocation?: LocationContext;
  statistics?: TrailStatistics;
  theme: Theme;
  showUserLocation?: boolean;
  showTrails?: boolean;
  showPhotos?: boolean;
  showStatistics?: boolean;
  onPhotoPress?: (photo: TrailPhoto) => void;
  onMemoryPress?: (memory: TrailMemory) => void;
  onLocationPress?: (latitude: number, longitude: number) => void;
  style?: any;
}

export const EnhancedInteractiveMapView: React.FC<
  EnhancedInteractiveMapViewProps
> = ({
  trailMemories,
  activeMemory,
  currentLocation,
  statistics,
  theme,
  showUserLocation = true,
  showTrails = true,
  showPhotos = true,
  showStatistics = false,
  onPhotoPress,
  onMemoryPress,
  onLocationPress,
  style,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<TrailPhoto | null>(null);
  const [showStats, setShowStats] = useState(showStatistics);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 59.9139, // Oslo default
    longitude: 10.7522,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const styles = createStyles(theme);

  // Calculate map bounds from all memories and current location
  const mapBounds = useMemo(() => {
    let allPoints: { latitude: number; longitude: number }[] = [];

    // Add points from all trail memories
    trailMemories.forEach((memory) => {
      memory.segments.forEach((segment) => {
        allPoints = allPoints.concat(
          segment.points.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          }))
        );
      });
    });

    // Add current location
    if (currentLocation) {
      allPoints.push({
        latitude: currentLocation.currentLocation.coords.latitude,
        longitude: currentLocation.currentLocation.coords.longitude,
      });
    }

    if (allPoints.length === 0) {
      return null;
    }

    const latitudes = allPoints.map((p) => p.latitude);
    const longitudes = allPoints.map((p) => p.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latDelta = Math.max(maxLat - minLat, 0.01) * 1.2; // Add 20% padding
    const lngDelta = Math.max(maxLng - minLng, 0.01) * 1.2;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [trailMemories, currentLocation]);

  // Update map region when bounds change
  useEffect(() => {
    if (mapBounds) {
      setMapRegion(mapBounds);
    }
  }, [mapBounds]);

  const handlePhotoPress = (photo: TrailPhoto) => {
    setSelectedPhoto(photo);
    onPhotoPress?.(photo);
  };

  const handleMemoryPress = (memory: TrailMemory) => {
    // Focus on the memory bounds
    setMapRegion({
      latitude: memory.centerPoint.latitude,
      longitude: memory.centerPoint.longitude,
      latitudeDelta:
        Math.max(memory.bounds.north - memory.bounds.south, 0.005) * 1.2,
      longitudeDelta:
        Math.max(memory.bounds.east - memory.bounds.west, 0.005) * 1.2,
    });

    onMemoryPress?.(memory);
  };

  const renderPhoto = (photo: TrailPhoto) => (
    <PhotoBubble
      key={photo.id}
      photo={photo}
      onPress={() => handlePhotoPress(photo)}
      theme={theme}
      scale={selectedPhoto?.id === photo.id ? 1.2 : 1}
    />
  );

  const renderTrailSegment = (
    segment: VisualTrailSegment,
    memoryId: string
  ) => (
    <TrailSegmentOverlay
      key={`${memoryId}_${segment.id}`}
      segment={segment}
      theme={theme}
      isActive={activeMemory?.id === memoryId}
    />
  );

  return (
    <View style={[styles.container, style]}>
      {/* Mock Map Background */}
      <View style={[styles.map, styles.mockMap]}>
        <View style={styles.mockMapContent}>
          <MaterialIcons
            name="map"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.mockMapText, { color: theme.colors.textSecondary }]}
          >
            Interaktivt Kart
          </Text>
          <Text
            style={[
              styles.mockMapSubtext,
              { color: theme.colors.textSecondary },
            ]}
          >
            {trailMemories.length} tur{trailMemories.length !== 1 ? "er" : ""}
          </Text>

          {/* Trail Memory List */}
          <ScrollView
            style={styles.memoriesList}
            showsVerticalScrollIndicator={false}
          >
            {trailMemories.map((memory) => (
              <TouchableOpacity
                key={memory.id}
                style={[
                  styles.memoryItem,
                  {
                    backgroundColor:
                      activeMemory?.id === memory.id
                        ? theme.colors.primary + "20"
                        : theme.colors.surface,
                    borderLeftColor:
                      activeMemory?.id === memory.id
                        ? theme.colors.primary
                        : theme.colors.border,
                  },
                ]}
                onPress={() => handleMemoryPress(memory)}
              >
                <View style={styles.memoryHeader}>
                  <Text
                    style={[styles.memoryName, { color: theme.colors.text }]}
                  >
                    {memory.name}
                  </Text>
                  <Text
                    style={[
                      styles.memoryDate,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {memory.startTime.toLocaleDateString("no-NO")}
                  </Text>
                </View>

                <View style={styles.memoryStats}>
                  <View style={styles.memoryStat}>
                    <MaterialIcons
                      name="straighten"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.memoryStatText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {(memory.totalDistance / 1000).toFixed(2)}km
                    </Text>
                  </View>

                  <View style={styles.memoryStat}>
                    <MaterialIcons
                      name="timer"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.memoryStatText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {Math.floor(memory.totalDuration / 60)}min
                    </Text>
                  </View>

                  {memory.photos.length > 0 && (
                    <View style={styles.memoryStat}>
                      <MaterialIcons
                        name="camera-alt"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.memoryStatText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {memory.photos.length}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Movement Mode Indicators */}
                <View style={styles.movementModes}>
                  {memory.walkingTime > 0 && (
                    <View
                      style={[
                        styles.movementIndicator,
                        { backgroundColor: "#22c55e" },
                      ]}
                    >
                      <MaterialIcons
                        name="directions-walk"
                        size={12}
                        color="white"
                      />
                    </View>
                  )}
                  {memory.cyclingTime > 0 && (
                    <View
                      style={[
                        styles.movementIndicator,
                        { backgroundColor: "#3b82f6" },
                      ]}
                    >
                      <MaterialIcons
                        name="directions-bike"
                        size={12}
                        color="white"
                      />
                    </View>
                  )}
                  {memory.drivingTime > 0 && (
                    <View
                      style={[
                        styles.movementIndicator,
                        { backgroundColor: "#f59e0b" },
                      ]}
                    >
                      <MaterialIcons
                        name="directions-car"
                        size={12}
                        color="white"
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Current Location Indicator */}
      {showUserLocation && currentLocation && (
        <View style={styles.userLocationIndicator}>
          <View
            style={[
              styles.locationDot,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <Text
            style={[styles.locationText, { color: theme.colors.textSecondary }]}
          >
            Du er her
          </Text>
        </View>
      )}

      {/* Statistics Overlay */}
      {statistics && (
        <StatsOverlay
          statistics={statistics}
          currentLocation={currentLocation}
          theme={theme}
          isVisible={showStats}
          onToggle={() => setShowStats(!showStats)}
        />
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <Modal
          visible={!!selectedPhoto}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.photoModal}>
            <TouchableOpacity
              style={styles.photoModalBackdrop}
              onPress={() => setSelectedPhoto(null)}
            />
            <View
              style={[
                styles.photoModalContent,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.photoModalInfo}>
                <Text
                  style={[styles.photoModalDate, { color: theme.colors.text }]}
                >
                  {selectedPhoto.timestamp.toLocaleString("no-NO")}
                </Text>
                {selectedPhoto.description && (
                  <Text
                    style={[
                      styles.photoModalDescription,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {selectedPhoto.description}
                  </Text>
                )}
                <View style={styles.photoModalActions}>
                  <TouchableOpacity
                    style={[
                      styles.photoModalButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setSelectedPhoto(null)}
                  >
                    <Text style={styles.photoModalButtonText}>Lukk</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    mockMap: {
      backgroundColor: theme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    mockMapContent: {
      alignItems: "center",
      padding: 20,
      width: "100%",
    },
    mockMapText: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 16,
    },
    mockMapSubtext: {
      fontSize: 14,
      marginTop: 8,
      marginBottom: 20,
    },
    memoriesList: {
      width: "100%",
      maxHeight: screenHeight * 0.5,
    },
    memoryItem: {
      padding: 16,
      marginVertical: 4,
      borderRadius: 8,
      borderLeftWidth: 4,
    },
    memoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    memoryName: {
      fontSize: 16,
      fontWeight: "600",
    },
    memoryDate: {
      fontSize: 12,
    },
    memoryStats: {
      flexDirection: "row",
      justifyContent: "flex-start",
      marginBottom: 8,
    },
    memoryStat: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 16,
    },
    memoryStatText: {
      fontSize: 12,
      marginLeft: 4,
    },
    movementModes: {
      flexDirection: "row",
    },
    movementIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
    },
    photoBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    photoBubbleImage: {
      width: "100%",
      height: "100%",
    },
    photoBubbleBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    segmentOverlay: {
      position: "relative",
    },
    segmentLine: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
    },
    segmentMarker: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "white",
    },
    userLocationIndicator: {
      position: "absolute",
      top: 60,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.7)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    locationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    locationText: {
      fontSize: 12,
      color: "white",
    },
    statsToggleButton: {
      position: "absolute",
      bottom: 20,
      right: 20,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.27,
      shadowRadius: 4.65,
    },
    statsOverlay: {
      position: "absolute",
      bottom: 20,
      right: 20,
      left: 20,
      maxHeight: screenHeight * 0.6,
      borderRadius: 12,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5.84,
    },
    statsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#e5e5e5",
    },
    statsTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    statsContent: {
      padding: 16,
    },
    statsSection: {
      marginBottom: 20,
    },
    currentStatusCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f8f9fa",
      borderRadius: 8,
      padding: 12,
    },
    movementModeIndicator: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    currentStatusText: {
      flex: 1,
    },
    currentMode: {
      fontSize: 18,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    currentSpeed: {
      fontSize: 14,
      marginTop: 2,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statItem: {
      alignItems: "center",
      width: "48%",
      backgroundColor: "#f8f9fa",
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "600",
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    elevationStats: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    elevationItem: {
      alignItems: "center",
      flex: 1,
    },
    elevationLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    elevationValue: {
      fontSize: 14,
      fontWeight: "600",
      marginTop: 2,
    },
    currentElevation: {
      textAlign: "center",
      fontSize: 12,
      marginTop: 8,
    },
    movementBreakdown: {
      // No specific styling needed
    },
    movementItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    movementDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 12,
    },
    movementLabel: {
      flex: 1,
      fontSize: 14,
    },
    movementTime: {
      fontSize: 14,
      fontWeight: "500",
    },
    photoStats: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8f9fa",
      borderRadius: 8,
      padding: 12,
    },
    photoLabel: {
      fontSize: 14,
      marginLeft: 8,
      marginRight: 8,
    },
    photoCount: {
      fontSize: 16,
      fontWeight: "600",
    },
    gpsInfo: {
      backgroundColor: "#f8f9fa",
      borderRadius: 8,
      padding: 12,
    },
    gpsLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    gpsCoords: {
      fontSize: 10,
      fontFamily: "monospace",
    },
    photoModal: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    photoModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.8)",
    },
    photoModalContent: {
      width: screenWidth * 0.9,
      maxHeight: screenHeight * 0.8,
      borderRadius: 12,
      overflow: "hidden",
    },
    modalImage: {
      width: "100%",
      height: screenWidth * 0.9 * 0.6,
    },
    photoModalInfo: {
      padding: 16,
    },
    photoModalDate: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    photoModalDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    photoModalActions: {
      alignItems: "center",
    },
    photoModalButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 6,
    },
    photoModalButtonText: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
    },
  });

export default EnhancedInteractiveMapView;
