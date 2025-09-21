import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { logger } from "../utils/logger";
import { useTranslation } from "react-i18next";
import { createTheme } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  offlineMapService,
  OfflineRegion,
  OfflineMapState,
} from "../services/OfflineMapService";

export function OfflineMapsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [offlineState, setOfflineState] = useState<OfflineMapState>({
    _isOfflineMode: false,
    availableRegions: [],
    downloadingRegions: new Set(),
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [storageUsage, setStorageUsage] = useState({
    _totalSizeBytes: 0,
    regionSizes: {},
  });

  // Add region form state
  const [regionName, setRegionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Subscribe to offline map state changes
    const handleStateChange = (state: OfflineMapState) => {
      setOfflineState(state);
    };

    offlineMapService.addStateChangeListener(handleStateChange);

    // Load initial state
    setOfflineState(offlineMapService.getOfflineMapState());
    loadStorageUsage();

    return () => {
      offlineMapService.removeStateChangeListener(handleStateChange);
    };
  }, []);

  const loadStorageUsage = async () => {
    try {
      const usage = await offlineMapService.getStorageUsage();
      setStorageUsage({
        _totalSizeBytes: usage.totalSizeBytes,
        regionSizes: usage.regionSizes,
      });
    } catch (error) {
      logger.error("Failed to load storage usage:", error);
    }
  };

  const handleAddRegion = async () => {
    if (!regionName.trim()) {
      Alert.alert("Error", "Please enter a region name");
      return;
    }

    setIsCreating(true);

    try {
      // For demo purposes, create a region around Oslo
      // In a real app, you would let users select bounds on the map
      const osloRegion: [[number, number], [number, number]] = [
        [10.6, 59.85], // Southwest corner
        [10.9, 59.98], // Northeast corner
      ];

      const regionId = await offlineMapService.createOfflineRegion(
        regionName.trim(),
        osloRegion,
        10, // minZoom
        16 // maxZoom
      );

      // Start downloading immediately
      await offlineMapService.downloadOfflineRegion(regionId);

      Alert.alert(
        "Success",
        `Offline region "${regionName}" has been created and downloaded!`
      );

      setRegionName("");
      setShowAddModal(false);
      await loadStorageUsage();
    } catch (error) {
      logger.error("Failed to create offline region:", error);
      Alert.alert(
        "Error",
        "Failed to create offline region. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRegion = (region: OfflineRegion) => {
    Alert.alert(
      "Delete Offline Region",
      `Are you sure you want to delete "${region._name}"? This will free up ${formatBytes(region.sizeInBytes || 0)} of storage.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await offlineMapService.deleteOfflineRegion(region._id);
              await loadStorageUsage();
            } catch (error) {
              Alert.alert("Error", "Failed to delete offline region");
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Offline Data",
      `This will delete all offline maps and free up ${formatBytes(storageUsage._totalSizeBytes)} of storage. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await offlineMapService.clearAllOfflineData();
              await loadStorageUsage();
            } catch (error) {
              Alert.alert("Error", "Failed to clear offline data");
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString();
  };

  const renderRegionItem = ({ item: region }: { item: OfflineRegion }) => {
    const isDownloading = offlineState.downloadingRegions.has(region._id);
    const progressPercent = region.downloadProgress || 0;

    return (
      <View style={styles.regionItem}>
        <View style={styles.regionHeader}>
          <View style={styles.regionInfo}>
            <Text style={styles.regionName}>{region._name}</Text>
            <Text style={styles.regionDetails}>
              Zoom: {region._minZoom}-{region._maxZoom} • Created:{" "}
              {formatDate(region.createdAt)}
            </Text>
            {region.sizeInBytes && (
              <Text style={styles.regionSize}>
                Size: {formatBytes(region.sizeInBytes)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRegion(region)}
            disabled={isDownloading}
          >
            <MaterialIcons
              name="delete"
              size={24}
              color={
                isDownloading ? theme.colors.textSecondary : theme.colors.error
              }
            />
          </TouchableOpacity>
        </View>

        {isDownloading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        )}

        <View style={styles.regionStatus}>
          <View style={styles.statusIndicator}>
            <MaterialIcons
              name={
                region.isDownloaded
                  ? "cloud-done"
                  : isDownloading
                    ? "cloud-download"
                    : "cloud-off"
              }
              size={16}
              color={
                region.isDownloaded
                  ? theme.colors.success
                  : isDownloading
                    ? theme.colors.warning
                    : theme.colors.textSecondary
              }
            />
            <Text style={styles.statusText}>
              {region.isDownloaded
                ? "Available Offline"
                : isDownloading
                  ? "Downloading..."
                  : "Not Downloaded"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Offline Maps</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => offlineMapService.refreshConnectivity()}
          >
            <MaterialIcons name="refresh" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Mode Indicator */}
      {offlineState._isOfflineMode && (
        <View style={styles.offlineIndicator}>
          <MaterialIcons
            name="cloud-off"
            size={20}
            color={theme.colors.error}
          />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      {/* Storage Usage */}
      <View style={styles.storageInfo}>
        <Text style={styles.storageTitle}>Storage Usage</Text>
        <Text style={styles.storageValue}>
          {formatBytes(storageUsage._totalSizeBytes)}
        </Text>
        {storageUsage._totalSizeBytes > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAllData}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Regions List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Downloaded Regions</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialIcons
              name="add"
              size={24}
              color={theme.colors.background}
            />
          </TouchableOpacity>
        </View>

        {offlineState.availableRegions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="cloud-download"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No offline maps yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Download maps for offline use when you don't have internet
              connection
            </Text>
          </View>
        ) : (
          <FlatList
            data={offlineState.availableRegions}
            renderItem={renderRegionItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add Region Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Offline Region</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Region name (e.g., Oslo City)"
              placeholderTextColor={theme.colors.textSecondary}
              value={regionName}
              onChangeText={setRegionName}
              autoFocus
            />

            <Text style={styles.modalNote}>
              Note: This will download map data for the Oslo area. In a future
              version, you'll be able to select custom regions on the map.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleAddRegion}
                disabled={isCreating || !regionName.trim()}
              >
                {isCreating ? (
                  <ActivityIndicator
                    color={theme.colors.background}
                    size="small"
                  />
                ) : (
                  <Text style={styles.createButtonText}>Create & Download</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
    headerActions: {
      flexDirection: "row",
    },
    iconButton: {
      padding: theme.spacing.xs,
    },
    offlineIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.errorSurface,
      paddingVertical: theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    offlineText: {
      marginLeft: theme.spacing.xs,
      color: theme.colors.error,
      fontFamily: theme.typography.fontFamily.medium,
    },
    storageInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    storageTitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
    },
    storageValue: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.bold,
      flex: 1,
      textAlign: "center",
    },
    clearButton: {
      backgroundColor: theme.colors.error,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    clearButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    listContainer: {
      flex: 1,
      margin: theme.spacing.lg,
      marginTop: 0,
    },
    listHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    listTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    emptyStateText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      textAlign: "center",
    },
    emptyStateSubtext: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      textAlign: "center",
      lineHeight: 20,
    },
    regionItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    regionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    regionInfo: {
      flex: 1,
    },
    regionName: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    regionDetails: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    regionSize: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    deleteButton: {
      padding: theme.spacing.xs,
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.md,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginRight: theme.spacing.md,
    },
    progressFill: {
      height: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.medium,
      minWidth: 40,
    },
    regionStatus: {
      marginTop: theme.spacing.md,
    },
    statusIndicator: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusText: {
      marginLeft: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      margin: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      width: "90%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    modalNote: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: theme.spacing.lg,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    createButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
