/**
 * Core configuration types for EchoTrail Enterprise
 * Comprehensive type definitions for all app configurations
 */

export interface AppConfig {
  readonly name: string;
  readonly version: string;
  readonly buildNumber: string;
  readonly environment: "development" | "staging" | "production";
  readonly debugMode: boolean;
  readonly api: ApiConfig;
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
  readonly features: FeatureFlags;
  readonly monitoring: MonitoringConfig;
  readonly maps: MapsConfig;
  readonly ai: AIConfig;
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly enableCaching: boolean;
  readonly cacheTimeout: number;
  readonly enableMocking: boolean;
  readonly mockDelay: number;
}

export interface DatabaseConfig {
  readonly name: string;
  readonly version: number;
  readonly enableEncryption: boolean;
  readonly enableBackup: boolean;
  readonly syncInterval: number;
  readonly conflictResolution: "client" | "server" | "merge";
  readonly remote: RemoteDatabaseConfig;
}

export interface RemoteDatabaseConfig {
  readonly url: string;
  readonly project: string;
  readonly branch: string;
  readonly apiUrl: string;
}

export interface AuthConfig {
  readonly provider: "stack" | "supabase" | "firebase";
  readonly projectId: string;
  readonly jwksUrl: string;
  readonly enableBiometrics: boolean;
  readonly sessionTimeout: number;
  readonly tokenRefreshThreshold: number;
}

export interface FeatureFlags {
  readonly aiStories: boolean;
  readonly locationTracking: boolean;
  readonly offlineMaps: boolean;
  readonly socialFeatures: boolean;
  readonly notifications: boolean;
  readonly advancedAnalytics: boolean;
  readonly enterpriseAuth: boolean;
  readonly performanceMonitoring: boolean;
  readonly crashReporting: boolean;
  readonly betaFeatures: boolean;
}

export interface MonitoringConfig {
  readonly enableCrashReporting: boolean;
  readonly enablePerformanceMonitoring: boolean;
  readonly enableAnalytics: boolean;
  readonly sampleRate: number;
  readonly enableUserFeedback: boolean;
  readonly enableSessionReplay: boolean;
}

export interface MapsConfig {
  readonly provider: "google" | "mapbox" | "osm";
  readonly googleMapsApiKey: string;
  readonly mapboxAccessToken: string;
  readonly defaultZoom: number;
  readonly maxZoom: number;
  readonly minZoom: number;
  readonly searchRadius: number;
  readonly enableOffline: boolean;
  readonly enableTerrain: boolean;
  readonly enableSatellite: boolean;
}

export interface AIConfig {
  readonly provider: "openai" | "anthropic" | "google";
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly enableTTS: boolean;
  readonly voiceSettings: VoiceSettings;
  readonly enableStoryGeneration: boolean;
  readonly storyMaxLength: number;
}

export interface VoiceSettings {
  readonly voice: string;
  readonly speed: number;
  readonly pitch: number;
  readonly volume: number;
  readonly enableSsml: boolean;
}

export interface EnvironmentConfig extends AppConfig {
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isStaging: boolean;
  readonly enableDebugTools: boolean;
  readonly enableStorybook: boolean;
  readonly enableE2ETesting: boolean;
}

// Theme and UI Configuration
export interface ThemeConfig {
  readonly mode: "light" | "dark" | "auto";
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly errorColor: string;
  readonly warningColor: string;
  readonly successColor: string;
  readonly spacing: SpacingConfig;
  readonly typography: TypographyConfig;
  readonly animations: AnimationConfig;
}

export interface SpacingConfig {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly xxl: number;
}

export interface TypographyConfig {
  readonly fontFamily: string;
  readonly fontSize: {
    readonly xs: number;
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly xl: number;
    readonly xxl: number;
  };
  readonly fontWeight: {
    readonly light: string;
    readonly normal: string;
    readonly medium: string;
    readonly bold: string;
  };
  readonly lineHeight: {
    readonly tight: number;
    readonly normal: number;
    readonly loose: number;
  };
}

export interface AnimationConfig {
  readonly enableReducedMotion: boolean;
  readonly defaultDuration: number;
  readonly defaultEasing: string;
  readonly enableHaptics: boolean;
}

// Error and Performance Types
export interface ErrorConfig {
  readonly enableGlobalHandler: boolean;
  readonly enableFallbackUI: boolean;
  readonly enableErrorReporting: boolean;
  readonly enableUserFeedback: boolean;
  readonly excludedErrors: string[];
  readonly maxErrorLogs: number;
}

export interface PerformanceConfig {
  readonly enableMonitoring: boolean;
  readonly sampleRate: number;
  readonly enableMemoryTracking: boolean;
  readonly enableNetworkTracking: boolean;
  readonly enableRenderTracking: boolean;
  readonly enableNavigationTracking: boolean;
  readonly enableCustomMetrics: boolean;
}

// Security Configuration
export interface SecurityConfig {
  readonly enableCodeObfuscation: boolean;
  readonly enableRootDetection: boolean;
  readonly enableSSLPinning: boolean;
  readonly enableIntegrityCheck: boolean;
  readonly enableDebugDetection: boolean;
  readonly enableScreenshotBlocking: boolean;
  readonly enableDataEncryption: boolean;
  readonly encryptionKey?: string;
}

// Localization Configuration
export interface LocalizationConfig {
  readonly defaultLanguage: "en" | "nb";
  readonly supportedLanguages: readonly ("en" | "nb")[];
  readonly enableRTL: boolean;
  readonly enablePluralRules: boolean;
  readonly enableNumberFormatting: boolean;
  readonly enableDateFormatting: boolean;
  readonly fallbackLanguage: "en";
}
