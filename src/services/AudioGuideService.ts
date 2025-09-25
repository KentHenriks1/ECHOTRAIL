// Audio functionality simplified for demo
import * as Location from "expo-location";
import OpenAITTSService from "./OpenAITTSService";
import { Trail, AudioGuidePoint } from "../types/Trail";
import { calculateDistance } from "../utils/trailUtils";
import { logger } from "../utils/logger";

export interface AudioGuideState {
  _isPlaying: boolean;
  currentPoint?: AudioGuidePoint;
  playedPoints: string[];
  sound?: any;
  trail?: Trail;
  userLocation?: { latitude: number; longitude: number };
}

export interface AudioGuidePlaybackOptions {
  voice?: string;
  speed?: number;
  volume?: number;
  useOpenAI?: boolean;
}

class AudioGuideService {
  private state: AudioGuideState = {
    _isPlaying: false,
    playedPoints: [],
  };

  private proximityThreshold = 50; // meters
  private locationSubscription: Location.LocationSubscription | null = null;
  private checkInterval: number | null = null;

  /**
   * Initialize audio guide for a trail
   */
  async initializeForTrail(
    trail: Trail,
    options: AudioGuidePlaybackOptions = {}
  ): Promise<void> {
    // Stop any current audio
    await this.stop();

    this.state = {
      _isPlaying: false,
      currentPoint: undefined,
      playedPoints: [],
      trail,
    };

    // Audio setup simplified for demo
    logger.debug("Audio guide initialized for trail:", trail.name);
  }

  /**
   * Start monitoring user location for audio guide points
   */
  async startLocationMonitoring(
    options: AudioGuidePlaybackOptions = {}
  ): Promise<void> {
    if (!this.state.trail) {
      throw new Error("No trail initialized");
    }

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Location permission not granted");
    }

    // Start location tracking
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Check every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      (location) => this.handleLocationUpdate(location, options)
    );

    // Fallback check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkForNearbyPoints(options);
    }, 10000);
  }

  /**
   * Stop location monitoring
   */
  async stopLocationMonitoring(): Promise<void> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Handle location updates
   */
  private async handleLocationUpdate(
    location: Location.LocationObject,
    options: AudioGuidePlaybackOptions
  ): Promise<void> {
    const userLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    this.state.userLocation = userLocation;
    await this.checkForNearbyPoints(options);
  }

  /**
   * Check if user is near any audio guide points
   */
  private async checkForNearbyPoints(
    options: AudioGuidePlaybackOptions
  ): Promise<void> {
    if (
      !this.state.trail ||
      !this.state.userLocation ||
      this.state._isPlaying
    ) {
      return;
    }

    const unplayedPoints = this.state.trail.audioGuidePoints.filter(
      (point) => !this.state.playedPoints.includes(point.id)
    );

    // Find the closest unplayed point within threshold
    let closestPoint: AudioGuidePoint | null = null;
    let closestDistance = Infinity;

    for (const point of unplayedPoints) {
      const distance = calculateDistance(
        this.state.userLocation.latitude,
        this.state.userLocation.longitude,
        point.coordinate.latitude,
        point.coordinate.longitude
      );

      if (distance <= this.proximityThreshold && distance < closestDistance) {
        closestPoint = point;
        closestDistance = distance;
      }
    }

    if (closestPoint) {
      await this.playAudioGuidePoint(closestPoint, options);
    }
  }

  /**
   * Play a specific audio guide point
   */
  async playAudioGuidePoint(
    point: AudioGuidePoint,
    options: AudioGuidePlaybackOptions = {}
  ): Promise<void> {
    try {
      // Stop any current audio
      await this.stopCurrentAudio();

      this.state._isPlaying = true;
      this.state.currentPoint = point;

      const useOpenAI =
        options.useOpenAI ?? (await OpenAITTSService.isAvailable());

      if (useOpenAI) {
        await this.playWithOpenAI(point, options);
      } else {
        await this.playWithSystemTTS(point);
      }

      // Mark as played
      this.state.playedPoints.push(point.id);
    } catch (error) {
      logger.error("Error playing audio guide point:", error);
      this.state._isPlaying = false;
      this.state.currentPoint = undefined;
    }
  }

  /**
   * Play using OpenAI TTS
   */
  private async playWithOpenAI(
    point: AudioGuidePoint,
    options: AudioGuidePlaybackOptions
  ): Promise<void> {
    const voice = options.voice || "nova"; // Use high-quality voice
    const speed = options.speed || 0.85; // Slightly slower for trail narration

    const content = point.content || point.audioScript;
    await OpenAITTSService.speakText(
      content,
      {
        voice: voice as any,
        speed,
        model: "tts-1-hd", // Use highest quality model
      },
      {
        onStart: () => {
          logger.debug(`Started playing audio guide: ${point.title}`);
        },
        onComplete: () => {
          this.state._isPlaying = false;
          this.state.currentPoint = undefined;
          logger.debug(`Finished playing audio guide: ${point.title}`);
        },
        onError: (error) => {
          logger.error("OpenAI TTS error:", error);
          // Fallback to system TTS
          this.playWithSystemTTS(point);
        },
      }
    );
  }

  /**
   * Play using system TTS
   */
  private async playWithSystemTTS(point: AudioGuidePoint): Promise<void> {
    try {
      const Speech = (await import("expo-speech")).default;

      // Use Speech for system TTS
      const content = point.content || point.audioScript;
      logger.debug(`Playing with system TTS: ${point.title}`);

      await Speech.speak(content, {
        language: "nb-NO",
        pitch: 1.0,
        rate: 0.8,
        onStart: () => {
          logger.debug(`Started playing audio guide: ${point.title}`);
        },
        onDone: () => {
          this.state._isPlaying = false;
          this.state.currentPoint = undefined;
          logger.debug(`Finished playing audio guide: ${point.title}`);
        },
      });
    } catch (error) {
      logger.error("System TTS error:", error);
      this.state._isPlaying = false;
      this.state.currentPoint = undefined;
    }
  }

  /**
   * Stop current audio playback
   */
  async stopCurrentAudio(): Promise<void> {
    if (this.state.sound) {
      try {
        await this.state.sound.stopAsync();
        await this.state.sound.unloadAsync();
      } catch (error) {
        logger.error("Error stopping audio:", error);
      }
      this.state.sound = undefined;
    }

    // Stop OpenAI TTS if playing
    try {
      await OpenAITTSService.stopAudio();
    } catch (error) {
      // OpenAI TTS might not be initialized
    }

    // Stop system TTS
    try {
      const Speech = (await import("expo-speech")).default;
      Speech.stop();
    } catch (error) {
      // Speech might not be available
    }

    this.state._isPlaying = false;
    this.state.currentPoint = undefined;
  }

  /**
   * Stop audio guide completely
   */
  async stop(): Promise<void> {
    await this.stopLocationMonitoring();
    await this.stopCurrentAudio();

    this.state = {
      _isPlaying: false,
      playedPoints: [],
    };
  }

  /**
   * Pause current audio
   */
  async pause(): Promise<void> {
    if (this.state.sound) {
      await this.state.sound.pauseAsync();
    }

    // Note: System TTS and OpenAI TTS don't support pausing
    // Would need to stop and remember position for those
  }

  /**
   * Resume current audio
   */
  async resume(): Promise<void> {
    if (this.state.sound) {
      await this.state.sound.playAsync();
    }
  }

  /**
   * Skip current audio guide point
   */
  async skip(): Promise<void> {
    await this.stopCurrentAudio();

    if (this.state.currentPoint) {
      // Mark current point as played
      this.state.playedPoints.push(this.state.currentPoint.id);
    }
  }

  /**
   * Reset played points (for replaying trail)
   */
  resetPlayedPoints(): void {
    this.state.playedPoints = [];
  }

  /**
   * Get current audio guide state
   */
  getState(): AudioGuideState {
    return { ...this.state };
  }

  /**
   * Get progress through audio guide points
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    const total = this.state.trail?.audioGuidePoints.length || 0;
    const completed = this.state.playedPoints.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  /**
   * Get upcoming audio guide points
   */
  getUpcomingPoints(limit: number = 3): AudioGuidePoint[] {
    if (!this.state.trail || !this.state.userLocation) {
      return [];
    }

    const unplayedPoints = this.state.trail.audioGuidePoints
      .filter((point) => !this.state.playedPoints.includes(point.id))
      .map((point) => ({
        ...point,
        distance: calculateDistance(
          this.state.userLocation!.latitude,
          this.state.userLocation!.longitude,
          point.coordinate.latitude,
          point.coordinate.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return unplayedPoints;
  }

  /**
   * Manually trigger a specific audio guide point
   */
  async playPointById(
    pointId: string,
    options: AudioGuidePlaybackOptions = {}
  ): Promise<void> {
    if (!this.state.trail) {
      throw new Error("No trail initialized");
    }

    const point = this.state.trail.audioGuidePoints.find(
      (p) => p.id === pointId
    );
    if (!point) {
      throw new Error(`Audio guide point with ID ${pointId} not found`);
    }

    await this.playAudioGuidePoint(point, options);
  }

  /**
   * Set proximity threshold for audio guide points
   */
  setProximityThreshold(meters: number): void {
    this.proximityThreshold = Math.max(10, Math.min(500, meters)); // Between 10m and 500m
  }

  /**
   * Get available OpenAI voices
   */
  getAvailableVoices() {
    return OpenAITTSService.getAvailableVoices();
  }

  /**
   * Check if OpenAI TTS is available
   */
  async isOpenAITTSAvailable(): Promise<boolean> {
    return await OpenAITTSService.isAvailable();
  }

  /**
   * Generate audio preview for a point
   */
  async previewAudioPoint(
    point: AudioGuidePoint,
    options: AudioGuidePlaybackOptions = {}
  ): Promise<void> {
    const content = point.content || point.audioScript;
    const previewText =
      content.length > 200 ? `${content.substring(0, 200)}...` : content;

    const useOpenAI =
      options.useOpenAI ?? (await OpenAITTSService.isAvailable());

    if (useOpenAI) {
      const voice = options.voice || "nova"; // Use high-quality voice
      await OpenAITTSService.speakText(previewText, {
        voice: voice as any,
        speed: options.speed || 0.9,
        model: "tts-1-hd",
      });
    } else {
      const Speech = (await import("expo-speech")).default;
      await Speech.speak(previewText, {
        language: "nb-NO",
        pitch: 1.0,
        rate: options.speed || 0.9,
      });
    }
  }

  /**
   * Export audio guide statistics
   */
  getStatistics(): {
    totalPoints: number;
    playedPoints: number;
    completionPercentage: number;
    averagePointLength: number;
    totalContentLength: number;
  } {
    const totalPoints = this.state.trail?.audioGuidePoints.length || 0;
    const playedPoints = this.state.playedPoints.length;
    const completionPercentage =
      totalPoints > 0 ? Math.round((playedPoints / totalPoints) * 100) : 0;

    const allContent =
      this.state.trail?.audioGuidePoints.map((p) => p.content) || [];
    const totalContentLength = allContent.reduce(
      (sum, content) => sum + (content?.length || 0),
      0
    );
    const averagePointLength =
      totalPoints > 0 ? Math.round(totalContentLength / totalPoints) : 0;

    return {
      totalPoints,
      playedPoints,
      completionPercentage,
      averagePointLength,
      totalContentLength,
    };
  }
}

export default new AudioGuideService();
