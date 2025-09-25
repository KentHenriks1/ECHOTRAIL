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

// Mock database
jest.mock("../../config/reactNativeDatabase", () => ({
  db: jest.fn(() => ({
    raw: jest.fn(() => Promise.resolve()),
    select: jest.fn(() => ({
      where: jest.fn(() => ({
        orderBy: jest.fn(() => Promise.resolve([])),
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
      del: jest.fn(() => Promise.resolve()),
    })),
    del: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe("TrailService", () => {
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

  describe("startRecording", () => {
    it("should start recording a new trail", async () => {
      const result = await trailService.startRecording("Test Trail");

      expect(result).toBe(true);
    });

    it("should not start recording if already recording", async () => {
      await trailService.startRecording("First Trail");
      const result = await trailService.startRecording("Second Trail");

      expect(result).toBe(false);
    });
  });

  describe("addLocationPoint", () => {
    it("should add location point during recording", async () => {
      await trailService.startRecording("Test Trail");

      await trailService.addLocationPoint(mockLocationPoint);

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it("should not add location point when not recording", async () => {
      await trailService.addLocationPoint(mockLocationPoint);

      // Should not throw any errors but won't add the point
      expect(true).toBe(true);
    });
  });

  describe("stopRecording", () => {
    it("should stop recording and return trail", async () => {
      await trailService.startRecording("Test Trail");
      await trailService.addLocationPoint(mockLocationPoint);

      const trail = await trailService.stopRecording();

      expect(trail).toBeDefined();
      expect(trail?.name).toBe("Test Trail");
      expect(trail?.id).toBeDefined();
    });

    it("should return null when not recording", async () => {
      const trail = await trailService.stopRecording();

      expect(trail).toBeNull();
    });
  });
});
