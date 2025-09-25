import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";
import { logger } from "../utils/logger";

// Notification Types
export interface NotificationPreferences {
  _trailSharing: boolean;
  _trailUpdates: boolean;
  _syncCompletion: boolean;
  _systemUpdates: boolean;
  _weeklyReminders: boolean;
  _offlineMapUpdates: boolean;
}

export interface NotificationData {
  type:
    | "trail_sharing"
    | "trail_update"
    | "sync_completion"
    | "system_update"
    | "reminder"
    | "offline_map";
  trailId?: string;
  shareId?: string;
  userId?: string;
  title: string;
  body: string;
  data?: any;
}

export interface ScheduledNotification {
  _id: string;
  type: NotificationData["type"];
  _scheduledDate: Date;
  _data: NotificationData;
  recurring?: boolean;
  recurringInterval?: "daily" | "weekly" | "monthly";
}

// Storage Keys
const STORAGE_KEYS = {
  PUSH_TOKEN: "echotrail_push_token",
  PREFERENCES: "echotrail_notification_preferences",
  SCHEDULED: "echotrail_scheduled_notifications",
  PERMISSION_REQUESTED: "echotrail_permission_requested",
};

// Default Preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  _trailSharing: true,
  _trailUpdates: true,
  _syncCompletion: false,
  _systemUpdates: true,
  _weeklyReminders: true,
  _offlineMapUpdates: true,
};

class NotificationService {
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private scheduledNotifications: ScheduledNotification[] = [];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the notification service
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Configure notification handling
      this.configureNotifications();

      // Load stored data
      await this.loadStoredData();

      // Request permissions and register for push notifications
      await this.requestPermissionsAndRegister();

      this.initialized = true;
      logger.debug("NotificationService initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize NotificationService:", error);
    }
  }

  /**
   * Configure notification behavior
   */
  private configureNotifications(): void {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content
          .data as unknown as NotificationData;
        const type = data?.type || "system_update";

        // Check if notification type is enabled in preferences
        const shouldShow = this.shouldShowNotification(type);

        return {
          shouldShowAlert: shouldShow,
          shouldPlaySound: shouldShow && this.preferences._systemUpdates,
          shouldSetBadge: shouldShow,
        } as any;
      },
    });

    // Handle notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );

    // Handle notifications received while app is in foreground
    Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ): void => {
    const { data } = response.notification.request.content;
    const notificationData = data as unknown as NotificationData;

    logger.debug("Notification tapped:", notificationData);

    // Emit event for navigation handling
    this.emitNavigationEvent(notificationData);
  };

  /**
   * Handle notification received in foreground
   */
  private handleNotificationReceived = (
    notification: Notifications.Notification
  ): void => {
    const { data } = notification.request.content;
    const notificationData = data as unknown as NotificationData;

    logger.debug("Notification received in foreground:", notificationData);

    // Show in-app notification or update UI
    this.handleForegroundNotification(notificationData);
  };

  /**
   * Load stored data from AsyncStorage
   */
  private async loadStoredData(): Promise<void> {
    try {
      // Load push token
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
      if (storedToken) {
        this.pushToken = storedToken;
      }

      // Load preferences
      const storedPreferences = await AsyncStorage.getItem(
        STORAGE_KEYS.PREFERENCES
      );
      if (storedPreferences) {
        this.preferences = {
          ...DEFAULT_PREFERENCES,
          ...JSON.parse(storedPreferences),
        };
      }

      // Load scheduled notifications
      const storedScheduled = await AsyncStorage.getItem(
        STORAGE_KEYS.SCHEDULED
      );
      if (storedScheduled) {
        this.scheduledNotifications = JSON.parse(storedScheduled).map(
          (notif: any) => ({
            ...notif,
            _scheduledDate: new Date(notif.scheduledDate),
          })
        );
      }
    } catch (error) {
      logger.error("Failed to load stored notification data:", error);
    }
  }

  /**
   * Request notification permissions and register for push notifications
   */
  private async requestPermissionsAndRegister(): Promise<void> {
    if (!Device.isDevice) {
      logger.warn("Push notifications only work on physical devices");
      return;
    }

    try {
      // Check if we already requested permissions
      const permissionRequested = await AsyncStorage.getItem(
        STORAGE_KEYS.PERMISSION_REQUESTED
      );

      if (!permissionRequested) {
        // Show explanation before requesting permissions
        Alert.alert(
          "Enable Notifications",
          "EchoTrail would like to send you notifications about trail sharing, updates, and reminders. You can customize these preferences later in settings.",
          [
            { text: "Not Now", style: "cancel" },
            {
              text: "Enable",
              onPress: () => this.requestNotificationPermissions(),
            },
          ]
        );
        return;
      }

      await this.requestNotificationPermissions();
    } catch (error) {
      logger.error("Failed to request notification permissions:", error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestNotificationPermissions(): Promise<void> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        logger.warn("Notification permissions not granted");
        return;
      }

      // Mark permission as requested
      await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_REQUESTED, "true");

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

        // TODO: Send token to backend for registration
        logger.debug("Push token obtained:", token);
      }
    } catch (error) {
      logger.error("Failed to get notification permissions:", error);
    }
  }

  /**
   * Get push token for the device
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token;
    } catch (error) {
      logger.error("Failed to get push token:", error);
      return null;
    }
  }

  /**
   * Check if notification type should be shown based on preferences
   */
  private shouldShowNotification(type: NotificationData["type"]): boolean {
    switch (type) {
      case "trail_sharing":
        return this.preferences._trailSharing;
      case "trail_update":
        return this.preferences._trailUpdates;
      case "sync_completion":
        return this.preferences._syncCompletion;
      case "system_update":
        return this.preferences._systemUpdates;
      case "reminder":
        return this.preferences._weeklyReminders;
      case "offline_map":
        return this.preferences._offlineMapUpdates;
      default:
        return true;
    }
  }

  /**
   * Handle foreground notifications
   */
  private handleForegroundNotification(data: NotificationData): void {
    // Use NavigationService to handle foreground notification
    const { navigationService } = require("./NavigationService");
    navigationService.handleForegroundNotification(data);
  }

  /**
   * Emit navigation event for handling notification taps
   */
  private emitNavigationEvent(data: NotificationData): void {
    // Use NavigationService to handle notification navigation
    const { navigationService } = require("./NavigationService");
    navigationService.handleNotificationNavigation(data);
  }

  // PUBLIC API

  /**
   * Get current notification preferences
   */
  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update notification preferences
   */
  public async updatePreferences(
    updates: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREFERENCES,
        JSON.stringify(this.preferences)
      );
      logger.debug("Notification preferences updated:", this.preferences);
    } catch (error) {
      logger.error("Failed to update notification preferences:", error);
      throw error;
    }
  }

  /**
   * Get current push token
   */
  public getPushTokenForBackend(): string | null {
    return this.pushToken;
  }

  /**
   * Schedule a local notification
   */
  public async scheduleNotification(
    data: NotificationData,
    scheduledDate: Date,
    recurring?: boolean,
    recurringInterval?: "daily" | "weekly" | "monthly"
  ): Promise<string> {
    try {
      if (!this.shouldShowNotification(data.type)) {
        logger.debug(
          "Notification type disabled, skipping schedule:",
          data.type
        );
        return "";
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data as any,
          sound: "default",
        },
        trigger: {
          date: scheduledDate,
        } as any,
      });

      // Store scheduled notification
      const scheduledNotification: ScheduledNotification = {
        _id: notificationId,
        type: data.type,
        _scheduledDate: scheduledDate,
        _data: data,
        recurring,
        recurringInterval,
      };

      this.scheduledNotifications.push(scheduledNotification);
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED,
        JSON.stringify(this.scheduledNotifications)
      );

      logger.debug("Notification scheduled:", notificationId);
      return notificationId;
    } catch (error) {
      logger.error("Failed to schedule notification:", error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelScheduledNotification(
    notificationId: string
  ): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);

      this.scheduledNotifications = this.scheduledNotifications.filter(
        (notif) => notif._id !== notificationId
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED,
        JSON.stringify(this.scheduledNotifications)
      );

      logger.debug("Notification cancelled:", notificationId);
    } catch (error) {
      logger.error("Failed to cancel scheduled notification:", error);
      throw error;
    }
  }

  /**
   * Get all scheduled notifications
   */
  public getScheduledNotifications(): ScheduledNotification[] {
    return [...this.scheduledNotifications];
  }

  /**
   * Send a trail sharing notification
   */
  public async sendTrailSharingNotification(
    trailName: string,
    sharedBy: string,
    shareId: string
  ): Promise<void> {
    if (!this.preferences._trailSharing) return;
    const data: NotificationData = {
      type: "trail_sharing",
      shareId,
      title: "New Trail Shared",
      body: `${sharedBy} shared "${trailName}" with you`,
      data: { shareId, sharedBy, trailName },
    };

    await this.scheduleNotification(data, new Date());
  }

  /**
   * Send a trail update notification
   */
  public async sendTrailUpdateNotification(
    trailName: string,
    trailId: string,
    updateType: string
  ): Promise<void> {
    if (!this.preferences._trailUpdates) return;

    const data: NotificationData = {
      type: "trail_update",
      trailId,
      title: "Trail Updated",
      body: `"${trailName}" has been ${updateType}`,
      data: { trailId, updateType },
    };

    await this.scheduleNotification(data, new Date());
  }

  /**
   * Send a sync completion notification
   */
  public async sendSyncCompletionNotification(
    syncedCount: number
  ): Promise<void> {
    if (!this.preferences._syncCompletion || syncedCount === 0) return;

    const data: NotificationData = {
      type: "sync_completion",
      title: "Sync Complete",
      body: `${syncedCount} trail${syncedCount > 1 ? "s" : ""} synced successfully`,
      data: { syncedCount },
    };

    await this.scheduleNotification(data, new Date());
  }

  /**
   * Schedule weekly reminder notifications
   */
  public async scheduleWeeklyReminders(): Promise<void> {
    if (!this.preferences._weeklyReminders) return;

    // Cancel existing weekly reminders
    const existingReminders = this.scheduledNotifications.filter(
      (notif) => notif.type === "reminder" && notif.recurring
    );

    for (const reminder of existingReminders) {
      await this.cancelScheduledNotification(reminder._id);
    }

    // Schedule new weekly reminder
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(10, 0, 0, 0); // 10 AM on Sundays

    const data: NotificationData = {
      type: "reminder",
      title: "Time to Explore!",
      body: "Ready to discover new trails? Start your next adventure with EchoTrail.",
      data: { reminderType: "weekly" },
    };

    await this.scheduleNotification(data, nextSunday, true, "weekly");
  }

  /**
   * Clear all notifications and reset preferences
   */
  public async reset(): Promise<void> {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Clear stored data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PUSH_TOKEN,
        STORAGE_KEYS.PREFERENCES,
        STORAGE_KEYS.SCHEDULED,
      ]);

      // Reset in-memory state
      this.pushToken = null;
      this.preferences = DEFAULT_PREFERENCES;
      this.scheduledNotifications = [];

      logger.debug("NotificationService reset successfully");
    } catch (error) {
      logger.error("Failed to reset NotificationService:", error);
      throw error;
    }
  }

  /**
   * Check and cleanup expired scheduled notifications
   */
  public async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      const activeNotifications = this.scheduledNotifications.filter(
        (notif) => notif._scheduledDate > now || notif.recurring
      );

      if (activeNotifications.length !== this.scheduledNotifications.length) {
        this.scheduledNotifications = activeNotifications;
        await AsyncStorage.setItem(
          STORAGE_KEYS.SCHEDULED,
          JSON.stringify(this.scheduledNotifications)
        );
        logger.debug("Cleaned up expired scheduled notifications");
      }
    } catch (error) {
      logger.error("Failed to cleanup expired notifications:", error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
