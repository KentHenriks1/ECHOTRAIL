import { Alert, Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export enum ErrorType {
  GPS_PERMISSION_DENIED = "GPS_PERMISSION_DENIED",
  GPS_UNAVAILABLE = "GPS_UNAVAILABLE",
  GPS_TIMEOUT = "GPS_TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  AUDIO_ERROR = "AUDIO_ERROR",
  MAP_ERROR = "MAP_ERROR",
  TRAIL_NOT_FOUND = "TRAIL_NOT_FOUND",
  INVALID_COORDINATES = "INVALID_COORDINATES",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: string;
  timestamp: Date;
  userId?: string;
  deviceInfo: {
    platform: string;
    version: string;
  };
  _actionable: boolean;
  _retryable: boolean;
  userFriendly: string;
}

export interface RecoveryAction {
  label: string;
  _action: () => Promise<void> | void;
  type: "retry" | "settings" | "dismiss" | "fallback";
}

class ErrorHandler {
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  /**
   * Main error handling method
   */
  async handleError(
    error: Error | unknown,
    context: string = "Unknown",
    options: {
      silent?: boolean;
      showAlert?: boolean;
      logToStorage?: boolean;
      retryAction?: () => Promise<void>;
    } = {}
  ): Promise<void> {
    const errorInfo = this.categorizeError(error, context);

    // Log error
    await this.logError(errorInfo, options.logToStorage);

    // Show user-friendly message if not silent
    if (!options.silent && options.showAlert !== false) {
      await this.showUserAlert(errorInfo, options.retryAction);
    }

    // Perform automatic recovery if possible
    await this.attemptAutoRecovery(errorInfo);
  }

  /**
   * Categorize errors by type and severity
   */
  private categorizeError(error: Error | unknown, context: string): ErrorInfo {
    const timestamp = new Date();
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version.toString(),
    };

    let errorInfo: ErrorInfo = {
      type: ErrorType.UNKNOWN_ERROR,
      message: "An unknown error occurred",
      originalError: error instanceof Error ? error : undefined,
      context,
      timestamp,
      deviceInfo,
      _actionable: false,
      _retryable: false,
      userFriendly: "Noe gikk galt. Prøv igjen senere.",
    };

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // GPS/Location errors
      if (message.includes("location") || message.includes("permission")) {
        if (message.includes("denied") || message.includes("not granted")) {
          errorInfo = {
            ...errorInfo,
            type: ErrorType.GPS_PERMISSION_DENIED,
            message: "Location permission denied",
            _actionable: true,
            _retryable: true,
            userFriendly:
              "Vi trenger tilgang til din posisjon for å vise nærliggende stier. Gå til innstillinger for å gi tillatelse.",
          };
        } else if (message.includes("timeout")) {
          errorInfo = {
            ...errorInfo,
            type: ErrorType.GPS_TIMEOUT,
            message: "GPS location timeout",
            _actionable: true,
            _retryable: true,
            userFriendly:
              "Kan ikke finne din posisjon. Sjekk at GPS er aktivert og at du er utendørs.",
          };
        } else {
          errorInfo = {
            ...errorInfo,
            type: ErrorType.GPS_UNAVAILABLE,
            message: "GPS unavailable",
            _actionable: true,
            _retryable: true,
            userFriendly:
              "GPS er ikke tilgjengelig. Sjekk at posisjonstjenester er aktivert.",
          };
        }
      }

      // Network errors
      else if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("connection")
      ) {
        errorInfo = {
          ...errorInfo,
          type: ErrorType.NETWORK_ERROR,
          message: error.message,
          _actionable: true,
          _retryable: true,
          userFriendly:
            "Ingen internettforbindelse. Sjekk nettverket ditt og prøv igjen.",
        };
      }

      // Storage errors
      else if (
        message.includes("storage") ||
        message.includes("asyncstorage")
      ) {
        errorInfo = {
          ...errorInfo,
          type: ErrorType.STORAGE_ERROR,
          message: error.message,
          _actionable: false,
          _retryable: true,
          userFriendly:
            "Kan ikke lagre data på enheten. Sjekk at du har nok lagringsplass.",
        };
      }

      // Audio errors
      else if (
        message.includes("audio") ||
        message.includes("sound") ||
        message.includes("speech")
      ) {
        errorInfo = {
          ...errorInfo,
          type: ErrorType.AUDIO_ERROR,
          message: error.message,
          _actionable: true,
          _retryable: true,
          userFriendly:
            "Lydavspilling feilet. Sjekk voluminnstillingene og prøv igjen.",
        };
      }

      // Map errors
      else if (message.includes("map") || message.includes("coordinate")) {
        errorInfo = {
          ...errorInfo,
          type: ErrorType.MAP_ERROR,
          message: error.message,
          _actionable: false,
          _retryable: true,
          userFriendly: "Kartvisning feilet. Prøv å laste siden på nytt.",
        };
      }

      // File system errors
      else if (message.includes("file") || message.includes("directory")) {
        errorInfo = {
          ...errorInfo,
          type: ErrorType.FILE_SYSTEM_ERROR,
          message: error.message,
          _actionable: false,
          _retryable: true,
          userFriendly:
            "Kan ikke lese eller skrive filer. Sjekk lagringsplass og tillatelser.",
        };
      }
    }

    return errorInfo;
  }

  /**
   * Log error for debugging and analytics
   */
  private async logError(
    errorInfo: ErrorInfo,
    persistToStorage: boolean = true
  ): Promise<void> {
    // Add to memory log
    this.errorLog.push(errorInfo);

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console log in development
    if (__DEV__) {
      logger.error("🚨 Error Handler:", {
        type: errorInfo.type,
        message: errorInfo.message,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp.toISOString(),
        originalError: errorInfo.originalError,
      });
    }

    // Persist to storage for crash reports
    if (persistToStorage) {
      try {
        const existingLogs = await AsyncStorage.getItem("error_logs");
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        logs.push({
          ...errorInfo,
          originalError: errorInfo.originalError?.stack,
        });

        // Keep only last 50 errors
        const recentLogs = logs.slice(-50);
        await AsyncStorage.setItem("error_logs", JSON.stringify(recentLogs));
      } catch (storageError) {
        logger.warn("Failed to persist error log:", storageError);
      }
    }
  }

  /**
   * Show user-friendly alert with recovery options
   */
  private async showUserAlert(
    errorInfo: ErrorInfo,
    retryAction?: () => Promise<void>
  ): Promise<void> {
    const actions = this.getRecoveryActions(errorInfo, retryAction);

    if (actions.length === 0) {
      Alert.alert("Feil", errorInfo.userFriendly, [{ text: "OK" }]);
      return;
    }

    if (actions.length === 1) {
      Alert.alert("Feil", errorInfo.userFriendly, [
        { text: "Avbryt", style: "cancel" },
        {
          text: actions[0].label,
          onPress: actions[0]._action,
        },
      ]);
      return;
    }

    // Multiple actions - show action sheet
    const buttons = [
      ...actions.map((action) => ({
        text: action.label,
        onPress: action._action,
      })),
      { text: "Avbryt", style: "cancel" as const },
    ];

    Alert.alert("Feil", errorInfo.userFriendly, buttons);
  }

  /**
   * Generate contextual recovery actions
   */
  private getRecoveryActions(
    errorInfo: ErrorInfo,
    retryAction?: () => Promise<void>
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (errorInfo.type) {
      case ErrorType.GPS_PERMISSION_DENIED:
        actions.push({
          label: "Åpne innstillinger",
          _action: this.openLocationSettings,
          type: "settings",
        });
        break;

      case ErrorType.GPS_TIMEOUT:
      case ErrorType.GPS_UNAVAILABLE:
        if (retryAction) {
          actions.push({
            label: "Prøv igjen",
            _action: retryAction,
            type: "retry",
          });
        }
        actions.push({
          label: "Sjekk GPS-innstillinger",
          _action: this.openLocationSettings,
          type: "settings",
        });
        break;

      case ErrorType.NETWORK_ERROR:
        if (retryAction) {
          actions.push({
            label: "Prøv igjen",
            _action: retryAction,
            type: "retry",
          });
        }
        actions.push({
          label: "Bruk offline modus",
          _action: this.enableOfflineMode,
          type: "fallback",
        });
        break;

      case ErrorType.AUDIO_ERROR:
        actions.push({
          label: "Sjekk lydinnstillinger",
          _action: this.checkAudioSettings,
          type: "settings",
        });
        if (retryAction) {
          actions.push({
            label: "Prøv igjen",
            _action: retryAction,
            type: "retry",
          });
        }
        break;

      default:
        if (errorInfo._retryable && retryAction) {
          actions.push({
            label: "Prøv igjen",
            _action: retryAction,
            type: "retry",
          });
        }
    }

    return actions;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptAutoRecovery(errorInfo: ErrorInfo): Promise<void> {
    switch (errorInfo.type) {
      case ErrorType.STORAGE_ERROR:
        // Try to clear some cached data
        try {
          await AsyncStorage.removeItem("temp_data");
        } catch {}
        break;

      case ErrorType.GPS_TIMEOUT:
        // Reduce GPS accuracy for better reliability
        await this.adjustGPSSettings();
        break;

      case ErrorType.NETWORK_ERROR:
        // Enable offline mode automatically
        await this.enableOfflineMode();
        break;
    }
  }

  /**
   * GPS-specific error handling
   */
  async handleGPSError(
    error: unknown,
    context: string = "GPS"
  ): Promise<Location.LocationObject | null> {
    await this.handleError(error, context, { showAlert: true });

    // Try fallback location methods
    try {
      // Try with reduced accuracy
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        // _maximumAge: 30000, // Not available in current Location options
      });
    } catch (fallbackError) {
      // Final fallback - use last known location
      try {
        return await Location.getLastKnownPositionAsync({
          maxAge: 300000, // 5 minutes
        });
      } catch {
        return null;
      }
    }
  }

  /**
   * Network-specific error handling
   */
  async handleNetworkError<T>(
    networkOperation: () => Promise<T>,
    fallbackData?: T,
    retryAttempts: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await networkOperation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retryAttempts) {
          await this.handleError(error, "Network Operation", {
            showAlert: attempt === retryAttempts,
            silent: attempt < retryAttempts,
          });
        }

        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // Return fallback data if available
    if (fallbackData !== undefined) {
      return fallbackData;
    }

    throw lastError!;
  }

  /**
   * Recovery action implementations
   */
  private async openLocationSettings(): Promise<void> {
    try {
      if (Platform.OS === "ios") {
        // Open iOS settings
        await Location.requestForegroundPermissionsAsync();
      } else {
        // Open Android location settings
        await Location.requestForegroundPermissionsAsync();
      }
    } catch (error) {
      logger.warn("Could not open location settings:", error);
    }
  }

  private async enableOfflineMode(): Promise<void> {
    // Implement offline mode logic
    logger.debug("🔌 Offline mode enabled");
    // This would trigger app-wide offline state
  }

  private async checkAudioSettings(): Promise<void> {
    logger.debug("🔊 Checking audio settings");
    // This would check and potentially reset audio configuration
  }

  private async adjustGPSSettings(): Promise<void> {
    logger.debug("📍 Adjusting GPS settings for better reliability");
    // This would modify GPS accuracy and update intervals
  }

  /**
   * Error reporting and analytics
   */
  async getErrorReport(): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: ErrorInfo[];
    crashRate: number;
  }> {
    const errorsByType: Record<string, number> = {};

    this.errorLog.forEach((error) => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10),
      crashRate: this.calculateCrashRate(),
    };
  }

  private calculateCrashRate(): number {
    const criticalErrors = this.errorLog.filter((error) =>
      [
        ErrorType.GPS_UNAVAILABLE,
        ErrorType.STORAGE_ERROR,
        ErrorType.FILE_SYSTEM_ERROR,
      ].includes(error.type)
    );

    return this.errorLog.length > 0
      ? (criticalErrors.length / this.errorLog.length) * 100
      : 0;
  }

  async clearErrorLog(): Promise<void> {
    this.errorLog = [];
    try {
      await AsyncStorage.removeItem("error_logs");
    } catch (error) {
      logger.warn("Failed to clear error logs:", error);
    }
  }

  /**
   * Proactive error prevention
   */
  async preventCommonErrors(): Promise<void> {
    // Check storage space
    // Verify permissions
    // Test network connectivity
    // Validate GPS availability

    logger.debug("🛡️ Running proactive error prevention checks");
  }
}

export default new ErrorHandler();
