/**
 * EchoTrail Enterprise Mobile App
 * Main application component with comprehensive provider setup
 * and enterprise-grade error boundaries
 */

import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

// Core providers and configurations
import { AppConfig, ThemeConfig } from "./core/config";
import {
  Logger,
  ErrorHandler,
  PerformanceMonitor,
} from "./core/utils";
import { AppProvider } from "./providers/AppProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { DatabaseProvider } from "./providers/DatabaseProvider";
import { NavigationProvider } from "./providers/NavigationProvider";
import { NotificationProvider } from "./providers/NotificationProvider";

// Error boundary and monitoring
import { GlobalErrorBoundary } from "./components/errors/GlobalErrorBoundary";
import { PerformanceTracker } from "./components/performance/PerformanceTracker";
import { LoadingScreen } from "./components/loading/LoadingScreen";

// Main app navigation and screens
import { AppNavigator } from "./navigation/AppNavigator";

// Localization
import { LocalizationProvider } from "./providers/LocalizationProvider";

// Analytics and monitoring
import { AnalyticsProvider } from "./providers/AnalyticsProvider";

// Initialize logger for App component
const logger = new Logger("App");

/**
 * Initialize app configuration and utilities
 */
const useAppInitialization = () => {
  useEffect(() => {
    // Initialize enterprise utilities
    logger.info("Initializing EchoTrail Enterprise App", {
      version: AppConfig.version,
      buildNumber: AppConfig.buildNumber,
      environment: AppConfig.environment,
      platform: Platform.OS,
    });

    // Configure error handling
    ErrorHandler.configure({
      enableGlobalHandler: true,
      enableFallbackUI: true,
      enableErrorReporting: AppConfig.monitoring.enableCrashReporting,
      enableUserFeedback: AppConfig.monitoring.enableUserFeedback,
      enableAutoRetry: false,
      maxRetryAttempts: 3,
    });

    // Configure performance monitoring
    PerformanceMonitor.configure({
      enableMonitoring: AppConfig.monitoring.enablePerformanceMonitoring,
      sampleRate: AppConfig.monitoring.sampleRate,
      enableMemoryTracking: true,
      enableNetworkTracking: true,
      enableRenderTracking: AppConfig.isDevelopment,
      enableNavigationTracking: true,
      enableCustomMetrics: true,
      enableAlerts: AppConfig.isDevelopment,
    });

    logger.info("Enterprise utilities initialized successfully");

    // Cleanup function
    return () => {
      PerformanceMonitor.stopMonitoring();
      logger.info("App cleanup completed");
    };
  }, []);
};

/**
 * Provider tree component with all app providers
 */
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider config={AppConfig}>
    <ThemeProvider config={ThemeConfig}>
      <LocalizationProvider>
        <AnalyticsProvider
          config={{
            enableAnalytics: AppConfig.monitoring.enableAnalytics,
            enableUserFeedback: AppConfig.monitoring.enableUserFeedback,
            enableSessionReplay: AppConfig.monitoring.enableSessionReplay,
            sampleRate: AppConfig.monitoring.sampleRate,
          }}
        >
          <DatabaseProvider config={AppConfig.database}>
            <AuthProvider config={AppConfig.auth}>
              <NotificationProvider
                config={{
                  enableNotifications: AppConfig.features.notifications,
                  enablePushNotifications: AppConfig.features.notifications,
                }}
              >
                <NavigationProvider>
                  {children}
                </NavigationProvider>
              </NotificationProvider>
            </AuthProvider>
          </DatabaseProvider>
        </AnalyticsProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </AppProvider>
);

/**
 * Main Application Component
 * Sets up all providers and enterprise-grade infrastructure
 */
export function App(): React.ReactElement {
  // Initialize app systems
  useAppInitialization();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GlobalErrorBoundary>
          <PerformanceTracker>
            <AppProviders>
              <StatusBar
                style="auto"
                backgroundColor="transparent"
                translucent={Platform.OS === "android"}
              />
              <React.Suspense fallback={<LoadingScreen />}>
                <AppNavigator />
              </React.Suspense>
            </AppProviders>
          </PerformanceTracker>
        </GlobalErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
