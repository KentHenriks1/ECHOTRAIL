import { Trail } from "../types/Trail";
import { TrailFilters } from "../components/trails/TrailSearch";

// Re-export TrailFilters for convenience
export type { TrailFilters };

export interface TrailWithDistance extends Trail {
  distanceFromUser?: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude 1
 * @param lon1 Longitude 1
 * @param lat2 Latitude 2
 * @param lon2 Longitude 2
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Filter trails based on search criteria
 */
export const filterTrails = (
  trails: Trail[],
  filters: TrailFilters,
  userLocation?: { latitude: number; longitude: number }
): TrailWithDistance[] => {
  let filteredTrails = trails.map((trail) => {
    const trailWithDistance: TrailWithDistance = { ...trail };

    // Calculate distance from user if location is provided
    if (userLocation) {
      trailWithDistance.distanceFromUser = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        trail.startPoint.latitude,
        trail.startPoint.longitude
      );
    }

    return trailWithDistance;
  });

  // Apply search query filter
  if (filters.searchQuery.trim().length > 0) {
    const query = filters.searchQuery.toLowerCase().trim();
    filteredTrails = filteredTrails.filter(
      (trail) =>
        trail.name.toLowerCase().includes(query) ||
        trail.description.toLowerCase().includes(query) ||
        trail.category.toLowerCase().includes(query)
    );
  }

  // Apply difficulty filter
  if (filters.difficulty !== "all") {
    filteredTrails = filteredTrails.filter(
      (trail) => trail.difficulty === filters.difficulty
    );
  }

  // Apply category filter
  if (filters.category !== "all") {
    filteredTrails = filteredTrails.filter(
      (trail) => trail.category === filters.category
    );
  }

  // Apply distance filter
  if (userLocation && filters.maxDistance > 0) {
    const maxDistanceMeters = filters.maxDistance * 1000; // Convert km to meters
    filteredTrails = filteredTrails.filter(
      (trail) =>
        trail.distanceFromUser !== undefined &&
        trail.distanceFromUser <= maxDistanceMeters
    );
  }

  // Apply rating filter
  if (filters.minRating > 0) {
    filteredTrails = filteredTrails.filter(
      (trail) => trail.rating >= filters.minRating
    );
  }

  // Apply audio guide filter
  if (filters.hasAudioGuide) {
    filteredTrails = filteredTrails.filter(
      (trail) => trail.audioGuidePoints.length > 0
    );
  }

  // Sort by distance if user location is available
  if (userLocation) {
    filteredTrails.sort((a, b) => {
      if (a.distanceFromUser === undefined) return 1;
      if (b.distanceFromUser === undefined) return -1;
      return a.distanceFromUser - b.distanceFromUser;
    });
  }

  return filteredTrails;
};

/**
 * Create default filter settings
 */
export const createDefaultFilters = (): TrailFilters => ({
  searchQuery: "",
  difficulty: "all",
  category: "all",
  maxDistance: 50, // 50km default
  minRating: 0,
  hasAudioGuide: false,
});

/**
 * Find trails near a specific location
 */
export const findNearbyTrails = (
  trails: Trail[],
  userLocation: { latitude: number; longitude: number },
  maxDistance: number = 10000,
  limit: number = 10
): TrailWithDistance[] => {
  const trailsWithDistance = trails.map((trail) => ({
    ...trail,
    distanceFromUser: calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      trail.startPoint.latitude,
      trail.startPoint.longitude
    ),
  }));

  return trailsWithDistance
    .filter((trail) => trail.distanceFromUser <= maxDistance)
    .sort((a, b) => a.distanceFromUser - b.distanceFromUser)
    .slice(0, limit);
};

/**
 * Format distance in a human-readable way
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Format duration in a human-readable way
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  }
  return `${hours}t ${mins}min`;
};

/**
 * Get difficulty color based on trail difficulty
 */
export const getDifficultyColor = (difficulty: Trail["difficulty"]): string => {
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
      return "#6366f1";
  }
};

/**
 * Generate trail statistics
 */
export const getTrailStats = (trails: Trail[]) => {
  const totalTrails = trails.length;
  const totalDistance = trails.reduce((sum, trail) => sum + trail.distance, 0);
  const averageRating =
    trails.reduce((sum, trail) => sum + trail.rating, 0) / totalTrails;
  const trailsWithAudioGuide = trails.filter(
    (trail) => trail.audioGuidePoints.length > 0
  ).length;

  const difficultyCount = trails.reduce(
    (acc, trail) => {
      acc[trail.difficulty] = (acc[trail.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<Trail["difficulty"], number>
  );

  const categoryCount = trails.reduce(
    (acc, trail) => {
      acc[trail.category] = (acc[trail.category] || 0) + 1;
      return acc;
    },
    {} as Record<Trail["category"], number>
  );

  return {
    totalTrails,
    totalDistance: totalDistance / 1000, // Convert to km
    averageRating: Math.round(averageRating * 10) / 10,
    trailsWithAudioGuide,
    audioGuidePercentage: Math.round(
      (trailsWithAudioGuide / totalTrails) * 100
    ),
    difficultyCount,
    categoryCount,
  };
};
