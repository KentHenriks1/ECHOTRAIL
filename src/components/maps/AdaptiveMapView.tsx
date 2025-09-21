import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { logger } from "../../utils/logger";
import { View, Text, StyleSheet, Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import MapLibreView, {
  MapLibreViewProps,
  MapLibreViewRef,
  MapCoordinate,
  MapRegion,
} from "./MapLibreView";
import OfflineMapManager from "../../services/OfflineMapManager";
import { useTheme } from "../../context/ThemeContext";

// Fallback to react-native-maps if needed
let MapView: any;
let Marker: any;
let Polyline: any;

try {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  Polyline = RNMaps.Polyline;
} catch (error) {
  logger.warn("react-native-maps not available, using MapLibre only");
}

export interface AdaptiveMapViewProps
  extends Omit<MapLibreViewProps, "offlineEnabled" | "offlineTileSource"> {
  preferOffline?: boolean;
  fallbackToRNMaps?: boolean;
  onMapTypeChange?: (mapType: "maplibre" | "react-native-maps") => void;
}

export interface AdaptiveMapViewRef extends MapLibreViewRef {
  getCurrentMapType: () => "maplibre" | "react-native-maps";
  switchToOfflineMode: () => Promise<void>;
  switchToOnlineMode: () => void;
}

const AdaptiveMapView = forwardRef<AdaptiveMapViewRef, AdaptiveMapViewProps>(
  (
    {
      preferOffline = false,
      fallbackToRNMaps = true,
      onMapTypeChange,
      region,
      markers = [],
      polylines = [],
      mapType = "standard",
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();
    const mapLibreRef = useRef<MapLibreViewRef>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [useMapLibre, setUseMapLibre] = useState(true);
    const [offlineTileSource, setOfflineTileSource] = useState<
      string | undefined
    >();
    const [currentMapType, setCurrentMapType] = useState<
      "maplibre" | "react-native-maps"
    >("maplibre");

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration?: number) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.animateToRegion(region, duration);
        }
        // TODO: Add react-native-maps implementation
      },
      animateToCoordinate: (coordinate: MapCoordinate, duration?: number) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.animateToCoordinate(coordinate, duration);
        }
        // TODO: Add react-native-maps implementation
      },
      fitToCoordinates: (coordinates: MapCoordinate[], animated?: boolean) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.fitToCoordinates(coordinates, animated);
        }
        // TODO: Add react-native-maps implementation
      },
      addMarker: (marker) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.addMarker(marker);
        }
        // TODO: Add react-native-maps implementation
      },
      removeMarker: (markerId) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.removeMarker(markerId);
        }
        // TODO: Add react-native-maps implementation
      },
      addPolyline: (polyline) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.addPolyline(polyline);
        }
        // TODO: Add react-native-maps implementation
      },
      removePolyline: (polylineId) => {
        if (useMapLibre && mapLibreRef.current) {
          mapLibreRef.current.removePolyline(polylineId);
        }
        // TODO: Add react-native-maps implementation
      },
      getCurrentMapType: () => currentMapType,
      switchToOfflineMode: async () => {
        await setupOfflineMode();
      },
      switchToOnlineMode: () => {
        setOfflineTileSource(undefined);
        setUseMapLibre(true);
        setCurrentMapType("maplibre");
        onMapTypeChange?.("maplibre");
      },
    }));

    useEffect(() => {
      initializeMap();
      const unsubscribe = setupNetworkListener();

      // Cleanup function
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (preferOffline) {
        setupOfflineMode();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferOffline, region]);

    const initializeMap = async () => {
      try {
        await OfflineMapManager.initialize();

        // Check if we should start in offline mode
        if (preferOffline && region) {
          const isAvailable = await OfflineMapManager.isRegionAvailableOffline(
            region,
            mapType
          );
          if (isAvailable) {
            await setupOfflineMode();
            return;
          }
        }

        // Default to MapLibre online mode
        setUseMapLibre(true);
        setCurrentMapType("maplibre");
        onMapTypeChange?.("maplibre");
      } catch (error) {
        logger.warn("Failed to initialize map:", error);

        // Fallback to react-native-maps if available
        if (fallbackToRNMaps && MapView) {
          setUseMapLibre(false);
          setCurrentMapType("react-native-maps");
          onMapTypeChange?.("react-native-maps");
        }
      }
    };

    const setupNetworkListener = () => {
      const unsubscribe = NetInfo.addEventListener((state) => {
        const wasOffline = isOffline;
        setIsOffline(!state.isConnected);

        // Automatically switch to offline mode if network is lost
        if (!wasOffline && !state.isConnected && region) {
          setupOfflineMode();
        }

        // Switch back to online mode when network is restored (optional)
        if (wasOffline && state.isConnected && !preferOffline) {
          setOfflineTileSource(undefined);
        }
      });

      return unsubscribe;
    };

    const setupOfflineMode = async () => {
      if (!region) return;

      try {
        const isAvailable = await OfflineMapManager.isRegionAvailableOffline(
          region,
          mapType
        );

        if (isAvailable) {
          // Find a downloaded region that contains the current region
          const downloadedRegions =
            await OfflineMapManager.getDownloadedRegions();
          const matchingRegion = downloadedRegions.find((offlineRegion) => {
            return (
              region.latitude >= offlineRegion.bounds.south &&
              region.latitude <= offlineRegion.bounds.north &&
              region.longitude >= offlineRegion.bounds.west &&
              region.longitude <= offlineRegion.bounds.east
            );
          });

          if (matchingRegion) {
            // Generate offline style for this region
            const styles = OfflineMapManager.getAvailableStyles();
            const matchingStyle = styles.find((s) =>
              matchingRegion.styleUrl.includes(s.id)
            );

            if (matchingStyle) {
              const offlineStylePath =
                await OfflineMapManager.generateOfflineStyle(
                  matchingRegion._id,
                  matchingStyle
                );
              setOfflineTileSource(`file://${offlineStylePath}`);
              setUseMapLibre(true);
              setCurrentMapType("maplibre");
              onMapTypeChange?.("maplibre");
              return;
            }
          }
        }

        // No offline maps available - try to suggest download
        if (isOffline) {
          Alert.alert(
            "Offline modus",
            "Ingen offline kart tilgjengelig for dette området. Last ned kart for å bruke appen uten internett.",
            [{ text: "OK", style: "default" }]
          );
        }

        // Fallback to online MapLibre or react-native-maps
        setOfflineTileSource(undefined);
        if (isOffline && fallbackToRNMaps && MapView) {
          setUseMapLibre(false);
          setCurrentMapType("react-native-maps");
          onMapTypeChange?.("react-native-maps");
        } else {
          setUseMapLibre(true);
          setCurrentMapType("maplibre");
          onMapTypeChange?.("maplibre");
        }
      } catch (error) {
        logger.warn("Failed to setup offline mode:", error);
      }
    };

    // Convert MapLibre coordinates to react-native-maps format
    const convertCoordinates = (coords: MapCoordinate[]) => {
      return coords.map((coord) => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
      }));
    };

    // Render MapLibre
    if (useMapLibre) {
      return (
        <MapLibreView
          ref={mapLibreRef}
          region={region}
          markers={markers}
          polylines={polylines}
          mapType={mapType}
          offlineEnabled={!!offlineTileSource}
          offlineTileSource={offlineTileSource}
          style={styles.map}
          {...props}
        />
      );
    }

    // Render react-native-maps fallback
    if (MapView) {
      return (
        <View style={styles.container}>
          <MapView
            style={styles.map}
            region={region}
            mapType={mapType === "satellite" ? "satellite" : "standard"}
            showsUserLocation={props.showUserLocation}
            followsUserLocation={props.followUserLocation}
            onRegionChangeComplete={props.onRegionChange}
            {...props}
          >
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                coordinate={{
                  latitude: marker.coordinate.latitude,
                  longitude: marker.coordinate.longitude,
                }}
                title={marker.title}
                description={marker.description}
                pinColor={marker.color}
                onPress={() => props.onMarkerPress?.(marker.id)}
              />
            ))}

            {polylines.map((polyline) => (
              <Polyline
                key={polyline.id}
                coordinates={convertCoordinates(polyline.coordinates)}
                strokeColor={polyline.strokeColor || colors.primary}
                strokeWidth={polyline.strokeWidth || 3}
              />
            ))}
          </MapView>
        </View>
      );
    }

    // No map available - show error
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.errorText, { color: colors.text }]}>
          Kart ikke tilgjengelig
        </Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

AdaptiveMapView.displayName = "AdaptiveMapView";

export default AdaptiveMapView;
