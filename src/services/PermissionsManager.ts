import * as Location from "expo-location";
import * as Camera from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as TaskManager from "expo-task-manager";
import { Platform, Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export interface PermissionStatus {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
  expires?: string;
}

export interface PermissionsState {
  location: {
    foreground: PermissionStatus;
    background: PermissionStatus;
  };
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
  notifications: PermissionStatus;
  microphone: PermissionStatus;
}

export interface PermissionRequest {
  type: "location" | "camera" | "mediaLibrary" | "notifications" | "microphone";
  reason: string;
  required: boolean;
  onGranted?: () => void;
  onDenied?: () => void;
}

// Background task names
const LOCATION_TASK_NAME = "background-location-task";
const GEOFENCE_TASK_NAME = "geofence-task";

export class PermissionsManager {
  private static instance: PermissionsManager;
  private permissionsState: PermissionsState;
  private permissionCallbacks: Map<string, Function> = new Map();
  private backgroundLocationStarted = false;

  private constructor() {
    this.permissionsState = this.initializePermissionsState();
    this.setupBackgroundTasks();
  }

  static getInstance(): PermissionsManager {
    if (!PermissionsManager.instance) {
      PermissionsManager.instance = new PermissionsManager();
    }
    return PermissionsManager.instance;
  }

  private initializePermissionsState(): PermissionsState {
    return {
      location: {
        foreground: {
          granted: false,
          status: "undetermined",
          canAskAgain: true,
        },
        background: {
          granted: false,
          status: "undetermined",
          canAskAgain: true,
        },
      },
      camera: { granted: false, status: "undetermined", canAskAgain: true },
      mediaLibrary: {
        granted: false,
        status: "undetermined",
        canAskAgain: true,
      },
      notifications: {
        granted: false,
        status: "undetermined",
        canAskAgain: true,
      },
      microphone: { granted: false, status: "undetermined", canAskAgain: true },
    };
  }

  /**
   * Setup background tasks for location tracking
   */
  private setupBackgroundTasks(): void {
    try {
      // Background location task
      TaskManager.defineTask(
        LOCATION_TASK_NAME,
        async ({ data, error }: any) => {
          if (error) {
            logger.error("Background location task error:", error);
            return Promise.resolve();
          }

          if (data) {
            const { locations } = data;
            logger.debug(`Received ${locations.length} background locations`);

            // Store location updates locally
            await this.handleBackgroundLocationUpdate(locations);
          }
          return Promise.resolve();
        }
      );

      // Geofence task
      TaskManager.defineTask(
        GEOFENCE_TASK_NAME,
        async ({ data, error }: any) => {
          if (error) {
            logger.error("Geofence task error:", error);
            return Promise.resolve();
          }

          if (data) {
            const { eventType, region } = data;
            logger.debug(
              `Geofence event: ${eventType} for region ${region.identifier}`
            );

            // Handle geofence events
            await this.handleGeofenceEvent(eventType, region);
          }
          return Promise.resolve();
        }
      );

      logger.info("Background tasks defined successfully");
    } catch (error) {
      logger.error("Error defining background tasks:", error);
    }
  }

  /**
   * Get current permissions status
   */
  async getPermissionsStatus(): Promise<PermissionsState> {
    try {
      // Check location permissions
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();

      this.permissionsState.location.foreground = {
        granted: foregroundStatus.granted,
        status: foregroundStatus.status,
        canAskAgain: foregroundStatus.canAskAgain,
        expires:
          typeof foregroundStatus.expires === "number"
            ? foregroundStatus.expires.toString()
            : foregroundStatus.expires,
      };

      this.permissionsState.location.background = {
        granted: backgroundStatus.granted,
        status: backgroundStatus.status,
        canAskAgain: backgroundStatus.canAskAgain,
        expires:
          typeof backgroundStatus.expires === "number"
            ? backgroundStatus.expires.toString()
            : backgroundStatus.expires,
      };

      // Check camera permissions - using ImagePicker as fallback since expo-camera hooks can't be used here
      try {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        this.permissionsState.camera = {
          granted: cameraStatus.granted,
          status: cameraStatus.status,
          canAskAgain: cameraStatus.canAskAgain,
          expires:
            typeof cameraStatus.expires === "number"
              ? cameraStatus.expires.toString()
              : cameraStatus.expires,
        };
      } catch (error) {
        logger.warn(
          "Could not check camera permissions via ImagePicker, using default values:",
          error
        );
        this.permissionsState.camera = {
          granted: false,
          status: "undetermined",
          canAskAgain: true,
        };
      }

      // Check media library permissions
      const mediaStatus = await MediaLibrary.getPermissionsAsync();
      this.permissionsState.mediaLibrary = {
        granted: mediaStatus.granted,
        status: mediaStatus.status,
        canAskAgain: mediaStatus.canAskAgain,
        expires:
          typeof mediaStatus.expires === "number"
            ? mediaStatus.expires.toString()
            : mediaStatus.expires,
      };

      // Check notification permissions
      const notificationStatus = await Notifications.getPermissionsAsync();
      this.permissionsState.notifications = {
        granted: notificationStatus.granted,
        status: notificationStatus.status,
        canAskAgain: notificationStatus.canAskAgain,
      };

      // Check microphone permissions (for camera/audio recording)
      try {
        const microphoneStatus =
          await ImagePicker.requestCameraPermissionsAsync();
        this.permissionsState.microphone = {
          granted: microphoneStatus.granted,
          status: microphoneStatus.status,
          canAskAgain: microphoneStatus.canAskAgain,
          expires:
            typeof microphoneStatus.expires === "number"
              ? microphoneStatus.expires.toString()
              : microphoneStatus.expires,
        };
      } catch (error) {
        logger.warn("Could not check microphone permissions:", error);
      }

      // Save to storage
      await this.savePermissionsState();

      return this.permissionsState;
    } catch (error) {
      logger.error("Error getting permissions status:", error);
      return this.permissionsState;
    }
  }

  /**
   * Request specific permission with user-friendly dialog
   */
  async requestPermission(request: PermissionRequest): Promise<boolean> {
    try {
      logger.info(`Requesting ${request.type} permission: ${request.reason}`);

      // Show explanation dialog if required
      if (request.required) {
        const shouldRequest = await this.showPermissionExplanation(request);
        if (!shouldRequest) {
          request.onDenied?.();
          return false;
        }
      }

      let result: any;

      switch (request.type) {
        case "location":
          result = await this.requestLocationPermissions();
          break;
        case "camera":
          result = await this.requestCameraPermission();
          break;
        case "mediaLibrary":
          result = await this.requestMediaLibraryPermission();
          break;
        case "notifications":
          result = await this.requestNotificationPermission();
          break;
        case "microphone":
          result = await this.requestMicrophonePermission();
          break;
        default:
          throw new Error(`Unknown permission type: ${request.type}`);
      }

      if (result.granted) {
        request.onGranted?.();
        await this.getPermissionsStatus(); // Update state
        return true;
      } else {
        // Handle denied permission
        await this.handlePermissionDenied(request, result);
        request.onDenied?.();
        return false;
      }
    } catch (error) {
      logger.error(`Error requesting ${request.type} permission:`, error);
      request.onDenied?.();
      return false;
    }
  }

  /**
   * Request all necessary permissions for the app
   */
  async requestAllPermissions(): Promise<{
    allGranted: boolean;
    granted: string[];
    denied: string[];
  }> {
    const results = {
      allGranted: true,
      granted: [] as string[],
      denied: [] as string[],
    };

    const permissions: PermissionRequest[] = [
      {
        type: "location",
        reason:
          "EchoTrail trenger tilgang til lokasjon for å spore dine ruter og gi deg personlig opplevelser.",
        required: true,
      },
      {
        type: "camera",
        reason:
          "EchoTrail bruker kameraet til å ta bilder av interessante steder på dine turer.",
        required: false,
      },
      {
        type: "mediaLibrary",
        reason:
          "EchoTrail kan lagre bildene dine i galleriet for enkel tilgang.",
        required: false,
      },
      {
        type: "notifications",
        reason:
          "EchoTrail sender viktige oppdateringer og påminnelser om dine aktiviteter.",
        required: false,
      },
    ];

    for (const permission of permissions) {
      const granted = await this.requestPermission(permission);
      if (granted) {
        results.granted.push(permission.type);
      } else {
        results.denied.push(permission.type);
        if (permission.required) {
          results.allGranted = false;
        }
      }
    }

    return results;
  }

  /**
   * Start background location tracking
   */
  async startBackgroundLocation(options?: {
    accuracy?: Location.Accuracy;
    timeInterval?: number;
    distanceInterval?: number;
  }): Promise<boolean> {
    if (!this.permissionsState.location.background.granted) {
      logger.warn("Background location permission not granted");
      return false;
    }

    try {
      const {
        accuracy = Location.Accuracy.Balanced,
        timeInterval = 10000,
        distanceInterval = 10,
      } = options || {};

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy,
        timeInterval,
        distanceInterval,
        showsBackgroundLocationIndicator: Platform.OS === "ios",
        foregroundService:
          Platform.OS === "android"
            ? {
                notificationTitle: "EchoTrail GPS Sporing",
                notificationBody: "Sporer din lokasjon i bakgrunnen",
                notificationColor: "#2196F3",
              }
            : undefined,
      });

      this.backgroundLocationStarted = true;
      logger.info("Background location tracking started");
      return true;
    } catch (error) {
      logger.error("Error starting background location:", error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundLocation(): Promise<void> {
    try {
      const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        this.backgroundLocationStarted = false;
        logger.info("Background location tracking stopped");
      }
    } catch (error) {
      logger.error("Error stopping background location:", error);
    }
  }

  /**
   * Setup geofencing
   */
  async setupGeofencing(
    regions: Array<{
      identifier: string;
      latitude: number;
      longitude: number;
      radius: number;
    }>
  ): Promise<boolean> {
    if (!this.permissionsState.location.background.granted) {
      logger.warn("Background location permission required for geofencing");
      return false;
    }

    try {
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      logger.info(`Geofencing started for ${regions.length} regions`);
      return true;
    } catch (error) {
      logger.error("Error setting up geofencing:", error);
      return false;
    }
  }

  /**
   * Configure notification settings
   */
  async setupNotifications(): Promise<boolean> {
    if (!this.permissionsState.notifications.granted) {
      return false;
    }

    try {
      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Configure notification categories
      await this.setupNotificationCategories();

      logger.info("Notifications configured successfully");
      return true;
    } catch (error) {
      logger.error("Error setting up notifications:", error);
      return false;
    }
  }

  /**
   * Send local notification
   */
  async sendNotification(options: {
    title: string;
    body: string;
    data?: any;
    categoryId?: string;
    trigger?: Notifications.NotificationTriggerInput;
  }): Promise<string | null> {
    if (!this.permissionsState.notifications.granted) {
      logger.warn("Notification permission not granted");
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data || {},
          categoryIdentifier: options.categoryId,
        },
        trigger: options.trigger || null,
      });

      logger.debug(`Notification scheduled with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      logger.error("Error sending notification:", error);
      return null;
    }
  }

  /**
   * Check if app can run with current permissions
   */
  canRunApp(): { canRun: boolean; missingCritical: string[] } {
    const missingCritical: string[] = [];

    if (!this.permissionsState.location.foreground.granted) {
      missingCritical.push("location");
    }

    return {
      canRun: missingCritical.length === 0,
      missingCritical,
    };
  }

  /**
   * Get permission settings info for user
   */
  getPermissionsInfo(): {
    status: PermissionsState;
    recommendations: Array<{ type: string; message: string; action: string }>;
  } {
    const recommendations: Array<{
      type: string;
      message: string;
      action: string;
    }> = [];

    if (!this.permissionsState.location.foreground.granted) {
      recommendations.push({
        type: "location",
        message: "Lokasjon er nødvendig for GPS-sporing av dine ruter",
        action: "Aktiver lokasjon i innstillinger",
      });
    }

    if (!this.permissionsState.location.background.granted) {
      recommendations.push({
        type: "background-location",
        message:
          "Bakgrunns-lokasjon lar deg spore ruter selv når appen er lukket",
        action: 'Aktiver "Alltid" for lokasjon i innstillinger',
      });
    }

    if (!this.permissionsState.camera.granted) {
      recommendations.push({
        type: "camera",
        message: "Kamera-tilgang lar deg ta bilder på dine turer",
        action: "Aktiver kamera i innstillinger",
      });
    }

    if (!this.permissionsState.notifications.granted) {
      recommendations.push({
        type: "notifications",
        message: "Varslinger holder deg oppdatert på viktige hendelser",
        action: "Aktiver varslinger i innstillinger",
      });
    }

    return {
      status: this.permissionsState,
      recommendations,
    };
  }

  // Private helper methods

  private async showPermissionExplanation(
    request: PermissionRequest
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert("Tillatelse nødvendig", request.reason, [
        {
          text: "Ikke nå",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "OK",
          onPress: () => resolve(true),
        },
      ]);
    });
  }

  private async requestLocationPermissions(): Promise<any> {
    const foregroundResult = await Location.requestForegroundPermissionsAsync();

    if (foregroundResult.granted) {
      // Also request background permission
      const backgroundResult =
        await Location.requestBackgroundPermissionsAsync();
      return backgroundResult;
    }

    return foregroundResult;
  }

  private async requestCameraPermission(): Promise<any> {
    // Use ImagePicker for camera permissions since expo-camera methods are deprecated
    return await ImagePicker.requestCameraPermissionsAsync();
  }

  private async requestMediaLibraryPermission(): Promise<any> {
    return await MediaLibrary.requestPermissionsAsync();
  }

  private async requestNotificationPermission(): Promise<any> {
    return await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }

  private async requestMicrophonePermission(): Promise<any> {
    return await ImagePicker.requestCameraPermissionsAsync();
  }

  private async handlePermissionDenied(
    request: PermissionRequest,
    result: any
  ): Promise<void> {
    if (!result.canAskAgain) {
      // Show settings dialog
      Alert.alert(
        "Tillatelse nødvendig",
        `${request.reason}\n\nGå til Innstillinger > EchoTrail for å aktivere denne tillatelsen.`,
        [
          { text: "Avbryt", style: "cancel" },
          { text: "Åpne innstillinger", onPress: () => Linking.openSettings() },
        ]
      );
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    const categories = [
      {
        identifier: "TRAIL_RECORDING",
        actions: [
          {
            identifier: "PAUSE_RECORDING",
            buttonTitle: "Pause",
          },
          {
            identifier: "STOP_RECORDING",
            buttonTitle: "Stopp",
            options: { isDestructive: true },
          },
        ],
      },
      {
        identifier: "TRAIL_COMPLETE",
        actions: [
          {
            identifier: "VIEW_TRAIL",
            buttonTitle: "Se rute",
          },
          {
            identifier: "SHARE_TRAIL",
            buttonTitle: "Del",
          },
        ],
      },
    ];

    await Notifications.setNotificationCategoryAsync(
      "TRAIL_RECORDING",
      categories[0].actions
    );
    await Notifications.setNotificationCategoryAsync(
      "TRAIL_COMPLETE",
      categories[1].actions
    );
  }

  private async handleBackgroundLocationUpdate(
    locations: any[]
  ): Promise<void> {
    try {
      // Store locations locally for sync later
      const locationData = locations.map((loc) => ({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        timestamp: new Date(loc.timestamp),
      }));

      // Save to async storage for background processing
      const existing = await AsyncStorage.getItem(
        "@echotrail:background_locations"
      );
      const existingLocations = existing ? JSON.parse(existing) : [];
      const allLocations = [...existingLocations, ...locationData];

      // Keep only last 1000 locations to prevent storage overflow
      const recentLocations = allLocations.slice(-1000);

      await AsyncStorage.setItem(
        "@echotrail:background_locations",
        JSON.stringify(recentLocations)
      );

      logger.debug(`Stored ${locations.length} background locations`);
    } catch (error) {
      logger.error("Error handling background location update:", error);
    }
  }

  private async handleGeofenceEvent(
    eventType: string,
    region: any
  ): Promise<void> {
    try {
      const message =
        eventType === "enter"
          ? `Du har kommet til ${region.identifier}`
          : `Du har forlatt ${region.identifier}`;

      // Send local notification
      await this.sendNotification({
        title: "Plassering oppdaget",
        body: message,
        data: { eventType, region: region.identifier },
        categoryId: "LOCATION_UPDATE",
      });

      logger.info(`Geofence ${eventType} for region ${region.identifier}`);
    } catch (error) {
      logger.error("Error handling geofence event:", error);
    }
  }

  private async savePermissionsState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "@echotrail:permissions_state",
        JSON.stringify(this.permissionsState)
      );
    } catch (error) {
      logger.error("Error saving permissions state:", error);
    }
  }

  private async loadPermissionsState(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem("@echotrail:permissions_state");
      if (saved) {
        this.permissionsState = {
          ...this.permissionsState,
          ...JSON.parse(saved),
        };
      }
    } catch (error) {
      logger.error("Error loading permissions state:", error);
    }
  }
}

export const permissionsManager = PermissionsManager.getInstance();
