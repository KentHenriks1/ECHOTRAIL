/**
 * Utility functions for HomeScreen
 * Format distance, duration, and other data display
 */

/**
 * Format distance in meters to human-readable string
 */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

// Time constants
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

/**
 * Format duration in seconds to human-readable string
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format date to localized date string
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};

/**
 * Format speed to human-readable string
 */
export const formatSpeed = (speed: number): string => {
  return `${speed.toFixed(1)} m/s`;
};