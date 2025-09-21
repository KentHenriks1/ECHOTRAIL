// Auto-initialization service for EchoTrail app
import openAITTSService from "./OpenAITTSService";
import { logger } from "../utils/logger";

class AppInitService {
  private static instance: AppInitService;
  private isInitialized = false;

  static getInstance(): AppInitService {
    if (!AppInitService.instance) {
      AppInitService.instance = new AppInitService();
    }
    return AppInitService.instance;
  }

  /**
   * Initialize app with default settings and API keys
   */
  async initializeApp(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info("🚀 Initializing EchoTrail app...");

      // Check if OpenAI API key is already configured
      const existingApiKey = await openAITTSService.getApiKey();

      if (!existingApiKey) {
        logger.info("🔧 Auto-configuring OpenAI TTS...");

        // API key should be retrieved from environment variables or secure storage
        const API_KEY = process.env.OPENAI_API_KEY || "";

        if (API_KEY) {
          await openAITTSService.setApiKey(API_KEY);
          await openAITTSService.setPreferredVoice("nova"); // High-quality voice

          logger.info("✅ OpenAI TTS auto-configured successfully!");
          logger.info("🎤 Voice: Nova (Premium HD)");
          logger.info("📈 Model: tts-1-hd (Highest Quality)");

          // Test the configuration
          const isAvailable = await openAITTSService.isAvailable();
          if (isAvailable) {
            logger.info("🔊 OpenAI TTS is ready and available");
          }
        } else {
          logger.warn("⚠️ No OpenAI API key found in environment variables");
        }
      } else {
        logger.info("✅ OpenAI API key already configured");
        const voice = await openAITTSService.getPreferredVoice();
        logger.info(`🎤 Current voice: ${voice}`);
      }

      // Initialize other services here if needed
      await this.initializeOtherServices();

      this.isInitialized = true;
      logger.info("🎉 EchoTrail app initialization complete!");
    } catch (error) {
      logger.error("❌ App initialization failed:", error);
      // Don't throw error - app should still work without auto-config
    }
  }

  /**
   * Initialize other app services
   */
  private async initializeOtherServices(): Promise<void> {
    try {
      // Initialize audio system
      // Other service initializations can go here

      logger.debug("📱 App services initialized");
    } catch (error) {
      logger.warn("⚠️ Some services failed to initialize:", error);
    }
  }

  /**
   * Reset API key (for testing or changing keys)
   */
  async resetApiKey(newApiKey?: string): Promise<void> {
    try {
      if (newApiKey) {
        await openAITTSService.setApiKey(newApiKey);
        logger.info("🔄 API key updated successfully");
      } else {
        await openAITTSService.setApiKey("");
        logger.info("🗑️ API key cleared");
      }
    } catch (error) {
      logger.error("❌ Failed to reset API key:", error);
    }
  }

  /**
   * Get initialization status
   */
  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Force re-initialization
   */
  async forceReinitialize(): Promise<void> {
    this.isInitialized = false;
    await this.initializeApp();
  }
}

export default AppInitService.getInstance();
