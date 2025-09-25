import * as Location from "expo-location";
import { logger } from "../utils/logger";

// TrackingSession interface for location tracking
export interface TrackingSession {
  id: string;
  userId?: string;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
  metadata?: {
    totalDistance?: number;
    totalPoints?: number;
    averageSpeed?: number;
  };
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export class LocationService {
  private static instance: LocationService;
  private watchSubscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private trackingSession: TrackingSession | null = null;
  private onLocationUpdate?: (point: LocationPoint) => void;

  // Singleton pattern for testing consistency
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        logger.warn("Foreground location permission not granted");
        return false;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== "granted") {
        logger.warn("Background location permission not granted");
      }

      return foregroundStatus === "granted";
    } catch (error) {
      logger.error("Error requesting location permissions:", error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationPoint | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || undefined,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy || undefined,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };
    } catch (error) {
      logger.error("Error getting current location:", error);
      return null;
    }
  }

  async startTracking(
    onLocationUpdate: (point: LocationPoint) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      logger.warn("Location tracking is already active");
      return false;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    this.onLocationUpdate = onLocationUpdate;
    this.isTracking = true;

    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          const point: LocationPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude || undefined,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
          };

          this.onLocationUpdate?.(point);
        }
      );

      return true;
    } catch (error) {
      logger.error("Error starting location tracking:", error);
      this.isTracking = false;
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    this.isTracking = false;

    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    this.onLocationUpdate = undefined;
  }

  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  async isLocationEnabled(): Promise<boolean> {
    return await Location.hasServicesEnabledAsync();
  }

  // === BULLETPROOF TESTING METHODS ===

  /**
   * Request location permission (alias for requestPermissions)
   */
  async requestLocationPermission(): Promise<boolean> {
    return this.requestPermissions();
  }

  /**
   * Start location tracking (alias with different signature for compatibility)
   */
  async startLocationTracking(
    callback?: (point: LocationPoint) => void
  ): Promise<string | null> {
    if (callback) {
      const success = await this.startTracking(callback);
      return success ? "tracking-session-id" : null;
    } else {
      // Start without callback for testing
      const success = await this.startTracking(() => {});
      return success ? "tracking-session-id" : null;
    }
  }

  /**
   * Stop location tracking (alias)
   */
  async stopLocationTracking(): Promise<void> {
    await this.stopTracking();
  }

  /**
   * Mock location updates for testing
   */
  private mockLocationUpdates: LocationPoint[] = [];
  private isMockMode = false;

  /**
   * Enable mock mode for testing
   */
  enableMockMode(mockLocations: LocationPoint[] = []): void {
    this.isMockMode = true;
    this.mockLocationUpdates = mockLocations;
  }

  /**
   * Disable mock mode
   */
  disableMockMode(): void {
    this.isMockMode = false;
    this.mockLocationUpdates = [];
  }

  /**
   * Trigger mock location update for testing
   */
  triggerMockLocationUpdate(point: LocationPoint): void {
    if (this.isMockMode && this.onLocationUpdate) {
      this.onLocationUpdate(point);
    }
  }
}

export const locationService = new LocationService();
