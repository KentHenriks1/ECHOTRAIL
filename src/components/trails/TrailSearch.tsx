import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Trail } from "../../types/Trail";
import { Theme } from "../../ui";
import { ModernCard } from "../modern";

export interface TrailFilters {
  searchQuery: string;
  difficulty: Trail["difficulty"] | "all";
  category: Trail["category"] | "all";
  maxDistance: number; // in kilometers
  minRating: number;
  hasAudioGuide: boolean;
}

interface TrailSearchProps {
  theme: Theme;
  filters: TrailFilters;
  onFiltersChange: (filters: TrailFilters) => void;
  onClearFilters: () => void;
  totalResults: number;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const TrailSearch: React.FC<TrailSearchProps> = ({
  theme,
  filters,
  onFiltersChange,
  onClearFilters,
  totalResults,
  isExpanded = false,
  onToggleExpanded,
}) => {
  const styles = createStyles(theme);
  const [localSearchQuery, setLocalSearchQuery] = useState(filters.searchQuery);
  const searchTimeout = useRef<number | null>(null);
  const expansionAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(expansionAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expansionAnim]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setLocalSearchQuery(text);

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      onFiltersChange({ ...filters, searchQuery: text });
    }, 300);
  };

  const updateFilter = <K extends keyof TrailFilters>(
    key: K,
    value: TrailFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const getDifficultyColor = (difficulty: Trail["difficulty"] | "all") => {
    switch (difficulty) {
      case "easy":
        return "#22c55e";
      case "moderate":
        return "#f59e0b";
      case "hard":
        return "#ef4444";
      case "extreme":
        return "#8b5cf6";
      default:
        return theme.colors.primary;
    }
  };

  const getCategoryIcon = (
    category: Trail["category"] | "all"
  ): keyof typeof MaterialIcons.glyphMap => {
    switch (category) {
      case "hiking":
        return "hiking";
      case "walking":
        return "directions-walk";
      case "cycling":
        return "directions-bike";
      case "cultural":
        return "museum";
      case "historical":
        return "history";
      case "nature":
        return "nature";
      default:
        return "all-inclusive";
    }
  };

  const hasActiveFilters = () => {
    return (
      filters.searchQuery.length > 0 ||
      filters.difficulty !== "all" ||
      filters.category !== "all" ||
      filters.maxDistance !== 50 ||
      filters.minRating !== 0 ||
      filters.hasAudioGuide
    );
  };

  const difficulties: (Trail["difficulty"] | "all")[] = [
    "all",
    "easy",
    "moderate",
    "hard",
    "extreme",
  ];
  const categories: (Trail["category"] | "all")[] = [
    "all",
    "hiking",
    "walking",
    "cycling",
    "cultural",
    "historical",
    "nature",
  ];

  const difficultyLabels: Record<Trail["difficulty"] | "all", string> = {
    all: "Alle",
    easy: "Lett",
    moderate: "Moderat",
    hard: "Vanskelig",
    extreme: "Ekstrem",
  };

  const categoryLabels: Record<Trail["category"] | "all", string> = {
    all: "Alle",
    hiking: "Turgåing",
    walking: "Spasering",
    cycling: "Sykling",
    cultural: "Kultur",
    historical: "Historie",
    nature: "Natur",
  };

  return (
    <ModernCard theme={theme} variant="elevated" style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search trails..."
            placeholderTextColor={theme.colors.textSecondary}
            value={localSearchQuery}
            onChangeText={handleSearchChange}
          />
          {localSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <MaterialIcons
                name="clear"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterToggle,
            { backgroundColor: `${theme.colors.primary}15` },
          ]}
          onPress={onToggleExpanded}
        >
          <MaterialIcons
            name={isExpanded ? "expand-less" : "tune"}
            size={24}
            color={theme.colors.primary}
          />
          {hasActiveFilters() && (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: theme.colors.secondary },
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Results Summary */}
      <View style={styles.resultsSummary}>
        <Text
          style={[styles.resultsText, { color: theme.colors.textSecondary }]}
        >
          {totalResults} stier funnet
        </Text>
        {hasActiveFilters() && (
          <TouchableOpacity onPress={onClearFilters}>
            <Text
              style={[styles.clearFiltersText, { color: theme.colors.primary }]}
            >
              Nullstill filtre
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Expanded Filters */}
      <Animated.View
        style={[
          styles.expandedFilters,
          {
            maxHeight: expansionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400],
            }),
            opacity: expansionAnim,
          },
        ]}
      >
        {/* Difficulty Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
            Vanskelighetsgrad
          </Text>
          <View style={styles.filterOptions}>
            {difficulties.map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      filters.difficulty === difficulty
                        ? getDifficultyColor(difficulty)
                        : theme.colors.background,
                    borderColor: getDifficultyColor(difficulty),
                  },
                ]}
                onPress={() => updateFilter("difficulty", difficulty)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        filters.difficulty === difficulty
                          ? "white"
                          : getDifficultyColor(difficulty),
                    },
                  ]}
                >
                  {difficultyLabels[difficulty]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
            Kategori
          </Text>
          <View style={styles.filterOptions}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      filters.category === category
                        ? theme.colors.primary
                        : theme.colors.background,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => updateFilter("category", category)}
              >
                <MaterialIcons
                  name={getCategoryIcon(category)}
                  size={16}
                  color={
                    filters.category === category
                      ? "white"
                      : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        filters.category === category
                          ? "white"
                          : theme.colors.primary,
                      marginLeft: 4,
                    },
                  ]}
                >
                  {categoryLabels[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Distance Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
            Maks avstand: {filters.maxDistance}km
          </Text>
          <View style={styles.sliderContainer}>
            {[5, 10, 25, 50, 100].map((distance) => (
              <TouchableOpacity
                key={distance}
                style={[
                  styles.distanceOption,
                  {
                    backgroundColor:
                      filters.maxDistance === distance
                        ? theme.colors.primary
                        : theme.colors.background,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => updateFilter("maxDistance", distance)}
              >
                <Text
                  style={[
                    styles.distanceOptionText,
                    {
                      color:
                        filters.maxDistance === distance
                          ? "white"
                          : theme.colors.primary,
                    },
                  ]}
                >
                  {distance}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rating Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
            Min vurdering:{" "}
            {filters.minRating > 0 ? `${filters.minRating}+` : "Alle"}
          </Text>
          <View style={styles.ratingContainer}>
            {[0, 3, 4, 4.5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingOption,
                  {
                    backgroundColor:
                      filters.minRating === rating
                        ? "#f59e0b"
                        : theme.colors.background,
                    borderColor: "#f59e0b",
                  },
                ]}
                onPress={() => updateFilter("minRating", rating)}
              >
                <MaterialIcons
                  name="star"
                  size={16}
                  color={filters.minRating === rating ? "white" : "#f59e0b"}
                />
                <Text
                  style={[
                    styles.ratingOptionText,
                    {
                      color: filters.minRating === rating ? "white" : "#f59e0b",
                    },
                  ]}
                >
                  {rating > 0 ? `${rating}+` : "Alle"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Audio Guide Filter */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              updateFilter("hasAudioGuide", !filters.hasAudioGuide)
            }
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: filters.hasAudioGuide
                    ? theme.colors.secondary
                    : theme.colors.background,
                  borderColor: theme.colors.secondary,
                },
              ]}
            >
              {filters.hasAudioGuide && (
                <MaterialIcons name="check" size={16} color="white" />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
              Kun stier med lydguide
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ModernCard>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
      overflow: "hidden",
    },
    searchHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginLeft: 8,
    },
    filterToggle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    filterBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    resultsSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    resultsText: {
      fontSize: 14,
      fontWeight: "500",
    },
    clearFiltersText: {
      fontSize: 14,
      fontWeight: "600",
    },
    expandedFilters: {
      overflow: "hidden",
    },
    filterSection: {
      marginTop: 16,
    },
    filterLabel: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
    },
    filterOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "600",
    },
    sliderContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    distanceOption: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    distanceOptionText: {
      fontSize: 12,
      fontWeight: "600",
    },
    ratingContainer: {
      flexDirection: "row",
      gap: 8,
    },
    ratingOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    ratingOptionText: {
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 4,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    checkboxLabel: {
      fontSize: 14,
      fontWeight: "500",
    },
  });
