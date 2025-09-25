import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { GeneratedContent } from "./AIContentPipeline";
import { LocationContext, MovementMode } from "./IntelligentLocationService";
import { logger } from "../utils/logger";
import OpenAITTSService from "./OpenAITTSService";

export enum AudioState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
}

export enum AudioQuality {
  HIGH = "HIGH", // OpenAI TTS, slower
  STANDARD = "STANDARD", // System TTS, faster
  AUTO = "AUTO", // Intelligent selection based on context
}

export interface AudioSettings {
  quality: AudioQuality;
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0.0 - 1.0
  voice: string;
  autoPlay: boolean;
  backgroundPlayback: boolean;
  duckOtherAudio: boolean;
  pauseOnCall: boolean;
}

export interface PlaybackStatus {
  state: AudioState;
  currentContent: GeneratedContent | null;
  position: number; // seconds
  duration: number; // seconds
  isBuffering: boolean;
  canSeek: boolean;
  speed: number;
  volume: number;
}

export interface AudioCallback {
  onStateChange?: (status: PlaybackStatus) => void;
  onContentComplete?: (contentId: string) => void;
  onError?: (error: string) => void;
  onBufferingChange?: (isBuffering: boolean) => void;
}

class IntelligentAudioSystem {
  private static instance: IntelligentAudioSystem;

  private sound: Audio.Sound | null = null;
  private currentContent: GeneratedContent | null = null;
  private audioState: AudioState = AudioState.IDLE;
  private settings: AudioSettings;
  private callbacks: AudioCallback = {};

  // Queue management
  private audioQueue: GeneratedContent[] = [];
  private currentPosition = 0;
  private totalDuration = 0;

  // Background and interruption handling
  private wasPlayingBeforeInterruption = false;
  private appStateListener: any;

  // Audio session management
  private audioSession: any;

  // Default settings
  private readonly DEFAULT_SETTINGS: AudioSettings = {
    quality: AudioQuality.AUTO,
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    voice: "default",
    autoPlay: true,
    backgroundPlayback: true,
    duckOtherAudio: true,
    pauseOnCall: true,
  };

  private constructor() {
    this.settings = { ...this.DEFAULT_SETTINGS };
    this.initializeAudioSystem();
    this.loadSettings();
  }

  static getInstance(): IntelligentAudioSystem {
    if (!IntelligentAudioSystem.instance) {
      IntelligentAudioSystem.instance = new IntelligentAudioSystem();
    }
    return IntelligentAudioSystem.instance;
  }

  /**
   * Initialize the audio system with proper session configuration
   */
  private async initializeAudioSystem(): Promise<void> {
    try {
      // Configure audio session for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: this.settings.duckOtherAudio,
        playThroughEarpieceAndroid: false,
      });

      // Listen for app state changes
      this.appStateListener = AppState.addEventListener(
        "change",
        this.handleAppStateChange.bind(this)
      );

      logger.info("Audio system initialized");
    } catch (error) {
      logger.error("Failed to initialize audio system:", error);
    }
  }

  /**
   * Set audio callbacks for status updates
   */
  setCallbacks(callbacks: AudioCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update audio settings
   */
  async updateSettings(newSettings: Partial<AudioSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Apply settings to current playback if active
    if (this.sound && this.audioState === AudioState.PLAYING) {
      await this.applySettingsToPlayback();
    }

    logger.info("Audio settings updated:", newSettings);
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Play content with intelligent audio selection
   */
  async playContent(
    content: GeneratedContent,
    locationContext?: LocationContext
  ): Promise<boolean> {
    try {
      this.setState(AudioState.LOADING);
      this.currentContent = content;

      // Determine best audio method based on context and settings
      const audioMethod = this.selectAudioMethod(content, locationContext);

      if (audioMethod === "tts-openai") {
        return await this.playWithOpenAITTS(content);
      } else {
        return await this.playWithSystemTTS(content);
      }
    } catch (error) {
      logger.error("Failed to play content:", error);
      this.setState(AudioState.ERROR);
      this.callbacks.onError?.(`Kunne ikke spille av innhold: ${error}`);
      return false;
    }
  }

  /**
   * Add content to playback queue
   */
  addToQueue(content: GeneratedContent): void {
    this.audioQueue.push(content);
    logger.info(
      `Added to queue: ${content.title} (queue size: ${this.audioQueue.length})`
    );

    // Auto-play if not currently playing
    if (this.audioState === AudioState.IDLE && this.settings.autoPlay) {
      this.playNextInQueue();
    }
  }

  /**
   * Play next content in queue
   */
  async playNextInQueue(): Promise<boolean> {
    if (this.audioQueue.length === 0) {
      this.setState(AudioState.IDLE);
      return false;
    }

    const nextContent = this.audioQueue.shift();
    if (nextContent) {
      return await this.playContent(nextContent);
    }

    return false;
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    try {
      if (this.sound && this.audioState === AudioState.PLAYING) {
        await this.sound.pauseAsync();
        this.setState(AudioState.PAUSED);
        logger.info("Playback paused");
      }
    } catch (error) {
      logger.error("Failed to pause playback:", error);
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    try {
      if (this.sound && this.audioState === AudioState.PAUSED) {
        await this.sound.playAsync();
        this.setState(AudioState.PLAYING);
        logger.info("Playback resumed");
      }
    } catch (error) {
      logger.error("Failed to resume playback:", error);
    }
  }

  /**
   * Stop playback and clear queue
   */
  async stop(): Promise<void> {
    try {
      // Stop system TTS if running
      if (await Speech.isSpeakingAsync()) {
        Speech.stop();
      }

      // Stop Audio.Sound if running
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.setState(AudioState.IDLE);
      this.currentContent = null;
      this.currentPosition = 0;
      this.totalDuration = 0;

      logger.info("Playback stopped");
    } catch (error) {
      logger.error("Failed to stop playback:", error);
    }
  }

  /**
   * Skip to next content
   */
  async skipToNext(): Promise<boolean> {
    await this.stop();

    if (this.currentContent) {
      this.callbacks.onContentComplete?.(this.currentContent.id);
    }

    return await this.playNextInQueue();
  }

  /**
   * Seek to position
   */
  async seekTo(positionSeconds: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(positionSeconds * 1000);
        this.currentPosition = positionSeconds;
        this.notifyStatusChange();
      }
    } catch (error) {
      logger.error("Failed to seek:", error);
    }
  }

  /**
   * Get current playback status
   */
  getPlaybackStatus(): PlaybackStatus {
    return {
      state: this.audioState,
      currentContent: this.currentContent,
      position: this.currentPosition,
      duration: this.totalDuration,
      isBuffering: this.audioState === AudioState.LOADING,
      canSeek: this.sound !== null,
      speed: this.settings.speed,
      volume: this.settings.volume,
    };
  }

  /**
   * Clear audio queue
   */
  clearQueue(): void {
    this.audioQueue = [];
    logger.info("Audio queue cleared");
  }

  /**
   * Get current queue
   */
  getQueue(): GeneratedContent[] {
    return [...this.audioQueue];
  }

  /**
   * Select best audio method based on context
   */
  private selectAudioMethod(
    content: GeneratedContent,
    locationContext?: LocationContext
  ): "tts-openai" | "tts-system" {
    if (this.settings.quality === AudioQuality.STANDARD) {
      return "tts-system";
    }

    if (this.settings.quality === AudioQuality.HIGH) {
      return "tts-openai";
    }

    // AUTO selection based on context
    if (!locationContext) {
      return "tts-system"; // Default to faster option
    }

    // Use high quality for stationary listening (user has time)
    if (locationContext.movementMode === MovementMode.STATIONARY) {
      return "tts-openai";
    }

    // Use standard for fast movement (prioritize responsiveness)
    if (
      locationContext.movementMode === MovementMode.DRIVING ||
      locationContext.movementMode === MovementMode.CYCLING
    ) {
      return "tts-system";
    }

    // Walking - use high quality for longer content, standard for short
    if (content.duration > 120) {
      // 2+ minutes
      return "tts-openai";
    }

    return "tts-system";
  }

  /**
   * Play content using OpenAI TTS
   */
  private async playWithOpenAITTS(content: GeneratedContent): Promise<boolean> {
    try {
      logger.info(`Playing with OpenAI TTS: ${content.title}`);

      // Generate or retrieve cached audio
      const audioBuffer = await OpenAITTSService.textToSpeechWithCache(
        content.content,
        {
          voice: this.settings.voice as any,
          speed: this.settings.speed,
        }
      );

      // Convert ArrayBuffer to base64 URI
      const uint8Array = new Uint8Array(audioBuffer);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));
      const audioUri = `data:audio/mp3;base64,${base64Audio}`;

      if (!audioUri) {
        throw new Error("Failed to generate audio with OpenAI TTS");
      }

      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: true,
          volume: this.settings.volume,
          rate: this.settings.speed,
          isLooping: false,
        }
      );

      this.sound = sound;

      // Set up playback callbacks
      this.sound.setOnPlaybackStatusUpdate((status) => {
        this.handlePlaybackStatusUpdate(status);
      });

      this.setState(AudioState.PLAYING);
      return true;
    } catch (error) {
      logger.error("OpenAI TTS playback failed:", error);
      // Fallback to system TTS
      return await this.playWithSystemTTS(content);
    }
  }

  /**
   * Play content using system TTS
   */
  private async playWithSystemTTS(content: GeneratedContent): Promise<boolean> {
    try {
      logger.info(`Playing with System TTS: ${content.title}`);

      // Estimate duration for progress tracking
      const wordCount = content.content.split(" ").length;
      this.totalDuration = Math.ceil(
        (wordCount / (150 * this.settings.speed)) * 60
      );

      // Configure TTS options
      const ttsOptions = {
        language: "nb-NO", // Norwegian
        pitch: this.settings.pitch,
        rate: this.settings.speed,
        voice:
          this.settings.voice !== "default" ? this.settings.voice : undefined,
        volume: this.settings.volume,
        onStart: () => {
          this.setState(AudioState.PLAYING);
        },
        onDone: () => {
          this.handleContentComplete();
        },
        onStopped: () => {
          this.setState(AudioState.IDLE);
        },
        onError: (error: any) => {
          logger.error("System TTS error:", error);
          this.setState(AudioState.ERROR);
          this.callbacks.onError?.("TTS-feil oppstod");
        },
      };

      // Start speaking
      Speech.speak(content.content, ttsOptions);

      // Start position tracking
      this.startPositionTracking();

      return true;
    } catch (error) {
      logger.error("System TTS playback failed:", error);
      throw error;
    }
  }

  /**
   * Handle playback status updates from Audio.Sound
   */
  private handlePlaybackStatusUpdate(status: any): void {
    if (status.isLoaded) {
      this.currentPosition = (status.positionMillis || 0) / 1000;
      this.totalDuration = (status.durationMillis || 0) / 1000;

      if (status.didJustFinish && !status.isLooping) {
        this.handleContentComplete();
      }

      this.notifyStatusChange();
    }
  }

  /**
   * Start position tracking for system TTS
   */
  private startPositionTracking(): void {
    const trackingInterval = setInterval(() => {
      if (this.audioState !== AudioState.PLAYING) {
        clearInterval(trackingInterval);
        return;
      }

      this.currentPosition += 1;

      if (this.currentPosition >= this.totalDuration) {
        clearInterval(trackingInterval);
        this.handleContentComplete();
      }

      this.notifyStatusChange();
    }, 1000);
  }

  /**
   * Handle content completion
   */
  private handleContentComplete(): void {
    const completedContentId = this.currentContent?.id;

    this.setState(AudioState.IDLE);
    this.currentPosition = 0;

    if (completedContentId) {
      this.callbacks.onContentComplete?.(completedContentId);
      logger.info(`Content completed: ${completedContentId}`);
    }

    // Auto-play next in queue
    if (this.settings.autoPlay && this.audioQueue.length > 0) {
      setTimeout(() => {
        this.playNextInQueue();
      }, 1000); // Brief pause between items
    }
  }

  /**
   * Apply current settings to active playback
   */
  private async applySettingsToPlayback(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(this.settings.volume);
        await this.sound.setRateAsync(this.settings.speed, false);
      } catch (error) {
        logger.warn("Failed to apply settings to playback:", error);
      }
    }
  }

  /**
   * Handle app state changes for background playback
   */
  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === "background" && this.settings.backgroundPlayback) {
      // Continue playing in background
      logger.info("App backgrounded, continuing playback");
    } else if (nextAppState === "active" && this.wasPlayingBeforeInterruption) {
      // Resume if was playing before interruption
      this.resume();
      this.wasPlayingBeforeInterruption = false;
    }
  }

  /**
   * Set audio state and notify listeners
   */
  private setState(newState: AudioState): void {
    if (this.audioState !== newState) {
      this.audioState = newState;
      this.notifyStatusChange();
    }
  }

  /**
   * Notify callbacks of status change
   */
  private notifyStatusChange(): void {
    this.callbacks.onStateChange?.(this.getPlaybackStatus());
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "echotrail_audio_settings",
        JSON.stringify(this.settings)
      );
    } catch (error) {
      logger.warn("Failed to save audio settings:", error);
    }
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem(
        "echotrail_audio_settings"
      );
      if (settingsJson) {
        const savedSettings = JSON.parse(settingsJson);
        this.settings = { ...this.DEFAULT_SETTINGS, ...savedSettings };
      }
    } catch (error) {
      logger.warn("Failed to load audio settings:", error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stop();

      if (this.appStateListener) {
        this.appStateListener.remove();
      }

      logger.info("Audio system cleaned up");
    } catch (error) {
      logger.error("Audio system cleanup error:", error);
    }
  }
}

export default IntelligentAudioSystem.getInstance();
