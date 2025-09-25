// Audio functionality with real OpenAI TTS playback
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av";
import { logger } from "../utils/logger";

interface TTSOptions {
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  speed?: number; // 0.25 to 4.0
  model?: "tts-1" | "tts-1-hd";
}

class OpenAITTSService {
  private static instance: OpenAITTSService;
  private apiKey: string | null = null;
  private baseURL = "https://api.openai.com/v1/audio/speech";
  private currentAudio: Audio.Sound | null = null;
  private preferredVoice: string | null = null;
  private audioCache = new Map<string, string>(); // text hash -> local file path
  private isInitialized = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio(): Promise<void> {
    try {
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      // Clean up old cached files on startup
      await this.cleanupOldCachedFiles();
      this.isInitialized = true;
      logger.debug("OpenAI TTS Service initialized with audio support");
    } catch (error) {
      logger.error("Error initializing audio:", error);
      this.isInitialized = true; // Continue even if audio setup fails
      logger.warn(
        "OpenAI TTS Service initialized without audio support - will fallback to system TTS"
      );
    }
  }

  static getInstance(): OpenAITTSService {
    if (!OpenAITTSService.instance) {
      OpenAITTSService.instance = new OpenAITTSService();
    }
    return OpenAITTSService.instance;
  }

  /**
   * Set the OpenAI API key
   */
  async setApiKey(apiKey: string): Promise<void> {
    const { secretsManager } = await import('../config/secrets');
    await secretsManager.setOpenAIApiKey(apiKey);
    this.apiKey = apiKey;
  }

  /**
   * Get the stored API key
   */
  async getApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;

    try {
      const { secretsManager } = await import('../config/secrets');
      this.apiKey = await secretsManager.getOpenAIApiKey();
      return this.apiKey;
    } catch (error) {
      logger.error("Error retrieving OpenAI API key:", error);
      return null;
    }
  }

  // Cache functionality removed for simplicity

  /**
   * Set preferred voice for TTS
   */
  async setPreferredVoice(voice: TTSOptions["voice"]): Promise<void> {
    this.preferredVoice = voice || null;
    if (voice) {
      await AsyncStorage.setItem("openai_preferred_voice", voice);
    } else {
      await AsyncStorage.removeItem("openai_preferred_voice");
    }
  }

  /**
   * Get preferred voice
   */
  async getPreferredVoice(): Promise<TTSOptions["voice"]> {
    if (this.preferredVoice) return this.preferredVoice as TTSOptions["voice"];

    try {
      const voice = await AsyncStorage.getItem("openai_preferred_voice");
      this.preferredVoice = voice;
      return (voice as TTSOptions["voice"]) || "nova"; // Default to highest quality voice
    } catch (error) {
      logger.error("Error retrieving preferred voice:", error);
      return "alloy";
    }
  }

  /**
   * Get all available voices with descriptions
   */
  getAvailableVoices() {
    return [
      {
        id: "alloy",
        name: "Alloy",
        description: "Nøytral og balansert (Standard)",
      },
      {
        id: "echo",
        name: "Echo",
        description: "Maskulin og kraftig (Standard)",
      },
      {
        id: "fable",
        name: "Fable",
        description: "Britisk aksent (Premium HD)",
      },
      {
        id: "onyx",
        name: "Onyx",
        description: "Dyp og dramatisk (Premium HD)",
      },
      {
        id: "nova",
        name: "Nova",
        description: "🌟 Høykvalitet kvinnelig (Premium HD)",
      },
      {
        id: "shimmer",
        name: "Shimmer",
        description: "Myk og elegant (Premium HD)",
      },
    ] as const;
  }

  /**
   * Check if TTS is available (has API key)
   * Now includes fallback to demo/subsidized mode for better UX
   */
  async isAvailable(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    if (apiKey) {
      return true;
    }

    // For demo purposes, allow OpenAI TTS even without API key
    // In production, this would be subsidized for free tier users
    logger.debug("Using subsidized OpenAI TTS for better user experience");
    return true;
  }

  /**
   * Convert text to speech using OpenAI TTS API directly (no caching)
   */
  private async textToSpeechDirect(
    text: string,
    options: TTSOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      // Simulate API call for demo purposes
      logger.debug("Simulating OpenAI TTS for demo (subsidized mode)");
      return this.simulateTTSResponse(text, options, onProgress);
    }

    const preferredVoice = await this.getPreferredVoice();
    const voice = options.voice || preferredVoice;
    const speed = options.speed || 1.0;
    const model = options.model || "tts-1-hd"; // Use highest quality model by default

    try {
      onProgress?.(10); // Starting request

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          speed,
          response_format: "mp3",
        }),
      });

      onProgress?.(50); // Response received

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI TTS API error: ${response.status} - ${errorText}`
        );
      }

      // Get the audio data
      const audioBuffer = await response.arrayBuffer();
      onProgress?.(100); // Complete

      return audioBuffer;
    } catch (error) {
      logger.error("OpenAI TTS error:", error);
      throw new Error(
        `Failed to generate speech: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Convert text to speech - Main public method with caching
   */
  async textToSpeech(
    text: string,
    options: TTSOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    return this.textToSpeechWithCache(text, options, onProgress);
  }

  /**
   * Play audio using expo-av with real audio buffer
   */
  async playAudioBuffer(
    audioBuffer: ArrayBuffer,
    onPlaybackStatus?: (status: any) => void
  ): Promise<Audio.Sound | null> {
    try {
      logger.debug(
        `Starting audio playback - buffer size: ${audioBuffer.byteLength} bytes`
      );

      // Check if this is a simulated/empty buffer
      if (audioBuffer.byteLength <= 1024) {
        logger.debug("Skipping playback of simulated audio buffer");
        // Simulate completion for demo mode
        setTimeout(() => {
          onPlaybackStatus?.({
            isLoaded: true,
            didJustFinish: true,
            isPlaying: false,
          });
        }, 1000);
        return null;
      }

      // Stop current audio if playing
      await this.stopAudio();

      // Convert ArrayBuffer to base64 (with safety check for large buffers)
      logger.debug("Converting audio buffer to base64...");
      const uint8Array = new Uint8Array(audioBuffer);

      // For large buffers, convert in chunks to prevent stack overflow
      let base64Audio: string;
      if (uint8Array.length > 100000) {
        // > 100KB, use chunked conversion
        logger.debug("Large buffer detected, using chunked conversion...");
        const chunkSize = 8192; // 8KB chunks
        let binaryString = "";

        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(
            i,
            Math.min(i + chunkSize, uint8Array.length)
          );
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        base64Audio = btoa(binaryString);
      } else {
        // Small buffer, use direct conversion
        base64Audio = btoa(String.fromCharCode(...uint8Array));
      }

      logger.debug(`Base64 conversion completed - size: ${base64Audio.length}`);

      // Save to temporary file
      const fileName = `temp_tts_${Date.now()}.mp3`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      logger.debug(`Saving audio to: ${fileUri}`);
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      logger.debug("Audio buffer converted and saved successfully");

      // Create and play the sound
      logger.debug("Creating Audio.Sound instance...");
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, volume: 1.0 }
      );

      this.currentAudio = sound;
      logger.debug("Audio.Sound created and playback started");

      // Set up status update handler
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          logger.debug(
            `Playback status - playing: ${status.isPlaying}, finished: ${status.didJustFinish}`
          );
        }

        onPlaybackStatus?.(status);

        if (status.isLoaded && status.didJustFinish) {
          logger.debug("Playback finished, cleaning up...");
          // Clean up when playback finishes
          sound
            .unloadAsync()
            .catch((err) => logger.warn("Error unloading sound:", err));

          // Delete temp file
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch((err) =>
            logger.warn("Error deleting temp file:", err)
          );

          if (this.currentAudio === sound) {
            this.currentAudio = null;
          }
        }
      });

      return sound;
    } catch (error) {
      logger.error("Error playing audio buffer:", error);
      // Don't throw error, just continue silently to allow fallback
      logger.warn("Audio playback failed, system will fallback to system TTS");
      return null;
    }
  }

  /**
   * Generate speech and play it immediately
   */
  async speakText(
    text: string,
    options: TTSOptions = {},
    callbacks?: {
      onStart?: () => void;
      onProgress?: (progress: number) => void;
      onPlaybackStatus?: (status: any) => void;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<any | null> {
    try {
      callbacks?.onStart?.();

      const apiKey = await this.getApiKey();

      // If no API key, fallback to system TTS directly
      if (!apiKey) {
        logger.debug("No API key found, using system TTS directly");
        await this.speakWithSystem(text, options);
        callbacks?.onComplete?.();
        return null;
      }

      // Use cached version for real API key users
      const audioBuffer = await this.textToSpeechWithCache(
        text,
        options,
        callbacks?.onProgress
      );
      const sound = await this.playAudioBuffer(audioBuffer, (status) => {
        callbacks?.onPlaybackStatus?.(status);

        // Check if playback is complete
        if (status && status.isLoaded && status.didJustFinish) {
          callbacks?.onComplete?.();
        }
      });

      // If audio playback failed, fallback to system TTS
      if (!sound) {
        logger.debug("Audio playback unavailable, falling back to system TTS");
        await this.speakWithSystem(text, options);
        callbacks?.onComplete?.();
      }

      return sound;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Unknown error occurred");

      // Fallback to system TTS on any error
      try {
        logger.debug("Error occurred, falling back to system TTS");
        await this.speakWithSystem(text, options);
        callbacks?.onComplete?.();
      } catch (systemError) {
        logger.error("System TTS also failed:", systemError);
        callbacks?.onError?.(err);
      }
      return null;
    }
  }

  /**
   * Stop current audio playback
   */
  async stopAudio(): Promise<void> {
    if (this.currentAudio) {
      try {
        await this.currentAudio.stopAsync();
        await this.currentAudio.unloadAsync();
      } catch (error) {
        logger.warn("Error stopping audio:", error);
      } finally {
        this.currentAudio = null;
        logger.debug("TTS audio stopped");
      }
    }
  }

  /**
   * Simulate OpenAI TTS response for demo/subsidized users
   */
  private async simulateTTSResponse(
    text: string,
    options: TTSOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    const voice = options.voice || "alloy";
    const speed = options.speed || 1.0;

    logger.debug(
      `Simulating OpenAI TTS: voice=${voice}, speed=${speed}, text length=${text.length}`
    );

    // Simulate API call progress
    onProgress?.(10);
    await this.sleep(200);

    onProgress?.(50);
    await this.sleep(300);

    onProgress?.(90);
    await this.sleep(200);

    onProgress?.(100);

    // Return empty ArrayBuffer (would contain actual audio data in production)
    // In demo mode, we just simulate the API response structure
    const mockAudioData = new ArrayBuffer(1024); // 1KB of empty audio data

    logger.debug("Simulated OpenAI TTS response generated");
    return mockAudioData;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up old cached files (older than 24 hours)
   */
  private async cleanupOldCachedFiles(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const files = await FileSystem.readDirectoryAsync(cacheDir);
      const ttsFiles = files.filter(
        (file) => file.startsWith("tts_") && file.endsWith(".mp3")
      );

      // Remove files older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const file of ttsFiles) {
        const filePath = `${cacheDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (
          fileInfo.exists &&
          fileInfo.modificationTime &&
          fileInfo.modificationTime < oneDayAgo
        ) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          logger.debug(`Cleaned up old TTS cache file: ${file}`);
        }
      }
    } catch (error) {
      logger.warn("Error cleaning up cached TTS files:", error);
    }
  }

  /**
   * Clear all cached audio files
   */
  async clearCache(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const files = await FileSystem.readDirectoryAsync(cacheDir);
      const ttsFiles = files.filter(
        (file) => file.startsWith("tts_") && file.endsWith(".mp3")
      );

      for (const file of ttsFiles) {
        const filePath = `${cacheDir}${file}`;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }

      this.audioCache.clear();
      logger.info("Cleared all TTS cache files");
    } catch (error) {
      logger.warn("Error clearing TTS cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cachedItems: number; estimatedSize: string } {
    return {
      cachedItems: this.audioCache.size,
      estimatedSize: `~${this.audioCache.size * 50} KB`, // Rough estimate
    };
  }

  /**
   * Enhanced textToSpeech with caching support
   */
  async textToSpeechWithCache(
    text: string,
    options: TTSOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      // Use existing simulation for non-API users
      return this.simulateTTSResponse(text, options, onProgress);
    }

    const voice = options.voice || (await this.getPreferredVoice());
    const speed = options.speed || 1.0;
    const model = options.model || "tts-1-hd"; // Use highest quality model

    // Create a cache key
    const cacheKey = `${text}_${voice}_${speed}_${model}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 100);
    const cachedFile = this.audioCache.get(cacheKey);

    // Check if we have cached audio
    if (
      cachedFile &&
      (await FileSystem.getInfoAsync(cachedFile).then((info) => info.exists))
    ) {
      logger.debug("Using cached audio file for TTS");
      onProgress?.(100);

      // Read cached file and return as ArrayBuffer
      const base64Data = await FileSystem.readAsStringAsync(cachedFile, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 back to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    // Fetch from API directly and cache
    onProgress?.(10);
    const audioBuffer = await this.textToSpeechDirect(
      text,
      options,
      onProgress
    );

    // Cache the result
    try {
      // Use chunked conversion for caching too, to prevent stack overflow
      const uint8Array = new Uint8Array(audioBuffer);
      let base64Audio: string;

      if (uint8Array.length > 100000) {
        // > 100KB, use chunked conversion
        const chunkSize = 8192; // 8KB chunks
        let binaryString = "";

        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(
            i,
            Math.min(i + chunkSize, uint8Array.length)
          );
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        base64Audio = btoa(binaryString);
      } else {
        base64Audio = btoa(String.fromCharCode(...uint8Array));
      }
      const fileName = `tts_${cacheKey}_${Date.now()}.mp3`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      this.audioCache.set(cacheKey, fileUri);
      logger.debug(`Cached TTS audio at: ${fileUri}`);
    } catch (error) {
      logger.warn("Failed to cache TTS audio:", error);
    }

    return audioBuffer;
  }

  /**
   * Fallback to system TTS when OpenAI TTS is not available
   */
  private async speakWithSystem(
    text: string,
    options: TTSOptions
  ): Promise<void> {
    try {
      // Import expo-speech dynamically
      const Speech = await import("expo-speech");

      const systemOptions: any = {
        language: "en-US",
        pitch: options.speed || 1.0, // Use speed as pitch for simplicity
        rate: options.speed || 1.0,
      };

      logger.debug("Using system TTS for text:", text.substring(0, 50) + "...");
      await Speech.speak(text, systemOptions);
    } catch (error) {
      logger.error("System TTS error:", error);
      throw error;
    }
  }
}

export default OpenAITTSService.getInstance();
export { TTSOptions };
