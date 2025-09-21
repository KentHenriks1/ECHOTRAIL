import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";
import * as Device from "expo-device";
import * as Constants from "expo-constants";
import { logger } from "../utils/logger";

// Feedback Types
export interface FeedbackData {
  _id: string;
  type: "bug" | "feature" | "rating" | "survey" | "crash";
  _title: string;
  _description: string;
  rating?: number; // 1-5 stars
  category: "app" | "feature" | "performance" | "ui" | "other";
  timestamp: Date;
  deviceInfo: DeviceInfo;
  appVersion: string;
  userId?: string;
  metadata?: Record<string, any>;
  _submitted: boolean;
}

export interface DeviceInfo {
  platform: string;
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  buildNumber: string;
  screenResolution: string;
  locale: string;
}

export interface UsageAnalytics {
  sessionId: string;
  userId?: string;
  _event: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface BetaSurveyResponse {
  _surveyId: string;
  userId: string;
  responses: Record<string, any>;
  completedAt: Date;
  _timeSpent: number; // in seconds
}

// Storage Keys
const STORAGE_KEYS = {
  FEEDBACK_QUEUE: "echotrail_beta_feedback",
  ANALYTICS_QUEUE: "echotrail_beta_analytics",
  USER_ID: "echotrail_beta_user_id",
  SESSION_ID: "echotrail_current_session",
  SURVEYS_COMPLETED: "echotrail_surveys_completed",
  BETA_ONBOARDING: "echotrail_beta_onboarding",
};

class BetaFeedbackService {
  private feedbackQueue: FeedbackData[] = [];
  private analyticsQueue: UsageAnalytics[] = [];
  private userId: string | null = null;
  private sessionId: string = "";
  private deviceInfo: DeviceInfo | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the beta feedback service
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Generate session ID
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Load stored data
      await this.loadStoredData();

      // Get device info
      this.deviceInfo = await this.getDeviceInfo();

      // Load user ID or generate one
      let storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (!storedUserId) {
        storedUserId = `beta_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, storedUserId);
      }
      this.userId = storedUserId;

      this.initialized = true;
      logger.debug("BetaFeedbackService initialized successfully");

      // Track session start
      this.trackEvent("session_start", {
        sessionId: this.sessionId,
        deviceInfo: this.deviceInfo,
      });
    } catch (error) {
      logger.error("Failed to initialize BetaFeedbackService:", error);
    }
  }

  /**
   * Load stored data from AsyncStorage
   */
  private async loadStoredData(): Promise<void> {
    try {
      // Load feedback queue
      const storedFeedback = await AsyncStorage.getItem(
        STORAGE_KEYS.FEEDBACK_QUEUE
      );
      if (storedFeedback) {
        this.feedbackQueue = JSON.parse(storedFeedback).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }

      // Load analytics queue
      const storedAnalytics = await AsyncStorage.getItem(
        STORAGE_KEYS.ANALYTICS_QUEUE
      );
      if (storedAnalytics) {
        this.analyticsQueue = JSON.parse(storedAnalytics).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      logger.error("Failed to load stored beta feedback data:", error);
    }
  }

  /**
   * Get device information for feedback context
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      const deviceInfo: DeviceInfo = {
        platform: Platform.OS,
        osVersion: Platform.Version.toString(),
        deviceModel: Device.modelName || "Unknown",
        appVersion:
          ((Constants as any)?.expoConfig?.version as string) || "1.0.0",
        buildNumber:
          ((Constants as any)?.expoConfig?.extra as any)?.buildNumber || "1",
        screenResolution: `${Platform.OS === "web" ? window.screen?.width : "N/A"}x${Platform.OS === "web" ? window.screen?.height : "N/A"}`,
        locale: Platform.OS === "web" ? navigator.language : "en-US",
      };

      return deviceInfo;
    } catch (error) {
      logger.error("Failed to get device info:", error);
      return {
        platform: Platform.OS,
        osVersion: "Unknown",
        deviceModel: "Unknown",
        appVersion: "1.0.0",
        buildNumber: "1",
        screenResolution: "Unknown",
        locale: "en-US",
      };
    }
  }

  /**
   * Submit feedback
   */
  public async submitFeedback(
    type: FeedbackData["type"],
    title: string,
    description: string,
    category: FeedbackData["category"],
    rating?: number,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      if (!this.deviceInfo || !this.userId) {
        await this.initialize();
      }

      const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const feedback: FeedbackData = {
        _id: feedbackId,
        type,
        _title: title,
        _description: description,
        rating,
        category,
        timestamp: new Date(),
        deviceInfo: this.deviceInfo!,
        appVersion: this.deviceInfo!.appVersion,
        userId: this.userId || undefined,
        metadata,
        _submitted: false,
      };

      // Add to queue
      this.feedbackQueue.push(feedback);

      // Save to storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.FEEDBACK_QUEUE,
        JSON.stringify(this.feedbackQueue)
      );

      // Try to submit immediately if online
      await this.syncFeedbackQueue();

      logger.debug("Feedback submitted:", feedbackId);
      return feedbackId;
    } catch (error) {
      logger.error("Failed to submit feedback:", error);
      throw error;
    }
  }

  /**
   * Track usage analytics event
   */
  public async trackEvent(
    event: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const analytics: UsageAnalytics = {
        sessionId: this.sessionId,
        userId: this.userId || undefined,
        _event: event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          platform: this.deviceInfo?.platform,
          appVersion: this.deviceInfo?.appVersion,
        },
        timestamp: new Date(),
      };

      // Add to queue
      this.analyticsQueue.push(analytics);

      // Keep queue size reasonable
      if (this.analyticsQueue.length > 100) {
        this.analyticsQueue = this.analyticsQueue.slice(-50);
      }

      // Save to storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.ANALYTICS_QUEUE,
        JSON.stringify(this.analyticsQueue)
      );

      // Try to sync periodically (every 10 events)
      if (this.analyticsQueue.length % 10 === 0) {
        await this.syncAnalyticsQueue();
      }
    } catch (error) {
      logger.error("Failed to track event:", error);
    }
  }

  /**
   * Show shake-to-report feedback dialog
   */
  public showShakeToReportDialog(): void {
    Alert.alert(
      "Report an Issue",
      "Help us improve EchoTrail by reporting bugs or suggesting features.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Report Bug", onPress: () => this.showFeedbackDialog("bug") },
        {
          text: "Suggest Feature",
          onPress: () => this.showFeedbackDialog("feature"),
        },
      ]
    );
  }

  /**
   * Show feedback dialog
   */
  private showFeedbackDialog(type: "bug" | "feature"): void {
    // This would typically show a custom modal or navigate to a feedback screen
    // For now, we'll use a simple prompt
    Alert.prompt(
      type === "bug" ? "Report Bug" : "Suggest Feature",
      type === "bug"
        ? "Describe the bug you encountered:"
        : "Describe your feature idea:",
      async (text) => {
        if (text && text.trim()) {
          await this.submitFeedback(
            type,
            type === "bug" ? "Bug Report" : "Feature Request",
            text.trim(),
            type === "bug" ? "app" : "feature"
          );
          Alert.alert("Thank You!", "Your feedback has been submitted.");
        }
      },
      "plain-text"
    );
  }

  /**
   * Rate a specific feature
   */
  public async rateFeature(
    featureName: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    await this.submitFeedback(
      "rating",
      `Feature Rating: ${featureName}`,
      comment || `User rated ${featureName} as ${rating}/5 stars`,
      "feature",
      rating,
      { featureName }
    );

    await this.trackEvent("feature_rated", {
      feature: featureName,
      rating,
      comment,
    });
  }

  /**
   * Submit survey response
   */
  public async submitSurveyResponse(
    surveyId: string,
    responses: Record<string, any>,
    timeSpent: number
  ): Promise<void> {
    try {
      const surveyResponse: BetaSurveyResponse = {
        _surveyId: surveyId,
        userId: this.userId!,
        responses,
        completedAt: new Date(),
        _timeSpent: timeSpent,
      };

      // Mark survey as completed
      const completedSurveys = await this.getCompletedSurveys();
      completedSurveys.push(surveyId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.SURVEYS_COMPLETED,
        JSON.stringify(completedSurveys)
      );

      // Track survey completion
      await this.trackEvent("survey_completed", {
        surveyId,
        timeSpent,
        responseCount: Object.keys(responses).length,
      });

      logger.debug("Survey response submitted:", surveyId);
    } catch (error) {
      logger.error("Failed to submit survey response:", error);
      throw error;
    }
  }

  /**
   * Get completed surveys
   */
  public async getCompletedSurveys(): Promise<string[]> {
    try {
      const completed = await AsyncStorage.getItem(
        STORAGE_KEYS.SURVEYS_COMPLETED
      );
      return completed ? JSON.parse(completed) : [];
    } catch (error) {
      logger.error("Failed to get completed surveys:", error);
      return [];
    }
  }

  /**
   * Check if user has completed onboarding
   */
  public async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(
        STORAGE_KEYS.BETA_ONBOARDING
      );
      return completed === "true";
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  public async completeOnboarding(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BETA_ONBOARDING, "true");
      await this.trackEvent("beta_onboarding_completed", {
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to mark onboarding as completed:", error);
    }
  }

  /**
   * Sync feedback queue with backend
   */
  private async syncFeedbackQueue(): Promise<void> {
    try {
      const unsubmittedFeedback = this.feedbackQueue.filter(
        (f) => !f._submitted
      );

      for (const feedback of unsubmittedFeedback) {
        // TODO: Send to actual backend API
        // For now, just mark as submitted
        feedback._submitted = true;
        logger.debug("Feedback synced:", feedback._id);
      }

      // Update storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.FEEDBACK_QUEUE,
        JSON.stringify(this.feedbackQueue)
      );
    } catch (error) {
      logger.error("Failed to sync feedback queue:", error);
    }
  }

  /**
   * Sync analytics queue with backend
   */
  private async syncAnalyticsQueue(): Promise<void> {
    try {
      // TODO: Send analytics to backend API
      // For now, just log that sync would happen
      logger.debug(`Would sync ${this.analyticsQueue.length} analytics events`);

      // Clear synced events (keep last 10 for debugging)
      this.analyticsQueue = this.analyticsQueue.slice(-10);
      await AsyncStorage.setItem(
        STORAGE_KEYS.ANALYTICS_QUEUE,
        JSON.stringify(this.analyticsQueue)
      );
    } catch (error) {
      logger.error("Failed to sync analytics queue:", error);
    }
  }

  /**
   * Get feedback statistics
   */
  public getFeedbackStats(): {
    total: number;
    byType: Record<string, number>;
    submitted: number;
    _pending: number;
  } {
    const stats = {
      total: this.feedbackQueue.length,
      byType: {} as Record<string, number>,
      submitted: 0,
      pending: 0,
    };

    this.feedbackQueue.forEach((feedback) => {
      stats.byType[feedback.type] = (stats.byType[feedback.type] || 0) + 1;
      if (feedback._submitted) {
        stats.submitted++;
      } else {
        stats.pending++;
      }
    });

    return {
      ...stats,
      _pending: stats.pending,
    };
  }

  /**
   * Get user ID for beta program
   */
  public getBetaUserId(): string | null {
    return this.userId;
  }

  /**
   * Reset all beta data (for testing)
   */
  public async resetBetaData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.FEEDBACK_QUEUE,
        STORAGE_KEYS.ANALYTICS_QUEUE,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.SURVEYS_COMPLETED,
        STORAGE_KEYS.BETA_ONBOARDING,
      ]);

      this.feedbackQueue = [];
      this.analyticsQueue = [];
      this.userId = null;
      this.initialized = false;

      await this.initialize();
      logger.debug("Beta data reset successfully");
    } catch (error) {
      logger.error("Failed to reset beta data:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const betaFeedbackService = new BetaFeedbackService();
export default betaFeedbackService;
