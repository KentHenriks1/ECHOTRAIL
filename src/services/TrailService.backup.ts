import * as SecureStore from "expo-secure-store";
import { Trail } from "../types/Trail";
import { LocationPoint } from "./LocationService";
import { logger } from "../utils/logger";

const TRAILS_STORAGE_KEY = "echotrail_trails";
const ACTIVE_SESSION_KEY = "echotrail_active_session";

export interface TrailRecordingState {
  _isRecording: boolean;
  _currentTrail: Trail | null;
  points: LocationPoint[];
  _startTime: number | null;
  distance: number;
  _duration: number;
}

export class TrailService {
  private static instance: TrailService;
  private recordingState: TrailRecordingState = {
    _isRecording: false,
    _currentTrail: null,
    points: [],
    _startTime: null,
    distance: 0,
    _duration: 0,
  };

  private onStateChange?: (state: TrailRecordingState) => void;

  // Singleton pattern for testing consistency
  static getInstance(): TrailService {
    if (!TrailService.instance) {
      TrailService.instance = new TrailService();
    }
    return TrailService.instance;
  }

  setOnStateChange(callback: (state: TrailRecordingState) => void) {
    this.onStateChange = callback;
  }

  private notifyStateChange() {
    this.onStateChange?.(this.recordingState);
  }

  async startRecording(name?: string): Promise<boolean> {
    if (this.recordingState._isRecording) {
      return false;
    }

    const trailId = `trail_${Date.now()}`;
    const startTime = Date.now();

    const newTrail: Trail = {
      id: trailId,
      name: name || `Trail ${new Date().toLocaleDateString()}`,
      userId: "local-user", // For offline mode
      trackPoints: [],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.recordingState = {
      _isRecording: true,
      _currentTrail: newTrail,
      points: [],
      _startTime: startTime,
      distance: 0,
      _duration: 0,
    };

    // Save active session
    await this.saveActiveSession();
    this.notifyStateChange();

    return true;
  }

  async stopRecording(): Promise<Trail | null> {
    if (
      !this.recordingState._isRecording ||
      !this.recordingState._currentTrail
    ) {
      return null;
    }

    const finishedTrail = await this.finalizeTrail();

    // Reset recording state
    this.recordingState = {
      _isRecording: false,
      _currentTrail: null,
      points: [],
      _startTime: null,
      distance: 0,
      _duration: 0,
    };

    // Clear active session
    await SecureStore.deleteItemAsync(ACTIVE_SESSION_KEY);
    this.notifyStateChange();

    return finishedTrail;
  }

  async addLocationPoint(point: LocationPoint): Promise<void> {
    if (
      !this.recordingState._isRecording ||
      !this.recordingState._currentTrail
    ) {
      return;
    }

    this.recordingState.points.push(point);

    // Calculate distance from previous point
    if (this.recordingState.points.length > 1) {
      const prevPoint =
        this.recordingState.points[this.recordingState.points.length - 2];
      const distance = this.calculateDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        point.latitude,
        point.longitude
      );
      this.recordingState.distance += distance;
    }

    // Update duration
    if (this.recordingState._startTime) {
      this.recordingState._duration =
        Date.now() - this.recordingState._startTime;
    }

    // Update trail track points
    this.recordingState._currentTrail.trackPoints =
      this.recordingState.points.map((p) => ({
        coordinate: { latitude: p.latitude, longitude: p.longitude },
        timestamp: new Date(p.timestamp),
        accuracy: p.accuracy,
        altitude: p.altitude,
        speed: p.speed,
        heading: p.heading,
      }));

    // Update metadata
    this.recordingState._currentTrail.metadata = {
      distance: this.recordingState.distance,
      duration: Math.floor(this.recordingState._duration / 1000),
    };

    // Save active session periodically (every 10 points)
    if (this.recordingState.points.length % 10 === 0) {
      await this.saveActiveSession();
    }

    this.notifyStateChange();
  }

  private async finalizeTrail(): Promise<Trail> {
    const trail = this.recordingState._currentTrail!;

    // Calculate elevation statistics
    const elevations = this.recordingState.points
      .map((p) => p.altitude)
      .filter((alt) => alt !== undefined) as number[];

    if (elevations.length > 0) {
      let elevationGain = 0;
      let elevationLoss = 0;

      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) {
          elevationGain += diff;
        } else {
          elevationLoss += Math.abs(diff);
        }
      }

      // Update metadata with elevation data
      trail.metadata = {
        ...trail.metadata,
        elevationGain,
        elevationLoss,
      };
    }

    trail.updatedAt = new Date();

    // Save trail to storage
    await this.saveTrail(trail as any);

    return trail;
  }

  private async saveActiveSession(): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        ACTIVE_SESSION_KEY,
        JSON.stringify(this.recordingState)
      );
    } catch (error) {
      logger.error("Error saving active session:", error);
    }
  }

  async loadActiveSession(): Promise<void> {
    try {
      const sessionData = await SecureStore.getItemAsync(ACTIVE_SESSION_KEY);
      if (sessionData) {
        this.recordingState = JSON.parse(sessionData);
        this.notifyStateChange();
      }
    } catch (error) {
      logger.error("Error loading active session:", error);
    }
  }

  async getStoredTrails(): Promise<Trail[]> {
    try {
      const trailsData = await SecureStore.getItemAsync(TRAILS_STORAGE_KEY);
      return trailsData ? JSON.parse(trailsData) : [];
    } catch (error) {
      logger.error("Error loading trails:", error);
      return [];
    }
  }

  async deleteTrail(trailId: string): Promise<void> {
    try {
      const trails = await this.getStoredTrails();
      const updatedTrails = trails.filter((t) => t.id !== trailId);
      await SecureStore.setItemAsync(
        TRAILS_STORAGE_KEY,
        JSON.stringify(updatedTrails)
      );
    } catch (error) {
      logger.error("Error deleting trail:", error);
    }
  }

  getRecordingState(): TrailRecordingState {
    return { ...this.recordingState };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
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
  }

  // === BULLETPROOF TESTING METHODS ===

  /**
   * Save a trail directly (for testing)
   */
  async saveTrail(trail: any): Promise<any> {
    try {
      // Add default values for missing fields
      const normalizedTrail = {
        id: trail.id,
        name: trail.name,
        description: trail.description || "",
        userId: trail.userId || "local-user",
        trackPoints: trail.trackPoints || trail.points || [],
        isPublic: trail.isPublic !== undefined ? trail.isPublic : false,
        metadata: trail.metadata || {
          distance: trail.distance || 0,
          duration: trail.duration || 0,
        },
        elevation: trail.elevation || { gain: 0, loss: 0, max: 0, min: 0 },
        tags: trail.tags || [],
        syncStatus: trail.syncStatus || "PENDING",
        localOnly: trail.localOnly !== undefined ? trail.localOnly : true,
        version: trail.version || 1,
        createdAt: trail.createdAt || new Date(),
        updatedAt: trail.updatedAt || new Date(),
        startTime: trail.startTime || new Date(),
        endTime: trail.endTime || new Date(),
        duration: trail.duration || 0,
        distance: trail.distance || 0,
        points: trail.points || [],
        ...trail, // Preserve any additional fields
      };

      const existingTrails = await this.getStoredTrails();
      const trailIndex = existingTrails.findIndex(
        (t) => t.id === normalizedTrail.id
      );

      if (trailIndex >= 0) {
        // Update existing trail
        existingTrails[trailIndex] = {
          ...existingTrails[trailIndex],
          ...normalizedTrail,
        };
      } else {
        // Add new trail
        existingTrails.push(normalizedTrail);
      }

      await SecureStore.setItemAsync(
        TRAILS_STORAGE_KEY,
        JSON.stringify(existingTrails)
      );

      return normalizedTrail;
    } catch (error) {
      logger.error("Error in saveTrail:", error);
      throw error;
    }
  }

  /**
   * Get all trails (alias for getStoredTrails)
   */
  async getAllTrails(): Promise<Trail[]> {
    return this.getStoredTrails();
  }

  /**
   * Get trail by ID
   */
  async getTrailById(trailId: string): Promise<Trail | null> {
    try {
      const trails = await this.getStoredTrails();
      return trails.find((t) => t.id === trailId) || null;
    } catch (error) {
      logger.error("Error getting trail by ID:", error);
      return null;
    }
  }

  /**
   * Clear all trails (for testing)
   */
  async clearAllTrails(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TRAILS_STORAGE_KEY);
      logger.info("All trails cleared");
    } catch (error) {
      logger.error("Error clearing all trails:", error);
      throw error;
    }
  }

  /**
   * Close database connections (for testing cleanup)
   */
  async closeDatabase(): Promise<void> {
    try {
      // Clear any active sessions
      await SecureStore.deleteItemAsync(ACTIVE_SESSION_KEY);

      // Reset recording state
      this.recordingState = {
        _isRecording: false,
        _currentTrail: null,
        points: [],
        _startTime: null,
        distance: 0,
        _duration: 0,
      };

      logger.info("Database connections closed");
    } catch (error) {
      logger.error("Error closing database:", error);
    }
  }

  /**
   * Get database stats (for testing)
   */
  async getDatabaseStats(): Promise<{
    totalTrails: number;
    totalPoints: number;
    totalDistance: number;
    storageSize: number;
  }> {
    try {
      const trails = await this.getStoredTrails();
      const totalTrails = trails.length;
      const totalPoints = trails.reduce(
        (sum, trail) => sum + (trail.trackPoints?.length || 0),
        0
      );
      const totalDistance = trails.reduce(
        (sum, trail) => sum + (trail.metadata?.distance || 0),
        0
      );

      // Estimate storage size
      const storageData = await SecureStore.getItemAsync(TRAILS_STORAGE_KEY);
      const storageSize = storageData ? new Blob([storageData]).size : 0;

      return {
        totalTrails,
        totalPoints,
        totalDistance,
        storageSize,
      };
    } catch (error) {
      logger.error("Error getting database stats:", error);
      return {
        totalTrails: 0,
        totalPoints: 0,
        totalDistance: 0,
        storageSize: 0,
      };
    }
  }

  /**
   * Validate trail data integrity
   */
  validateTrail(trail: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trail.id) {
      errors.push("Trail must have an ID");
    }

    if (!trail.name || trail.name.trim().length === 0) {
      errors.push("Trail must have a name");
    }

    if (!trail.userId) {
      errors.push("Trail must have a user ID");
    }

    if (trail.trackPoints && !Array.isArray(trail.trackPoints)) {
      errors.push("Track points must be an array");
    }

    if (trail.trackPoints) {
      trail.trackPoints.forEach((point: any, index: number) => {
        if (
          !point.coordinate ||
          typeof point.coordinate.latitude !== "number" ||
          typeof point.coordinate.longitude !== "number"
        ) {
          errors.push(`Track point ${index} has invalid coordinates`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Batch operations for performance testing
   */
  async batchSaveTrails(trails: any[]): Promise<any[]> {
    try {
      const results = [];
      const batchSize = 10; // Process in batches to avoid memory issues

      for (let i = 0; i < trails.length; i += batchSize) {
        const batch = trails.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((trail) => this.saveTrail(trail))
        );
        results.push(...batchResults);

        // Small delay to avoid overwhelming the storage system
        if (i + batchSize < trails.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      return results;
    } catch (error) {
      logger.error("Error in batch save:", error);
      throw error;
    }
  }
}

export const trailService = new TrailService();
