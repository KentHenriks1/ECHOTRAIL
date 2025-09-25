import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { createTheme } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  offlineMapService,
  OfflineMapState,
} from "../services/OfflineMapService";

interface MapViewProps {
  style?: any;
  initialLocation?: [number, number];
  trails?: any[];
  onLocationChange?: (location: [number, number]) => void;
  showOfflineIndicator?: boolean;
}

export function MapView({
  style,
  initialLocation = [10.7522, 59.9139],
  trails = [],
  onLocationChange,
  showOfflineIndicator = true,
}: MapViewProps) {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [offlineState, setOfflineState] = useState<OfflineMapState>({
    _isOfflineMode: false,
    availableRegions: [],
    downloadingRegions: new Set(),
  });

  useEffect(() => {
    const handleOfflineStateChange = (state: OfflineMapState) => {
      setOfflineState(state);
    };

    offlineMapService.addStateChangeListener(handleOfflineStateChange);
    setOfflineState(offlineMapService.getOfflineMapState());

    return () => {
      offlineMapService.removeStateChangeListener(handleOfflineStateChange);
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Kart midlertidig deaktivert</Text>
        <Text style={styles.placeholderText}>
          Vi bytter til MapLibre-backend for stabil build. Funksjonalitet for
          spor og posisjon vises her når kart er reaktivert.
        </Text>
      </View>

      {showOfflineIndicator && (
        <>
          {offlineState._isOfflineMode && (
            <View style={styles.offlineIndicator}>
              <MaterialIcons
                name="cloud-off"
                size={16}
                color={theme.colors.error}
              />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}

          {offlineState.downloadingRegions.size > 0 && (
            <View style={styles.downloadingIndicator}>
              <MaterialIcons
                name="cloud-download"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.downloadingText}>
                Laster ned {offlineState.downloadingRegions.size}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, position: "relative" },
    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    placeholderTitle: {
      fontSize: 18,
      fontFamily: theme.typography.fontFamily.medium,
      marginBottom: 8,
      color: theme.colors.foreground,
      textAlign: "center",
    },
    placeholderText: {
      fontSize: 14,
      color: theme.colors.muted,
      textAlign: "center",
    },
    offlineIndicator: {
      position: "absolute",
      top: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.error}20`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    offlineText: {
      marginLeft: theme.spacing.xs,
      color: theme.colors.error,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    downloadingIndicator: {
      position: "absolute",
      top: 50,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}20`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    downloadingText: {
      marginLeft: theme.spacing.xs,
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
