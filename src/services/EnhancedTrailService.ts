// NOTE: This is a stub file to prevent TypeScript errors
// Real API service dependencies are missing

import * as SecureStore from "expo-secure-store";
import { logger } from "../utils/logger";
import { Trail } from "../types/Trail";
import { LocationPoint } from "./LocationService";
import { conflictResolutionService } from "./ConflictResolutionService";
import { notificationService } from "./NotificationService";

// Mock API service
const apiService = {
  getTrails: () => Promise.resolve([]),
  createTrail: (data: any) => Promise.resolve({ _id: "mock-id", ...data }),
  uploadTrackPoints: (id: string, points: any[]) => Promise.resolve(),
  deleteTrail: (id: string) => Promise.resolve(),
};

// Mock TrackPoint
interface ApiTrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  elevation?: number;
}

const PENDING_TRAILS_KEY = "pending_trails";
const ACTIVE_SESSION_KEY = "active_recording_session";

export interface TrailRecordingState {
  _isRecording: boolean;
  _currentTrail: LocalTrail | null;
  points: LocationPoint[];
  _startTime: number | null;
  distance: number;
  _duration: number;
}

export interface LocalTrail {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  points: LocationPoint[];
  startTime: number;
  endTime?: number;
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  synced: boolean;
  remoteId?: string;
}

export class EnhancedTrailService {
  private recordingState: TrailRecordingState = {
    _isRecording: false,
    _currentTrail: null,
    points: [],
    _startTime: null,
    distance: 0,
    _duration: 0,
  };

  private onStateChange?: (state: TrailRecordingState) => void;

  setOnStateChange(callback: (state: TrailRecordingState) => void) {
    this.onStateChange = callback;
  }

  private notifyStateChange() {
    this.onStateChange?.(this.recordingState);
  }

  async startRecording(name?: string): Promise<boolean> {
    logger.debug("Mock startRecording:", name);
    return true;
  }

  async stopRecording(): Promise<LocalTrail | null> {
    logger.debug("Mock stopRecording");
    return null;
  }

  async addLocationPoint(_point: LocationPoint): Promise<void> {
    logger.debug("Mock addLocationPoint");
  }

  async getAllTrails(): Promise<(LocalTrail | Trail)[]> {
    logger.debug("Mock getAllTrails");
    return [];
  }

  async getLocalTrails(): Promise<LocalTrail[]> {
    return [];
  }

  async getBackendTrails(): Promise<Trail[]> {
    return [];
  }

  private calculateDistance(
    _lat1: number,
    _lon1: number,
    _lat2: number,
    _lon2: number
  ): number {
    return 0;
  }

  private calculateElevationStats(_trail: LocalTrail): void {
    // Mock implementation
  }

  private async saveTrailLocally(_trail: LocalTrail): Promise<void> {
    logger.debug("Mock saveTrailLocally");
  }

  private async saveActiveSession(): Promise<void> {
    logger.debug("Mock saveActiveSession");
  }

  private async syncTrailWithBackend(_trail: LocalTrail): Promise<void> {
    logger.debug("Mock syncTrailWithBackend");
  }

  async loadActiveSession(): Promise<void> {
    logger.debug("Mock loadActiveSession");
  }

  getRecordingState(): TrailRecordingState {
    return this.recordingState;
  }

  async deleteTrail(trailId: string): Promise<void> {
    logger.debug("Mock deleteTrail:", trailId);
  }

  async updateTrail(trailId: string, trailData?: any): Promise<void> {
    logger.debug("Mock updateTrail:", trailId, trailData);
  }
}

export const enhancedTrailService = new EnhancedTrailService();
