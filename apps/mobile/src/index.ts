/**
 * EchoTrail Mobile App - Enterprise Edition
 * Main application entry point with comprehensive error handling
 * and performance monitoring
 */

export { App } from "./App";

// Re-export core types for external usage
export type {
  AppConfig,
  EnvironmentConfig,
  ApiConfig,
  DatabaseConfig,
} from "./core/config/types";

// Re-export core utilities
export { Logger, ErrorHandler, PerformanceMonitor } from "./core/utils";

// App version and build info
export const APP_VERSION = "2.0.0";
export const BUILD_NUMBER = process.env.EXPO_PUBLIC_BUILD_NUMBER || "1";
export const BUILD_TYPE = __DEV__ ? "development" : "production";

// Enterprise feature flags
export const ENTERPRISE_FEATURES = {
  ADVANCED_ANALYTICS: true,
  OFFLINE_SYNC: true,
  ENTERPRISE_AUTH: true,
  PERFORMANCE_MONITORING: true,
  CRASH_REPORTING: true,
  A_B_TESTING: true,
} as const;
