import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { createTheme } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MapView } from "../components/MapView";
import { MaterialIcons } from "@expo/vector-icons";
import { locationService, LocationPoint } from "../services/LocationService";
import {
  enhancedTrailService,
  TrailRecordingState,
} from "../services/EnhancedTrailService";

export function MapScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [isRecording, setIsRecording] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<
    [number, number] | null
  >(null);
  const [recordingState, setRecordingState] =
    useState<TrailRecordingState | null>(null);
  const [trails, setTrails] = useState<any[]>([]);

  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      // Load any existing recording session
      await enhancedTrailService.loadActiveSession();

      // Set up trail service state change listener
      enhancedTrailService.setOnStateChange((state) => {
        setRecordingState(state);
        setIsRecording(state._isRecording);
      });

      // Get current recording state
      const currentState = enhancedTrailService.getRecordingState();
      setRecordingState(currentState);
      setIsRecording(currentState._isRecording);

      // Load trails for map display
      const allTrails = await enhancedTrailService.getAllTrails();
      setTrails(allTrails);
    };

    initServices();

    return () => {
      // Cleanup location tracking when component unmounts
      locationService.stopTracking();
    };
  }, []);

  const handleLocationChange = (location: [number, number]) => {
    setCurrentLocation(location);
  };

  const handleLocationUpdate = (point: LocationPoint) => {
    setCurrentLocation([point.longitude, point.latitude]);

    // Add point to trail if recording
    if (recordingState?._isRecording) {
      enhancedTrailService.addLocationPoint(point);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      try {
        const savedTrail = await enhancedTrailService.stopRecording();
        await locationService.stopTracking();

        if (savedTrail) {
          Alert.alert(
            "Trail Saved",
            `Trail "${savedTrail.name}" has been saved successfully!`,
            [{ text: "OK" }]
          );

          // Refresh trails list
          const allTrails = await enhancedTrailService.getAllTrails();
          setTrails(allTrails);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to save trail. Please try again.");
      }
    } else {
      // Start recording
      try {
        const hasPermission = await locationService.requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            "Permission Required",
            "Location permission is required to record trails.",
            [{ text: "OK" }]
          );
          return;
        }

        const recordingStarted = await enhancedTrailService.startRecording();
        if (recordingStarted) {
          await locationService.startTracking(handleLocationUpdate);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to start recording. Please try again.");
      }
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        onLocationChange={handleLocationChange}
        trails={[]}
      />

      <View style={styles.overlay}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            {currentLocation
              ? `${currentLocation[1].toFixed(6)}, ${currentLocation[0].toFixed(6)}`
              : "Locating..."}
          </Text>
        </View>

        {recordingState?._isRecording && (
          <View style={styles.recordingStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Distance:</Text>
              <Text style={styles.statValue}>
                {formatDistance(recordingState.distance)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Duration:</Text>
              <Text style={styles.statValue}>
                {formatDuration(recordingState._duration)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Points:</Text>
              <Text style={styles.statValue}>
                {recordingState.points.length}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
          onPress={toggleRecording}
        >
          <MaterialIcons
            name={isRecording ? "stop" : "play-arrow"}
            size={32}
            color={theme.colors.background}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    map: {
      flex: 1,
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "box-none",
    },
    locationInfo: {
      position: "absolute",
      top: 50,
      left: 16,
      right: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    locationText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.mono,
      color: theme.colors.text,
      textAlign: "center",
    },
    recordButton: {
      position: "absolute",
      bottom: 100,
      alignSelf: "center",
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    },
    recordButtonActive: {
      backgroundColor: theme.colors.error,
    },
    recordingStats: {
      position: "absolute",
      top: 110,
      left: 16,
      right: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
    },
    statValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });

export default MapScreen;
