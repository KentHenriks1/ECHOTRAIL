/**
 * Trails Screen - Enterprise Edition
 * Comprehensive trail listing with search, filter, and detailed views
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { ApiServices } from "../services/api";
import type {
  Trail,
  TrailFilters,
  TrailSortOption,
} from "../services/api/TrailService";
import { Logger, PerformanceMonitor } from "../core/utils";
import { ThemeConfig } from "../core/config";
import { getFontWeight } from "../core/theme/utils";

interface TrailsState {
  trails: Trail[];
  filteredTrails: Trail[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
  filters: TrailFilters;
  sortBy: TrailSortOption;
  selectedTrail: Trail | null;
  showFilters: boolean;
  showTrailDetail: boolean;
}

type LoadingState = "idle" | "loading" | "error" | "success";

export function TrailsScreen(): React.ReactElement {
  const { user } = useAuth();
  const [state, setState] = useState<TrailsState>({
    trails: [],
    filteredTrails: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    searchQuery: "",
    filters: {
      isPublic: undefined,
      createdBy: undefined,
      dateRange: undefined,
    },
    sortBy: "createdAt",
    selectedTrail: null,
    showFilters: false,
    showTrailDetail: false,
  });
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");

  const logger = useMemo(() => new Logger("TrailsScreen"), []);

  // Load trails from API
  const loadTrails = useCallback(
    async (refresh = false) => {
      try {
        if (!refresh) {
          setState((prev) => ({ ...prev, isLoading: true }));
          setLoadingState("loading");
        } else {
          setState((prev) => ({ ...prev, isRefreshing: true }));
        }

        logger.info("Loading trails", { refresh });

        const response = await ApiServices.trails.getTrails({
          limit: 100,
          sortBy: state.sortBy,
          filters: state.filters,
          includeTrackPoints: false,
        });

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to load trails");
        }

        const trails = response.data || [];

        setState((prev) => ({
          ...prev,
          trails,
          filteredTrails: trails,
          isLoading: false,
          isRefreshing: false,
          error: null,
        }));
        setLoadingState("success");

        logger.info("Trails loaded successfully", { count: trails.length });

        // Track performance
        PerformanceMonitor.trackCustomMetric(
          "trails_loaded",
          trails.length,
          "count",
          undefined,
          {
            refresh,
            sortBy: state.sortBy,
          }
        );
      } catch (err) {
        const errorMessage = (err as Error).message;
        setState((prev) => ({
          ...prev,
          trails: [],
          filteredTrails: [],
          isLoading: false,
          isRefreshing: false,
          error: errorMessage,
        }));
        setLoadingState("error");
        logger.error("Failed to load trails", undefined, err as Error);
      }
    },
    [state.sortBy, state.filters, logger]
  );

  // Filter and search trails
  const filterTrails = useCallback(() => {
    const { trails, searchQuery, filters } = state;

    let filtered = [...trails];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (trail) =>
          trail.name.toLowerCase().includes(query) ||
          (trail.description && trail.description.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.isPublic !== undefined) {
      filtered = filtered.filter(
        (trail) => trail.isPublic === filters.isPublic
      );
    }

    if (filters.createdBy) {
      filtered = filtered.filter((trail) => trail.userId === filters.createdBy);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter((trail) => {
        const createdAt = new Date(trail.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    setState((prev) => ({ ...prev, filteredTrails: filtered }));

    logger.info("Trails filtered", {
      total: trails.length,
      filtered: filtered.length,
      searchQuery,
      filters,
    });
  }, [state, logger]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: TrailSortOption) => {
      setState((prev) => ({ ...prev, sortBy }));
      loadTrails();
    },
    [loadTrails]
  );

  // Handle filter change
  const handleFilterChange = useCallback((filters: Partial<TrailFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    setState((prev) => ({ ...prev, showFilters: false }));
    loadTrails();
  }, [loadTrails]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {
        isPublic: undefined,
        createdBy: undefined,
        dateRange: undefined,
      },
      searchQuery: "",
    }));
    loadTrails();
  }, [loadTrails]);

  // Select trail
  const selectTrail = useCallback(
    (trail: Trail) => {
      setState((prev) => ({
        ...prev,
        selectedTrail: trail,
        showTrailDetail: true,
      }));

      logger.info("Trail selected", {
        trailId: trail.id,
        trailName: trail.name,
      });

      // Track selection
      PerformanceMonitor.trackCustomMetric(
        "trail_selected_in_list",
        1,
        "count",
        undefined,
        {
          trailId: trail.id,
          trailName: trail.name,
        }
      );
    },
    [logger]
  );

  // Close trail detail
  // const closeTrailDetail = useCallback(() => {
  //   setSelectedTrail(null);
  //   setShowTrailDetail(false);
  // }, []);

  // Delete trail
  const deleteTrail = useCallback(
    async (trail: Trail) => {
      try {
        logger.info("Deleting trail", { trailId: trail.id });

        const response = await ApiServices.trails.deleteTrail(trail.id);

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to delete trail");
        }

        // Remove from local state
        setState((prev) => ({
          ...prev,
          trails: prev.trails.filter((t) => t.id !== trail.id),
          filteredTrails: prev.filteredTrails.filter((t) => t.id !== trail.id),
          selectedTrail: null,
          showTrailDetail: false,
        }));

        logger.info("Trail deleted successfully", { trailId: trail.id });

        Alert.alert(
          "Trail Deleted",
          `Trail "${trail.name}" has been deleted successfully.`,
          [{ text: "OK", style: "default" }]
        );
      } catch (err) {
        const errorMessage = (err as Error).message;
        logger.error("Failed to delete trail", undefined, err as Error);

        Alert.alert(
          "Delete Failed",
          `Failed to delete trail: ${errorMessage}`,
          [{ text: "OK", style: "default" }]
        );
      }
    },
    [logger]
  );

  // Confirm delete
  const confirmDelete = useCallback(
    (trail: Trail) => {
      Alert.alert(
        "Delete Trail",
        `Are you sure you want to delete "${trail.name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteTrail(trail),
          },
        ]
      );
    },
    [deleteTrail]
  );

  // Share trail
  const shareTrail = useCallback(
    async (trail: Trail) => {
      try {
        logger.info("Sharing trail", { trailId: trail.id });

        // Toggle public visibility
        const response = await ApiServices.trails.updateTrail(trail.id, {
          isPublic: !trail.isPublic,
        });

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to update trail");
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          trails: prev.trails.map((t) =>
            t.id === trail.id ? { ...t, isPublic: !t.isPublic } : t
          ),
          filteredTrails: prev.filteredTrails.map((t) =>
            t.id === trail.id ? { ...t, isPublic: !t.isPublic } : t
          ),
          selectedTrail:
            prev.selectedTrail?.id === trail.id
              ? {
                  ...prev.selectedTrail,
                  isPublic: !prev.selectedTrail.isPublic,
                }
              : prev.selectedTrail,
        }));

        const message = trail.isPublic
          ? `Trail "${trail.name}" is now private.`
          : `Trail "${trail.name}" is now public and can be shared.`;

        Alert.alert("Trail Updated", message, [
          { text: "OK", style: "default" },
        ]);

        logger.info("Trail sharing toggled", {
          trailId: trail.id,
          isPublic: !trail.isPublic,
        });
      } catch (err) {
        const errorMessage = (err as Error).message;
        logger.error("Failed to update trail sharing", undefined, err as Error);

        Alert.alert("Share Failed", `Failed to update trail: ${errorMessage}`, [
          { text: "OK", style: "default" },
        ]);
      }
    },
    [logger]
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    loadTrails(true);
  }, [loadTrails]);

  // Initialize
  useEffect(() => {
    loadTrails();
  }, [loadTrails]);

  // Apply filters when search or filters change
  useEffect(() => {
    filterTrails();
  }, [filterTrails]);

  // Format date
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }, []);

  // Render trail item
  const renderTrailItem = useCallback(
    ({ item: trail }: { item: Trail }) => {
      const isOwner = user?.id === trail.userId;
      const trackPointCount = trail.trackPoints?.length || 0;

      return (
        <Pressable style={styles.trailItem} onPress={() => selectTrail(trail)}>
          <View style={styles.trailItemHeader}>
            <View style={styles.trailItemTitle}>
              <Text style={styles.trailName}>{trail.name}</Text>
              <Text style={styles.trailDescription}>
                {trail.description || "No description"}
              </Text>
            </View>
            <View style={styles.trailItemBadge}>
              <Text style={styles.trailItemBadgeText}>
                {trail.isPublic ? "🌍 Public" : "🔒 Private"}
              </Text>
            </View>
          </View>

          <View style={styles.trailItemStats}>
            <View style={styles.trailStat}>
              <Text style={styles.trailStatValue}>{trackPointCount}</Text>
              <Text style={styles.trailStatLabel}>Points</Text>
            </View>

            <View style={styles.trailStat}>
              <Text style={styles.trailStatValue}>
                {formatDate(trail.createdAt)}
              </Text>
              <Text style={styles.trailStatLabel}>Created</Text>
            </View>

            {isOwner && (
              <View style={styles.trailActions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => shareTrail(trail)}
                >
                  <Text style={styles.actionButtonText}>
                    {trail.isPublic ? "🔒" : "🌍"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => confirmDelete(trail)}
                >
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [user, selectTrail, shareTrail, confirmDelete, formatDate]
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={state.showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() =>
        setState((prev) => ({ ...prev, showFilters: false }))
      }
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter Trails</Text>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() =>
              setState((prev) => ({ ...prev, showFilters: false }))
            }
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Visibility Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Visibility</Text>
            <View style={styles.filterOptions}>
              <Pressable
                style={[
                  styles.filterOption,
                  state.filters.isPublic === undefined &&
                    styles.activeFilterOption,
                ]}
                onPress={() => handleFilterChange({ isPublic: undefined })}
              >
                <Text style={styles.filterOptionText}>All</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterOption,
                  state.filters.isPublic === true && styles.activeFilterOption,
                ]}
                onPress={() => handleFilterChange({ isPublic: true })}
              >
                <Text style={styles.filterOptionText}>Public</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterOption,
                  state.filters.isPublic === false && styles.activeFilterOption,
                ]}
                onPress={() => handleFilterChange({ isPublic: false })}
              >
                <Text style={styles.filterOptionText}>Private</Text>
              </Pressable>
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.filterOptions}>
              <Pressable
                style={[
                  styles.filterOption,
                  state.sortBy === "createdAt" && styles.activeFilterOption,
                ]}
                onPress={() => handleSortChange("createdAt")}
              >
                <Text style={styles.filterOptionText}>Date</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterOption,
                  state.sortBy === "name" && styles.activeFilterOption,
                ]}
                onPress={() => handleSortChange("name")}
              >
                <Text style={styles.filterOptionText}>Name</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Pressable style={styles.modalActionButton} onPress={clearFilters}>
            <Text style={styles.modalActionText}>Clear All</Text>
          </Pressable>
          <Pressable
            style={[styles.modalActionButton, styles.modalPrimaryButton]}
            onPress={applyFilters}
          >
            <Text style={styles.modalPrimaryText}>Apply Filters</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Loading state
  if (loadingState === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ThemeConfig.primaryColor} />
          <Text style={styles.loadingText}>Loading trails...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (loadingState === "error" && state.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Loading Error</Text>
          <Text style={styles.errorText}>{state.error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadTrails()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Filter Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search trails..."
            value={state.searchQuery}
            onChangeText={handleSearch}
            clearButtonMode="while-editing"
          />
          <Pressable
            style={styles.filterButton}
            onPress={() => setState((prev) => ({ ...prev, showFilters: true }))}
          >
            <Text style={styles.filterButtonText}>🔍</Text>
          </Pressable>
        </View>

        {/* Results Info */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {state.filteredTrails.length} of {state.trails.length} trails
          </Text>
        </View>
      </View>

      {/* Trails List */}
      <FlatList
        data={state.filteredTrails}
        keyExtractor={(item) => item.id}
        renderItem={renderTrailItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={onRefresh}
            colors={[ThemeConfig.primaryColor]}
            tintColor={ThemeConfig.primaryColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {state.searchQuery || Object.values(state.filters).some(Boolean)
                ? "No trails match your criteria"
                : "No trails found. Start recording your first trail!"}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  loadingText: {
    marginTop: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  errorTitle: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.errorColor,
    marginBottom: ThemeConfig.spacing.sm,
  },
  errorText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
    marginBottom: ThemeConfig.spacing.lg,
  },
  retryButton: {
    backgroundColor: ThemeConfig.primaryColor,
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.xl,
    borderRadius: 12,
  },
  retryText: {
    color: "#ffffff",
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: ThemeConfig.spacing.lg,
    paddingVertical: ThemeConfig.spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    marginRight: ThemeConfig.spacing.sm,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: ThemeConfig.primaryColor,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonText: {
    fontSize: 18,
    color: "#ffffff",
  },
  resultsInfo: {
    alignItems: "center",
  },
  resultsText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  listContainer: {
    paddingHorizontal: ThemeConfig.spacing.lg,
    paddingVertical: ThemeConfig.spacing.md,
  },
  trailItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: ThemeConfig.spacing.lg,
    marginBottom: ThemeConfig.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trailItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ThemeConfig.spacing.md,
  },
  trailItemTitle: {
    flex: 1,
    marginRight: ThemeConfig.spacing.md,
  },
  trailName: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.xs,
  },
  trailDescription: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  trailItemBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: ThemeConfig.spacing.sm,
    paddingVertical: ThemeConfig.spacing.xs,
    borderRadius: 6,
  },
  trailItemBadgeText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  trailItemStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trailStat: {
    alignItems: "center",
  },
  trailStatValue: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.primaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  trailStatLabel: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  trailActions: {
    flexDirection: "row",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: ThemeConfig.spacing.sm,
  },
  deleteButton: {
    backgroundColor: "#fef2f2",
  },
  actionButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: ThemeConfig.spacing.xl * 2,
  },
  emptyText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
    paddingVertical: ThemeConfig.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  modalTitle: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: ThemeConfig.secondaryColor,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  filterSection: {
    marginVertical: ThemeConfig.spacing.lg,
  },
  filterSectionTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.md,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    paddingHorizontal: ThemeConfig.spacing.md,
    paddingVertical: ThemeConfig.spacing.sm,
    marginRight: ThemeConfig.spacing.sm,
    marginBottom: ThemeConfig.spacing.sm,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeFilterOption: {
    backgroundColor: ThemeConfig.primaryColor,
    borderColor: ThemeConfig.primaryColor,
  },
  filterOptionText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: ThemeConfig.spacing.lg,
    paddingVertical: ThemeConfig.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: ThemeConfig.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    marginRight: ThemeConfig.spacing.sm,
    backgroundColor: "#f1f5f9",
  },
  modalPrimaryButton: {
    backgroundColor: ThemeConfig.primaryColor,
    marginRight: 0,
    marginLeft: ThemeConfig.spacing.sm,
  },
  modalActionText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
    color: ThemeConfig.secondaryColor,
  },
  modalPrimaryText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
    color: "#ffffff",
  },
});
