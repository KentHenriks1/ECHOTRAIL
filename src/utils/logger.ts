/**
 * Production-ready logger utility
 * Replaces logger.debug statements with proper logging
 */

interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

// In production, we either silent log or use a proper logging service
const createLogger = (): Logger => {
  const isDevelopment = __DEV__;

  return {
    info: (message: string, ...args: unknown[]) => {
      if (isDevelopment) {
        console.log(`[INFO] ${message}`, ...args);
      }
      // In production: send to logging service or silent
    },

    warn: (message: string, ...args: unknown[]) => {
      if (isDevelopment) {
        console.warn(`[WARN] ${message}`, ...args);
      }
      // In production: send to logging service or silent
    },

    error: (message: string, ...args: unknown[]) => {
      if (isDevelopment) {
        console.error(`[ERROR] ${message}`, ...args);
      }
      // In production: send to error reporting service
    },

    debug: (message: string, ...args: unknown[]) => {
      if (isDevelopment) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
      // Production: completely silent
    },
  };
};

export const logger = createLogger();

// Helper for errors that should be silent in production
export const silentError = (error: unknown): void => {
  // Completely silent - for non-critical errors
  if (__DEV__) {
    console.warn("Silent error:", error);
  }
};
