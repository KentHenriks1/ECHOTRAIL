import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trail } from "../types/Trail";
import { LocationPoint } from "./LocationService";
import { logger } from "../utils/logger";
import { API_CONFIG } from "../config/api";
import { randomUUID } from "expo-crypto";
// React Native compatible database layer
import { db } from "../config/reactNativeDatabase";

const ACTIVE_SESSION_KEY = "echotrail_active_session";
const STORED_TRAILS_KEY = "echotrail_stored_trails";

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
  private _databaseReady = false;
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

    const trailId = randomUUID();
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
      await this.ensureDatabaseReady();

      // First get all trails
      const trails = await db("trails")
        .select("*")
        .orderBy("created_at", "desc");

      // Then get track points for each trail and build full trail objects
      const fullTrails = await Promise.all(
        trails.map(async (trail: any) => {
          const trackPoints = await db("track_points")
            .select("*")
            .where("trail_id", trail.id)
            .orderBy("timestamp", "asc");

          return {
            ...trail,
            track_points: trackPoints.map((point: any) => ({
              coordinate: {
                latitude: parseFloat(point.latitude),
                longitude: parseFloat(point.longitude),
              },
              timestamp: point.timestamp,
              accuracy: parseFloat(point.accuracy || "0"),
              altitude: parseFloat(point.elevation || "0"),
              speed: parseFloat(point.speed || "0"),
              heading: parseFloat(point.heading || "0"),
            })),
          };
        })
      );

      return fullTrails.map(this.normalizeTrailFromDb);
    } catch (error) {
      logger.error("Error loading trails:", error);
      // Fallback to offline storage if database fails
      return await this.loadTrailsOffline();
    }
  }

  async deleteTrail(trailId: string): Promise<void> {
    try {
      await this.ensureDatabaseReady();

      // Delete trail and related track points (CASCADE will handle track_points)
      await db("trails").where("id", trailId).del();

      logger.info(`Deleted trail: ${trailId}`);
    } catch (error) {
      logger.error("Error deleting trail:", error);
      // Fallback to offline storage update
      try {
        const trails = await this.loadTrailsOffline();
        const filteredTrails = trails.filter((trail) => trail.id !== trailId);
        await this.saveTrailsOffline(filteredTrails);
        logger.info(`Deleted trail from offline storage: ${trailId}`);
      } catch (fallbackError) {
        logger.error(
          "Failed to delete from offline storage too:",
          fallbackError
        );
        throw error; // Re-throw original error
      }
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
      await this.ensureDatabaseReady();

      const trailId = trail.id || randomUUID();
      const now = new Date();

      // Normalize trail data for database
      const trailData = {
        id: trailId,
        name: trail.name || `Trail ${now.toLocaleDateString()}`,
        description: trail.description || "",
        user_id: trail.userId || "local-user",
        is_public: trail.isPublic !== undefined ? trail.isPublic : false,
        metadata: trail.metadata || {
          distance: trail.distance || 0,
          duration: trail.duration || 0,
        },
        distance: trail.distance || 0,
        duration: trail.duration || 0,
        elevation: trail.elevation || { gain: 0, loss: 0, max: 0, min: 0 },
        tags: trail.tags || [],
        sync_status: trail.syncStatus || "PENDING",
        local_only: trail.localOnly !== undefined ? trail.localOnly : true,
        version: trail.version || 1,
        start_time: trail.startTime || now,
        end_time: trail.endTime || now,
        created_at: trail.createdAt || now,
        updated_at: now,
      };

      // Insert or update trail
      const [savedTrail] = await db("trails")
        .insert(trailData)
        .onConflict("id")
        .merge()
        .returning("*");

      // Handle track points
      const trackPoints = trail.trackPoints || trail.points || [];
      if (trackPoints.length > 0) {
        // Delete existing track points
        await db("track_points").where("trail_id", trailId).del();

        // Insert new track points
        const trackPointsData = trackPoints.map(
          (point: any, index: number) => ({
            id: randomUUID(),
            trail_id: trailId,
            latitude: point.coordinate?.latitude || point.latitude,
            longitude: point.coordinate?.longitude || point.longitude,
            elevation: point.altitude || point.coordinate?.altitude,
            timestamp: point.timestamp ? new Date(point.timestamp) : new Date(),
            accuracy: point.accuracy,
            speed: point.speed,
            heading: point.heading,
            additional_data: {},
          })
        );

        if (trackPointsData.length > 0) {
          await db("track_points").insert(trackPointsData);
        }
      }

      return this.normalizeTrailFromDb(savedTrail);
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
      await this.ensureDatabaseReady();

      // Get the trail
      const trail = await db("trails").select("*").where("id", trailId).first();

      if (!trail) {
        return null;
      }

      // Get track points for this trail
      const trackPoints = await db("track_points")
        .select("*")
        .where("trail_id", trailId)
        .orderBy("timestamp", "asc");

      const fullTrail = {
        ...trail,
        track_points: trackPoints.map((point: any) => ({
          coordinate: {
            latitude: parseFloat(point.latitude),
            longitude: parseFloat(point.longitude),
          },
          timestamp: point.timestamp,
          accuracy: parseFloat(point.accuracy || "0"),
          altitude: parseFloat(point.elevation || "0"),
          speed: parseFloat(point.speed || "0"),
          heading: parseFloat(point.heading || "0"),
        })),
      };

      return this.normalizeTrailFromDb(fullTrail);
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
      await this.ensureDatabaseReady();

      // Delete all track points first, then trails (or let CASCADE handle it)
      await db("trails").del();

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

      // Note: We don't close the main db connection as it's shared across the app
      // Only tests should call this for cleanup

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
      await this.ensureDatabaseReady();

      // For React Native compatibility, use aggregate function strings instead of db.raw()
      const [trailStats] = (await db("trails").select(
        "COUNT(*) as total_trails",
        "SUM(distance) as total_distance"
      )) as any[];

      const [pointStats] = (await db("track_points").select(
        "COUNT(*) as total_points"
      )) as any[];

      // Estimate storage size (rough approximation)
      const storageSize =
        parseInt(trailStats?.total_trails || "0") * 1000 +
        parseInt(pointStats?.total_points || "0") * 100;

      return {
        totalTrails: parseInt(trailStats?.total_trails || "0") || 0,
        totalPoints: parseInt(pointStats?.total_points || "0") || 0,
        totalDistance: parseFloat(trailStats?.total_distance || "0") || 0,
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

  // === DATABASE HELPER METHODS ===

  /**
   * Ensure database is ready
   */
  private async ensureDatabaseReady(): Promise<void> {
    if (!this._databaseReady) {
      try {
        // Test database connection
        await db.raw("SELECT 1");
        this._databaseReady = true;
        logger.info("Database connection ready");
      } catch (error) {
        logger.warn("Database unavailable, using offline mode:", error);
        this._databaseReady = true; // Still mark as ready for offline mode
      }
    }
  }

  // Offline storage helpers
  private async saveTrailsOffline(trails: Trail[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORED_TRAILS_KEY, JSON.stringify(trails));
      logger.info(`Saved ${trails.length} trails to offline storage`);
    } catch (error) {
      logger.error("Error saving trails to offline storage:", error);
    }
  }

  private async loadTrailsOffline(): Promise<Trail[]> {
    try {
      const storedData = await AsyncStorage.getItem(STORED_TRAILS_KEY);
      if (storedData) {
        const trails = JSON.parse(storedData);
        logger.info(`Loaded ${trails.length} trails from offline storage`);
        return trails;
      }
    } catch (error) {
      logger.error("Error loading trails from offline storage:", error);
    }
    return [];
  }

  /**
   * Normalize trail data from database format to application format
   */
  private normalizeTrailFromDb(dbTrail: any): Trail {
    return {
      id: dbTrail.id,
      name: dbTrail.name || "Unnamed Trail",
      description: dbTrail.description,
      userId: dbTrail.user_id,
      trackPoints: Array.isArray(dbTrail.track_points)
        ? dbTrail.track_points
        : [],
      isPublic: dbTrail.is_public || false,
      metadata: dbTrail.metadata || {},
      createdAt: new Date(dbTrail.created_at),
      updatedAt: new Date(dbTrail.updated_at),
    } as Trail; // Cast to Trail type since we only partially populate it
  }

  /**
   * Get trails near a specific location (for local Trail type)
   */
  async getTrailsNearLocation(
    position: { latitude: number; longitude: number },
    radiusKm: number = 10
  ): Promise<any[]> {
    // For now, return mock data since we're using different Trail types
    // In production, this would filter based on geospatial queries
    const { mockTrails } = await import("../data/mockTrails");

    return mockTrails.filter((trail) => {
      const distance = this.calculateDistance(
        position.latitude,
        position.longitude,
        trail.startPoint.latitude,
        trail.startPoint.longitude
      );
      return distance <= radiusKm * 1000; // Convert km to meters
    });
  }

  /**
   * Get all available trails (local Trail type)
   */
  getTrails(): any[] {
    // For now, return empty array since we're using mock data
    // In production, this would fetch from the database
    return [];
  }
}

// Create and export singleton instance
export const trailService = TrailService.getInstance();
