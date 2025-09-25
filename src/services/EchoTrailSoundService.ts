import { logger } from "../utils/logger";
import OpenAITTSService from "./OpenAITTSService";
import * as Speech from "expo-speech";

/**
 * EchoTrail Signature Sound Service
 * Handles the iconic app startup sound and audio branding
 */
class EchoTrailSoundService {
  private static instance: EchoTrailSoundService;
  private hasPlayedWelcome = false;

  static getInstance(): EchoTrailSoundService {
    if (!EchoTrailSoundService.instance) {
      EchoTrailSoundService.instance = new EchoTrailSoundService();
    }
    return EchoTrailSoundService.instance;
  }

  /**
   * Play the iconic EchoTrail welcome sound
   * Concept: "Echo... Trail" with reverb effect + nature ambience
   */
  async playWelcomeSound(): Promise<void> {
    if (this.hasPlayedWelcome) return;

    try {
      logger.debug("Playing EchoTrail signature welcome sound");

      // For demo, always use system TTS to ensure users hear the sound
      // In production, this would check for actual OpenAI API keys
      const hasRealOpenAI = false; // Set to true when real API is configured

      if (hasRealOpenAI) {
        await this.playOpenAIWelcome();
      } else {
        await this.playSystemWelcome();
      }

      this.hasPlayedWelcome = true;
    } catch (error) {
      logger.error("Failed to play welcome sound:", error);
      // Fallback to simple system message
      try {
        await Speech.speak("Welcome to EchoTrail", {
          language: "en-US",
          pitch: 1.1,
          rate: 0.9,
        });
      } catch (fallbackError) {
        logger.error("Even system TTS fallback failed:", fallbackError);
      }
    }
  }

  /**
   * Premium OpenAI TTS welcome with multiple voice layers
   */
  private async playOpenAIWelcome(): Promise<void> {
    // Signature EchoTrail welcome sequence:
    // 1. Whispered "Echo..." (mysterious, with reverb effect implied in text)
    // 2. Short pause
    // 3. Clear "Trail" (confident, inviting)
    // 4. Nature ambience implied through descriptive text

    const welcomeSequences = [
      {
        text: "*soft whisper with distant mountain echo* Echo...",
        voice: "echo" as const,
        speed: 0.7,
      },
      {
        text: "*clear and welcoming* Trail. Welcome to your adventure.",
        voice: "alloy" as const,
        speed: 0.9,
        delay: 800, // 0.8 second pause
      },
    ];

    for (const sequence of welcomeSequences) {
      if (sequence.delay) {
        await this.sleep(sequence.delay);
      }

      await OpenAITTSService.speakText(
        sequence.text,
        {
          voice: sequence.voice,
          speed: sequence.speed,
          model: "tts-1-hd", // Use HD for signature sound
        },
        {
          onStart: () => {
            logger.debug(`Playing welcome sequence: ${sequence.voice}`);
          },
          onComplete: () => {
            logger.debug(`Completed welcome sequence: ${sequence.voice}`);
          },
        }
      );
    }
  }

  /**
   * Fallback system TTS welcome (simpler but still branded)
   */
  private async playSystemWelcome(): Promise<void> {
    try {
      logger.debug("Playing EchoTrail system TTS welcome sequence");

      // Play "Echo" with mysterious tone
      await Speech.speak("Echo...", {
        language: "en-US",
        pitch: 0.8, // Lower pitch for mystery
        rate: 0.6, // Slower for effect
        onStart: () => {
          logger.debug("Playing system TTS: Echo...");
        },
      });

      // Wait for dramatic pause
      await this.sleep(1000);

      // Play "Trail" with clear, welcoming tone
      await Speech.speak("Trail. Welcome to your adventure.", {
        language: "en-US",
        pitch: 1.1, // Higher pitch for warmth
        rate: 0.9, // Normal speed for clarity
        onStart: () => {
          logger.debug("Playing system TTS: Trail welcome");
        },
        onDone: () => {
          logger.debug("EchoTrail system TTS welcome completed");
        },
      });
    } catch (error) {
      logger.error("System TTS welcome failed:", error);
      // Ultra-simple fallback
      try {
        await Speech.speak("Welcome to EchoTrail", {
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
        });
      } catch (finalError) {
        logger.error("All TTS methods failed:", finalError);
      }
    }
  }

  /**
   * Play contextual audio cues
   */
  async playContextualCue(
    context: "tour_start" | "tour_complete" | "memory_saved" | "discovery"
  ): Promise<void> {
    try {
      // For demo, use system TTS to ensure audio is heard
      const cues = {
        tour_start: "Your journey begins... Let the stories unfold.",
        tour_complete: "Another chapter in your EchoTrail story complete.",
        memory_saved: "Memory captured and preserved in your collection.",
        discovery: "A new discovery awaits... Listen closely.",
      };

      const cueText = cues[context];

      logger.debug(`Playing contextual cue: ${context}`);

      await Speech.speak(cueText, {
        language: "en-US",
        pitch: 1.1,
        rate: 0.95,
        onStart: () => {
          logger.debug(`Started contextual cue: ${context}`);
        },
        onDone: () => {
          logger.debug(`Completed contextual cue: ${context}`);
        },
      });
    } catch (error) {
      logger.error(`Failed to play contextual cue: ${context}`, error);
    }
  }

  /**
   * Reset welcome flag (for testing or user preference)
   */
  resetWelcome(): void {
    this.hasPlayedWelcome = false;
  }

  /**
   * Check if welcome has been played this session
   */
  hasPlayedWelcomeSound(): boolean {
    return this.hasPlayedWelcome;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default EchoTrailSoundService.getInstance();

/**
 * EchoTrail Audio Branding Guidelines:
 *
 * 🎵 Signature Sound Concept:
 * - "Echo" (whispered, mysterious, with implied reverb)
 * - Brief pause (0.8 seconds)
 * - "Trail" (clear, confident, welcoming)
 * - Subtle nature ambience implied through voice tone
 *
 * 🎙️ Voice Characteristics:
 * - Echo: Deep, mysterious, distant
 * - Trail: Warm, inviting, clear
 * - Overall: Natural, human, adventurous
 *
 * 🔊 Audio Hierarchy:
 * 1. Signature welcome (app launch)
 * 2. Contextual cues (tour events)
 * 3. Story narration (main content)
 * 4. System notifications (fallback)
 *
 * 💡 Implementation Philosophy:
 * - OpenAI TTS as standard (premium experience)
 * - System TTS only as graceful fallback
 * - Audio branding reinforces app identity
 * - Contextual sounds enhance user journey
 */
