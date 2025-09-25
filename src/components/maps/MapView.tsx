import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Text,
  Platform,
} from "react-native";
import { logger } from "../../utils/logger";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { Trail, AudioGuidePoint } from "../../types/Trail";
import { Theme } from "../../ui";

// Import react-native-maps
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

// Region interface for react-native-maps compatibility
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const { width, height } = Dimensions.get("window");

interface EchoTrailMapViewProps {
  trails: Trail[];
  selectedTrail?: Trail;
  theme: Theme;
  onTrailMarkerPress?: (_trail: Trail) => void;
  onAudioPointPress?: (_audioPoint: AudioGuidePoint) => void;
  showUserLocation?: boolean;
  followUser?: boolean;
  style?: any;
}

export const EchoTrailMapView: React.FC<EchoTrailMapViewProps> = ({
  trails,
  selectedTrail,
  theme,
  onTrailMarkerPress,
  onAudioPointPress,
  showUserLocation = true,
  followUser = false,
  style,
}) => {
  const styles = createStyles(theme);
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 59.9139, // Default to Oslo
    longitude: 10.7522,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Posisjonstilgang",
          "EchoTrail trenger tilgang til din posisjon for å vise deg på kartet og finne nærliggende stier."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation(location);

      if (followUser && mapRef.current) {
        const region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
        mapRef.current.animateToRegion(region, 1000);
      }
    } catch (error) {
      logger.error("Error getting location:", error);
    }
  }, [followUser]);

  useEffect(() => {
    if (showUserLocation) {
      getCurrentLocation();
    }
  }, [showUserLocation, getCurrentLocation]);

  const focusOnTrail = useCallback((trail: Trail) => {
    if (!trail.trackPoints || trail.trackPoints.length === 0) {
      return;
    }

    const firstPoint = trail.trackPoints[0];
    const region = {
      latitude: firstPoint.coordinate.latitude,
      longitude: firstPoint.coordinate.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    setMapRegion(region);
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 1000);
    }
    logger.debug("Focusing on trail:", trail.name);
  }, []);

  useEffect(() => {
    if (selectedTrail) {
      focusOnTrail(selectedTrail);
    }
  }, [selectedTrail, focusOnTrail]);

  const getDifficultyColor = (difficulty: Trail["difficulty"]): string => {
    switch (difficulty) {
      case "easy":
        return "#22c55e";
      case "moderate":
        return "#f59e0b";
      case "hard":
        return "#ef4444";
      case "extreme":
        return "#8b5cf6";
      default:
        return theme.colors.primary;
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

  const getAudioCategoryIcon = (
    category: AudioGuidePoint["category"]
  ): keyof typeof MaterialIcons.glyphMap => {
    switch (category) {
      case "history":
        return "history";
      case "nature":
        return "nature";
      case "culture":
        return "museum";
      case "legends":
        return "auto-stories";
      case "architecture":
        return "architecture";
      case "mystery":
        return "help-outline";
      default:
        return "volume-up";
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        region={mapRegion}
        showsUserLocation={showUserLocation}
        followsUserLocation={followUser}
        showsMyLocationButton={true}
        showsCompass={true}
        onRegionChangeComplete={setMapRegion}
      >
        {/* Trail polylines */}
        {trails.map((trail) => {
          if (!trail.trackPoints || trail.trackPoints.length === 0) return null;

          const coordinates = trail.trackPoints.map((point) => ({
            latitude: point.coordinate.latitude,
            longitude: point.coordinate.longitude,
          }));

          return (
            <Polyline
              key={`trail-${trail.id}`}
              coordinates={coordinates}
              strokeColor={getDifficultyColor(trail.difficulty)}
              strokeWidth={4}
            />
          );
        })}

        {/* Trail start markers */}
        {trails.map((trail) => {
          if (!trail.trackPoints || trail.trackPoints.length === 0) return null;

          const startPoint = trail.trackPoints[0];
          return (
            <Marker
              key={`marker-${trail.id}`}
              coordinate={{
                latitude: startPoint.coordinate.latitude,
                longitude: startPoint.coordinate.longitude,
              }}
              onPress={() => onTrailMarkerPress?.(trail)}
              title={trail.name}
              description={`${trail.distance ? (trail.distance / 1000).toFixed(1) + "km" : ""} • ${trail.difficulty}`}
            >
              <View
                style={[
                  styles.trailMarker,
                  { backgroundColor: getDifficultyColor(trail.difficulty) },
                ]}
              >
                <MaterialIcons
                  name={getCategoryIcon(trail.category)}
                  size={20}
                  color="white"
                />
              </View>
            </Marker>
          );
        })}

        {/* Audio guide markers */}
        {trails.flatMap(
          (trail) =>
            trail.audioGuidePoints?.map((audioPoint, index) => (
              <Marker
                key={`audio-${trail.id}-${index}`}
                coordinate={{
                  latitude: audioPoint.coordinate.latitude,
                  longitude: audioPoint.coordinate.longitude,
                }}
                onPress={() => onAudioPointPress?.(audioPoint)}
                title={audioPoint.title}
                description={audioPoint.category}
              >
                <View
                  style={[
                    styles.audioMarker,
                    { backgroundColor: theme.colors.secondary },
                  ]}
                >
                  <MaterialIcons
                    name={getAudioCategoryIcon(audioPoint.category)}
                    size={14}
                    color="white"
                  />
                </View>
              </Marker>
            )) || []
        )}
      </MapView>
    </View>
  );
};

// Export as both names for compatibility
export { EchoTrailMapView as MapView };

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      width: "100%",
      height: "100%",
    },
    trailMarker: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
    },
    audioMarker: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "white",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
  });
