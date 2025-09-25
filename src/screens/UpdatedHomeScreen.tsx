import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Services
import { authService } from "../services/AuthService";
import { dataSyncService, SyncStatus } from "../services/DataSyncService";
import { locationService } from "../services/LocationService";
import { db } from "../config/database";

// Components
import { Card } from "../components/modern";

// Hooks
import { useTheme } from "../hooks/useTheme";

const { width } = Dimensions.get("window");

interface DashboardStats {
  totalTrails: number;
  totalDistance: number;
  totalDuration: number;
  recentTrails: any[];
  syncStatus: SyncStatus;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
}

const UpdatedHomeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrails: 0,
    totalDistance: 0,
    totalDuration: 0,
    recentTrails: [],
    syncStatus: {
      isOnline: false,
      isSyncing: false,
      pendingItems: 0,
      failedItems: 0,
      totalItems: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const user = authService.getCurrentUser();

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      // Get user statistics
      const trails = await db("trails")
        .where("user_id", user.id)
        .where("deleted_at", null);

      const totalDistance = trails.reduce(
        (sum, trail) => sum + (trail.distance || 0),
        0
      );
      const totalDuration = trails.reduce(
        (sum, trail) => sum + (trail.duration || 0),
        0
      );

      // Get recent trails (last 5)
      const recentTrails = await db("trails")
        .where("user_id", user.id)
        .where("deleted_at", null)
        .orderBy("created_at", "desc")
        .limit(5)
        .select("*");

      // Get sync status
      const syncStatus = dataSyncService.getSyncStatus();

      setStats({
        totalTrails: trails.length,
        totalDistance,
        totalDuration,
        recentTrails,
        syncStatus,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    try {
      const hasPermission = await locationService.requestPermissions();
      if (hasPermission) {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
    }
  }, []);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      getCurrentLocation(),
      dataSyncService.forceFulSync(),
    ]);
    setRefreshing(false);
  }, [loadDashboardData, getCurrentLocation]);

  // Load data on component mount and focus
  useEffect(() => {
    loadDashboardData();
    getCurrentLocation();
  }, [loadDashboardData, getCurrentLocation]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: "record",
      title: "Start Sporing",
      subtitle: "Ny rute",
      icon: "radio-button-checked",
      color: colors.primary,
      onPress: () => navigation.navigate("Recording"),
    },
    {
      id: "map",
      title: "Kart",
      subtitle: "Se området",
      icon: "map",
      color: colors.secondary || "#2196F3",
      onPress: () =>
        navigation.navigate("MapView", {
          centerLocation: currentLocation,
        }),
    },
    {
      id: "trails",
      title: "Mine Ruter",
      subtitle: `${stats.totalTrails} ruter`,
      icon: "list",
      color: colors.success || "#4CAF50",
      onPress: () => navigation.navigate("Trails"),
    },
    {
      id: "discover",
      title: "Utforsk",
      subtitle: "Finn nye ruter",
      icon: "explore",
      color: colors.warning || "#FF9800",
      onPress: () => navigation.navigate("Discover"),
    },
  ];

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}t ${minutes}min`;
    }
    return `${minutes}min`;
  };

  // Handle sync action
  const handleSync = async () => {
    if (stats.syncStatus.isSyncing) return;

    try {
      const success = await dataSyncService.forceFulSync();
      if (success) {
        Alert.alert("Synkronisering", "Data synkronisert med skyen");
      } else {
        Alert.alert("Feil", "Kunne ikke synkronisere data");
      }
    } catch (error) {
      Alert.alert("Feil", "Nettverksfeil under synkronisering");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header Section */}
      <LinearGradient
        colors={[colors.primary, colors.primary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Velkommen tilbake</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>

          <TouchableOpacity
            onPress={handleSync}
            style={[
              styles.syncButton,
              { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              stats.syncStatus.isSyncing && styles.syncingButton,
            ]}
            disabled={stats.syncStatus.isSyncing}
          >
            <Ionicons
              name={
                stats.syncStatus.isSyncing
                  ? "sync"
                  : stats.syncStatus.isOnline
                    ? "cloud-done"
                    : "cloud-offline"
              }
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalTrails}</Text>
            <Text style={styles.statLabel}>Ruter</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {formatDistance(stats.totalDistance)}
            </Text>
            <Text style={styles.statLabel}>Totalt</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {formatDuration(stats.totalDuration)}
            </Text>
            <Text style={styles.statLabel}>Tid</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Hurtighandlinger
          </Text>

          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: colors.surface },
                ]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.color },
                  ]}
                >
                  <MaterialIcons
                    name={action.icon as any}
                    size={24}
                    color="white"
                  />
                </View>
                <Text style={[styles.quickActionTitle, { color: colors.text }]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.quickActionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {action.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Trails */}
        {stats.recentTrails.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Nylige Ruter
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Trails")}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  Se alle
                </Text>
              </TouchableOpacity>
            </View>

            {stats.recentTrails.map((trail) => (
              <Card key={trail.id} style={styles.trailCard}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("TrailDetails", { trailId: trail.id })
                  }
                  style={styles.trailCardContent}
                >
                  <View style={styles.trailInfo}>
                    <Text style={[styles.trailName, { color: colors.text }]}>
                      {trail.name}
                    </Text>
                    <Text
                      style={[
                        styles.trailStats,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDistance(trail.distance || 0)} •{" "}
                      {formatDuration(trail.duration || 0)}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

        {/* Sync Status */}
        {(stats.syncStatus.pendingItems > 0 ||
          stats.syncStatus.failedItems > 0) && (
          <View style={styles.section}>
            <Card
              style={{
                ...styles.syncStatusCard,
                backgroundColor: colors.surface,
              }}
            >
              <View style={styles.syncStatusHeader}>
                <Ionicons
                  name="cloud-upload"
                  size={20}
                  color={colors.warning}
                />
                <Text style={[styles.syncStatusTitle, { color: colors.text }]}>
                  Synkroniseringsstatus
                </Text>
              </View>

              <Text
                style={[styles.syncStatusText, { color: colors.textSecondary }]}
              >
                {stats.syncStatus.pendingItems > 0 &&
                  `${stats.syncStatus.pendingItems} elementer venter på synkronisering\n`}
                {stats.syncStatus.failedItems > 0 &&
                  `${stats.syncStatus.failedItems} elementer feilet`}
              </Text>

              <TouchableOpacity
                onPress={handleSync}
                style={[
                  styles.syncActionButton,
                  { backgroundColor: colors.primary },
                ]}
                disabled={stats.syncStatus.isSyncing}
              >
                <Text style={styles.syncButtonText}>
                  {stats.syncStatus.isSyncing
                    ? "Synkroniserer..."
                    : "Synkroniser nå"}
                </Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    color: "white",
    fontWeight: "700",
    marginTop: 4,
  },
  syncButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  syncingButton: {
    opacity: 0.6,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    color: "white",
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: "600",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
  trailCard: {
    marginBottom: 12,
  },
  trailCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  trailInfo: {
    flex: 1,
  },
  trailName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  trailStats: {
    fontSize: 14,
  },
  syncStatusCard: {
    padding: 16,
  },
  syncStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  syncStatusTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  syncStatusText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  syncActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  syncButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

export default UpdatedHomeScreen;
