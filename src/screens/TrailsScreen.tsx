import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { logger } from "../utils/logger";
import { useTranslation } from "react-i18next";
import { createTheme } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Trail } from "../types/Trail";
import {
  enhancedTrailService,
  LocalTrail,
} from "../services/EnhancedTrailService";

export function TrailsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);
  const [trails, setTrails] = useState<(LocalTrail | Trail)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrails();
  }, []);

  const loadTrails = async () => {
    try {
      setLoading(true);
      const allTrails = await enhancedTrailService.getAllTrails();
      setTrails(allTrails);
    } catch (error) {
      logger.error("Error loading trails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrail = (trailId: string) => {
    Alert.alert(
      "Delete Trail",
      "Are you sure you want to delete this trail? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await enhancedTrailService.deleteTrail(trailId);
              await loadTrails();
            } catch (error) {
              Alert.alert("Error", "Failed to delete trail. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateInput: string | number | Date): string => {
    return new Date(dateInput).toLocaleDateString();
  };

  const getTrailDate = (trail: LocalTrail | Trail): string | number | Date => {
    if ("createdAt" in trail) {
      return trail.createdAt; // Trail
    }
    return trail.startTime; // LocalTrail
  };

  const getTrailMetadata = (trail: LocalTrail | Trail) => {
    if ("estimatedDuration" in trail) {
      // Trail type - convert to metadata format
      return {
        distance: trail.distance,
        duration: trail.estimatedDuration * 60, // Convert minutes to seconds
        elevationGain: trail.elevationGain,
      };
    }
    // LocalTrail - convert to metadata format
    const localTrail = trail as LocalTrail;
    return {
      distance: localTrail.distance,
      duration: Math.floor(localTrail.duration / 1000), // Convert ms to seconds
      elevationGain: localTrail.elevationGain,
    };
  };

  const renderTrailItem = ({ item }: { item: LocalTrail | Trail }) => (
    <View style={styles.trailItem}>
      <View style={styles.trailHeader}>
        <Text style={styles.trailName}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteTrail(item.id)}
          style={styles.deleteButton}
        >
          <MaterialIcons name="delete" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <Text style={styles.trailDate}>{formatDate(getTrailDate(item))}</Text>

      <View style={styles.trailStats}>
        <View style={styles.statItem}>
          <MaterialIcons
            name="straighten"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.statText}>
            {formatDistance(getTrailMetadata(item).distance || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons
            name="access-time"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.statText}>
            {formatDuration(getTrailMetadata(item).duration || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons
            name="terrain"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.statText}>
            {Math.round(getTrailMetadata(item).elevationGain || 0)}m ↗
          </Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.trailDescription}>{item.description}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading trails...</Text>
      </View>
    );
  }

  if (trails.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons
          name="terrain"
          size={64}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.emptyTitle}>No Trails Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start recording your first trail using the Map screen!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("screens.trails.title")}</Text>
        <Text style={styles.subtitle}>{trails.length} trails recorded</Text>
      </View>

      <FlatList
        data={trails}
        keyExtractor={(item) => item.id}
        renderItem={renderTrailItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    listContainer: {
      padding: theme.spacing.lg,
      paddingTop: 0,
    },
    trailItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    trailHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    trailName: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      flex: 1,
    },
    deleteButton: {
      padding: theme.spacing.xs,
    },
    trailDate: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    trailStats: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    statText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginLeft: theme.spacing.xs,
    },
    trailDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      lineHeight: 18,
    },
  });

export default TrailsScreen;
