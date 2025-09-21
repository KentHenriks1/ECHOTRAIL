import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export enum MovementMode {
  STATIONARY = "STATIONARY",
  WALKING = "WALKING",
  CYCLING = "CYCLING",
  DRIVING = "DRIVING",
}

export enum EnvironmentType {
  URBAN = "URBAN",
  NATURE = "NATURE",
  HISTORIC = "HISTORIC",
  RESIDENTIAL = "RESIDENTIAL",
}

export interface LocationContext {
  currentLocation: Location.LocationObject;
  movementMode: MovementMode;
  speed: number; // km/h
  direction: number; // degrees
  stationaryDuration: number; // minutes
  locationHistory: LocationPoint[];
  environment: EnvironmentType;
  accuracy: number; // meters
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface Interest {
  id: string;
  name: string;
  category:
    | "history"
    | "nature"
    | "culture"
    | "legend"
    | "architecture"
    | "local";
  weight: number; // 0-1, user preference strength
}

const LOCATION_TASK_NAME = "ECHOTRAIL_LOCATION_TRACKING";

class IntelligentLocationService {
  private static instance: IntelligentLocationService;

  private currentContext: LocationContext | null = null;
  private locationHistory: LocationPoint[] = [];
  private speedHistory: number[] = [];
  private stationaryStartTime: Date | null = null;
  private isTracking = false;

  // Configuration
  private readonly MAX_HISTORY = 50; // Keep last 50 location points
  private readonly STATIONARY_THRESHOLD = 1.5; // km/h - below this is stationary
  private readonly WALKING_THRESHOLD = 8; // km/h - above this is cycling/driving
  private readonly CYCLING_THRESHOLD = 25; // km/h - above this is driving

  // Callbacks
  private onLocationUpdate?: (context: LocationContext) => void;
  private onMovementModeChange?: (
    mode: MovementMode,
    context: LocationContext
  ) => void;

  private constructor() {
    this.registerBackgroundTask();
    this.loadHistoryFromStorage();
  }

  static getInstance(): IntelligentLocationService {
    if (!IntelligentLocationService.instance) {
      IntelligentLocationService.instance = new IntelligentLocationService();
    }
    return IntelligentLocationService.instance;
  }

  /**
   * Start intelligent location tracking with callbacks
   */
  async startIntelligentTracking(
    interests: Interest[],
    onLocationUpdate?: (context: LocationContext) => void,
    onMovementModeChange?: (
      mode: MovementMode,
      context: LocationContext
    ) => void
  ): Promise<void> {
    this.onLocationUpdate = onLocationUpdate;
    this.onMovementModeChange = onMovementModeChange;

    // Request permissions
    const foregroundPermission =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== "granted") {
      throw new Error("Location permission not granted");
    }

    const backgroundPermission =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundPermission.status === "granted") {
      // Start background location tracking
      try {
        await this.startBackgroundTracking();
      } catch (error) {
        logger.warn(
          "Background location tracking failed, continuing with foreground only:",
          error
        );
        // Continue with foreground tracking only
      }
    } else {
      logger.info(
        "Background permission not granted, using foreground tracking only"
      );
    }

    // Start foreground tracking for immediate response
    await this.startForegroundTracking();

    this.isTracking = true;
    logger.info("Intelligent location tracking started");
  }

  /**
   * Stop location tracking
   */
  async stopTracking(): Promise<void> {
    this.isTracking = false;

    // Stop foreground tracking
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {
      // Ignore errors if not running
    });

    logger.info("Location tracking stopped");
  }

  /**
   * Get current location context
   */
  getCurrentContext(): LocationContext | null {
    return this.currentContext;
  }

  /**
   * Get movement pattern over time
   */
  getMovementPattern(): {
    averageSpeed: number;
    dominantMode: MovementMode;
    stationaryPercentage: number;
    totalDistance: number;
  } {
    if (this.locationHistory.length < 2) {
      return {
        averageSpeed: 0,
        dominantMode: MovementMode.STATIONARY,
        stationaryPercentage: 100,
        totalDistance: 0,
      };
    }

    const speeds = this.speedHistory.filter((s) => s > 0);
    const averageSpeed =
      speeds.length > 0
        ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
        : 0;

    // Calculate dominant movement mode
    const modeCounts = {
      [MovementMode.STATIONARY]: 0,
      [MovementMode.WALKING]: 0,
      [MovementMode.CYCLING]: 0,
      [MovementMode.DRIVING]: 0,
    };
    this.speedHistory.forEach((speed) => {
      const mode = this.calculateMovementMode(speed);
      modeCounts[mode]++;
    });

    const dominantMode = Object.entries(modeCounts).reduce((a, b) =>
      modeCounts[a[0] as MovementMode] > modeCounts[b[0] as MovementMode]
        ? a
        : b
    )[0] as MovementMode;

    const stationaryPercentage =
      (modeCounts[MovementMode.STATIONARY] / this.speedHistory.length) * 100;

    // Calculate total distance
    const totalDistance = this.calculateTotalDistance();

    return {
      averageSpeed,
      dominantMode,
      stationaryPercentage,
      totalDistance,
    };
  }

  /**
   * Predict upcoming locations based on current movement
   */
  predictUpcomingLocations(lookaheadMinutes: number = 5): LocationPoint[] {
    if (
      !this.currentContext ||
      this.currentContext.movementMode === MovementMode.STATIONARY
    ) {
      return [];
    }

    const currentSpeed = this.currentContext.speed; // km/h
    const direction = this.currentContext.direction; // degrees
    const distanceKm = (currentSpeed * lookaheadMinutes) / 60;

    // Convert direction to radians
    const directionRad = (direction * Math.PI) / 180;

    // Earth's radius in km
    const earthRadius = 6371;

    // Current position
    const lat1 =
      this.currentContext.currentLocation.coords.latitude * (Math.PI / 180);
    const lon1 =
      this.currentContext.currentLocation.coords.longitude * (Math.PI / 180);

    // Calculate future position
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceKm / earthRadius) +
        Math.cos(lat1) *
          Math.sin(distanceKm / earthRadius) *
          Math.cos(directionRad)
    );

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(directionRad) *
          Math.sin(distanceKm / earthRadius) *
          Math.cos(lat1),
        Math.cos(distanceKm / earthRadius) - Math.sin(lat1) * Math.sin(lat2)
      );

    return [
      {
        latitude: lat2 * (180 / Math.PI),
        longitude: lon2 * (180 / Math.PI),
        timestamp: new Date(Date.now() + lookaheadMinutes * 60 * 1000),
        speed: currentSpeed,
        heading: direction,
      },
    ];
  }

  /**
   * Register background location task
   */
  private registerBackgroundTask(): void {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        logger.error("Background location task error:", error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        locations.forEach((location) => {
          this.processLocationUpdate(location);
        });
      }
    });
  }

  /**
   * Start background location tracking
   */
  private async startBackgroundTracking(): Promise<void> {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // 30 seconds in background
        distanceInterval: 50, // 50 meters
        deferredUpdatesInterval: 60000, // 1 minute
        foregroundService: {
          notificationTitle: "EchoTrail kjører",
          notificationBody: "Lytter etter interessante steder langs ruten din",
          notificationColor: "#4A90E2",
          killServiceOnDestroy: false,
        },
      });
      logger.info("Background location tracking started successfully");
    } catch (error) {
      logger.error("Failed to start background location tracking:", error);
      // Fall back to foreground-only tracking
      throw new Error(
        "Background location service unavailable. " +
          "Foreground location permissions were not found in the manifest. " +
          "Please ensure FOREGROUND_SERVICE and FOREGROUND_SERVICE_LOCATION permissions are declared."
      );
    }
  }

  /**
   * Start foreground location tracking for immediate response
   */
  private async startForegroundTracking(): Promise<void> {
    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000, // 5 seconds in foreground
        distanceInterval: 10, // 10 meters
      },
      (location) => this.processLocationUpdate(location)
    );
  }

  /**
   * Process incoming location updates
   */
  private processLocationUpdate(location: Location.LocationObject): void {
    const locationPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp),
      speed: location.coords.speed ? location.coords.speed * 3.6 : undefined, // Convert m/s to km/h
      heading: location.coords.heading || undefined,
      accuracy: location.coords.accuracy || undefined,
    };

    // Add to history
    this.locationHistory.push(locationPoint);
    if (this.locationHistory.length > this.MAX_HISTORY) {
      this.locationHistory.shift();
    }

    // Calculate speed if not provided
    let speed = locationPoint.speed || 0;
    if (!speed && this.locationHistory.length > 1) {
      speed = this.calculateSpeed(
        this.locationHistory[this.locationHistory.length - 2],
        locationPoint
      );
    }

    // Add speed to history
    this.speedHistory.push(speed);
    if (this.speedHistory.length > this.MAX_HISTORY) {
      this.speedHistory.shift();
    }

    // Determine movement mode
    const movementMode = this.calculateMovementMode(speed);
    const previousMode = this.currentContext?.movementMode;

    // Handle stationary duration
    let stationaryDuration = 0;
    if (movementMode === MovementMode.STATIONARY) {
      if (!this.stationaryStartTime) {
        this.stationaryStartTime = new Date();
      }
      stationaryDuration = Math.floor(
        (Date.now() - this.stationaryStartTime.getTime()) / (1000 * 60)
      );
    } else {
      this.stationaryStartTime = null;
    }

    // Determine environment
    const environment = this.determineEnvironment(locationPoint);

    // Create context
    const context: LocationContext = {
      currentLocation: location,
      movementMode,
      speed,
      direction: locationPoint.heading || this.calculateDirection(),
      stationaryDuration,
      locationHistory: [...this.locationHistory],
      environment,
      accuracy: locationPoint.accuracy || 0,
    };

    this.currentContext = context;

    // Save to storage periodically
    this.saveHistoryToStorage();

    // Notify callbacks
    this.onLocationUpdate?.(context);

    if (previousMode !== movementMode) {
      logger.info(`Movement mode changed: ${previousMode} -> ${movementMode}`);
      this.onMovementModeChange?.(movementMode, context);
    }
  }

  /**
   * Calculate movement mode based on speed
   */
  private calculateMovementMode(speed: number): MovementMode {
    if (speed < this.STATIONARY_THRESHOLD) {
      return MovementMode.STATIONARY;
    } else if (speed < this.WALKING_THRESHOLD) {
      return MovementMode.WALKING;
    } else if (speed < this.CYCLING_THRESHOLD) {
      return MovementMode.CYCLING;
    } else {
      return MovementMode.DRIVING;
    }
  }

  /**
   * Calculate speed between two points
   */
  private calculateSpeed(point1: LocationPoint, point2: LocationPoint): number {
    const distance = this.calculateDistance(
      point1.latitude,
      point1.longitude,
      point2.latitude,
      point2.longitude
    );

    const timeHours =
      (point2.timestamp.getTime() - point1.timestamp.getTime()) /
      (1000 * 60 * 60);

    return timeHours > 0 ? distance / timeHours : 0;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate current direction based on recent movement
   */
  private calculateDirection(): number {
    if (this.locationHistory.length < 2) return 0;

    const recent = this.locationHistory.slice(-2);
    const lat1 = recent[0].latitude * (Math.PI / 180);
    const lat2 = recent[1].latitude * (Math.PI / 180);
    const deltaLon =
      (recent[1].longitude - recent[0].longitude) * (Math.PI / 180);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    return (bearing + 360) % 360;
  }

  /**
   * Determine environment type based on location patterns
   */
  private determineEnvironment(location: LocationPoint): EnvironmentType {
    // This would ideally use external APIs, but for now use simple heuristics
    const accuracy = location.accuracy || 100;

    if (accuracy > 50) {
      return EnvironmentType.NATURE; // Poor GPS usually means natural areas
    }

    // Could integrate with geocoding APIs, POI databases, etc.
    return EnvironmentType.URBAN; // Default assumption
  }

  /**
   * Calculate total distance traveled
   */
  private calculateTotalDistance(): number {
    if (this.locationHistory.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.locationHistory.length; i++) {
      const prev = this.locationHistory[i - 1];
      const curr = this.locationHistory[i];
      totalDistance += this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    return totalDistance;
  }

  /**
   * Save location history to local storage
   */
  private async saveHistoryToStorage(): Promise<void> {
    try {
      // Save only recent history to avoid storage bloat
      const recentHistory = this.locationHistory.slice(-20);
      await AsyncStorage.setItem(
        "echotrail_location_history",
        JSON.stringify(recentHistory)
      );
    } catch (error) {
      logger.warn("Failed to save location history:", error);
    }
  }

  /**
   * Load location history from storage
   */
  private async loadHistoryFromStorage(): Promise<void> {
    try {
      const historyJson = await AsyncStorage.getItem(
        "echotrail_location_history"
      );
      if (historyJson) {
        const history = JSON.parse(historyJson);
        this.locationHistory = history.map((point: any) => ({
          ...point,
          timestamp: new Date(point.timestamp),
        }));
      }
    } catch (error) {
      logger.warn("Failed to load location history:", error);
    }
  }
}

export default IntelligentLocationService.getInstance();
