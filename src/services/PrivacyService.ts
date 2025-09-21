import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { logger } from "../utils/logger";

export interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  locationTracking: boolean;
  dataSharing: boolean;
  notifications: boolean;
  timestamp: Date;
  version: string;
}

export interface DataRetentionPolicy {
  category: string;
  retentionPeriod: number; // days
  description: string;
  autoDelete: boolean;
}

export interface PrivacySettings {
  profileVisibility: "public" | "friends" | "private";
  trailSharingDefault: "public" | "friends" | "private";
  dataExportFormat: "json" | "gpx" | "csv";
  locationPrecision: "exact" | "approximate" | "city";
  _dataMinimization: boolean;
}

export class PrivacyService {
  private static instance: PrivacyService;
  private readonly STORAGE_KEYS = {
    CONSENT_PREFERENCES: "privacy_consent_preferences",
    PRIVACY_SETTINGS: "privacy_settings",
    DATA_RETENTION_ACKNOWLEDGED: "data_retention_acknowledged",
    GDPR_REQUESTS: "gdpr_requests",
  };

  private readonly CURRENT_PRIVACY_VERSION = "1.2";
  private readonly DATA_RETENTION_POLICIES: DataRetentionPolicy[] = [
    {
      category: "Account Data",
      retentionPeriod: 2555, // 7 years
      description: "User profile and authentication data",
      autoDelete: false,
    },
    {
      category: "Location Data",
      retentionPeriod: 1095, // 3 years
      description: "GPS coordinates and trail data",
      autoDelete: true,
    },
    {
      category: "Activity Logs",
      retentionPeriod: 365, // 1 year
      description: "App usage and performance logs",
      autoDelete: true,
    },
    {
      category: "Marketing Data",
      retentionPeriod: 730, // 2 years
      description: "Preferences and communication history",
      autoDelete: true,
    },
    {
      category: "Support Data",
      retentionPeriod: 1095, // 3 years
      description: "Customer support interactions",
      autoDelete: false,
    },
  ];

  private constructor() {}

  public static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Check if user needs to update consent preferences
   */
  async checkConsentStatus(): Promise<{
    needsUpdate: boolean;
    reason?: string;
  }> {
    try {
      const storedPreferences = await this.getConsentPreferences();

      if (!storedPreferences) {
        return { needsUpdate: true, reason: "No consent recorded" };
      }

      if (storedPreferences.version !== this.CURRENT_PRIVACY_VERSION) {
        return { needsUpdate: true, reason: "Privacy policy updated" };
      }

      // Check if consent is older than 1 year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (new Date(storedPreferences.timestamp) < oneYearAgo) {
        return { needsUpdate: true, reason: "Consent needs renewal" };
      }

      return { needsUpdate: false };
    } catch (error) {
      logger.error("PrivacyService: Error checking consent status", error);
      return { needsUpdate: true, reason: "Error checking consent" };
    }
  }

  /**
   * Get current consent preferences
   */
  async getConsentPreferences(): Promise<ConsentPreferences | null> {
    try {
      const stored = await AsyncStorage.getItem(
        this.STORAGE_KEYS.CONSENT_PREFERENCES
      );
      if (!stored) return null;

      const preferences = JSON.parse(stored);
      preferences.timestamp = new Date(preferences.timestamp);
      return preferences;
    } catch (error) {
      logger.error("PrivacyService: Error getting consent preferences", error);
      return null;
    }
  }

  /**
   * Update consent preferences
   */
  async updateConsentPreferences(
    preferences: Partial<ConsentPreferences>
  ): Promise<void> {
    try {
      const currentPreferences = await this.getConsentPreferences();

      const updatedPreferences: ConsentPreferences = {
        essential: true, // Always required
        analytics:
          preferences.analytics ?? currentPreferences?.analytics ?? false,
        marketing:
          preferences.marketing ?? currentPreferences?.marketing ?? false,
        locationTracking:
          preferences.locationTracking ??
          currentPreferences?.locationTracking ??
          false,
        dataSharing:
          preferences.dataSharing ?? currentPreferences?.dataSharing ?? false,
        notifications:
          preferences.notifications ??
          currentPreferences?.notifications ??
          false,
        timestamp: new Date(),
        version: this.CURRENT_PRIVACY_VERSION,
      };

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CONSENT_PREFERENCES,
        JSON.stringify(updatedPreferences)
      );

      logger.debug(
        "PrivacyService: Consent preferences updated",
        updatedPreferences
      );
    } catch (error) {
      logger.error("PrivacyService: Error updating consent preferences", error);
      throw new Error("Failed to update consent preferences");
    }
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettings> {
    try {
      const stored = await AsyncStorage.getItem(
        this.STORAGE_KEYS.PRIVACY_SETTINGS
      );
      if (!stored) {
        return this.getDefaultPrivacySettings();
      }

      return JSON.parse(stored);
    } catch (error) {
      logger.error("PrivacyService: Error getting privacy settings", error);
      return this.getDefaultPrivacySettings();
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    settings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.getPrivacySettings();
      const updatedSettings: PrivacySettings = {
        ...currentSettings,
        ...settings,
      };

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PRIVACY_SETTINGS,
        JSON.stringify(updatedSettings)
      );

      logger.debug("PrivacyService: Privacy settings updated", updatedSettings);
    } catch (error) {
      logger.error("PrivacyService: Error updating privacy settings", error);
      throw new Error("Failed to update privacy settings");
    }
  }

  /**
   * Get data retention policies
   */
  getDataRetentionPolicies(): DataRetentionPolicy[] {
    return [...this.DATA_RETENTION_POLICIES];
  }

  /**
   * Check if data should be deleted based on retention policy
   */
  shouldDeleteData(category: string, dataDate: Date): boolean {
    const policy = this.DATA_RETENTION_POLICIES.find(
      (p) => p.category === category
    );
    if (!policy || !policy.autoDelete) return false;

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - policy.retentionPeriod);

    return dataDate < retentionDate;
  }

  /**
   * Request data export (GDPR Article 20 - Data Portability)
   */
  async requestDataExport(
    format: "json" | "gpx" | "csv" = "json"
  ): Promise<{ requestId: string; estimatedCompletion: Date }> {
    try {
      const requestId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + 7); // 7 days

      const request = {
        _id: requestId,
        type: "DATA_EXPORT",
        format,
        requestDate: new Date(),
        status: "PENDING",
        estimatedCompletion,
      };

      // Store request for tracking
      await this.storeGDPRRequest(request);

      logger.debug("PrivacyService: Data export requested", request);

      return { requestId, estimatedCompletion };
    } catch (error) {
      logger.error("PrivacyService: Error requesting data export", error);
      throw new Error("Failed to request data export");
    }
  }

  /**
   * Request account deletion (GDPR Article 17 - Right to Erasure)
   */
  async requestAccountDeletion(
    reason?: string
  ): Promise<{ requestId: string; scheduledDeletion: Date }> {
    try {
      const requestId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledDeletion = new Date();
      scheduledDeletion.setDate(scheduledDeletion.getDate() + 30); // 30-day grace period

      const request = {
        _id: requestId,
        type: "ACCOUNT_DELETION",
        reason,
        requestDate: new Date(),
        status: "PENDING",
        scheduledDeletion,
      };

      await this.storeGDPRRequest(request);

      // Show confirmation dialog
      Alert.alert(
        "Account Deletion Requested",
        `Your account will be permanently deleted on ${scheduledDeletion.toLocaleDateString()}. You can cancel this request before then.`,
        [{ text: "OK", style: "default" }]
      );

      logger.debug("PrivacyService: Account deletion requested", request);

      return { requestId, scheduledDeletion };
    } catch (error) {
      logger.error("PrivacyService: Error requesting account deletion", error);
      throw new Error("Failed to request account deletion");
    }
  }

  /**
   * Request data rectification (GDPR Article 16 - Right to Rectification)
   */
  async requestDataRectification(
    dataType: string,
    currentValue: string,
    requestedValue: string
  ): Promise<{ requestId: string }> {
    try {
      const requestId = `rectification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const request = {
        _id: requestId,
        type: "DATA_RECTIFICATION",
        dataType,
        currentValue,
        requestedValue,
        requestDate: new Date(),
        status: "PENDING",
      };

      await this.storeGDPRRequest(request);

      logger.debug("PrivacyService: Data rectification requested", request);

      return { requestId };
    } catch (error) {
      logger.error(
        "PrivacyService: Error requesting data rectification",
        error
      );
      throw new Error("Failed to request data rectification");
    }
  }

  /**
   * Object to data processing (GDPR Article 21 - Right to Object)
   */
  async objectToProcessing(
    processingType: string,
    reason: string
  ): Promise<{ requestId: string }> {
    try {
      const requestId = `objection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const request = {
        _id: requestId,
        type: "PROCESSING_OBJECTION",
        processingType,
        reason,
        requestDate: new Date(),
        status: "PENDING",
      };

      await this.storeGDPRRequest(request);

      logger.debug("PrivacyService: Processing objection requested", request);

      return { requestId };
    } catch (error) {
      logger.error("PrivacyService: Error objecting to processing", error);
      throw new Error("Failed to object to processing");
    }
  }

  /**
   * Get all GDPR requests for the user
   */
  async getGDPRRequests(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem(
        this.STORAGE_KEYS.GDPR_REQUESTS
      );
      if (!stored) return [];

      return JSON.parse(stored);
    } catch (error) {
      logger.error("PrivacyService: Error getting GDPR requests", error);
      return [];
    }
  }

  /**
   * Show privacy policy
   */
  showPrivacyPolicy(): void {
    // This would typically open a webview or navigate to privacy policy screen
    logger.debug("PrivacyService: Opening privacy policy");
    // Implementation would depend on navigation setup
  }

  /**
   * Show cookie policy (for web features)
   */
  showCookiePolicy(): void {
    logger.debug("PrivacyService: Opening cookie policy");
    // Implementation would depend on navigation setup
  }

  /**
   * Generate privacy report for user
   */
  async generatePrivacyReport(): Promise<{
    consentStatus: ConsentPreferences | null;
    privacySettings: PrivacySettings;
    retentionPolicies: DataRetentionPolicy[];
    gdprRequests: any[];
    dataCategories: string[];
  }> {
    try {
      const [consentStatus, privacySettings, gdprRequests] = await Promise.all([
        this.getConsentPreferences(),
        this.getPrivacySettings(),
        this.getGDPRRequests(),
      ]);

      return {
        consentStatus,
        privacySettings,
        retentionPolicies: this.getDataRetentionPolicies(),
        gdprRequests,
        dataCategories: [
          "Account",
          "Location",
          "Activity",
          "Social",
          "Support",
        ],
      };
    } catch (error) {
      logger.error("PrivacyService: Error generating privacy report", error);
      throw new Error("Failed to generate privacy report");
    }
  }

  /**
   * Private helper methods
   */
  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      profileVisibility: "private",
      trailSharingDefault: "private",
      dataExportFormat: "json",
      locationPrecision: "approximate",
      _dataMinimization: true,
    };
  }

  private async storeGDPRRequest(request: any): Promise<void> {
    try {
      const existingRequests = await this.getGDPRRequests();
      existingRequests.push(request);

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.GDPR_REQUESTS,
        JSON.stringify(existingRequests)
      );
    } catch (error) {
      logger.error("PrivacyService: Error storing GDPR request", error);
      throw error;
    }
  }

  /**
   * Initialize privacy service on app start
   */
  async initialize(): Promise<void> {
    try {
      const consentStatus = await this.checkConsentStatus();

      if (consentStatus.needsUpdate) {
        logger.debug(
          "PrivacyService: Consent update needed",
          consentStatus.reason
        );
        // This would trigger a consent update flow in the UI
      }

      // Check for any scheduled deletions
      const requests = await this.getGDPRRequests();
      const pendingDeletions = requests.filter(
        (r) =>
          r.type === "ACCOUNT_DELETION" &&
          r.status === "PENDING" &&
          new Date(r.scheduledDeletion) <= new Date()
      );

      if (pendingDeletions.length > 0) {
        logger.debug("PrivacyService: Account deletions due", pendingDeletions);
        // This would trigger account deletion process
      }

      logger.debug("PrivacyService: Initialized successfully");
    } catch (error) {
      logger.error("PrivacyService: Initialization failed", error);
    }
  }
}
