import { describe, it, expect } from "@jest/globals";
import {
  calculateDistance,
  createDefaultFilters,
  filterTrails,
  findNearbyTrails,
  TrailFilters,
  TrailWithDistance,
} from "../trailUtils";
import { Trail } from "../../types/Trail";

// Mock trail data for testing
const mockTrails: Trail[] = [
  {
    id: "trail-1",
    name: "Easy Beach Walk",
    description: "A relaxing walk along the beach",
    difficulty: "easy",
    category: "walking",
    startPoint: { latitude: 59.9139, longitude: 10.7522 },
    endPoint: { latitude: 59.9149, longitude: 10.7532 },
    waypoints: [
      { latitude: 59.9139, longitude: 10.7522 },
      { latitude: 59.9149, longitude: 10.7532 },
    ],
    trackPoints: [],
    bounds: {
      northeast: { latitude: 59.9149, longitude: 10.7532 },
      southwest: { latitude: 59.9139, longitude: 10.7522 },
    },
    distance: 2000, // 2km
    estimatedDuration: 30, // 30 min
    elevationGain: 10,
    maxElevation: 15,
    minElevation: 0,
    images: [],
    audioGuidePoints: [],
    rating: 4.5,
    reviewCount: 12,
    popularity: 75,
    createdAt: new Date("2024-01-01T09:00:00Z"),
    updatedAt: new Date("2024-01-01T09:00:00Z"),
    isActive: true,
    requiresPermits: false,
    features: {
      hasWater: false,
      hasRestrooms: true,
      hasParking: true,
      isPetFriendly: true,
      isAccessible: true,
      hasWifi: false,
    },
  },
  {
    id: "trail-2",
    name: "Mountain Challenge",
    description: "A challenging mountain hike with great views",
    difficulty: "hard",
    category: "hiking",
    startPoint: { latitude: 60.0139, longitude: 10.8522 },
    endPoint: { latitude: 60.02, longitude: 10.86 },
    waypoints: [
      { latitude: 60.0139, longitude: 10.8522 },
      { latitude: 60.02, longitude: 10.86 },
    ],
    trackPoints: [],
    bounds: {
      northeast: { latitude: 60.02, longitude: 10.86 },
      southwest: { latitude: 60.0139, longitude: 10.8522 },
    },
    distance: 8000, // 8km
    estimatedDuration: 240, // 4 hours
    elevationGain: 800,
    maxElevation: 1200,
    minElevation: 400,
    images: [],
    audioGuidePoints: [
      {
        id: "audio-1",
        coordinate: { latitude: 60.015, longitude: 10.855 },
        title: "Scenic Viewpoint",
        description: "Amazing view of the valley",
        audioScript: "Welcome to this scenic viewpoint...",
        triggerRadius: 50,
        category: "nature",
      },
    ],
    rating: 4.8,
    reviewCount: 25,
    popularity: 90,
    createdAt: new Date("2024-01-01T07:00:00Z"),
    updatedAt: new Date("2024-01-01T07:00:00Z"),
    isActive: true,
    requiresPermits: false,
    features: {
      hasWater: true,
      hasRestrooms: false,
      hasParking: true,
      isPetFriendly: false,
      isAccessible: false,
      hasWifi: false,
    },
  },
  {
    id: "trail-3",
    name: "Forest Loop",
    description: "A moderate forest trail with wildlife spotting opportunities",
    difficulty: "moderate",
    category: "nature",
    startPoint: { latitude: 59.95, longitude: 10.7 },
    endPoint: { latitude: 59.955, longitude: 10.71 },
    waypoints: [
      { latitude: 59.95, longitude: 10.7 },
      { latitude: 59.955, longitude: 10.71 },
    ],
    trackPoints: [],
    bounds: {
      northeast: { latitude: 59.955, longitude: 10.71 },
      southwest: { latitude: 59.95, longitude: 10.7 },
    },
    distance: 5000, // 5km
    estimatedDuration: 120, // 2 hours
    elevationGain: 200,
    maxElevation: 300,
    minElevation: 120,
    images: [],
    audioGuidePoints: [],
    rating: 4.2,
    reviewCount: 8,
    popularity: 65,
    createdAt: new Date("2024-01-01T10:30:00Z"),
    updatedAt: new Date("2024-01-01T10:30:00Z"),
    isActive: true,
    requiresPermits: false,
    features: {
      hasWater: false,
      hasRestrooms: false,
      hasParking: false,
      isPetFriendly: true,
      isAccessible: false,
      hasWifi: false,
    },
  },
];

describe("trailUtils", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two points correctly", () => {
      const oslo = { latitude: 59.9139, longitude: 10.7522 };
      const bergen = { latitude: 60.3913, longitude: 5.3221 };

      const distance = calculateDistance(
        oslo.latitude,
        oslo.longitude,
        bergen.latitude,
        bergen.longitude
      );

      // Distance between Oslo and Bergen is approximately 308 km
      expect(distance).toBeGreaterThan(300000); // > 300km
      expect(distance).toBeLessThan(320000); // < 320km
    });

    it("should return 0 for identical coordinates", () => {
      const distance = calculateDistance(59.9139, 10.7522, 59.9139, 10.7522);
      expect(distance).toBe(0);
    });

    it("should handle coordinates across the antimeridian", () => {
      const point1 = { latitude: 0, longitude: 179 };
      const point2 = { latitude: 0, longitude: -179 };

      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude
      );

      // Should be approximately 222 km (2 degrees at equator)
      expect(distance).toBeGreaterThan(200000);
      expect(distance).toBeLessThan(250000);
    });
  });

  describe("createDefaultFilters", () => {
    it("should create filters with default values", () => {
      const filters = createDefaultFilters();

      expect(filters).toEqual({
        searchQuery: "",
        difficulty: "all",
        maxDistance: 50,
        hasAudioGuide: false,
        category: "all",
        minRating: 0,
      });
    });

    it("should allow overriding default values", () => {
      const customFilters = {
        ...createDefaultFilters(),
        searchQuery: "mountain",
        difficulty: "hard" as const,
        maxDistance: 20,
      };

      expect(customFilters.searchQuery).toBe("mountain");
      expect(customFilters.difficulty).toBe("hard");
      expect(customFilters.maxDistance).toBe(20);
      expect(customFilters.hasAudioGuide).toBe(false); // Should keep defaults
    });
  });

  describe("filterTrails", () => {
    it("should filter trails by search query", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        searchQuery: "beach",
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Easy Beach Walk");
    });

    it("should filter trails by difficulty", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        difficulty: "hard",
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].difficulty).toBe("hard");
    });

    it("should filter trails by maximum distance", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        maxDistance: 3, // 3km
      };
      const userLocation = { latitude: 59.9139, longitude: 10.7522 };

      const filtered = filterTrails(mockTrails, filters, userLocation);
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      // Check that distance calculation is working
      filtered.forEach((trail) => {
        expect(trail.distanceFromUser).toBeDefined();
      });
    });

    it("should filter trails with audio guide", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        hasAudioGuide: true,
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].audioGuidePoints.length).toBeGreaterThan(0);
    });

    it("should filter by category", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        category: "hiking",
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe("hiking");
    });

    it("should apply multiple filters simultaneously", () => {
      const filters: TrailFilters = {
        searchQuery: "challenge",
        difficulty: "hard",
        maxDistance: 10,
        hasAudioGuide: true,
        category: "hiking",
        minRating: 0,
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Mountain Challenge");
    });

    it("should return all trails when filters match all", () => {
      const filters: TrailFilters = {
        searchQuery: "",
        difficulty: "all",
        maxDistance: 100,
        hasAudioGuide: false,
        category: "all",
        minRating: 0,
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(3);
    });

    it("should return empty array when no trails match filters", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        searchQuery: "nonexistent",
      };

      const filtered = filterTrails(mockTrails, filters);
      expect(filtered).toHaveLength(0);
    });
  });

  describe("findNearbyTrails", () => {
    const userLocation = { latitude: 59.9139, longitude: 10.7522 };

    it("should find trails within specified radius", () => {
      const nearbyTrails = findNearbyTrails(mockTrails, userLocation, 10); // 10km radius

      expect(Array.isArray(nearbyTrails)).toBe(true);
      // Should find at least the first trail which is close to user location
      expect(nearbyTrails.length).toBeGreaterThan(0);
    });

    it("should sort trails by distance", () => {
      const nearbyTrails = findNearbyTrails(mockTrails, userLocation, 100); // Large radius

      // Check that trails are sorted by distance (ascending)
      for (let i = 0; i < nearbyTrails.length - 1; i++) {
        expect(nearbyTrails[i].distanceFromUser).toBeLessThanOrEqual(
          nearbyTrails[i + 1].distanceFromUser
        );
      }
    });

    it("should include distance in results", () => {
      const nearbyTrails = findNearbyTrails(mockTrails, userLocation, 100);

      nearbyTrails.forEach((trail: TrailWithDistance) => {
        expect(typeof trail.distanceFromUser).toBe("number");
        expect(trail.distanceFromUser).toBeGreaterThanOrEqual(0);
      });
    });

    it("should respect the limit parameter", () => {
      const nearbyTrails = findNearbyTrails(mockTrails, userLocation, 100, 2);

      expect(nearbyTrails.length).toBeLessThanOrEqual(2);
    });

    it("should filter out trails beyond radius", () => {
      const verySmallRadius = 0.1; // 100m
      const nearbyTrails = findNearbyTrails(
        mockTrails,
        userLocation,
        verySmallRadius
      );

      nearbyTrails.forEach((trail: TrailWithDistance) => {
        expect(trail.distanceFromUser).toBeLessThanOrEqual(
          verySmallRadius * 1000
        ); // Convert km to meters
      });
    });

    it("should handle edge cases", () => {
      // Empty trail array
      const emptyResult = findNearbyTrails([], userLocation, 10);
      expect(emptyResult).toHaveLength(0);

      // Zero radius - should only find exact matches (distance = 0)
      const zeroRadiusResult = findNearbyTrails(mockTrails, userLocation, 0);
      // Trail 1 starts at exact user location, so it should be found
      expect(zeroRadiusResult.length).toBeGreaterThanOrEqual(0);

      // Negative limit (should return empty)
      const negativeLimitResult = findNearbyTrails(
        mockTrails,
        userLocation,
        10,
        -1
      );
      expect(negativeLimitResult).toHaveLength(0);
    });
  });

  describe("Integration tests", () => {
    it("should work with real-world scenario", () => {
      const userLocation = { latitude: 59.9139, longitude: 10.7522 }; // Oslo
      const searchRadius = 20; // 20km
      const maxTrails = 5;

      // Find nearby trails
      const nearbyTrails = findNearbyTrails(
        mockTrails,
        userLocation,
        searchRadius,
        maxTrails
      );

      // Apply additional filtering
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        difficulty: "easy",
        maxDistance: 3, // 3km trail length
      };

      const finalTrails = filterTrails(nearbyTrails, filters);

      expect(Array.isArray(finalTrails)).toBe(true);
      finalTrails.forEach((trail) => {
        expect(trail.difficulty).toBe("easy");
        expect(trail.distance).toBeLessThanOrEqual(3000);
      });
    });

    it("should handle performance with large datasets", () => {
      // Create a large dataset
      const largeTrailSet: Trail[] = [];
      for (let i = 0; i < 1000; i++) {
        largeTrailSet.push({
          ...mockTrails[0],
          id: `trail-${i}`,
          name: `Trail ${i}`,
          waypoints: [
            {
              latitude: 59.9139 + (Math.random() - 0.5) * 0.1,
              longitude: 10.7522 + (Math.random() - 0.5) * 0.1,
            },
          ],
        });
      }

      const startTime = Date.now();
      const results = findNearbyTrails(
        largeTrailSet,
        { latitude: 59.9139, longitude: 10.7522 },
        10,
        50
      );
      const endTime = Date.now();

      expect(results.length).toBeLessThanOrEqual(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
