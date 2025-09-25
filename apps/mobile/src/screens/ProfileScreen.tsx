/**
 * Profile Screen - Enterprise Edition
 * User profile management with settings and account options
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { ApiServices } from "../services/api";
import { Logger, PerformanceMonitor } from "../core/utils";
import { ThemeConfig } from "../core/config";
import { getFontWeight } from "../core/theme/utils";
import { PhotoCapture } from "../components/common/PhotoCapture";
import { PhotoAsset } from "../services/media/PhotoService";

interface UserStats {
  totalTrails: number;
  totalDistance: number;
  totalTrackPoints: number;
  publicTrails: number;
}

interface ProfileSettings {
  notifications: boolean;
  locationSharing: boolean;
  publicProfile: boolean;
  analytics: boolean;
}

interface UserProfile {
  profilePhotoUri?: string;
  displayName?: string;
  bio?: string;
}

export function ProfileScreen(): React.ReactElement {
  const { user, logout, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalTrails: 0,
    totalDistance: 0,
    totalTrackPoints: 0,
    publicTrails: 0,
  });
  const [settings, setSettings] = useState<ProfileSettings>({
    notifications: true,
    locationSharing: true,
    publicProfile: false,
    analytics: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    profilePhotoUri: undefined,
    displayName: user?.email?.split('@')[0] || 'User',
    bio: 'Trail explorer and nature enthusiast',
  });

  const logger = useMemo(() => new Logger("ProfileScreen"), []);

  // Load user statistics
  const loadUserStats = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      logger.info("Loading user statistics");
      setIsLoading(true);
      setError(null);

      // Get user trails for statistics
      const trailsResponse = await ApiServices.trails.getTrails({
        limit: 1000,
        includeTrackPoints: false,
      });

      if (trailsResponse.success && trailsResponse.data) {
        const trails = trailsResponse.data;
        const userTrails = trails.filter((trail) => trail.userId === user?.id);

        const stats: UserStats = {
          totalTrails: userTrails.length,
          totalDistance: 0, // Would need to calculate from track points
          totalTrackPoints: userTrails.reduce(
            (sum, trail) => sum + (trail.trackPoints?.length || 0),
            0
          ),
          publicTrails: userTrails.filter((trail) => trail.isPublic).length,
        };

        setStats(stats);
      }

      setIsLoading(false);
      logger.info("User statistics loaded successfully");
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setIsLoading(false);
      logger.error("Failed to load user statistics", undefined, err as Error);
    }
  }, [isAuthenticated, user?.id, logger]);

  // Save settings
  const saveSettings = useCallback(
    async (newSettings: Partial<ProfileSettings>) => {
      try {
        setIsSaving(true);
        logger.info("Saving profile settings", newSettings);

        // Update local state immediately for better UX
        setSettings((prev) => ({ ...prev, ...newSettings }));

        // Here you would typically save to backend
        // await ApiServices.user.updateSettings(newSettings)

        setIsSaving(false);
        logger.info("Profile settings saved successfully");
      } catch (err) {
        const errorMessage = (err as Error).message;
        logger.error("Failed to save settings", undefined, err as Error);
        setIsSaving(false);

        Alert.alert("Save Failed", `Failed to save settings: ${errorMessage}`, [
          { text: "OK", style: "default" },
        ]);
      }
    },
    [logger]
  );

  // Handle logout
  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logger.info("User logging out");
          logout();

          // Track logout event
          PerformanceMonitor.trackCustomMetric(
            "user_logout",
            1,
            "count",
            undefined,
            { userId: user?.id }
          );
        },
      },
    ]);
  }, [logout, user?.id, logger]);

  // Handle profile photo change
  const handleProfilePhotoChange = useCallback((asset: PhotoAsset) => {
    setProfile(prev => ({ ...prev, profilePhotoUri: asset.uri }));
    logger.info('Profile photo updated', { uri: asset.uri });
    
    // Here you would typically save to backend
    // await ApiServices.user.updateProfilePhoto(asset.uri)
  }, [logger]);

  // Handle profile photo removal
  const handleProfilePhotoRemove = useCallback(() => {
    setProfile(prev => ({ ...prev, profilePhotoUri: undefined }));
    logger.info('Profile photo removed');
    
    // Here you would typically remove from backend
    // await ApiServices.user.removeProfilePhoto()
  }, [logger]);

  // Delete account
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and will delete all your trails permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Delete",
              'This will permanently delete your account and all data. Type "DELETE" to confirm.',
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "DELETE PERMANENTLY",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      logger.warn("User deleting account", {
                        userId: user?.id,
                      });
                      // await ApiServices.user.deleteAccount()
                      logout();
                    } catch (err) {
                      logger.error(
                        "Failed to delete account",
                        undefined,
                        err as Error
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [logout, user?.id, logger]);

  // Initialize
  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // Format distance
  const formatDistance = useCallback((meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ThemeConfig.primaryColor} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <PhotoCapture
            currentImageUri={profile.profilePhotoUri}
            onPhotoSelected={handleProfilePhotoChange}
            onPhotoRemoved={handleProfilePhotoRemove}
            size="large"
            shape="circle"
            addPhotoText="Add Profile Photo"
            changePhotoText="Change Photo"
            removePhotoText="Remove Photo"
            photoOptions={{
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1], // Square aspect ratio
            }}
            style={styles.profilePhotoContainer}
          />
          
          {/* Fallback avatar when no photo */}
          {!profile.profilePhotoUri && (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          
          <Text style={styles.userName}>{profile.displayName || user?.email || "Anonymous User"}</Text>
          <Text style={styles.userRole}>Trail Explorer</Text>
          {profile.bio && (
            <Text style={styles.userBio}>{profile.bio}</Text>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Trail Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalTrails}</Text>
              <Text style={styles.statLabel}>Total Trails</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.publicTrails}</Text>
              <Text style={styles.statLabel}>Public Trails</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalTrackPoints}</Text>
              <Text style={styles.statLabel}>Track Points</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatDistance(stats.totalDistance)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications about trail updates
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => saveSettings({ notifications: value })}
              trackColor={{ false: "#f1f5f9", true: ThemeConfig.primaryColor }}
              disabled={isSaving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location Sharing</Text>
              <Text style={styles.settingDescription}>
                Allow sharing location with other users
              </Text>
            </View>
            <Switch
              value={settings.locationSharing}
              onValueChange={(value) =>
                saveSettings({ locationSharing: value })
              }
              trackColor={{ false: "#f1f5f9", true: ThemeConfig.primaryColor }}
              disabled={isSaving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Public Profile</Text>
              <Text style={styles.settingDescription}>
                Make your profile visible to other users
              </Text>
            </View>
            <Switch
              value={settings.publicProfile}
              onValueChange={(value) => saveSettings({ publicProfile: value })}
              trackColor={{ false: "#f1f5f9", true: ThemeConfig.primaryColor }}
              disabled={isSaving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Analytics</Text>
              <Text style={styles.settingDescription}>
                Help improve the app by sharing usage data
              </Text>
            </View>
            <Switch
              value={settings.analytics}
              onValueChange={(value) => saveSettings({ analytics: value })}
              trackColor={{ false: "#f1f5f9", true: ThemeConfig.primaryColor }}
              disabled={isSaving}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                "Export Data",
                "Export your trail data and statistics?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Export",
                    style: "default",
                    onPress: () => {
                      logger.info("Data export initiated");
                      Alert.alert(
                        "Export Started",
                        "Your data export is being prepared. You will be notified when ready."
                      );
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.actionButtonText}>📁 Export My Data</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                "Privacy Policy",
                "View EchoTrail's Privacy Policy and data handling practices?",
                [
                  { text: "Close", style: "cancel" },
                  {
                    text: "View Policy",
                    style: "default",
                    onPress: () => {
                      logger.info("Privacy policy accessed");
                      Alert.alert(
                        "Privacy Policy",
                        "EchoTrail respects your privacy. Your trail data is stored securely and never shared without your consent. Location data is only used to enhance your trail experience."
                      );
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.actionButtonText}>🛡️ Privacy Policy</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => {
              Alert.alert("Help & Support", "Need help with EchoTrail?", [
                { text: "Close", style: "cancel" },
                {
                  text: "Contact Support",
                  style: "default",
                  onPress: () => {
                    logger.info("Support contact initiated");
                    Alert.alert(
                      "Contact Support",
                      "For support, please email: support@echotrail.com\n\nOr visit our website for FAQ and troubleshooting guides."
                    );
                  },
                },
              ]);
            }}
          >
            <Text style={styles.actionButtonText}>💬 Help & Support</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Sign Out</Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>⚠️ Delete Account</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>EchoTrail Enterprise v2.0.0</Text>
          <Text style={styles.appCopyright}>
            © 2024 EchoTrail. All rights reserved.
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  loadingText: {
    marginTop: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  userSection: {
    alignItems: "center",
    paddingVertical: ThemeConfig.spacing.xl,
    backgroundColor: "#ffffff",
    marginBottom: ThemeConfig.spacing.md,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: ThemeConfig.spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ThemeConfig.primaryColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.md,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ThemeConfig.primaryColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.md,
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -60,
    zIndex: -1,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: getFontWeight("bold"),
    color: "#ffffff",
  },
  userName: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.xs,
    marginTop: ThemeConfig.spacing.sm,
  },
  userRole: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  userBio: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 280,
  },
  statsSection: {
    backgroundColor: "#ffffff",
    padding: ThemeConfig.spacing.lg,
    marginBottom: ThemeConfig.spacing.md,
  },
  sectionTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("bold"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: ThemeConfig.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.sm,
  },
  statValue: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.primaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  statLabel: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  settingsSection: {
    backgroundColor: "#ffffff",
    padding: ThemeConfig.spacing.lg,
    marginBottom: ThemeConfig.spacing.md,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ThemeConfig.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingInfo: {
    flex: 1,
    marginRight: ThemeConfig.spacing.md,
  },
  settingTitle: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.xs,
  },
  settingDescription: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  actionsSection: {
    backgroundColor: "#ffffff",
    padding: ThemeConfig.spacing.lg,
    marginBottom: ThemeConfig.spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: ThemeConfig.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  actionButtonText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: "#1e293b",
  },
  actionButtonArrow: {
    fontSize: 18,
    color: ThemeConfig.secondaryColor,
  },
  logoutButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    marginTop: ThemeConfig.spacing.lg,
  },
  logoutButtonText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
    color: "#ffffff",
  },
  deleteButton: {
    backgroundColor: ThemeConfig.errorColor,
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    marginTop: ThemeConfig.spacing.md,
  },
  deleteButtonText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
    color: "#ffffff",
  },
  appInfoSection: {
    alignItems: "center",
    paddingVertical: ThemeConfig.spacing.lg,
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  appVersion: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  appCopyright: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    margin: ThemeConfig.spacing.lg,
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: ThemeConfig.errorColor,
  },
  errorText: {
    color: ThemeConfig.errorColor,
    fontSize: ThemeConfig.typography.fontSize.md,
  },
});
