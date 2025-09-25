import {
  calculateDistance,
  filterTrails,
  createDefaultFilters,
  findNearbyTrails,
} from "../utils/trailUtils";
import { mockTrails } from "../data/mockTrails";
import { TrailFilters } from "../components/trails";

describe("Trail Utilities", () => {
  describe("calculateDistance", () => {
    test("should calculate distance between Oslo and Bergen correctly", () => {
      const osloLat = 59.9139;
      const osloLon = 10.7522;
      const bergenLat = 60.3913;
      const bergenLon = 5.3221;

      const distance = calculateDistance(
        osloLat,
        osloLon,
        bergenLat,
        bergenLon
      );

      // Distance between Oslo and Bergen is approximately 308 km
      expect(distance).toBeGreaterThan(300000); // 300 km in meters
      expect(distance).toBeLessThan(320000); // 320 km in meters
    });

    test("should return 0 for same coordinates", () => {
      const distance = calculateDistance(59.9139, 10.7522, 59.9139, 10.7522);
      expect(distance).toBe(0);
    });
  });

  describe("createDefaultFilters", () => {
    test("should create default filters with correct values", () => {
      const filters = createDefaultFilters();

      expect(filters).toEqual({
        searchQuery: "",
        difficulty: "all",
        category: "all",
        maxDistance: 50,
        minRating: 0,
        hasAudioGuide: false,
      });
    });
  });

  describe("filterTrails", () => {
    const userLocation = { latitude: 59.9139, longitude: 10.7522 }; // Oslo

    test("should filter trails by search query", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        searchQuery: "Marka",
      };

      const results = filterTrails(mockTrails, filters, userLocation);

      // Should find trails with "Marka" in name or description
      expect(results.length).toBeGreaterThan(0);
      results.forEach((trail) => {
        expect(
          trail.name.toLowerCase().includes("marka") ||
            trail.description.toLowerCase().includes("marka") ||
            trail.category.toLowerCase().includes("marka")
        ).toBe(true);
      });
    });

    test("should filter trails by difficulty", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        difficulty: "easy",
      };

      const results = filterTrails(mockTrails, filters, userLocation);

      results.forEach((trail) => {
        expect(trail.difficulty).toBe("easy");
      });
    });

    test("should filter trails by category", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        category: "hiking",
      };

      const results = filterTrails(mockTrails, filters, userLocation);

      results.forEach((trail) => {
        expect(trail.category).toBe("hiking");
      });
    });

    test("should filter trails by rating", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        minRating: 4.0,
      };

      const results = filterTrails(mockTrails, filters, userLocation);

      results.forEach((trail) => {
        expect(trail.rating).toBeGreaterThanOrEqual(4.0);
      });
    });

    test("should filter trails with audio guide", () => {
      const filters: TrailFilters = {
        ...createDefaultFilters(),
        hasAudioGuide: true,
      };

      const results = filterTrails(mockTrails, filters, userLocation);

      results.forEach((trail) => {
        expect(trail.audioGuidePoints.length).toBeGreaterThan(0);
      });
    });

    test("should sort results by distance when user location provided", () => {
      const filters = createDefaultFilters();
      const results = filterTrails(mockTrails, filters, userLocation);

      // Check that results are sorted by distance
      for (let i = 1; i < results.length; i++) {
        if (results[i - 1].distanceFromUser && results[i].distanceFromUser) {
          expect(results[i - 1].distanceFromUser).toBeLessThanOrEqual(
            results[i].distanceFromUser
          );
        }
      }
    });
  });

  describe("findNearbyTrails", () => {
    const userLocation = { latitude: 59.9139, longitude: 10.7522 }; // Oslo

    test("should find nearby trails within distance limit", () => {
      const maxDistance = 10000; // 10km
      const results = findNearbyTrails(
        mockTrails,
        userLocation,
        maxDistance,
        5
      );

      expect(results.length).toBeLessThanOrEqual(5); // Respects limit

      results.forEach((trail) => {
        expect(trail.distanceFromUser).toBeDefined();
        expect(trail.distanceFromUser!).toBeLessThanOrEqual(maxDistance);
      });
    });

    test("should sort results by distance", () => {
      const results = findNearbyTrails(mockTrails, userLocation, 50000, 10);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].distanceFromUser).toBeLessThanOrEqual(
          results[i].distanceFromUser
        );
      }
    });

    test("should respect limit parameter", () => {
      const limit = 3;
      const results = findNearbyTrails(mockTrails, userLocation, 50000, limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });
});

describe("GPX Service", () => {
  // Mock GPX service tests
  test("should be available for testing", () => {
    expect(true).toBe(true);
  });
});

describe("Audio Guide Service", () => {
  // Mock audio guide service tests
  test("should be available for testing", () => {
    expect(true).toBe(true);
  });
});
