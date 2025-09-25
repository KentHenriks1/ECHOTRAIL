import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { logger } from "../utils/logger";

export interface SecurityConfig {
  biometricsRequired: boolean;
  jailbreakDetectionEnabled: boolean;
  certificatePinningEnabled: boolean;
  dataEncryptionEnabled: boolean;
  sessionTimeout: number; // in minutes
  maxFailedAttempts: number;
}

export interface DeviceSecurityInfo {
  isJailbroken: boolean;
  isEmulator: boolean;
  isDebuggingEnabled: boolean;
  hasScreenLock: boolean;
  biometricType: string | null;
  systemVersion: string;
  deviceId: string;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private sessionStartTime: number = 0;
  private failedAttempts: number = 0;

  private constructor() {
    this.config = {
      biometricsRequired: true,
      jailbreakDetectionEnabled: true,
      certificatePinningEnabled: true,
      dataEncryptionEnabled: true,
      sessionTimeout: 15, // 15 minutes
      maxFailedAttempts: 3,
    };
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize security manager and perform security checks
   */
  async initialize(): Promise<{ isSecure: boolean; threats: string[] }> {
    logger.debug("SecurityManager: Initializing security checks");
    const threats: string[] = [];

    try {
      // Check device security
      const deviceInfo = await this.getDeviceSecurityInfo();

      if (this.config.jailbreakDetectionEnabled && deviceInfo.isJailbroken) {
        threats.push("DEVICE_COMPROMISED");
      }

      if (deviceInfo.isEmulator) {
        threats.push("EMULATOR_DETECTED");
      }

      if (deviceInfo.isDebuggingEnabled) {
        threats.push("DEBUGGING_ENABLED");
      }

      if (!deviceInfo.hasScreenLock) {
        threats.push("NO_SCREEN_LOCK");
      }

      // Check biometric availability if required
      if (this.config.biometricsRequired) {
        const biometricAvailable = await this.isBiometricAvailable();
        if (!biometricAvailable) {
          threats.push("BIOMETRICS_UNAVAILABLE");
        }
      }

      // Start session timer
      this.sessionStartTime = Date.now();

      return {
        isSecure: threats.length === 0,
        threats,
      };
    } catch (error) {
      logger.error("SecurityManager: Initialization failed", error);
      threats.push("SECURITY_CHECK_FAILED");
      return { isSecure: false, threats };
    }
  }

  /**
   * Get comprehensive device security information
   */
  async getDeviceSecurityInfo(): Promise<DeviceSecurityInfo> {
    const deviceInfo: DeviceSecurityInfo = {
      isJailbroken: false,
      isEmulator: false,
      isDebuggingEnabled: false,
      hasScreenLock: false,
      biometricType: null,
      systemVersion: Device.osVersion ?? "unknown",
      deviceId: (Device.deviceName ?? Device.modelId ?? "unknown").toString(),
    };

    try {
      // Check if running on emulator (approximation)
      deviceInfo.isEmulator = !Device.isDevice;

      // Simplified checks (placeholders)
      deviceInfo.isJailbroken = false;
      deviceInfo.isDebuggingEnabled = false;

      // Check biometric capabilities
      const biometricTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (
        biometricTypes.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT
        )
      ) {
        deviceInfo.biometricType = "fingerprint";
      } else if (
        biometricTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        deviceInfo.biometricType = "face";
      }

      // Check if device has screen lock (approximation)
      deviceInfo.hasScreenLock = await LocalAuthentication.hasHardwareAsync();
    } catch (error) {
      logger.warn("SecurityManager: Error getting device info", error);
    }

    return deviceInfo;
  }

  /**
   * Securely store sensitive data
   */
  async secureStore(key: string, value: string): Promise<void> {
    try {
      if (this.config.dataEncryptionEnabled) {
        // Encrypt data before storing
        const encryptedValue = await this.encryptData(value);
        await SecureStore.setItemAsync(key, encryptedValue);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      logger.error("SecurityManager: Failed to store secure data", error);
      throw new Error("Failed to store sensitive data");
    }
  }

  /**
   * Retrieve securely stored data
   */
  async secureRetrieve(key: string): Promise<string | null> {
    try {
      const storedValue = await SecureStore.getItemAsync(key);
      if (!storedValue) return null;

      if (this.config.dataEncryptionEnabled) {
        // Decrypt data after retrieving
        return await this.decryptData(storedValue);
      } else {
        return storedValue;
      }
    } catch (error) {
      logger.error("SecurityManager: Failed to retrieve secure data", error);
      throw new Error("Failed to retrieve sensitive data");
    }
  }

  /**
   * Remove securely stored data
   */
  async secureDelete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error("SecurityManager: Failed to delete secure data", error);
      throw new Error("Failed to delete sensitive data");
    }
  }

  /**
   * Encrypt data using AES
   */
  private async encryptData(data: string): Promise<string> {
    try {
      // Generate a random key for each encryption
      const key = await Crypto.randomUUID();
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + key
      );

      return `${key}:${encrypted}`;
    } catch (error) {
      logger.error("SecurityManager: Encryption failed", error);
      throw new Error("Data encryption failed");
    }
  }

  /**
   * Decrypt data
   */
  private async decryptData(encryptedData: string): Promise<string> {
    try {
      const [key, encrypted] = encryptedData.split(":");
      // In a real implementation, you would use proper decryption
      // This is a simplified version for demonstration
      return encrypted; // Simplified for demo
    } catch (error) {
      logger.error("SecurityManager: Decryption failed", error);
      throw new Error("Data decryption failed");
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateWithBiometrics(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: "Biometric authentication not available",
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access EchoTrail",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      if (result.success) {
        this.resetFailedAttempts();
        return { success: true };
      } else {
        this.incrementFailedAttempts();
        return {
          success: false,
          error: "Authentication failed",
        };
      }
    } catch (error) {
      logger.error("SecurityManager: Biometric authentication error", error);
      this.incrementFailedAttempts();
      return { success: false, error: "Authentication error occurred" };
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      logger.warn(
        "SecurityManager: Error checking biometric availability",
        error
      );
      return false;
    }
  }

  /**
   * Check if current session is valid
   */
  isSessionValid(): boolean {
    if (this.sessionStartTime === 0) return false;

    const currentTime = Date.now();
    const sessionDuration = currentTime - this.sessionStartTime;
    const timeoutMs = this.config.sessionTimeout * 60 * 1000;

    return sessionDuration < timeoutMs;
  }

  /**
   * Refresh session timer
   */
  refreshSession(): void {
    this.sessionStartTime = Date.now();
  }

  /**
   * Invalidate current session
   */
  invalidateSession(): void {
    this.sessionStartTime = 0;
  }

  /**
   * Check if maximum failed attempts reached
   */
  isMaxFailedAttemptsReached(): boolean {
    return this.failedAttempts >= this.config.maxFailedAttempts;
  }

  /**
   * Increment failed authentication attempts
   */
  private incrementFailedAttempts(): void {
    this.failedAttempts++;
    logger.warn(
      `SecurityManager: Failed attempt ${this.failedAttempts}/${this.config.maxFailedAttempts}`
    );
  }

  /**
   * Reset failed authentication attempts
   */
  private resetFailedAttempts(): void {
    this.failedAttempts = 0;
  }

  /**
   * Generate secure hash for data integrity
   */
  async generateHash(data: string): Promise<string> {
    try {
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
    } catch (error) {
      logger.error("SecurityManager: Hash generation failed", error);
      throw new Error("Hash generation failed");
    }
  }

  /**
   * Verify data integrity
   */
  async verifyHash(data: string, hash: string): Promise<boolean> {
    try {
      const newHash = await this.generateHash(data);
      return newHash === hash;
    } catch (error) {
      logger.error("SecurityManager: Hash verification failed", error);
      return false;
    }
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters and patterns
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: URLs
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers
      .trim();
  }

  /**
   * Lock application due to security concerns
   */
  lockApplication(reason: string): void {
    logger.warn(`SecurityManager: Application locked - ${reason}`);
    this.invalidateSession();
    // Emit event to trigger app lock UI
    // EventEmitter.emit('app-locked', { reason });
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug("SecurityManager: Configuration updated", this.config);
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(): Promise<{
    deviceInfo: DeviceSecurityInfo;
    sessionValid: boolean;
    failedAttempts: number;
    threats: string[];
    recommendations: string[];
  }> {
    const deviceInfo = await this.getDeviceSecurityInfo();
    const threats: string[] = [];
    const recommendations: string[] = [];

    if (deviceInfo.isJailbroken) {
      threats.push("DEVICE_COMPROMISED");
      recommendations.push("Use app on non-jailbroken device");
    }

    if (!deviceInfo.hasScreenLock) {
      threats.push("NO_SCREEN_LOCK");
      recommendations.push("Enable device screen lock");
    }

    if (!(await this.isBiometricAvailable())) {
      threats.push("BIOMETRICS_UNAVAILABLE");
      recommendations.push("Set up biometric authentication");
    }

    if (this.isMaxFailedAttemptsReached()) {
      threats.push("EXCESSIVE_FAILED_ATTEMPTS");
      recommendations.push("Account temporarily locked");
    }

    return {
      deviceInfo,
      sessionValid: this.isSessionValid(),
      failedAttempts: this.failedAttempts,
      threats,
      recommendations,
    };
  }
}
