/**
 * EchoTrail Enterprise Configuration Manager
 * Centralized configuration with environment-specific overrides
 * and comprehensive validation
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import type {
  EnvironmentConfig,
  ApiConfig,
  DatabaseConfig,
  AuthConfig,
  FeatureFlags,
  MonitoringConfig,
  MapsConfig,
  AIConfig,
  ThemeConfig,
  SecurityConfig,
  LocalizationConfig,
} from "./types";
import { Logger } from "../utils/Logger";

// Environment detection
const isDev = __DEV__;
const isStaging = Constants.expoConfig?.extra?.environment === "staging";
const isProd = !isDev && !isStaging;

const logger = new Logger("ConfigManager");

// Base API configuration
const API_CONFIGS: Record<string, ApiConfig> = {
  development: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1",
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    enableMocking: false,
    mockDelay: 500,
  },
  staging: {
    baseUrl:
      process.env.EXPO_PUBLIC_API_URL || "https://staging-api.echotrail.app/v1",
    timeout: 20000,
    retryAttempts: 3,
    retryDelay: 1500,
    enableCaching: true,
    cacheTimeout: 600000, // 10 minutes
    enableMocking: false,
    mockDelay: 0,
  },
  production: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || "https://api.echotrail.app/v1",
    timeout: 15000,
    retryAttempts: 2,
    retryDelay: 2000,
    enableCaching: true,
    cacheTimeout: 900000, // 15 minutes
    enableMocking: false,
    mockDelay: 0,
  },
};

// Database configuration
const DATABASE_CONFIGS: Record<string, DatabaseConfig> = {
  development: {
    name: "echotrail_dev.db",
    version: 1,
    enableEncryption: false,
    enableBackup: true,
    syncInterval: 30000, // 30 seconds
    conflictResolution: "client",
    remote: {
      url: process.env.EXPO_PUBLIC_DATABASE_URL || "",
      project: process.env.EXPO_PUBLIC_DATABASE_PROJECT || "",
      branch: process.env.EXPO_PUBLIC_DATABASE_BRANCH || "main",
      apiUrl: process.env.EXPO_PUBLIC_NEON_REST_API_URL || "",
    },
  },
  staging: {
    name: "echotrail_staging.db",
    version: 1,
    enableEncryption: true,
    enableBackup: true,
    syncInterval: 60000, // 1 minute
    conflictResolution: "merge",
    remote: {
      url: process.env.EXPO_PUBLIC_DATABASE_URL || "",
      project: process.env.EXPO_PUBLIC_DATABASE_PROJECT || "",
      branch: process.env.EXPO_PUBLIC_DATABASE_BRANCH || "staging",
      apiUrl: process.env.EXPO_PUBLIC_NEON_REST_API_URL || "",
    },
  },
  production: {
    name: "echotrail.db",
    version: 1,
    enableEncryption: true,
    enableBackup: true,
    syncInterval: 120000, // 2 minutes
    conflictResolution: "server",
    remote: {
      url: process.env.EXPO_PUBLIC_DATABASE_URL || "",
      project: process.env.EXPO_PUBLIC_DATABASE_PROJECT || "",
      branch: process.env.EXPO_PUBLIC_DATABASE_BRANCH || "main",
      apiUrl: process.env.EXPO_PUBLIC_NEON_REST_API_URL || "",
    },
  },
};

// Authentication configuration
const AUTH_CONFIG: AuthConfig = {
  provider: "stack",
  projectId: process.env.EXPO_PUBLIC_STACK_AUTH_PROJECT_ID || "",
  jwksUrl: process.env.EXPO_PUBLIC_STACK_AUTH_JWKS_URL || "",
  enableBiometrics: true,
  sessionTimeout: 3600000, // 1 hour
  tokenRefreshThreshold: 300000, // 5 minutes
};

// Feature flags based on environment
const FEATURE_FLAGS: Record<string, FeatureFlags> = {
  development: {
    aiStories: process.env.EXPO_PUBLIC_ENABLE_AI_STORIES === "true",
    locationTracking:
      process.env.EXPO_PUBLIC_ENABLE_LOCATION_TRACKING === "true",
    offlineMaps: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MAPS === "true",
    socialFeatures: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_FEATURES === "true",
    notifications: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === "true",
    advancedAnalytics: false,
    enterpriseAuth: false,
    performanceMonitoring: false,
    crashReporting: false,
    betaFeatures: true,
  },
  staging: {
    aiStories: process.env.EXPO_PUBLIC_ENABLE_AI_STORIES === "true",
    locationTracking:
      process.env.EXPO_PUBLIC_ENABLE_LOCATION_TRACKING === "true",
    offlineMaps: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MAPS === "true",
    socialFeatures: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_FEATURES === "true",
    notifications: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === "true",
    advancedAnalytics: true,
    enterpriseAuth: true,
    performanceMonitoring: true,
    crashReporting: true,
    betaFeatures: true,
  },
  production: {
    aiStories: process.env.EXPO_PUBLIC_ENABLE_AI_STORIES === "true",
    locationTracking:
      process.env.EXPO_PUBLIC_ENABLE_LOCATION_TRACKING === "true",
    offlineMaps: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MAPS === "true",
    socialFeatures: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_FEATURES === "true",
    notifications: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === "true",
    advancedAnalytics: true,
    enterpriseAuth: true,
    performanceMonitoring: true,
    crashReporting: true,
    betaFeatures: false,
  },
};

// Monitoring configuration
const MONITORING_CONFIG: MonitoringConfig = {
  enableCrashReporting: isProd || isStaging,
  enablePerformanceMonitoring: isProd || isStaging,
  enableAnalytics: true,
  sampleRate: isDev ? 1.0 : 0.1,
  enableUserFeedback: true,
  enableSessionReplay: !isProd,
};

// Maps configuration
const MAPS_CONFIG: MapsConfig = {
  provider: "google",
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
  defaultZoom: parseInt(process.env.EXPO_PUBLIC_DEFAULT_MAP_ZOOM || "14", 10),
  maxZoom: 20,
  minZoom: 3,
  searchRadius: parseInt(
    process.env.EXPO_PUBLIC_DEFAULT_SEARCH_RADIUS || "1000",
    10
  ),
  enableOffline: true,
  enableTerrain: true,
  enableSatellite: true,
};

// AI configuration
const AI_CONFIG: AIConfig = {
  provider: "openai",
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || "",
  model: "gpt-4o-mini",
  maxTokens: parseInt(
    process.env.EXPO_PUBLIC_AI_STORY_MAX_LENGTH || "1000",
    10
  ),
  temperature: 0.7,
  enableTTS: true,
  voiceSettings: {
    voice: "alloy",
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    enableSsml: false,
  },
  enableStoryGeneration: true,
  storyMaxLength: parseInt(
    process.env.EXPO_PUBLIC_AI_STORY_MAX_LENGTH || "1000",
    10
  ),
};

// Theme configuration
const THEME_CONFIG: ThemeConfig = {
  mode: "auto",
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  accentColor: "#06b6d4",
  errorColor: "#dc2626",
  warningColor: "#f59e0b",
  successColor: "#059669",
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    fontFamily: Platform.select({
      ios: "SF Pro Display",
      android: "Roboto",
      default: "System",
    }),
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    fontWeight: {
      light: "300" as const,
      normal: "400" as const,
      medium: "500" as const,
      bold: "700" as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      loose: 1.8,
    },
  },
  animations: {
    enableReducedMotion: false,
    defaultDuration: 200,
    defaultEasing: "ease-in-out",
    enableHaptics: true,
  },
};

// Security configuration
const SECURITY_CONFIG: SecurityConfig = {
  enableCodeObfuscation: isProd,
  enableRootDetection: isProd,
  enableSSLPinning: isProd,
  enableIntegrityCheck: isProd,
  enableDebugDetection: isProd,
  enableScreenshotBlocking: isProd,
  enableDataEncryption: isProd || isStaging,
  encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY,
};

// Localization configuration
const LOCALIZATION_CONFIG: LocalizationConfig = {
  defaultLanguage: "en",
  supportedLanguages: ["en", "nb"],
  enableRTL: false,
  enablePluralRules: true,
  enableNumberFormatting: true,
  enableDateFormatting: true,
  fallbackLanguage: "en",
};

// Get current environment
function getCurrentEnvironment(): "development" | "staging" | "production" {
  if (isDev) return "development";
  if (isStaging) return "staging";
  return "production";
}

// Create environment-specific configuration
export function createConfig(): EnvironmentConfig {
  const environment = getCurrentEnvironment();

  const config: EnvironmentConfig = {
    name: process.env.EXPO_PUBLIC_APP_NAME || "EchoTrail",
    version: process.env.EXPO_PUBLIC_APP_VERSION || "2.0.0",
    buildNumber: process.env.EXPO_PUBLIC_BUILD_NUMBER || "1",
    environment,
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === "true" || isDev,
    isProduction: isProd,
    isDevelopment: isDev,
    isStaging,
    enableDebugTools: isDev,
    enableStorybook: isDev,
    enableE2ETesting: !isProd,
    api: API_CONFIGS[environment],
    database: DATABASE_CONFIGS[environment],
    auth: AUTH_CONFIG,
    features: FEATURE_FLAGS[environment],
    monitoring: MONITORING_CONFIG,
    maps: MAPS_CONFIG,
    ai: AI_CONFIG,
  };

  // Validate critical configuration
  validateConfig(config);

  logger.info("Configuration initialized", {
    environment,
    version: config.version,
  });

  return config;
}

// Configuration validation
function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // Validate API configuration
  if (!config.api.baseUrl) {
    errors.push("API baseUrl is required");
  }

  // Validate database configuration
  if (!config.database.name) {
    errors.push("Database name is required");
  }

  // Validate authentication configuration
  if (!config.auth.projectId) {
    errors.push("Auth projectId is required");
  }

  // Validate maps configuration
  if (!config.maps.googleMapsApiKey && config.maps.provider === "google") {
    errors.push("Google Maps API key is required when using Google Maps");
  }

  if (!config.maps.mapboxAccessToken && config.maps.provider === "mapbox") {
    errors.push("Mapbox access token is required when using Mapbox");
  }

  // Validate AI configuration if enabled
  if (config.features.aiStories && !config.ai.apiKey) {
    errors.push("AI API key is required when AI stories are enabled");
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed:\\n${errors.join("\\n")}`;
    logger.error("Configuration validation failed", { errors });

    if (config.isProduction) {
      throw new Error(errorMessage);
    } else {
      console.warn(errorMessage);
    }
  }
}

// Export singleton configuration instance
export const AppConfig = createConfig();

// Export additional configurations
export {
  THEME_CONFIG as ThemeConfig,
  SECURITY_CONFIG as SecurityConfig,
  LOCALIZATION_CONFIG as LocalizationConfig,
};

// Export configuration utilities
export { getCurrentEnvironment, validateConfig };

// Export types
export type * from "./types";
