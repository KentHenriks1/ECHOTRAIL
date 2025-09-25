import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { logger } from "../utils/logger";
import { useTranslation } from "react-i18next";
import { createTheme, Button } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import {
  notificationService,
  NotificationPreferences,
  ScheduledNotification,
} from "../services/NotificationService";

export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    _trailSharing: true,
    _trailUpdates: true,
    _syncCompletion: false,
    _systemUpdates: true,
    _weeklyReminders: true,
    _offlineMapUpdates: true,
  });

  const [scheduledNotifications, setScheduledNotifications] = useState<
    ScheduledNotification[]
  >([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotificationData();
    checkPermissionStatus();
  }, []);

  const loadNotificationData = () => {
    try {
      const currentPreferences = notificationService.getPreferences();
      setPreferences(currentPreferences);

      const scheduled = notificationService.getScheduledNotifications();
      setScheduledNotifications(scheduled);

      const token = notificationService.getPushTokenForBackend();
      setPushToken(token);

      setIsLoading(false);
    } catch (error) {
      logger.error("Failed to load notification data:", error);
      setIsLoading(false);
    }
  };

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      logger.error("Failed to check permission status:", error);
    }
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    try {
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);

      await notificationService.updatePreferences({ [key]: value });

      // Handle special cases
      if (key === "_weeklyReminders") {
        if (value) {
          await notificationService.scheduleWeeklyReminders();
        } else {
          // Cancel weekly reminders
          const weeklyReminders = scheduledNotifications.filter(
            (notif) => notif.type === "reminder" && notif.recurring
          );
          for (const reminder of weeklyReminders) {
            await notificationService.cancelScheduledNotification(reminder._id);
          }
        }
        // Refresh scheduled notifications
        const updated = notificationService.getScheduledNotifications();
        setScheduledNotifications(updated);
      }
    } catch (error) {
      logger.error("Failed to update preference:", error);
      Alert.alert(
        "Error",
        "Failed to update notification preference. Please try again."
      );
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      if (existingStatus === "granted") {
        setPermissionStatus("granted");
        return;
      }

      if (existingStatus === "denied" && Platform.OS === "ios") {
        // On iOS, if denied, we need to direct user to settings
        Alert.alert(
          "Notifications Disabled",
          "Notifications are disabled for EchoTrail. To enable them, please go to Settings > EchoTrail > Notifications.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === "granted") {
        Alert.alert(
          "Notifications Enabled",
          "You will now receive notifications based on your preferences."
        );
        // Reload data to get push token
        loadNotificationData();
      } else {
        Alert.alert(
          "Notifications Disabled",
          "You can enable notifications later in your device settings."
        );
      }
    } catch (error) {
      logger.error("Failed to request permissions:", error);
      Alert.alert("Error", "Failed to request notification permissions.");
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  const testNotification = async () => {
    if (permissionStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications first to test them.",
        [
          { text: "OK" },
          { text: "Enable", onPress: requestNotificationPermissions },
        ]
      );
      return;
    }

    try {
      await notificationService.sendTrailSharingNotification(
        "Test Trail",
        "EchoTrail Team",
        "test-share-id"
      );
      Alert.alert("Test Sent", "A test notification has been sent!");
    } catch (error) {
      logger.error("Failed to send test notification:", error);
      Alert.alert("Error", "Failed to send test notification.");
    }
  };

  const clearAllScheduled = () => {
    Alert.alert(
      "Clear All Scheduled",
      "Are you sure you want to cancel all scheduled notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              setScheduledNotifications([]);
              Alert.alert(
                "Success",
                "All scheduled notifications have been cleared."
              );
            } catch (error) {
              logger.error("Failed to clear notifications:", error);
              Alert.alert("Error", "Failed to clear scheduled notifications.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const getNotificationTypeIcon = (
    type: string
  ): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case "trail_sharing":
        return "share";
      case "trail_update":
        return "update";
      case "sync_completion":
        return "sync";
      case "system_update":
        return "system-update";
      case "reminder":
        return "alarm";
      case "offline_map":
        return "map";
      default:
        return "notifications";
    }
  };

  const renderPermissionStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Status</Text>
      <View style={styles.statusContainer}>
        <MaterialIcons
          name={permissionStatus === "granted" ? "check-circle" : "cancel"}
          size={24}
          color={
            permissionStatus === "granted"
              ? theme.colors.success
              : theme.colors.error
          }
        />
        <View style={styles.statusText}>
          <Text style={styles.statusLabel}>
            {permissionStatus === "granted" ? "Enabled" : "Disabled"}
          </Text>
          <Text style={styles.statusDescription}>
            {permissionStatus === "granted"
              ? "EchoTrail can send you notifications"
              : "Enable notifications to receive updates"}
          </Text>
        </View>
        {permissionStatus !== "granted" && (
          <TouchableOpacity
            style={styles.enableButton}
            onPress={requestNotificationPermissions}
          >
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPreferenceToggle = (
    key: keyof NotificationPreferences,
    title: string,
    description: string,
    icon: keyof typeof MaterialIcons.glyphMap
  ) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceIconContainer}>
        <MaterialIcons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.preferenceContent}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        value={preferences[key]}
        onValueChange={(value) => updatePreference(key, value)}
        thumbColor={
          preferences[key] ? theme.colors.primary : theme.colors.textSecondary
        }
        trackColor={{
          false: theme.colors.border,
          true: `${theme.colors.primary}40`,
        }}
        disabled={permissionStatus !== "granted"}
      />
    </View>
  );

  const renderScheduledNotification = (
    notification: ScheduledNotification,
    _index: number
  ) => (
    <View key={notification._id} style={styles.notificationItem}>
      <View style={styles.notificationIconContainer}>
        <MaterialIcons
          name={getNotificationTypeIcon(notification.type)}
          size={20}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification._data.title}</Text>
        <Text style={styles.notificationBody}>{notification._data.body}</Text>
        <Text style={styles.notificationDate}>
          {formatDate(notification._scheduledDate)}
          {notification.recurring && (
            <Text style={styles.recurringLabel}>
              {" "}
              • {notification.recurringInterval}
            </Text>
          )}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.cancelNotificationButton}
        onPress={async () => {
          try {
            await notificationService.cancelScheduledNotification(
              notification._id
            );
            setScheduledNotifications((prev) =>
              prev.filter((n) => n._id !== notification._id)
            );
          } catch (error) {
            logger.error("Failed to cancel notification:", error);
          }
        }}
      >
        <MaterialIcons name="cancel" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>
          Customize when and how you receive notifications from EchoTrail
        </Text>
      </View>

      {/* Permission Status */}
      {renderPermissionStatus()}

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        <View style={styles.preferencesContainer}>
          {renderPreferenceToggle(
            "_trailSharing",
            "Trail Sharing",
            "Get notified when someone shares a trail with you",
            "share"
          )}
          {renderPreferenceToggle(
            "_trailUpdates",
            "Trail Updates",
            "Notifications about changes to your trails",
            "update"
          )}
          {renderPreferenceToggle(
            "_syncCompletion",
            "Sync Completion",
            "Get notified when your data finishes syncing",
            "sync"
          )}
          {renderPreferenceToggle(
            "_systemUpdates",
            "System Updates",
            "Important app updates and announcements",
            "system-update"
          )}
          {renderPreferenceToggle(
            "_weeklyReminders",
            "Weekly Reminders",
            "Weekly reminders to explore new trails",
            "alarm"
          )}
          {renderPreferenceToggle(
            "_offlineMapUpdates",
            "Offline Map Updates",
            "Notifications about offline map downloads and updates",
            "map"
          )}
        </View>
      </View>

      {/* Scheduled Notifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Scheduled Notifications ({scheduledNotifications.length})
          </Text>
          {scheduledNotifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={clearAllScheduled}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {scheduledNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="schedule"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>
              No scheduled notifications
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Notifications will appear here when scheduled
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {scheduledNotifications.map(renderScheduledNotification)}
          </View>
        )}
      </View>

      {/* Debug/Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing & Debug</Text>
        <View style={styles.debugContainer}>
          <Button
            title="Send Test Notification"
            onPress={testNotification}
            variant="secondary"
            theme={theme}
          />
          <View style={styles.debugInfo}>
            <Text style={styles.debugLabel}>Push Token:</Text>
            <Text style={styles.debugValue} numberOfLines={2}>
              {pushToken ? `${pushToken.substring(0, 32)}...` : "Not available"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.systemSettingsButton}
            onPress={openSystemSettings}
          >
            <MaterialIcons
              name="settings"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.systemSettingsText}>Open System Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    header: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    statusText: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    statusLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
    statusDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    enableButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },
    enableButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    preferencesContainer: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
    },
    preferenceItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    preferenceIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    preferenceContent: {
      flex: 1,
    },
    preferenceTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    preferenceDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    clearAllButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    clearAllText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      fontFamily: theme.typography.fontFamily.medium,
    },
    emptyState: {
      alignItems: "center",
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
    },
    emptyStateText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    emptyStateSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    notificationsList: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
    },
    notificationItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    notificationIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    notificationBody: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    notificationDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    recurringLabel: {
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.primary,
    },
    cancelNotificationButton: {
      padding: theme.spacing.sm,
    },
    debugContainer: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    debugInfo: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    debugLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    debugValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: "monospace",
    },
    systemSettingsButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    systemSettingsText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
  });
