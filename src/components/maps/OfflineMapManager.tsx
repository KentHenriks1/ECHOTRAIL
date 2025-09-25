import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  ProgressBarAndroid,
  Platform,
} from "react-native";
import { logger } from "../../utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import OfflineMapManager, {
  OfflineMapRegion,
  OfflineMapStyle,
  DownloadProgress,
} from "../../services/OfflineMapManager";
import { useTheme } from "../../context/ThemeContext";
import { MapRegion } from "./MapLibreView";

interface OfflineMapManagerProps {
  visible: boolean;
  onClose: () => void;
  currentRegion?: MapRegion;
}

interface NewRegionModalProps {
  visible: boolean;
  onClose: () => void;
  onDownload: (
    _name: string,
    bounds: OfflineMapRegion["bounds"],
    _minZoom: number,
    _maxZoom: number,
    _styleId: string
  ) => void;
  currentRegion?: MapRegion;
  availableStyles: OfflineMapStyle[];
}

const Progress: React.FC<{ value: number; style?: any }> = ({
  value,
  style,
}) => {
  // Note: ProgressViewIOS not available in current Expo version
  // Using a simple View with colored background as fallback
  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          {
            height: 4,
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: 2,
            overflow: "hidden",
          },
          style,
        ]}
      >
        <View
          style={[
            { height: "100%", backgroundColor: "#2563EB", borderRadius: 2 },
            { width: `${value * 100}%` },
          ]}
        />
      </View>
    );
  }
  return (
    <ProgressBarAndroid
      styleAttr="Horizontal"
      progress={value}
      indeterminate={false}
      style={style}
    />
  );
};

const NewRegionModal: React.FC<NewRegionModalProps> = ({
  visible,
  onClose,
  onDownload,
  currentRegion,
  availableStyles,
}) => {
  const { colors } = useTheme();
  const [regionName, setRegionName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("outdoor");
  const [minZoom, setMinZoom] = useState(10);
  const [maxZoom, setMaxZoom] = useState(16);
  const [estimatedSize, setEstimatedSize] = useState<{
    tileCount: number;
    estimatedSize: number;
  } | null>(null);

  useEffect(() => {
    if (currentRegion && visible) {
      // Calculate estimated download size
      const bounds = {
        north: currentRegion.latitude + currentRegion.latitudeDelta / 2,
        south: currentRegion.latitude - currentRegion.latitudeDelta / 2,
        east: currentRegion.longitude + currentRegion.longitudeDelta / 2,
        west: currentRegion.longitude - currentRegion.longitudeDelta / 2,
      };

      const estimate = OfflineMapManager.estimateDownloadSize(
        bounds,
        minZoom,
        maxZoom
      );
      setEstimatedSize(estimate);
    }
  }, [currentRegion, minZoom, maxZoom, visible]);

  const handleDownload = () => {
    if (!regionName.trim()) {
      Alert.alert("Feil", "Vennligst oppgi et navn for området");
      return;
    }

    if (!currentRegion) {
      Alert.alert("Feil", "Ingen region valgt");
      return;
    }

    const bounds = {
      north: currentRegion.latitude + currentRegion.latitudeDelta / 2,
      south: currentRegion.latitude - currentRegion.latitudeDelta / 2,
      east: currentRegion.longitude + currentRegion.longitudeDelta / 2,
      west: currentRegion.longitude - currentRegion.longitudeDelta / 2,
    };

    onDownload(regionName.trim(), bounds, minZoom, maxZoom, selectedStyle);
    onClose();
    setRegionName("");
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Last ned offline kart
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Navn på området
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              value={regionName}
              onChangeText={setRegionName}
              placeholder="F.eks. Fløyen, Bergen"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Kartstil</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.styleSelector}>
                {availableStyles.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    style={[
                      styles.styleButton,
                      {
                        backgroundColor:
                          selectedStyle === style.id
                            ? colors.primary
                            : colors.surface,
                      },
                    ]}
                    onPress={() => setSelectedStyle(style.id)}
                  >
                    <Text
                      style={[
                        styles.styleButtonText,
                        {
                          color:
                            selectedStyle === style.id ? "white" : colors.text,
                        },
                      ]}
                    >
                      {style.name}
                    </Text>
                    <Text
                      style={[
                        styles.styleDescription,
                        {
                          color:
                            selectedStyle === style.id
                              ? "rgba(255,255,255,0.8)"
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {style.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Zoom-nivå: {minZoom} - {maxZoom}
            </Text>
            <View style={styles.zoomSliders}>
              <View style={styles.sliderGroup}>
                <Text
                  style={[styles.sliderLabel, { color: colors.textSecondary }]}
                >
                  Min zoom: {minZoom}
                </Text>
                {/* Note: In a real app, you'd use a slider component here */}
                <View style={styles.zoomButtons}>
                  <TouchableOpacity
                    style={[
                      styles.zoomButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() => setMinZoom(Math.max(1, minZoom - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.zoomButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() =>
                      setMinZoom(Math.min(maxZoom - 1, minZoom + 1))
                    }
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.sliderGroup}>
                <Text
                  style={[styles.sliderLabel, { color: colors.textSecondary }]}
                >
                  Max zoom: {maxZoom}
                </Text>
                <View style={styles.zoomButtons}>
                  <TouchableOpacity
                    style={[
                      styles.zoomButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() =>
                      setMaxZoom(Math.max(minZoom + 1, maxZoom - 1))
                    }
                  >
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.zoomButton,
                      { backgroundColor: colors.surface },
                    ]}
                    onPress={() => setMaxZoom(Math.min(18, maxZoom + 1))}
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {estimatedSize && (
            <View
              style={[
                styles.estimateContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.estimateRow}>
                <Ionicons name="grid" size={20} color={colors.primary} />
                <Text style={[styles.estimateText, { color: colors.text }]}>
                  {estimatedSize.tileCount.toLocaleString()} tiles
                </Text>
              </View>
              <View style={styles.estimateRow}>
                <Ionicons name="download" size={20} color={colors.primary} />
                <Text style={[styles.estimateText, { color: colors.text }]}>
                  ~{formatSize(estimatedSize.estimatedSize)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Avbryt
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
          >
            <Text style={styles.downloadButtonText}>Last ned</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const OfflineMapManagerComponent: React.FC<OfflineMapManagerProps> = ({
  visible,
  onClose,
  currentRegion,
}) => {
  const { colors } = useTheme();
  const [downloadedRegions, setDownloadedRegions] = useState<
    OfflineMapRegion[]
  >([]);
  const [availableStyles, setAvailableStyles] = useState<OfflineMapStyle[]>([]);
  const [storageUsage, setStorageUsage] = useState({
    totalSize: 0,
    regionCount: 0,
  });
  const [showNewRegionModal, setShowNewRegionModal] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadData();
      setupDownloadListener();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);
      await OfflineMapManager.initialize();

      const [regions, usage, styles] = await Promise.all([
        OfflineMapManager.getDownloadedRegions(),
        OfflineMapManager.getStorageUsage(),
        Promise.resolve(OfflineMapManager.getAvailableStyles()),
      ]);

      setDownloadedRegions(regions);
      setStorageUsage(usage);
      setAvailableStyles(styles);
    } catch (error) {
      logger.error("Failed to load offline map data:", error);
      Alert.alert("Feil", "Kunne ikke laste offline kart-data");
    } finally {
      setLoading(false);
    }
  };

  const setupDownloadListener = () => {
    const unsubscribe = OfflineMapManager.onDownloadProgress((progress) => {
      setDownloadProgress(progress);
    });

    return unsubscribe;
  };

  const handleDownloadRegion = async (
    name: string,
    bounds: OfflineMapRegion["bounds"],
    minZoom: number,
    maxZoom: number,
    styleId: string
  ) => {
    try {
      const regionId = `region_${Date.now()}`;
      await OfflineMapManager.downloadRegion(
        regionId,
        name,
        bounds,
        minZoom,
        maxZoom,
        styleId
      );
      Alert.alert("Suksess", "Området har blitt lastet ned for offline bruk");
      await loadData();
    } catch (error) {
      logger.error("Failed to download _region:", error);
      Alert.alert("Feil", "Kunne ikke laste ned området");
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleDeleteRegion = (region: OfflineMapRegion) => {
    Alert.alert(
      "Slett område",
      `Er du sikker på at du vil slette "${region._name}"?`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            try {
              await OfflineMapManager.deleteRegion(region._id);
              await loadData();
            } catch (error) {
              Alert.alert("Feil", "Kunne ikke slette området");
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Slett alle offline kart",
      "Er du sikker på at du vil slette alle nedlastede kart? Dette kan ikke angres.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett alle",
          style: "destructive",
          onPress: async () => {
            try {
              await OfflineMapManager.clearAllOfflineMaps();
              await loadData();
            } catch (error) {
              Alert.alert("Feil", "Kunne ikke slette kartene");
            }
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Offline kart
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Download Progress */}
        {downloadProgress && (
          <View
            style={[
              styles.progressContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>
                Laster ned: {downloadProgress._regionId}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  OfflineMapManager.cancelDownload();
                  setDownloadProgress(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <Progress
              value={downloadProgress._percentage / 100}
              style={styles.progressBar}
            />
            <View style={styles.progressInfo}>
              <Text
                style={[styles.progressText, { color: colors.textSecondary }]}
              >
                {downloadProgress._downloaded} / {downloadProgress.total} tiles
              </Text>
              <Text
                style={[styles.progressText, { color: colors.textSecondary }]}
              >
                {downloadProgress._percentage.toFixed(1)}%
              </Text>
            </View>
            {downloadProgress._estimatedTimeRemaining > 0 && (
              <Text
                style={[styles.progressTime, { color: colors.textSecondary }]}
              >
                ~{Math.ceil(downloadProgress._estimatedTimeRemaining)} sek
                gjenstår
              </Text>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Laster offline kart...
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {/* Storage Usage */}
            <View
              style={[
                styles.storageContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.storageHeader}>
                <Ionicons name="server" size={20} color={colors.primary} />
                <Text style={[styles.storageTitle, { color: colors.text }]}>
                  Lagringsplass
                </Text>
              </View>
              <View style={styles.storageInfo}>
                <Text
                  style={[styles.storageText, { color: colors.textSecondary }]}
                >
                  {storageUsage.regionCount} områder
                </Text>
                <Text
                  style={[styles.storageText, { color: colors.textSecondary }]}
                >
                  {formatSize(storageUsage.totalSize)} brukt
                </Text>
              </View>
              {storageUsage.regionCount > 0 && (
                <TouchableOpacity
                  style={[
                    styles.clearButton,
                    { backgroundColor: colors.error },
                  ]}
                  onPress={handleClearAll}
                >
                  <Text style={styles.clearButtonText}>Slett alle</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setShowNewRegionModal(true)}
                disabled={!currentRegion}
              >
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.actionButtonText}>
                  Last ned nytt område
                </Text>
              </TouchableOpacity>
            </View>

            {/* Downloaded Regions */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Nedlastede områder
            </Text>

            {downloadedRegions.length === 0 ? (
              <View
                style={[styles.emptyState, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="map" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  Ingen offline kart
                </Text>
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Last ned kart for å bruke appen uten internett
                </Text>
              </View>
            ) : (
              downloadedRegions.map((region) => (
                <View
                  key={region._id}
                  style={[
                    styles.regionCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.regionHeader}>
                    <Text style={[styles.regionName, { color: colors.text }]}>
                      {region._name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteRegion(region)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.regionInfo}>
                    <View style={styles.regionInfoItem}>
                      <Ionicons
                        name="calendar"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.regionInfoText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDate(region.downloadedAt)}
                      </Text>
                    </View>

                    <View style={styles.regionInfoItem}>
                      <Ionicons
                        name="grid"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.regionInfoText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {region.tileCount.toLocaleString()} tiles
                      </Text>
                    </View>

                    <View style={styles.regionInfoItem}>
                      <Ionicons
                        name="download"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.regionInfoText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatSize(region.size)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.regionZoomInfo}>
                    <Text
                      style={[styles.zoomText, { color: colors.textSecondary }]}
                    >
                      Zoom: {region._minZoom}-{region._maxZoom}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        <NewRegionModal
          visible={showNewRegionModal}
          onClose={() => setShowNewRegionModal(false)}
          onDownload={handleDownloadRegion}
          currentRegion={currentRegion}
          availableStyles={availableStyles}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  progressContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    marginVertical: 8,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressTime: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
  },
  storageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  storageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  storageInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  storageText: {
    fontSize: 14,
    fontWeight: "500",
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  clearButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  actionContainer: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  regionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  regionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  regionName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  regionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  regionInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  regionInfoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  regionZoomInfo: {
    alignItems: "flex-end",
  },
  zoomText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // New Region Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  styleSelector: {
    flexDirection: "row",
    gap: 12,
  },
  styleButton: {
    padding: 16,
    borderRadius: 12,
    minWidth: 120,
  },
  styleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  zoomSliders: {
    gap: 16,
  },
  sliderGroup: {
    gap: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  zoomButtons: {
    flexDirection: "row",
    gap: 12,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  estimateContainer: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  estimateText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  downloadButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  downloadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OfflineMapManagerComponent;
