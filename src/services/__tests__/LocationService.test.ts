import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { LocationService, locationService } from "../LocationService";
import * as Location from "expo-location";

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  Accuracy: {
    High: 4,
    Highest: 6,
  },
}));

describe("LocationService", () => {
  let service: LocationService;

  beforeEach(() => {
    service = new LocationService();
    jest.clearAllMocks();
  });

  describe("exported instance", () => {
    it("should provide a singleton instance", () => {
      expect(locationService).toBeInstanceOf(LocationService);
    });
  });

  describe("requestPermissions", () => {
    it("should request and return location permission", async () => {
      const mockPermission = { status: "granted", granted: true };
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue(
        mockPermission
      );
      (Location.requestBackgroundPermissionsAsync as any).mockResolvedValue(
        mockPermission
      );

      const result = await service.requestPermissions();

      expect(result).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it("should return false when permission denied", async () => {
      const mockPermission = { status: "denied", granted: false };
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue(
        mockPermission
      );
      (Location.requestBackgroundPermissionsAsync as any).mockResolvedValue(
        mockPermission
      );

      const result = await service.requestPermissions();

      expect(result).toBe(false);
    });

    it("should handle permission request errors", async () => {
      (Location.requestForegroundPermissionsAsync as any).mockRejectedValue(
        new Error("Permission error")
      );

      const result = await service.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe("getCurrentLocation", () => {
    const mockLocation = {
      coords: {
        latitude: 59.9139,
        longitude: 10.7522,
        altitude: 100,
        accuracy: 5,
        speed: 2.5,
        heading: 0,
      },
      timestamp: Date.now(),
    };

    it("should return current location", async () => {
      (Location.getCurrentPositionAsync as any).mockResolvedValue(mockLocation);

      const location = await service.getCurrentLocation();

      expect(location).toBeDefined();
      expect(location?.latitude).toBe(59.9139);
      expect(location?.longitude).toBe(10.7522);
      expect(location?.altitude).toBe(100);
      expect(location?.accuracy).toBe(5);
      expect(location?.speed).toBe(2.5);
    });

    it("should handle location errors", async () => {
      (Location.getCurrentPositionAsync as any).mockRejectedValue(
        new Error("GPS error")
      );

      const location = await service.getCurrentLocation();

      expect(location).toBeNull();
    });
  });

  describe("startTracking", () => {
    it("should start location tracking with callback", async () => {
      const mockWatch = { remove: jest.fn() };
      const mockPermissions = { status: "granted" };
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue(
        mockPermissions
      );
      (Location.requestBackgroundPermissionsAsync as any).mockResolvedValue(
        mockPermissions
      );
      (Location.watchPositionAsync as any).mockResolvedValue(mockWatch);

      const callback = jest.fn();
      const result = await service.startTracking(callback);

      expect(result).toBe(true);
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });

    it("should handle tracking start errors", async () => {
      const mockPermissions = { status: "granted" };
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue(
        mockPermissions
      );
      (Location.requestBackgroundPermissionsAsync as any).mockResolvedValue(
        mockPermissions
      );
      (Location.watchPositionAsync as any).mockRejectedValue(
        new Error("Watch error")
      );

      const callback = jest.fn();
      const result = await service.startTracking(callback);

      expect(result).toBe(false);
    });
  });

  describe("stopTracking", () => {
    it("should stop location tracking", async () => {
      const mockWatch = { remove: jest.fn() };
      const mockPermissions = { status: "granted" };
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue(
        mockPermissions
      );
      (Location.requestBackgroundPermissionsAsync as any).mockResolvedValue(
        mockPermissions
      );
      (Location.watchPositionAsync as any).mockResolvedValue(mockWatch);

      const callback = jest.fn();
      await service.startTracking(callback);
      await service.stopTracking();

      expect(mockWatch.remove).toHaveBeenCalled();
    });
  });

  describe("getTrackingStatus", () => {
    it("should return tracking status", () => {
      expect(service.getTrackingStatus()).toBe(false);
    });
  });

  describe("isLocationEnabled", () => {
    it("should check if location services are enabled", async () => {
      (Location.hasServicesEnabledAsync as any).mockResolvedValue(true);

      const result = await service.isLocationEnabled();

      expect(result).toBe(true);
      expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
    });
  });
});
