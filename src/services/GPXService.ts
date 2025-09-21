import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { logger } from "../utils/logger";

// Fallback for documentDirectory
const getDocumentDirectory = () => {
  try {
    return (
      (FileSystem as any).documentDirectory ||
      "file:///data/data/com.yourapp.name/files/"
    );
  } catch {
    return "file:///data/data/com.yourapp.name/files/";
  }
};
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Trail } from "../types/Trail";

export interface GPXPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  time: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface GPXTrack {
  id: string;
  name: string;
  description?: string;
  points: GPXPoint[];
  startTime: Date;
  endTime?: Date;
  distance: number; // in meters
  duration: number; // in seconds
  averageSpeed?: number; // in m/s
  maxSpeed?: number; // in m/s
  elevationGain?: number; // in meters
  elevationLoss?: number; // in meters
  trailId?: string; // Reference to original trail if following one
}

export interface TrackingSession {
  id: string;
  track: GPXTrack;
  isActive: boolean;
  isPaused: boolean;
  lastPoint?: GPXPoint;
  statistics: {
    totalDistance: number;
    totalTime: number;
    averageSpeed: number;
    currentSpeed: number;
    elevationGain: number;
    elevationLoss: number;
  };
}

class GPXService {
  private currentSession: TrackingSession | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private readonly trackingOptions: Location.LocationOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5000, // Update every 5 seconds
    distanceInterval: 10, // Update every 10 meters
  };

  /**
   * Start tracking a new trail
   */
  async startTracking(
    trailName: string,
    trailId?: string,
    description?: string
  ): Promise<string> {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Location permission not granted");
    }

    // Stop any existing session
    if (this.currentSession) {
      await this.stopTracking();
    }

    // Get initial location
    const initialLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    const sessionId = `track_${Date.now()}`;
    const startTime = new Date();

    const initialPoint: GPXPoint = {
      latitude: initialLocation.coords.latitude,
      longitude: initialLocation.coords.longitude,
      elevation: initialLocation.coords.altitude || undefined,
      time: startTime,
      accuracy: initialLocation.coords.accuracy || undefined,
      speed: initialLocation.coords.speed || undefined,
      heading: initialLocation.coords.heading || undefined,
    };

    this.currentSession = {
      id: sessionId,
      track: {
        id: sessionId,
        name: trailName,
        description,
        points: [initialPoint],
        startTime,
        distance: 0,
        duration: 0,
        trailId,
      },
      isActive: true,
      isPaused: false,
      lastPoint: initialPoint,
      statistics: {
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        currentSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      },
    };

    // Start location tracking
    this.locationSubscription = await Location.watchPositionAsync(
      this.trackingOptions,
      (location) => this.handleLocationUpdate(location)
    );

    return sessionId;
  }

  /**
   * Stop tracking and save the session
   */
  async stopTracking(): Promise<GPXTrack | null> {
    if (!this.currentSession || !this.currentSession.isActive) {
      return null;
    }

    // Stop location updates
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Update end time and final statistics
    this.currentSession.track.endTime = new Date();
    this.currentSession.track.duration = Math.floor(
      (this.currentSession.track.endTime.getTime() -
        this.currentSession.track.startTime.getTime()) /
        1000
    );
    this.currentSession.track.distance =
      this.currentSession.statistics.totalDistance;
    this.currentSession.track.averageSpeed =
      this.currentSession.statistics.averageSpeed;
    this.currentSession.track.elevationGain =
      this.currentSession.statistics.elevationGain;
    this.currentSession.track.elevationLoss =
      this.currentSession.statistics.elevationLoss;

    // Calculate max speed
    this.currentSession.track.maxSpeed = Math.max(
      ...this.currentSession.track.points
        .map((point) => point.speed || 0)
        .filter((speed) => speed > 0)
    );

    const completedTrack = this.currentSession.track;
    this.currentSession.isActive = false;

    // Save to local storage
    await this.saveTrackLocally(completedTrack);

    return completedTrack;
  }

  /**
   * Pause tracking
   */
  pauseTracking(): boolean {
    if (!this.currentSession || !this.currentSession.isActive) {
      return false;
    }

    this.currentSession.isPaused = true;
    return true;
  }

  /**
   * Resume tracking
   */
  resumeTracking(): boolean {
    if (!this.currentSession || !this.currentSession.isActive) {
      return false;
    }

    this.currentSession.isPaused = false;
    return true;
  }

  /**
   * Get current tracking session
   */
  getCurrentSession(): TrackingSession | null {
    return this.currentSession;
  }

  /**
   * Handle location updates during tracking
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    if (
      !this.currentSession ||
      !this.currentSession.isActive ||
      this.currentSession.isPaused
    ) {
      return;
    }

    const newPoint: GPXPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      elevation: location.coords.altitude || undefined,
      time: new Date(location.timestamp),
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
      heading: location.coords.heading || undefined,
    };

    this.currentSession.track.points.push(newPoint);

    // Calculate distance from last point
    if (this.currentSession.lastPoint) {
      const distance = this.calculateDistance(
        this.currentSession.lastPoint.latitude,
        this.currentSession.lastPoint.longitude,
        newPoint.latitude,
        newPoint.longitude
      );

      this.currentSession.statistics.totalDistance += distance;

      // Calculate elevation changes
      if (this.currentSession.lastPoint.elevation && newPoint.elevation) {
        const elevationChange =
          newPoint.elevation - this.currentSession.lastPoint.elevation;
        if (elevationChange > 0) {
          this.currentSession.statistics.elevationGain += elevationChange;
        } else {
          this.currentSession.statistics.elevationLoss +=
            Math.abs(elevationChange);
        }
      }
    }

    // Update time and speed statistics
    const currentTime = Math.floor(
      (newPoint.time.getTime() -
        this.currentSession.track.startTime.getTime()) /
        1000
    );
    this.currentSession.statistics.totalTime = currentTime;

    if (currentTime > 0) {
      this.currentSession.statistics.averageSpeed =
        this.currentSession.statistics.totalDistance / currentTime;
    }

    this.currentSession.statistics.currentSpeed = newPoint.speed || 0;
    this.currentSession.lastPoint = newPoint;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
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

  /**
   * Convert track to GPX XML format
   */
  generateGPX(track: GPXTrack): string {
    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="EchoTrail" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${this.escapeXml(track.name)}</name>
    <desc>${this.escapeXml(track.description || "")}</desc>
    <time>${track.startTime.toISOString()}</time>
  </metadata>`;

    const trackHeader = `  <trk>
    <name>${this.escapeXml(track.name)}</name>
    <desc>${this.escapeXml(track.description || "")}</desc>
    <trkseg>`;

    const trackPoints = track.points
      .map((point) => {
        let trkpt = `      <trkpt lat="${point.latitude}" lon="${point.longitude}">`;
        if (point.elevation !== undefined) {
          trkpt += `\n        <ele>${point.elevation}</ele>`;
        }
        trkpt += `\n        <time>${point.time.toISOString()}</time>`;
        if (point.speed !== undefined) {
          trkpt += `\n        <speed>${point.speed}</speed>`;
        }
        trkpt += `\n      </trkpt>`;
        return trkpt;
      })
      .join("\n");

    const trackFooter = `    </trkseg>
  </trk>`;

    const gpxFooter = `</gpx>`;

    return [gpxHeader, trackHeader, trackPoints, trackFooter, gpxFooter].join(
      "\n"
    );
  }

  /**
   * Export track as GPX file
   */
  async exportGPX(track: GPXTrack): Promise<string> {
    const gpxContent = this.generateGPX(track);
    const fileName = `${track.name.replace(/[^a-z0-9]/gi, "_")}_${track.startTime.toISOString().slice(0, 10)}.gpx`;
    const fileUri = getDocumentDirectory() + fileName;

    await FileSystem.writeAsStringAsync(fileUri, gpxContent, {
      encoding: "utf8" as any,
    });

    return fileUri;
  }

  /**
   * Share GPX file
   */
  async shareGPX(track: GPXTrack): Promise<void> {
    const fileUri = await this.exportGPX(track);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/gpx+xml",
        dialogTitle: `Del ${track.name} GPX-fil`,
      });
    }
  }

  /**
   * Save GPX file to device storage
   */
  async saveGPXToDevice(track: GPXTrack): Promise<void> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Media library permission not granted");
    }

    const fileUri = await this.exportGPX(track);
    const asset = await MediaLibrary.createAssetAsync(fileUri);

    // Try to save to a specific album
    let album = await MediaLibrary.getAlbumAsync("EchoTrail GPX");
    if (!album) {
      album = await MediaLibrary.createAlbumAsync(
        "EchoTrail GPX",
        asset,
        false
      );
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
  }

  /**
   * Save track to local storage
   */
  private async saveTrackLocally(track: GPXTrack): Promise<void> {
    try {
      const tracksDir = `${getDocumentDirectory()}tracks/`;
      const dirInfo = await FileSystem.getInfoAsync(tracksDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tracksDir, { intermediates: true });
      }

      const fileName = `track_${track.id}.json`;
      const filePath = tracksDir + fileName;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(track), {
        encoding: "utf8" as any,
      });
    } catch (error) {
      logger.error("Error saving track locally:", error);
    }
  }

  /**
   * Load all saved tracks
   */
  async loadSavedTracks(): Promise<GPXTrack[]> {
    try {
      const tracksDir = `${getDocumentDirectory()}tracks/`;
      const dirInfo = await FileSystem.getInfoAsync(tracksDir);

      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(tracksDir);
      const tracks: GPXTrack[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = tracksDir + file;
            const content = await FileSystem.readAsStringAsync(filePath);
            const track = JSON.parse(content) as GPXTrack;

            // Parse dates from strings
            track.startTime = new Date(track.startTime);
            if (track.endTime) {
              track.endTime = new Date(track.endTime);
            }
            track.points.forEach((point) => {
              point.time = new Date(point.time);
            });

            tracks.push(track);
          } catch (error) {
            logger.error(`Error loading track from ${file}:`, error);
          }
        }
      }

      return tracks.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime()
      );
    } catch (error) {
      logger.error("Error loading saved tracks:", error);
      return [];
    }
  }

  /**
   * Delete a saved track
   */
  async deleteTrack(trackId: string): Promise<boolean> {
    try {
      const filePath = `${getDocumentDirectory()}tracks/track_${trackId}.json`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Error deleting track:", error);
      return false;
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        case '"':
          return "&quot;";
        default:
          return c;
      }
    });
  }

  /**
   * Calculate track statistics from points
   */
  static calculateTrackStatistics(points: GPXPoint[]): {
    distance: number;
    duration: number;
    averageSpeed: number;
    maxSpeed: number;
    elevationGain: number;
    elevationLoss: number;
  } {
    if (points.length < 2) {
      return {
        distance: 0,
        duration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      };
    }

    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxSpeed = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Calculate distance
      const distance = GPXService.prototype.calculateDistance.call(
        null,
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      totalDistance += distance;

      // Calculate elevation changes
      if (prev.elevation !== undefined && curr.elevation !== undefined) {
        const elevationChange = curr.elevation - prev.elevation;
        if (elevationChange > 0) {
          elevationGain += elevationChange;
        } else {
          elevationLoss += Math.abs(elevationChange);
        }
      }

      // Track max speed
      if (curr.speed !== undefined && curr.speed > maxSpeed) {
        maxSpeed = curr.speed;
      }
    }

    const duration = Math.floor(
      (points[points.length - 1].time.getTime() - points[0].time.getTime()) /
        1000
    );

    const averageSpeed = duration > 0 ? totalDistance / duration : 0;

    return {
      distance: totalDistance,
      duration,
      averageSpeed,
      maxSpeed,
      elevationGain,
      elevationLoss,
    };
  }
}

export default new GPXService();
