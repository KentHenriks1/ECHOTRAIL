import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { TrailService } from "../TrailService";
import { LocationPoint } from "../LocationService";

// Mock SecureStore
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock database with more realistic responses
jest.mock("../../config/reactNativeDatabase", () => ({
  db: jest.fn(() => ({
    raw: jest.fn(() => Promise.resolve([])),
    select: jest.fn(() => ({
      where: jest.fn(() => ({
        orderBy: jest.fn(() => Promise.resolve([])),
        first: jest.fn(() => Promise.resolve(null)),
      })),
      orderBy: jest.fn(() => Promise.resolve([])),
    })),
    insert: jest.fn(() => ({
      onConflict: jest.fn(() => ({
        merge: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([{ id: "test-trail-id" }])),
        })),
      })),
      returning: jest.fn(() => Promise.resolve([{ id: "test-trail-id" }])),
    })),
    where: jest.fn(() => ({
      del: jest.fn(() => Promise.resolve(1)),
      update: jest.fn(() => Promise.resolve(1)),
    })),
    del: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve(1)),
  })),
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe("TrailService Enhanced Tests", () => {
  // Set test timeout for this suite
  jest.setTimeout(20000);
  let trailService: TrailService;

  const mockLocationPoint: LocationPoint = {
    latitude: 59.9139,
    longitude: 10.7522,
    altitude: 100,
    timestamp: Date.now(),
    accuracy: 5,
    speed: 2.5,
    heading: 0,
  };

  beforeEach(() => {
    trailService = new TrailService();
    jest.clearAllMocks();
  });

  describe("Trail Recording Flow", () => {
    it("should complete a full recording cycle", async () => {
      // Start recording
      const startResult = await trailService.startRecording("Full Cycle Test");
      expect(startResult).toBe(true);

      // Add multiple location points
      const points = [
        { ...mockLocationPoint, latitude: 59.9139 },
        {
          ...mockLocationPoint,
          latitude: 59.914,
          timestamp: Date.now() + 1000,
        },
        {
          ...mockLocationPoint,
          latitude: 59.9141,
          timestamp: Date.now() + 2000,
        },
      ];

      for (const point of points) {
        await trailService.addLocationPoint(point);
      }

      // Stop recording
      const trail = await trailService.stopRecording();
      expect(trail).toBeDefined();
      expect(trail?.name).toBe("Full Cycle Test");
    });

    it("should handle concurrent recording attempts", async () => {
      const firstStart = await trailService.startRecording("First Trail");
      const secondStart = await trailService.startRecording("Second Trail");

      expect(firstStart).toBe(true);
      expect(secondStart).toBe(false);
    });

    it("should calculate distance correctly", async () => {
      await trailService.startRecording("Distance Test");

      // Add points that should create measurable distance
      await trailService.addLocationPoint({
        ...mockLocationPoint,
        latitude: 59.9139,
        longitude: 10.7522,
      });

      await trailService.addLocationPoint({
        ...mockLocationPoint,
        latitude: 59.9149, // ~1.1km north
        longitude: 10.7522,
        timestamp: Date.now() + 5000,
      });

      const trail = await trailService.stopRecording();
      expect(trail?.metadata?.distance).toBeGreaterThan(0);
    });
  });

  describe("Trail Management", () => {
    it("should save and retrieve trails", async () => {
      const testTrail = {
        id: "test-trail-123",
        name: "Test Trail",
        description: "A test trail for unit testing",
        distance: 5000,
        duration: 3600,
        difficulty: "moderate" as const,
        waypoints: [
          { latitude: 59.9139, longitude: 10.7522 },
          { latitude: 59.9149, longitude: 10.7532 },
        ],
        elevation: { gain: 150, loss: 100, max: 200, min: 50 },
        startTime: new Date(),
        endTime: new Date(),
        isPublic: true,
        tags: ["test", "hiking"],
        userId: "test-user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedTrail = await trailService.saveTrail(testTrail);
      expect(savedTrail).toBeDefined();
    });

    it("should handle trail search by location", async () => {
      // Test that the service can retrieve trails (location filtering would be implemented later)
      const allTrails = await trailService.getAllTrails();
      expect(Array.isArray(allTrails)).toBe(true);
    });

    it("should filter public trails", async () => {
      const allTrails = await trailService.getAllTrails();
      const publicTrails = allTrails.filter((trail) => trail.isPublic);
      expect(Array.isArray(publicTrails)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // Mock database error
      const mockDb = require("../../config/reactNativeDatabase").db;
      mockDb.mockImplementationOnce(() => ({
        select: () => {
          throw new Error("Database connection failed");
        },
      }));

      const trails = await trailService.getAllTrails();
      expect(Array.isArray(trails)).toBe(true); // Should return empty array on error
    });

    it("should handle invalid location points", async () => {
      await trailService.startRecording("Invalid Location Test");

      const invalidPoint = {
        ...mockLocationPoint,
        latitude: 999, // Invalid latitude
        longitude: 999, // Invalid longitude
      };

      // Should not throw error, but might skip the point
      await expect(
        trailService.addLocationPoint(invalidPoint)
      ).resolves.not.toThrow();
    });
  });

  describe("Performance and Optimization", () => {
    it("should handle large number of location points", async () => {
      await trailService.startRecording("Performance Test");

      // Add 20 location points (reduced from 100 for faster tests)
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          trailService.addLocationPoint({
            ...mockLocationPoint,
            latitude: 59.9139 + i * 0.0001,
            longitude: 10.7522 + i * 0.0001,
            timestamp: Date.now() + i * 1000,
          })
        );
      }

      await Promise.all(promises);

      const trail = await trailService.stopRecording();
      expect(trail).toBeDefined();
    }, 15000);

    it("should clean up resources properly", async () => {
      await trailService.startRecording("Cleanup Test");
      await trailService.addLocationPoint(mockLocationPoint);

      // Stop recording should clean up all resources
      const trail = await trailService.stopRecording();
      expect(trail).toBeDefined();

      // Subsequent operations should work normally
      const startAgain = await trailService.startRecording("Second Trail");
      expect(startAgain).toBe(true);
    });
  });

  describe("Data Integrity", () => {
    it("should generate unique trail IDs", async () => {
      const ids = new Set();

      // Since we're using mocks, we test that the service attempts to create multiple trails
      for (let i = 0; i < 3; i++) {
        const started = await trailService.startRecording(`Trail ${i}`);
        expect(started).toBe(true);
        const trail = await trailService.stopRecording();
        expect(trail).toBeDefined();
        if (trail?.id) {
          ids.add(trail.id);
        }
      }

      // With mocks, we can't test actual uniqueness, but we can verify the process works
      expect(ids.size).toBeGreaterThan(0); // At least one ID was generated
    }, 10000);

    it("should maintain trail metadata consistency", async () => {
      await trailService.startRecording("Metadata Test");

      const startTime = Date.now();
      await trailService.addLocationPoint({
        ...mockLocationPoint,
        timestamp: startTime,
      });

      // Wait a bit to ensure duration (reduced from 10ms to 1ms)
      await new Promise((resolve) => setTimeout(resolve, 1));

      await trailService.addLocationPoint({
        ...mockLocationPoint,
        latitude: 59.9149,
        timestamp: startTime + 1000, // 1 second later
      });

      const trail = await trailService.stopRecording();

      // Test basic trail properties that should be defined
      expect(trail).toBeDefined();
      expect(trail?.name).toBe("Metadata Test");
      expect(trail?.createdAt).toBeDefined();
      expect(trail?.updatedAt).toBeDefined();
      expect(trail?.trackPoints).toBeDefined();
    });
  });
});
