import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Dimensions, Alert, Platform } from "react-native";

// Platform-specific imports - react-native-maps doesn't work on web
let MapView: any;
let Marker: any;
let Polyline: any;
let PROVIDER_GOOGLE: any;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.warn('react-native-maps not available:', error);
  }
}
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { createModernTheme } from "../../ui/modernTheme";
import { useColorScheme } from "react-native";
import Constants from "expo-constants";
import { logger } from "../../utils/logger";

const { width, height } = Dimensions.get("window");

interface Trail {
  id: string;
  name: string;
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  difficulty: "easy" | "moderate" | "hard";
  distance: number;
  description?: string;
  stories?: Array<{
    id: string;
    title: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    content: string;
  }>;
}

interface GoogleMapViewProps {
  style?: any;
  initialLocation?: [number, number]; // [longitude, latitude]
  trails?: Trail[];
  onLocationChange?: (location: [number, number]) => void;
  showUserLocation?: boolean;
  followsUserLocation?: boolean;
  showTrails?: boolean;
  onTrailPress?: (trail: Trail) => void;
  onStoryPress?: (story: any) => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  style,
  initialLocation = [10.7522, 59.9139], // Oslo default
  trails = [],
  onLocationChange,
  showUserLocation = true,
  followsUserLocation = false,
  showTrails = true,
  onTrailPress,
  onStoryPress,
}) => {
  const colorScheme = useColorScheme();
  const theme = createModernTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] =
    useState(false);
  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);

  const region = {
    latitude: initialLocation[1],
    longitude: initialLocation[0],
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(newLocation);

      if (onLocationChange) {
        onLocationChange([location.coords.longitude, location.coords.latitude]);
      }

      // Animate to user location if following
      if (followsUserLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    } catch (error) {
      logger.error("Error getting current location:", error);
    }
  }, [onLocationChange, followsUserLocation]);

  const startLocationTracking = useCallback(async () => {
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setUserLocation(newLocation);

          if (onLocationChange) {
            onLocationChange([
              location.coords.longitude,
              location.coords.latitude,
            ]);
          }

          if (followsUserLocation && mapRef.current) {
            mapRef.current.animateToRegion({
              ...newLocation,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          }
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      logger.error("Error starting location tracking:", error);
    }
  }, [onLocationChange, followsUserLocation]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        setIsLocationPermissionGranted(true);
        getCurrentLocation();

        if (followsUserLocation) {
          startLocationTracking();
        }
      } else {
        Alert.alert(
          "Lokasjon kreves",
          "EchoTrail trenger tilgang til din posisjon for å vise kart og trails.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      logger.error("Error requesting location permission:", error);
    }
  }, [followsUserLocation, getCurrentLocation, startLocationTracking]);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [requestLocationPermission, locationSubscription]);

  const getDifficultyColor = (difficulty: Trail["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return theme.colors.success;
      case "moderate":
        return theme.colors.warning;
      case "hard":
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getGoogleMapsApiKey = async (): Promise<string> => {
    try {
      const { secretsManager } = await import('../../config/secrets');
      return await secretsManager.getGoogleMapsApiKey();
    } catch (error) {
      logger.error('Failed to get Google Maps API key:', error);
      throw new Error('Google Maps API key not configured. Please set up your API key in settings.');
    }
  };

  const mapStyle =
    colorScheme === "dark"
      ? [
          {
            elementType: "geometry",
            stylers: [
              {
                color: "#242f3e",
              },
            ],
          },
          {
            elementType: "labels.text.fill",
            stylers: [
              {
                color: "#746855",
              },
            ],
          },
          {
            elementType: "labels.text.stroke",
            stylers: [
              {
                color: "#242f3e",
              },
            ],
          },
          // Add more dark mode styles...
        ]
      : undefined;

  // Web fallback component
  const WebMapFallback = () => (
    <View style={[styles.map, styles.webMapFallback]}>
      <Text style={styles.webMapText}>
        🗺️ Kart ikke tilgjengelig på web
      </Text>
      <Text style={styles.webMapSubtext}>
        Bruk appen på mobil for full kartfunksjonalitet
      </Text>
      {trails.length > 0 && (
        <View style={styles.webTrailsList}>
          <Text style={styles.webTrailsTitle}>Tilgjengelige trails:</Text>
          {trails.slice(0, 3).map((trail) => (
            <Text key={trail.id} style={styles.webTrailItem}>
              • {trail.name} ({trail.difficulty})
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'web' || !MapView ? (
        <WebMapFallback />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          customMapStyle={mapStyle}
          showsUserLocation={showUserLocation && isLocationPermissionGranted}
          followsUserLocation={false} // We handle this manually
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          maxZoomLevel={18}
          minZoomLevel={5}
        >
        {/* Render trails as polylines */}
        {showTrails &&
          trails.map((trail) => (
            <React.Fragment key={trail.id}>
              <Polyline
                coordinates={trail.coordinates}
                strokeColor={getDifficultyColor(trail.difficulty)}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />

              {/* Trail start marker */}
              <Marker
                coordinate={trail.coordinates[0]}
                onPress={() => onTrailPress?.(trail)}
              >
                <View style={styles.trailMarker}>
                  <MaterialIcons
                    name="flag"
                    size={24}
                    color={getDifficultyColor(trail.difficulty)}
                  />
                </View>
              </Marker>

              {/* Story markers along the trail */}
              {trail.stories?.map((story) => (
                <Marker
                  key={story.id}
                  coordinate={story.coordinate}
                  onPress={() => onStoryPress?.(story)}
                >
                  <View style={styles.storyMarker}>
                    <MaterialIcons
                      name="auto-stories"
                      size={20}
                      color={theme.colors.secondary}
                    />
                  </View>
                </Marker>
              ))}
            </React.Fragment>
          ))}
        </MapView>
      )}

      {/* Map controls overlay */}
      <View style={styles.controlsOverlay}>
        {!isLocationPermissionGranted && (
          <View style={styles.permissionWarning}>
            <MaterialIcons
              name="location-off"
              size={16}
              color={theme.colors.error}
            />
            <Text style={styles.warningText}>Lokasjon ikke tilgjengelig</Text>
          </View>
        )}

        {trails.length > 0 && (
          <View style={styles.trailsIndicator}>
            <MaterialIcons
              name="route"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.trailsText}>{trails.length} trails</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: "relative",
    },
    map: {
      width: "100%",
      height: "100%",
    },
    trailMarker: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 8,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    storyMarker: {
      backgroundColor: theme.colors.card,
      borderRadius: 15,
      padding: 6,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
    controlsOverlay: {
      position: "absolute",
      top: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: "column",
      alignItems: "flex-end",
    },
    permissionWarning: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.destructiveBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xs,
    },
    warningText: {
      marginLeft: theme.spacing.xs,
      color: theme.colors.error,
      fontSize: theme.typography.fontSize?.sm || theme.typography.fontSize._sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    trailsIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}20`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },
    trailsText: {
      marginLeft: theme.spacing.xs,
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize?.sm || theme.typography.fontSize._sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    // Web fallback styles
    webMapFallback: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
    },
    webMapText: {
      fontSize: theme.typography.fontSize?.lg || 18,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    webMapSubtext: {
      fontSize: theme.typography.fontSize?.sm || 14,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.secondaryText,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    webTrailsList: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minWidth: 250,
    },
    webTrailsTitle: {
      fontSize: theme.typography.fontSize?.md || 16,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    webTrailItem: {
      fontSize: theme.typography.fontSize?.sm || 14,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.secondaryText,
      marginBottom: theme.spacing.xs,
    },
  });
