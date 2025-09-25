import * as Sentry from "@sentry/react-native";
import { logger } from "./logger";

export const initSentry = () => {
  // Only initialize in production or when explicitly enabled
  if (__DEV__ && !process.env.EXPO_PUBLIC_SENTRY_DEBUG) {
    return;
  }

  try {
    Sentry.init({
      // Replace with your actual DSN when you create a Sentry project
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",

      debug: __DEV__,

      environment: __DEV__ ? "development" : "production",

      // Release health tracking
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,

      // Performance monitoring
      enableNativeFramesTracking: true,
      enableStallTracking: true,

      // Capture unhandled promises
      enableCaptureFailedRequests: true,

      // Sample rate for performance traces
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,

      beforeSend(event) {
        // Filter out development noise
        if (
          __DEV__ &&
          event.exception?.values?.[0]?.value?.includes(
            "Network request failed"
          )
        ) {
          return null;
        }
        return event;
      },

      beforeBreadcrumb(breadcrumb) {
        // Don't send console logs in production
        if (!__DEV__ && breadcrumb.category === "console") {
          return null;
        }
        return breadcrumb;
      },
    });

    // Set user context
    Sentry.setContext("app", {
      version: "1.0.0",
      build: "1",
    });

    logger.info("Sentry initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Sentry:", error);
  }
};

// Helper functions for manual error reporting
export const captureError = (error: Error, extra?: Record<string, any>) => {
  if (__DEV__) {
    console.error("Error captured:", error, extra);
  }

  Sentry.withScope((scope) => {
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = "info",
  extra?: Record<string, any>
) => {
  if (__DEV__) {
    console.log(`[${level.toUpperCase()}] ${message}`, extra);
  }

  Sentry.withScope((scope) => {
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureMessage(message, level);
  });
};

export const setUserContext = (user: {
  id?: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

export const addBreadcrumb = (
  message: string,
  category?: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || "user_action",
    data,
    level: "info",
  });
};
