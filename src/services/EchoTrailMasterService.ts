import IntelligentLocationService, {
  LocationContext,
  MovementMode,
  Interest,
} from "./IntelligentLocationService";
import AIContentPipeline, {
  GeneratedContent,
  ContentRequest,
} from "./AIContentPipeline";
import IntelligentAudioSystem, {
  AudioState,
  PlaybackStatus,
} from "./IntelligentAudioSystem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export enum EchoTrailMode {
  DISCOVERY = "DISCOVERY", // Actively exploring, generating content
  PASSIVE = "PASSIVE", // Background listening, less frequent updates
  FOCUSED = "FOCUSED", // User engaged with specific content
  PAUSED = "PAUSED", // System paused by user
}

export enum InteractionState {
  IDLE = "IDLE",
  LISTENING = "LISTENING",
  GENERATING = "GENERATING",
  PLAYING = "PLAYING",
  WAITING = "WAITING",
}

export interface EchoTrailStatus {
  mode: EchoTrailMode;
  interactionState: InteractionState;
  locationContext: LocationContext | null;
  currentContent: GeneratedContent | null;
  playbackStatus: PlaybackStatus;
  queueSize: number;
  isActive: boolean;
  batteryOptimized: boolean;
}

export interface UserProfile {
  interests: Interest[];
  preferredContentLength: "short" | "medium" | "long" | "adaptive";
  audioQuality: "high" | "standard" | "auto";
  activityLevel: "low" | "medium" | "high";
  discoveryRadius: number; // kilometers
  privacyMode: boolean;
}

export interface EchoTrailSettings {
  mode: EchoTrailMode;
  autoStart: boolean;
  backgroundEnabled: boolean;
  minimumStationaryTime: number; // minutes
  contentGenerationInterval: number; // seconds
  maxQueueSize: number;
  batteryOptimization: boolean;
  dataUsageOptimization: boolean;
}

export interface EchoTrailCallbacks {
  onStatusChange?: (status: EchoTrailStatus) => void;
  onContentReady?: (content: GeneratedContent) => void;
  onLocationUpdate?: (context: LocationContext) => void;
  onError?: (error: string) => void;
  onModeChange?: (newMode: EchoTrailMode) => void;
}

class EchoTrailMasterService {
  private static instance: EchoTrailMasterService;

  // Core services
  private locationService = IntelligentLocationService;
  private contentPipeline = AIContentPipeline;
  private audioSystem = IntelligentAudioSystem;

  // State management
  private currentMode: EchoTrailMode = EchoTrailMode.PAUSED;
  private interactionState: InteractionState = InteractionState.IDLE;
  private isActive = false;
  private callbacks: EchoTrailCallbacks = {};

  // User configuration
  private userProfile: UserProfile;
  private settings: EchoTrailSettings;

  // Runtime state
  private lastLocationUpdate: LocationContext | null = null;
  private lastContentGeneration = 0;
  private contentGenerationInProgress = false;
  private statsTracker = {
    totalDistance: 0,
    totalListeningTime: 0,
    contentConsumed: 0,
    sessionsStarted: 0,
  };

  // Default configurations
  private readonly DEFAULT_PROFILE: UserProfile = {
    interests: [
      { id: "1", name: "Historie", category: "history", weight: 0.8 },
      { id: "2", name: "Natur", category: "nature", weight: 0.6 },
      { id: "3", name: "Kultur", category: "culture", weight: 0.7 },
    ],
    preferredContentLength: "adaptive",
    audioQuality: "auto",
    activityLevel: "medium",
    discoveryRadius: 2.0, // 2km radius
    privacyMode: false,
  };

  private readonly DEFAULT_SETTINGS: EchoTrailSettings = {
    mode: EchoTrailMode.DISCOVERY,
    autoStart: true,
    backgroundEnabled: true,
    minimumStationaryTime: 2, // 2 minutes before stationary content
    contentGenerationInterval: 60, // 1 minute
    maxQueueSize: 5,
    batteryOptimization: true,
    dataUsageOptimization: true,
  };

  private constructor() {
    this.userProfile = { ...this.DEFAULT_PROFILE };
    this.settings = { ...this.DEFAULT_SETTINGS };
    this.setupServiceCallbacks();
    this.loadUserConfiguration();
  }

  static getInstance(): EchoTrailMasterService {
    if (!EchoTrailMasterService.instance) {
      EchoTrailMasterService.instance = new EchoTrailMasterService();
    }
    return EchoTrailMasterService.instance;
  }

  /**
   * Initialize and start EchoTrail with user callbacks
   */
  async startEchoTrail(callbacks?: EchoTrailCallbacks): Promise<boolean> {
    try {
      this.callbacks = { ...this.callbacks, ...callbacks };

      logger.info("Starting EchoTrail Master Service");

      // Initialize location tracking
      await this.locationService.startIntelligentTracking(
        this.userProfile.interests,
        this.handleLocationUpdate.bind(this),
        this.handleMovementModeChange.bind(this)
      );

      // Configure audio system
      await this.audioSystem.updateSettings({
        quality: this.mapAudioQuality(this.userProfile.audioQuality),
        backgroundPlayback: this.settings.backgroundEnabled,
        autoPlay: true,
      });

      this.audioSystem.setCallbacks({
        onStateChange: this.handleAudioStateChange.bind(this),
        onContentComplete: this.handleContentComplete.bind(this),
        onError: this.handleAudioError.bind(this),
      });

      // Set initial mode and start
      this.currentMode = this.settings.mode;
      this.isActive = true;
      this.interactionState = InteractionState.IDLE;

      this.statsTracker.sessionsStarted++;
      await this.saveUserConfiguration();

      this.notifyStatusChange();
      logger.info(`EchoTrail started in ${this.currentMode} mode`);

      return true;
    } catch (error) {
      logger.error("Failed to start EchoTrail:", error);
      this.callbacks.onError?.(`Kunne ikke starte EchoTrail: ${error}`);
      return false;
    }
  }

  /**
   * Stop EchoTrail and cleanup resources
   */
  async stopEchoTrail(): Promise<void> {
    try {
      logger.info("Stopping EchoTrail Master Service");

      this.isActive = false;
      this.currentMode = EchoTrailMode.PAUSED;
      this.interactionState = InteractionState.IDLE;

      // Stop all services
      await this.locationService.stopTracking();
      await this.audioSystem.stop();

      this.notifyStatusChange();
      logger.info("EchoTrail stopped");
    } catch (error) {
      logger.error("Error stopping EchoTrail:", error);
    }
  }

  /**
   * Change EchoTrail operating mode
   */
  async setMode(newMode: EchoTrailMode): Promise<void> {
    if (this.currentMode === newMode) return;

    const previousMode = this.currentMode;
    this.currentMode = newMode;

    logger.info(`Mode changed: ${previousMode} -> ${newMode}`);

    // Apply mode-specific behavior
    switch (newMode) {
      case EchoTrailMode.DISCOVERY:
        await this.enterDiscoveryMode();
        break;
      case EchoTrailMode.PASSIVE:
        await this.enterPassiveMode();
        break;
      case EchoTrailMode.FOCUSED:
        await this.enterFocusedMode();
        break;
      case EchoTrailMode.PAUSED:
        await this.enterPausedMode();
        break;
    }

    this.settings.mode = newMode;
    await this.saveUserConfiguration();

    this.callbacks.onModeChange?.(newMode);
    this.notifyStatusChange();
  }

  /**
   * Update user profile and interests
   */
  async updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
    this.userProfile = { ...this.userProfile, ...profile };
    await this.saveUserConfiguration();

    // Update location service with new interests
    if (profile.interests && this.isActive) {
      await this.locationService.stopTracking();
      await this.locationService.startIntelligentTracking(
        this.userProfile.interests,
        this.handleLocationUpdate.bind(this),
        this.handleMovementModeChange.bind(this)
      );
    }

    // Update audio settings if changed
    if (profile.audioQuality) {
      await this.audioSystem.updateSettings({
        quality: this.mapAudioQuality(profile.audioQuality),
      });
    }

    logger.info("User profile updated");
  }

  /**
   * Update system settings
   */
  async updateSettings(newSettings: Partial<EchoTrailSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveUserConfiguration();

    // Apply settings that require service updates
    if (newSettings.backgroundEnabled !== undefined) {
      await this.audioSystem.updateSettings({
        backgroundPlayback: newSettings.backgroundEnabled,
      });
    }

    logger.info("Settings updated:", newSettings);
  }

  /**
   * Get current system status
   */
  getStatus(): EchoTrailStatus {
    return {
      mode: this.currentMode,
      interactionState: this.interactionState,
      locationContext: this.lastLocationUpdate,
      currentContent: this.audioSystem.getPlaybackStatus().currentContent,
      playbackStatus: this.audioSystem.getPlaybackStatus(),
      queueSize: this.audioSystem.getQueue().length,
      isActive: this.isActive,
      batteryOptimized: this.settings.batteryOptimization,
    };
  }

  /**
   * Get user profile
   */
  getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  /**
   * Get current settings
   */
  getSettings(): EchoTrailSettings {
    return { ...this.settings };
  }

  /**
   * Get usage statistics
   */
  getStats(): any {
    return { ...this.statsTracker };
  }

  /**
   * Force content generation for current location
   */
  async generateContentNow(): Promise<GeneratedContent | null> {
    if (!this.lastLocationUpdate) {
      logger.warn("No location available for content generation");
      return null;
    }

    return await this.generateContent(this.lastLocationUpdate, true);
  }

  /**
   * Manual audio control
   */
  async pauseAudio(): Promise<void> {
    await this.audioSystem.pause();
  }

  async resumeAudio(): Promise<void> {
    await this.audioSystem.resume();
  }

  async skipToNext(): Promise<boolean> {
    return await this.audioSystem.skipToNext();
  }

  /**
   * Clear all cached content
   */
  async clearContent(): Promise<void> {
    await this.contentPipeline.clearAllContent();
    this.audioSystem.clearQueue();
    logger.info("All content cleared");
  }

  /**
   * Setup service callbacks for coordination
   */
  private setupServiceCallbacks(): void {
    // Location service callbacks are set in startEchoTrail
    // Audio system callbacks are set in startEchoTrail
    // Content pipeline works through direct calls
  }

  /**
   * Handle location updates from location service
   */
  private async handleLocationUpdate(
    locationContext: LocationContext
  ): Promise<void> {
    this.lastLocationUpdate = locationContext;

    // Update stats
    if (this.lastLocationUpdate) {
      const pattern = this.locationService.getMovementPattern();
      this.statsTracker.totalDistance = pattern.totalDistance;
    }

    // Trigger content generation if needed
    await this.evaluateContentGeneration(locationContext);

    this.callbacks.onLocationUpdate?.(locationContext);
    this.notifyStatusChange();
  }

  /**
   * Handle movement mode changes
   */
  private async handleMovementModeChange(
    mode: MovementMode,
    context: LocationContext
  ): Promise<void> {
    logger.info(`Movement mode changed to: ${mode}`);

    // Adjust behavior based on movement mode
    switch (mode) {
      case MovementMode.STATIONARY:
        if (context.stationaryDuration >= this.settings.minimumStationaryTime) {
          await this.generateContent(context, false);
        }
        break;
      case MovementMode.DRIVING:
        // Prioritize safety - shorter, less frequent content
        break;
      case MovementMode.WALKING:
        // Optimal for content consumption
        await this.generateContent(context, false);
        break;
      case MovementMode.CYCLING:
        // Brief, engaging content
        break;
    }
  }

  /**
   * Handle audio state changes
   */
  private handleAudioStateChange(status: PlaybackStatus): void {
    // Update interaction state based on audio state
    switch (status.state) {
      case AudioState.PLAYING:
        this.interactionState = InteractionState.PLAYING;
        break;
      case AudioState.LOADING:
        this.interactionState = InteractionState.GENERATING;
        break;
      case AudioState.IDLE:
        this.interactionState = InteractionState.IDLE;
        break;
    }

    this.notifyStatusChange();
  }

  /**
   * Handle content completion
   */
  private handleContentComplete(contentId: string): void {
    this.statsTracker.contentConsumed++;
    this.contentPipeline.markContentAsPlayed(contentId);

    // Generate new content if queue is getting low
    if (this.audioSystem.getQueue().length < 2 && this.lastLocationUpdate) {
      this.generateContent(this.lastLocationUpdate, false);
    }
  }

  /**
   * Handle audio errors
   */
  private handleAudioError(error: string): void {
    logger.error("Audio error:", error);
    this.callbacks.onError?.(`Lyd-feil: ${error}`);
  }

  /**
   * Evaluate if content generation is needed
   */
  private async evaluateContentGeneration(
    context: LocationContext
  ): Promise<void> {
    if (this.contentGenerationInProgress) return;
    if (this.currentMode === EchoTrailMode.PAUSED) return;

    const timeSinceLastGeneration =
      (Date.now() - this.lastContentGeneration) / 1000;
    const shouldGenerate =
      timeSinceLastGeneration >= this.settings.contentGenerationInterval;

    if (shouldGenerate) {
      await this.generateContent(context, false);
    }
  }

  /**
   * Generate content using AI pipeline
   */
  private async generateContent(
    locationContext: LocationContext,
    forceRefresh: boolean
  ): Promise<GeneratedContent | null> {
    if (this.contentGenerationInProgress && !forceRefresh) return null;

    this.contentGenerationInProgress = true;
    this.interactionState = InteractionState.GENERATING;
    this.notifyStatusChange();

    try {
      const request: ContentRequest = {
        locationContext,
        interests: this.userProfile.interests,
        currentContent:
          this.audioSystem.getPlaybackStatus().currentContent || undefined,
        forceRefresh,
      };

      const content = await this.contentPipeline.generateContent(request);

      if (content) {
        // Add to audio queue
        this.audioSystem.addToQueue(content);
        this.callbacks.onContentReady?.(content);

        this.lastContentGeneration = Date.now();
        logger.info(`Generated content: ${content.title}`);
      }

      return content;
    } catch (error) {
      logger.error("Content generation failed:", error);
      return null;
    } finally {
      this.contentGenerationInProgress = false;
      this.interactionState = InteractionState.IDLE;
      this.notifyStatusChange();
    }
  }

  /**
   * Mode-specific behaviors
   */
  private async enterDiscoveryMode(): Promise<void> {
    // Aggressive content generation and playback
    this.settings.contentGenerationInterval = 45; // 45 seconds
    await this.audioSystem.updateSettings({ autoPlay: true });
  }

  private async enterPassiveMode(): Promise<void> {
    // Less frequent updates, background operation
    this.settings.contentGenerationInterval = 120; // 2 minutes
    await this.audioSystem.updateSettings({ autoPlay: false });
  }

  private async enterFocusedMode(): Promise<void> {
    // User actively engaged, high-quality content
    await this.audioSystem.updateSettings({
      quality: this.mapAudioQuality("high"),
      autoPlay: true,
    });
  }

  private async enterPausedMode(): Promise<void> {
    // Stop active generation but keep services ready
    await this.audioSystem.pause();
    this.audioSystem.clearQueue();
  }

  /**
   * Map user audio quality preference to system setting
   */
  private mapAudioQuality(quality: "high" | "standard" | "auto"): any {
    switch (quality) {
      case "high":
        return "HIGH";
      case "standard":
        return "STANDARD";
      case "auto":
        return "AUTO";
      default:
        return "AUTO";
    }
  }

  /**
   * Notify callbacks of status changes
   */
  private notifyStatusChange(): void {
    this.callbacks.onStatusChange?.(this.getStatus());
  }

  /**
   * Save user configuration to storage
   */
  private async saveUserConfiguration(): Promise<void> {
    try {
      const config = {
        userProfile: this.userProfile,
        settings: this.settings,
        stats: this.statsTracker,
      };

      await AsyncStorage.setItem("echotrail_config", JSON.stringify(config));
    } catch (error) {
      logger.warn("Failed to save user configuration:", error);
    }
  }

  /**
   * Load user configuration from storage
   */
  private async loadUserConfiguration(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem("echotrail_config");
      if (configJson) {
        const config = JSON.parse(configJson);

        this.userProfile = { ...this.DEFAULT_PROFILE, ...config.userProfile };
        this.settings = { ...this.DEFAULT_SETTINGS, ...config.settings };
        this.statsTracker = { ...this.statsTracker, ...config.stats };

        logger.info("User configuration loaded");
      }
    } catch (error) {
      logger.warn("Failed to load user configuration:", error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopEchoTrail();
      await this.audioSystem.cleanup();
      logger.info("EchoTrail Master Service cleaned up");
    } catch (error) {
      logger.error("Cleanup error:", error);
    }
  }
}

export default EchoTrailMasterService.getInstance();
