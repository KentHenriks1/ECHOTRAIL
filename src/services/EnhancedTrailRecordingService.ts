import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { logger } from "../utils/logger";
import IntelligentLocationService, {
  LocationContext,
  MovementMode,
} from "./IntelligentLocationService";

export interface TrailPhoto {
  id: string;
  uri: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  description?: string;
  isSavedToGallery: boolean;
}

export interface TrailPoint {
  id: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp: Date;
  accuracy?: number;
  speed?: number; // km/h
  heading?: number;
  movementMode: MovementMode;
}

export interface VisualTrailSegment {
  id: string;
  points: TrailPoint[];
  startTime: Date;
  endTime: Date;
  movementMode: MovementMode;
  distance: number; // meters
  duration: number; // seconds
  averageSpeed: number; // km/h
  color: string; // Hex color for rendering
}

export interface TrailMemory {
  id: string;
  name: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;

  // Trail data
  segments: VisualTrailSegment[];
  photos: TrailPhoto[];

  // Statistics
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalElevationGain: number; // meters
  totalElevationLoss: number; // meters
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h

  // Movement breakdown
  stationaryTime: number; // seconds
  walkingTime: number; // seconds
  cyclingTime: number; // seconds
  drivingTime: number; // seconds

  // Visual data
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  centerPoint: {
    latitude: number;
    longitude: number;
  };

  // Metadata
  weather?: string;
  tags: string[];
  isShared: boolean;
  shareId?: string;
}

export interface TrailStatistics {
  currentSpeed: number; // km/h
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  totalDistance: number; // meters
  totalDuration: number; // seconds
  elevationGain: number; // meters
  elevationLoss: number; // meters
  photoCount: number;
  currentMovementMode: MovementMode;

  // Real-time movement breakdown
  stationaryTime: number; // seconds
  walkingTime: number; // seconds
  cyclingTime: number; // seconds
  drivingTime: number; // seconds

  // Environmental data
  currentElevation?: number;
  currentAccuracy?: number;
}

export interface TrailRecordingCallbacks {
  onLocationUpdate?: (
    location: TrailPoint,
    statistics: TrailStatistics
  ) => void;
  onPhotoTaken?: (photo: TrailPhoto) => void;
  onMovementModeChange?: (mode: MovementMode) => void;
  onStatisticsUpdate?: (statistics: TrailStatistics) => void;
  onError?: (error: string) => void;
}

class EnhancedTrailRecordingService {
  private static instance: EnhancedTrailRecordingService;

  private currentMemory: TrailMemory | null = null;
  private isRecording = false;
  private callbacks: TrailRecordingCallbacks = {};

  // Real-time tracking
  private currentSegment: VisualTrailSegment | null = null;
  private lastMovementMode: MovementMode = MovementMode.STATIONARY;
  private lastLocation: TrailPoint | null = null;
  private statistics: TrailStatistics;

  // Colors for different movement modes
  private readonly MOVEMENT_COLORS = {
    [MovementMode.STATIONARY]: "#ef4444", // Red
    [MovementMode.WALKING]: "#22c55e", // Green
    [MovementMode.CYCLING]: "#3b82f6", // Blue
    [MovementMode.DRIVING]: "#f59e0b", // Orange
  };

  private constructor() {
    this.statistics = this.initializeStatistics();
    this.setupLocationService();
  }

  static getInstance(): EnhancedTrailRecordingService {
    if (!EnhancedTrailRecordingService.instance) {
      EnhancedTrailRecordingService.instance =
        new EnhancedTrailRecordingService();
    }
    return EnhancedTrailRecordingService.instance;
  }

  /**
   * Setup location service integration
   */
  private setupLocationService(): void {
    // This will be integrated with location updates from IntelligentLocationService
  }

  /**
   * Initialize statistics object
   */
  private initializeStatistics(): TrailStatistics {
    return {
      currentSpeed: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      totalDistance: 0,
      totalDuration: 0,
      elevationGain: 0,
      elevationLoss: 0,
      photoCount: 0,
      currentMovementMode: MovementMode.STATIONARY,
      stationaryTime: 0,
      walkingTime: 0,
      cyclingTime: 0,
      drivingTime: 0,
    };
  }

  /**
   * Set callbacks for real-time updates
   */
  setCallbacks(callbacks: TrailRecordingCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start recording a new trail memory
   */
  async startRecording(name: string, description?: string): Promise<boolean> {
    if (this.isRecording) {
      logger.warn("Recording already in progress");
      return false;
    }

    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Location permission not granted");
      }

      const { status: mediaStatus } =
        await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus !== "granted") {
        logger.warn(
          "Media library permission not granted - photos will not be saved to gallery"
        );
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      // Create initial trail point
      const initialPoint: TrailPoint = {
        id: this.generateId(),
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        elevation: initialLocation.coords.altitude || undefined,
        timestamp: new Date(),
        accuracy: initialLocation.coords.accuracy || undefined,
        speed: initialLocation.coords.speed
          ? initialLocation.coords.speed * 3.6
          : undefined,
        heading: initialLocation.coords.heading || undefined,
        movementMode: MovementMode.STATIONARY,
      };

      // Initialize trail memory
      const memoryId = this.generateId();
      this.currentMemory = {
        id: memoryId,
        name,
        description,
        startTime: new Date(),
        isActive: true,
        segments: [],
        photos: [],
        totalDistance: 0,
        totalDuration: 0,
        totalElevationGain: 0,
        totalElevationLoss: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        stationaryTime: 0,
        walkingTime: 0,
        cyclingTime: 0,
        drivingTime: 0,
        bounds: {
          north: initialPoint.latitude,
          south: initialPoint.latitude,
          east: initialPoint.longitude,
          west: initialPoint.longitude,
        },
        centerPoint: {
          latitude: initialPoint.latitude,
          longitude: initialPoint.longitude,
        },
        tags: [],
        isShared: false,
      };

      // Start first segment
      this.startNewSegment(initialPoint);

      // Start location tracking
      await IntelligentLocationService.startIntelligentTracking(
        [], // No specific interests needed for trail recording
        this.handleLocationUpdate.bind(this),
        this.handleMovementModeChange.bind(this)
      );

      this.isRecording = true;
      this.statistics = this.initializeStatistics();

      logger.info(`Started recording trail: ${name}`);
      return true;
    } catch (error) {
      logger.error("Failed to start recording:", error);
      this.callbacks.onError?.(`Kunne ikke starte opptak: ${error}`);
      return false;
    }
  }

  /**
   * Stop recording and save trail memory
   */
  async stopRecording(): Promise<TrailMemory | null> {
    if (!this.isRecording || !this.currentMemory) {
      return null;
    }

    try {
      // Stop location tracking
      await IntelligentLocationService.stopTracking();

      // Finish current segment
      if (this.currentSegment) {
        this.finishCurrentSegment();
      }

      // Finalize trail memory
      this.currentMemory.endTime = new Date();
      this.currentMemory.isActive = false;
      this.currentMemory.totalDuration = Math.floor(
        (this.currentMemory.endTime.getTime() -
          this.currentMemory.startTime.getTime()) /
          1000
      );

      // Calculate final statistics
      this.calculateFinalStatistics();

      // Save to local storage
      const savedMemory = { ...this.currentMemory };
      await this.saveTrailMemory(savedMemory);

      this.isRecording = false;
      this.currentMemory = null;
      this.currentSegment = null;

      logger.info("Trail recording completed and saved");
      return savedMemory;
    } catch (error) {
      logger.error("Error stopping recording:", error);
      this.callbacks.onError?.(`Feil ved stopping av opptak: ${error}`);
      return null;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): boolean {
    if (!this.isRecording || !this.currentMemory) {
      return false;
    }

    // Finish current segment
    if (this.currentSegment) {
      this.finishCurrentSegment();
    }

    logger.info("Trail recording paused");
    return true;
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<boolean> {
    if (!this.isRecording || !this.currentMemory || !this.lastLocation) {
      return false;
    }

    // Start new segment from last location
    this.startNewSegment(this.lastLocation);

    logger.info("Trail recording resumed");
    return true;
  }

  /**
   * Take photo at current location
   */
  async takePhoto(description?: string): Promise<TrailPhoto | null> {
    if (!this.isRecording || !this.currentMemory) {
      logger.warn("Cannot take photo - not recording");
      return null;
    }

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Tillatelse nødvendig",
          "Kamera-tilgang kreves for å ta bilder"
        );
        return null;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        exif: true,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];

      // Get current location
      const currentLocation =
        IntelligentLocationService.getCurrentContext()?.currentLocation;
      if (!currentLocation) {
        Alert.alert("Feil", "Kunne ikke få gjeldende posisjon");
        return null;
      }

      // Create photo object
      const photo: TrailPhoto = {
        id: this.generateId(),
        uri: asset.uri,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date(),
        description,
        isSavedToGallery: false,
      };

      // Save to gallery if permission granted
      try {
        const { status: mediaStatus } =
          await MediaLibrary.getPermissionsAsync();
        if (mediaStatus === "granted") {
          await MediaLibrary.createAssetAsync(asset.uri);
          photo.isSavedToGallery = true;
        }
      } catch (error) {
        logger.warn("Failed to save photo to gallery:", error);
      }

      // Add to current trail memory
      this.currentMemory.photos.push(photo);
      this.statistics.photoCount = this.currentMemory.photos.length;

      // Save trail memory
      await this.saveTrailMemory(this.currentMemory);

      this.callbacks.onPhotoTaken?.(photo);
      logger.info(`Photo taken at ${photo.latitude}, ${photo.longitude}`);

      return photo;
    } catch (error) {
      logger.error("Error taking photo:", error);
      this.callbacks.onError?.(`Feil ved fotografering: ${error}`);
      return null;
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): {
    isRecording: boolean;
    currentMemory: TrailMemory | null;
    statistics: TrailStatistics;
  } {
    return {
      isRecording: this.isRecording,
      currentMemory: this.currentMemory,
      statistics: this.statistics,
    };
  }

  /**
   * Get all saved trail memories
   */
  async getSavedMemories(): Promise<TrailMemory[]> {
    try {
      const memoriesJson = await AsyncStorage.getItem("echotrail_memories");
      if (!memoriesJson) {
        return [];
      }

      const memories = JSON.parse(memoriesJson);
      return memories.map((memory: any) => ({
        ...memory,
        startTime: new Date(memory.startTime),
        endTime: memory.endTime ? new Date(memory.endTime) : undefined,
        segments: memory.segments.map((segment: any) => ({
          ...segment,
          startTime: new Date(segment.startTime),
          endTime: new Date(segment.endTime),
          points: segment.points.map((point: any) => ({
            ...point,
            timestamp: new Date(point.timestamp),
          })),
        })),
        photos: memory.photos.map((photo: any) => ({
          ...photo,
          timestamp: new Date(photo.timestamp),
        })),
      }));
    } catch (error) {
      logger.error("Error loading saved memories:", error);
      return [];
    }
  }

  /**
   * Delete a trail memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const memories = await this.getSavedMemories();
      const updatedMemories = memories.filter(
        (memory) => memory.id !== memoryId
      );

      await AsyncStorage.setItem(
        "echotrail_memories",
        JSON.stringify(updatedMemories)
      );
      logger.info(`Deleted memory: ${memoryId}`);
      return true;
    } catch (error) {
      logger.error("Error deleting memory:", error);
      return false;
    }
  }

  /**
   * Export trail memory as GPX
   */
  async exportMemoryAsGPX(memory: TrailMemory): Promise<string | null> {
    try {
      const gpxContent = this.generateGPXFromMemory(memory);
      const fileName = `${memory.name.replace(/[^a-z0-9]/gi, "_")}_${memory.startTime.toISOString().slice(0, 10)}.gpx`;
      // Temporary solution - skip file writing for now due to FileSystem compatibility issues
      const documentsDirectory = "";
      const fileUri = documentsDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, gpxContent);
      logger.info(`Exported GPX: ${fileName}`);
      return fileUri;
    } catch (error) {
      logger.error("Error exporting GPX:", error);
      return null;
    }
  }

  /**
   * Handle location updates from IntelligentLocationService
   */
  private handleLocationUpdate(context: LocationContext): void {
    if (!this.isRecording || !this.currentMemory || !this.currentSegment) {
      return;
    }

    const newPoint: TrailPoint = {
      id: this.generateId(),
      latitude: context.currentLocation.coords.latitude,
      longitude: context.currentLocation.coords.longitude,
      elevation: context.currentLocation.coords.altitude || undefined,
      timestamp: new Date(),
      accuracy: context.accuracy,
      speed: context.speed,
      heading: context.direction,
      movementMode: context.movementMode,
    };

    // Add point to current segment
    this.currentSegment.points.push(newPoint);

    // Update statistics
    this.updateStatistics(newPoint);

    // Update bounds
    this.updateBounds(newPoint);

    this.lastLocation = newPoint;

    this.callbacks.onLocationUpdate?.(newPoint, this.statistics);
    this.callbacks.onStatisticsUpdate?.(this.statistics);
  }

  /**
   * Handle movement mode changes
   */
  private handleMovementModeChange(
    mode: MovementMode,
    context: LocationContext
  ): void {
    if (!this.isRecording || !this.currentMemory) {
      return;
    }

    if (mode !== this.lastMovementMode) {
      // Finish current segment and start new one
      if (this.currentSegment) {
        this.finishCurrentSegment();
      }

      if (this.lastLocation) {
        this.startNewSegment({
          ...this.lastLocation,
          movementMode: mode,
        });
      }

      this.lastMovementMode = mode;
      this.callbacks.onMovementModeChange?.(mode);
    }
  }

  /**
   * Start a new trail segment
   */
  private startNewSegment(initialPoint: TrailPoint): void {
    this.currentSegment = {
      id: this.generateId(),
      points: [initialPoint],
      startTime: new Date(),
      endTime: new Date(),
      movementMode: initialPoint.movementMode,
      distance: 0,
      duration: 0,
      averageSpeed: 0,
      color: this.MOVEMENT_COLORS[initialPoint.movementMode],
    };
  }

  /**
   * Finish current segment
   */
  private finishCurrentSegment(): void {
    if (!this.currentSegment || !this.currentMemory) {
      return;
    }

    this.currentSegment.endTime = new Date();
    this.currentSegment.duration = Math.floor(
      (this.currentSegment.endTime.getTime() -
        this.currentSegment.startTime.getTime()) /
        1000
    );

    // Calculate segment statistics
    this.calculateSegmentStatistics(this.currentSegment);

    // Add to memory
    this.currentMemory.segments.push(this.currentSegment);
    this.currentSegment = null;
  }

  /**
   * Calculate statistics for a segment
   */
  private calculateSegmentStatistics(segment: VisualTrailSegment): void {
    if (segment.points.length < 2) {
      return;
    }

    let totalDistance = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    for (let i = 1; i < segment.points.length; i++) {
      const prev = segment.points[i - 1];
      const curr = segment.points[i];

      // Calculate distance
      const distance = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      totalDistance += distance;

      // Track speed
      if (curr.speed && curr.speed > 0) {
        totalSpeed += curr.speed;
        speedCount++;
      }
    }

    segment.distance = totalDistance;
    segment.averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;
  }

  /**
   * Update real-time statistics
   */
  private updateStatistics(newPoint: TrailPoint): void {
    if (!this.lastLocation) {
      this.lastLocation = newPoint;
      return;
    }

    // Calculate distance from last point
    const distance = this.calculateDistance(
      this.lastLocation.latitude,
      this.lastLocation.longitude,
      newPoint.latitude,
      newPoint.longitude
    );

    this.statistics.totalDistance += distance;
    this.statistics.currentSpeed = newPoint.speed || 0;

    if (newPoint.speed && newPoint.speed > this.statistics.maxSpeed) {
      this.statistics.maxSpeed = newPoint.speed;
    }

    // Update duration and average speed
    this.statistics.totalDuration = Math.floor(
      (newPoint.timestamp.getTime() - this.currentMemory!.startTime.getTime()) /
        1000
    );

    if (this.statistics.totalDuration > 0) {
      this.statistics.averageSpeed =
        this.statistics.totalDistance /
        1000 /
        (this.statistics.totalDuration / 3600);
    }

    // Update elevation
    if (this.lastLocation.elevation && newPoint.elevation) {
      const elevationChange = newPoint.elevation - this.lastLocation.elevation;
      if (elevationChange > 0) {
        this.statistics.elevationGain += elevationChange;
      } else {
        this.statistics.elevationLoss += Math.abs(elevationChange);
      }
    }

    // Update movement mode times
    const timeDiff =
      newPoint.timestamp.getTime() - this.lastLocation.timestamp.getTime();
    const timeDiffSeconds = timeDiff / 1000;

    switch (newPoint.movementMode) {
      case MovementMode.STATIONARY:
        this.statistics.stationaryTime += timeDiffSeconds;
        break;
      case MovementMode.WALKING:
        this.statistics.walkingTime += timeDiffSeconds;
        break;
      case MovementMode.CYCLING:
        this.statistics.cyclingTime += timeDiffSeconds;
        break;
      case MovementMode.DRIVING:
        this.statistics.drivingTime += timeDiffSeconds;
        break;
    }

    this.statistics.currentMovementMode = newPoint.movementMode;
    this.statistics.currentElevation = newPoint.elevation;
    this.statistics.currentAccuracy = newPoint.accuracy;
  }

  /**
   * Update trail bounds
   */
  private updateBounds(point: TrailPoint): void {
    if (!this.currentMemory) {
      return;
    }

    const bounds = this.currentMemory.bounds;
    bounds.north = Math.max(bounds.north, point.latitude);
    bounds.south = Math.min(bounds.south, point.latitude);
    bounds.east = Math.max(bounds.east, point.longitude);
    bounds.west = Math.min(bounds.west, point.longitude);

    // Update center point
    this.currentMemory.centerPoint = {
      latitude: (bounds.north + bounds.south) / 2,
      longitude: (bounds.east + bounds.west) / 2,
    };
  }

  /**
   * Calculate final statistics
   */
  private calculateFinalStatistics(): void {
    if (!this.currentMemory) {
      return;
    }

    let totalDistance = 0;
    let maxSpeed = 0;

    this.currentMemory.segments.forEach((segment) => {
      totalDistance += segment.distance;

      segment.points.forEach((point) => {
        if (point.speed && point.speed > maxSpeed) {
          maxSpeed = point.speed;
        }
      });
    });

    this.currentMemory.totalDistance = totalDistance;
    this.currentMemory.maxSpeed = maxSpeed;
    this.currentMemory.averageSpeed =
      this.currentMemory.totalDuration > 0
        ? totalDistance / 1000 / (this.currentMemory.totalDuration / 3600)
        : 0;

    this.currentMemory.totalElevationGain = this.statistics.elevationGain;
    this.currentMemory.totalElevationLoss = this.statistics.elevationLoss;
    this.currentMemory.stationaryTime = this.statistics.stationaryTime;
    this.currentMemory.walkingTime = this.statistics.walkingTime;
    this.currentMemory.cyclingTime = this.statistics.cyclingTime;
    this.currentMemory.drivingTime = this.statistics.drivingTime;
  }

  /**
   * Save trail memory to storage
   */
  private async saveTrailMemory(memory: TrailMemory): Promise<void> {
    try {
      const memories = await this.getSavedMemories();
      const existingIndex = memories.findIndex((m) => m.id === memory.id);

      if (existingIndex >= 0) {
        memories[existingIndex] = memory;
      } else {
        memories.push(memory);
      }

      await AsyncStorage.setItem(
        "echotrail_memories",
        JSON.stringify(memories)
      );
    } catch (error) {
      logger.error("Error saving trail memory:", error);
    }
  }

  /**
   * Generate GPX content from trail memory
   */
  private generateGPXFromMemory(memory: TrailMemory): string {
    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="EchoTrail Enhanced" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${this.escapeXml(memory.name)}</name>
    <desc>${this.escapeXml(memory.description || "")}</desc>
    <time>${memory.startTime.toISOString()}</time>
  </metadata>`;

    const tracks = memory.segments
      .map((segment) => {
        const trackPoints = segment.points
          .map((point) => {
            let trkpt = `      <trkpt lat="${point.latitude}" lon="${point.longitude}">`;
            if (point.elevation !== undefined) {
              trkpt += `\n        <ele>${point.elevation}</ele>`;
            }
            trkpt += `\n        <time>${point.timestamp.toISOString()}</time>`;
            if (point.speed !== undefined) {
              trkpt += `\n        <speed>${point.speed}</speed>`;
            }
            trkpt += `\n        <extensions>`;
            trkpt += `\n          <movement_mode>${point.movementMode}</movement_mode>`;
            trkpt += `\n        </extensions>`;
            trkpt += `\n      </trkpt>`;
            return trkpt;
          })
          .join("\n");

        return `  <trk>
    <name>${segment.movementMode} Segment</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>`;
      })
      .join("\n");

    const waypoints = memory.photos
      .map(
        (photo) => `  <wpt lat="${photo.latitude}" lon="${photo.longitude}">
    <name>Photo: ${photo.timestamp.toISOString()}</name>
    <desc>${this.escapeXml(photo.description || "Photo taken during trail")}</desc>
    <time>${photo.timestamp.toISOString()}</time>
    <sym>Camera</sym>
  </wpt>`
      )
      .join("\n");

    const gpxFooter = `</gpx>`;

    return [gpxHeader, tracks, waypoints, gpxFooter].join("\n");
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
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
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
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default EnhancedTrailRecordingService.getInstance();
