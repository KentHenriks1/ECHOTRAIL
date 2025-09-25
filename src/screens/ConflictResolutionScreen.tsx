import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from "react-native";
import { useTranslation } from "react-i18next";
import { createTheme, Button } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  conflictResolutionService,
  DataConflict,
  ConflictResolutionState,
  ConflictResolutionStrategy,
} from "../services/ConflictResolutionService";

export function ConflictResolutionScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [conflictState, setConflictState] = useState<ConflictResolutionState>({
    pendingConflicts: [],
    resolvedConflicts: [],
    strategy: {
      autoResolve: false,
      preferLocal: false,
      preferRemote: false,
      alwaysPromptUser: true,
      mergeStrategy: "newest",
    },
    isResolvingConflicts: false,
  });

  const [selectedConflict, setSelectedConflict] = useState<DataConflict | null>(
    null
  );
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");

  useEffect(() => {
    // Subscribe to conflict state changes
    const handleStateChange = (state: ConflictResolutionState) => {
      setConflictState(state);
    };

    conflictResolutionService.addStateChangeListener(handleStateChange);

    // Load initial state
    setConflictState(conflictResolutionService.getConflictResolutionState());

    return () => {
      conflictResolutionService.removeStateChangeListener(handleStateChange);
    };
  }, []);

  const handleConflictPress = (conflict: DataConflict) => {
    setSelectedConflict(conflict);
    setShowConflictModal(true);
  };

  const handleResolveConflict = async (
    resolution: "local" | "remote" | "merge"
  ) => {
    if (!selectedConflict) return;

    try {
      await conflictResolutionService.resolveConflict(
        selectedConflict.id,
        resolution
      );
      setShowConflictModal(false);
      setSelectedConflict(null);

      Alert.alert(
        "Conflict Resolved",
        `The conflict has been resolved using the ${resolution} version.`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to resolve conflict. Please try again.");
    }
  };

  const handleAutoResolve = () => {
    Alert.alert(
      "Auto-Resolve Conflicts",
      "This will automatically resolve all pending conflicts using your current strategy. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve All",
          style: "default",
          onPress: async () => {
            try {
              await conflictResolutionService.autoResolveConflicts();
              Alert.alert(
                "Success",
                "All conflicts have been resolved automatically."
              );
            } catch (error) {
              Alert.alert("Error", "Failed to auto-resolve conflicts.");
            }
          },
        },
      ]
    );
  };

  const handleClearResolved = () => {
    Alert.alert(
      "Clear Resolved Conflicts",
      "This will remove all resolved conflicts from the history. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => conflictResolutionService.clearResolvedConflicts(),
        },
      ]
    );
  };

  const updateStrategy = async (
    updates: Partial<ConflictResolutionStrategy>
  ) => {
    await conflictResolutionService.updateStrategy(updates);
  };

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  const getConflictIcon = (
    type: string
  ): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case "trail":
        return "hiking";
      case "trackpoint":
        return "place";
      case "metadata":
        return "info";
      default:
        return "warning";
    }
  };

  const renderConflictItem = ({ item: conflict }: { item: DataConflict }) => {
    const isResolved = conflict._isResolved;

    return (
      <TouchableOpacity
        style={[styles.conflictItem, isResolved && styles.resolvedConflictItem]}
        onPress={() => handleConflictPress(conflict)}
        disabled={isResolved}
      >
        <View style={styles.conflictHeader}>
          <View style={styles.conflictIconContainer}>
            <MaterialIcons
              name={getConflictIcon(conflict.type)}
              size={24}
              color={isResolved ? theme.colors.success : theme.colors.warning}
            />
          </View>

          <View style={styles.conflictInfo}>
            <Text style={styles.conflictTitle}>
              {conflict.type === "trail" ? "Trail Conflict" : "Data Conflict"}
            </Text>
            <Text style={styles.conflictSubtitle}>
              {conflict._localVersion?.name || conflict.resourceId}
            </Text>
            <Text style={styles.conflictTimestamp}>
              {formatTimestamp(conflict.timestamp)}
            </Text>
          </View>

          <View style={styles.conflictStatus}>
            {isResolved ? (
              <View style={styles.resolvedBadge}>
                <MaterialIcons
                  name="check-circle"
                  size={16}
                  color={theme.colors.success}
                />
                <Text style={styles.resolvedText}>
                  {conflict.resolution?.toUpperCase()}
                </Text>
              </View>
            ) : (
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.textSecondary}
              />
            )}
          </View>
        </View>

        <View style={styles.conflictFields}>
          <Text style={styles.conflictFieldsLabel}>Conflicted fields:</Text>
          <Text style={styles.conflictFieldsList}>
            {conflict.conflictFields.join(", ")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConflictModal = () => {
    if (!selectedConflict) return null;

    const {
      _localVersion: localVersion,
      _remoteVersion: remoteVersion,
      conflictFields,
    } = selectedConflict;

    return (
      <Modal
        visible={showConflictModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConflictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Resolve Data Conflict</Text>

              <Text style={styles.modalSubtitle}>
                Choose which version to keep or merge them automatically
              </Text>

              {/* Conflict Fields Summary */}
              <View style={styles.conflictSummary}>
                <Text style={styles.summaryTitle}>Conflicted Fields:</Text>
                {conflictFields.map((field, index) => (
                  <View key={index} style={styles.fieldComparison}>
                    <Text style={styles.fieldName}>{field}:</Text>

                    <View style={styles.versionComparison}>
                      <View style={styles.versionColumn}>
                        <Text style={styles.versionLabel}>Local</Text>
                        <Text style={styles.versionValue}>
                          {String(localVersion[field] || "N/A").substring(
                            0,
                            50
                          )}
                          {String(localVersion[field] || "").length > 50
                            ? "..."
                            : ""}
                        </Text>
                      </View>

                      <View style={styles.versionColumn}>
                        <Text style={styles.versionLabel}>Remote</Text>
                        <Text style={styles.versionValue}>
                          {String(remoteVersion[field] || "N/A").substring(
                            0,
                            50
                          )}
                          {String(remoteVersion[field] || "").length > 50
                            ? "..."
                            : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Resolution Options */}
              <View style={styles.resolutionOptions}>
                <Button
                  title="Keep Local Version"
                  onPress={() => handleResolveConflict("local")}
                  variant="secondary"
                  theme={theme}
                />

                <Button
                  title="Keep Remote Version"
                  onPress={() => handleResolveConflict("remote")}
                  variant="secondary"
                  theme={theme}
                />

                <Button
                  title="Merge Automatically"
                  onPress={() => handleResolveConflict("merge")}
                  variant="primary"
                  theme={theme}
                />
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConflictModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Conflict Resolution Settings</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto-resolve conflicts</Text>
            <Switch
              value={conflictState.strategy.autoResolve}
              onValueChange={(value) => updateStrategy({ autoResolve: value })}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Always prefer local version</Text>
            <Switch
              value={conflictState.strategy.preferLocal}
              onValueChange={(value) =>
                updateStrategy({
                  preferLocal: value,
                  preferRemote: value
                    ? false
                    : conflictState.strategy.preferRemote,
                })
              }
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>
              Always prefer remote version
            </Text>
            <Switch
              value={conflictState.strategy.preferRemote}
              onValueChange={(value) =>
                updateStrategy({
                  preferRemote: value,
                  preferLocal: value
                    ? false
                    : conflictState.strategy.preferLocal,
                })
              }
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Always prompt user</Text>
            <Switch
              value={conflictState.strategy.alwaysPromptUser}
              onValueChange={(value) =>
                updateStrategy({ alwaysPromptUser: value })
              }
            />
          </View>

          <Button
            title="Close"
            onPress={() => setShowSettingsModal(false)}
            variant="primary"
            theme={theme}
          />
        </View>
      </View>
    </Modal>
  );

  const conflictSummary = conflictResolutionService.getConflictSummary();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sync Conflicts</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <MaterialIcons name="settings" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {conflictState.pendingConflicts.length}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {conflictState.resolvedConflicts.length}
          </Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
        {conflictState.pendingConflicts.length > 0 && (
          <TouchableOpacity
            style={styles.autoResolveButton}
            onPress={handleAutoResolve}
            disabled={conflictState.isResolvingConflicts}
          >
            <Text style={styles.autoResolveText}>Auto-Resolve All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pending ({conflictState.pendingConflicts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "resolved" && styles.activeTab]}
          onPress={() => setActiveTab("resolved")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "resolved" && styles.activeTabText,
            ]}
          >
            Resolved ({conflictState.resolvedConflicts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conflict List */}
      <View style={styles.listContainer}>
        {(activeTab === "pending"
          ? conflictState.pendingConflicts
          : conflictState.resolvedConflicts
        ).length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name={activeTab === "pending" ? "check-circle" : "history"}
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>
              {activeTab === "pending"
                ? "No pending conflicts"
                : "No resolved conflicts"}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === "pending"
                ? "All your data is in sync!"
                : "Resolved conflicts will appear here"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              activeTab === "pending"
                ? conflictState.pendingConflicts
                : conflictState.resolvedConflicts
            }
            renderItem={renderConflictItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Clear Resolved Button */}
      {activeTab === "resolved" &&
        conflictState.resolvedConflicts.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearResolved}
          >
            <Text style={styles.clearButtonText}>Clear All Resolved</Text>
          </TouchableOpacity>
        )}

      {/* Modals */}
      {renderConflictModal()}
      {renderSettingsModal()}
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
    settingsButton: {
      padding: theme.spacing.xs,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryNumber: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
    summaryLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    autoResolveButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },
    autoResolveText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    tabs: {
      flexDirection: "row",
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.xs,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      alignItems: "center",
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: theme.colors.background,
      fontFamily: theme.typography.fontFamily.medium,
    },
    listContainer: {
      flex: 1,
      margin: theme.spacing.lg,
      marginTop: theme.spacing.md,
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
    conflictItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning,
    },
    resolvedConflictItem: {
      borderLeftColor: theme.colors.success,
      opacity: 0.8,
    },
    conflictHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    conflictIconContainer: {
      marginRight: theme.spacing.md,
    },
    conflictInfo: {
      flex: 1,
    },
    conflictTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    conflictSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    conflictTimestamp: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    conflictStatus: {
      alignItems: "center",
    },
    resolvedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.success}20`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    resolvedText: {
      marginLeft: theme.spacing.xs,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.success,
      fontFamily: theme.typography.fontFamily.bold,
    },
    conflictFields: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    conflictFieldsLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    conflictFieldsList: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    clearButton: {
      backgroundColor: theme.colors.error,
      margin: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
    },
    clearButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
    },
    // Modal Styles
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
      maxWidth: 500,
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    modalSubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
      lineHeight: 20,
    },
    conflictSummary: {
      marginBottom: theme.spacing.lg,
    },
    summaryTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    fieldComparison: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
    },
    fieldName: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    versionComparison: {
      flexDirection: "row",
    },
    versionColumn: {
      flex: 1,
      marginHorizontal: theme.spacing.xs,
    },
    versionLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    versionValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      minHeight: 40,
    },
    resolutionOptions: {
      marginBottom: theme.spacing.lg,
    },
    resolutionButton: {
      marginBottom: theme.spacing.md,
    },
    cancelButton: {
      paddingVertical: theme.spacing.md,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    // Settings Modal
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      flex: 1,
    },
    closeButton: {
      marginTop: theme.spacing.lg,
    },
  });
