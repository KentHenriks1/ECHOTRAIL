import { MaterialIcons } from "@expo/vector-icons";

// EchoTrail specific icon mappings for consistent branding
export const EchoTrailIcons = {
  // Core Navigation
  home: "home" as keyof typeof MaterialIcons.glyphMap,
  discover: "explore" as keyof typeof MaterialIcons.glyphMap,
  trails: "alt-route" as keyof typeof MaterialIcons.glyphMap,
  memories: "photo-library" as keyof typeof MaterialIcons.glyphMap,
  profile: "account-circle" as keyof typeof MaterialIcons.glyphMap,

  // Actions
  startRecording: "mic" as keyof typeof MaterialIcons.glyphMap,
  playStory: "play-circle-filled" as keyof typeof MaterialIcons.glyphMap,
  pauseStory: "pause-circle-filled" as keyof typeof MaterialIcons.glyphMap,
  stopStory: "stop-circle" as keyof typeof MaterialIcons.glyphMap,
  shareStory: "share" as keyof typeof MaterialIcons.glyphMap,
  favoriteStory: "favorite" as keyof typeof MaterialIcons.glyphMap,

  // Historical & Nature Elements
  historicalSite: "account-balance" as keyof typeof MaterialIcons.glyphMap,
  castle: "castle" as keyof typeof MaterialIcons.glyphMap,
  nature: "nature-people" as keyof typeof MaterialIcons.glyphMap,
  forest: "forest" as keyof typeof MaterialIcons.glyphMap,
  mountain: "terrain" as keyof typeof MaterialIcons.glyphMap,
  water: "waves" as keyof typeof MaterialIcons.glyphMap,
  trail: "alt-route" as keyof typeof MaterialIcons.glyphMap,

  // Story Categories
  legend: "auto-stories" as keyof typeof MaterialIcons.glyphMap,
  mystery: "help-outline" as keyof typeof MaterialIcons.glyphMap,
  culture: "theater-comedy" as keyof typeof MaterialIcons.glyphMap,
  architecture: "architecture" as keyof typeof MaterialIcons.glyphMap,
  war: "security" as keyof typeof MaterialIcons.glyphMap,
  folklore: "psychology" as keyof typeof MaterialIcons.glyphMap,

  // Technology & Features
  ai: "auto-awesome" as keyof typeof MaterialIcons.glyphMap,
  gps: "gps-fixed" as keyof typeof MaterialIcons.glyphMap,
  audio: "volume-up" as keyof typeof MaterialIcons.glyphMap,
  highQuality: "hd" as keyof typeof MaterialIcons.glyphMap,
  openai: "smart-toy" as keyof typeof MaterialIcons.glyphMap,

  // Status & Feedback
  success: "check-circle" as keyof typeof MaterialIcons.glyphMap,
  error: "error" as keyof typeof MaterialIcons.glyphMap,
  warning: "warning" as keyof typeof MaterialIcons.glyphMap,
  loading: "hourglass-empty" as keyof typeof MaterialIcons.glyphMap,
  offline: "wifi-off" as keyof typeof MaterialIcons.glyphMap,
  online: "wifi" as keyof typeof MaterialIcons.glyphMap,

  // User Actions
  like: "thumb-up" as keyof typeof MaterialIcons.glyphMap,
  dislike: "thumb-down" as keyof typeof MaterialIcons.glyphMap,
  bookmark: "bookmark" as keyof typeof MaterialIcons.glyphMap,
  comment: "comment" as keyof typeof MaterialIcons.glyphMap,
  rating: "star" as keyof typeof MaterialIcons.glyphMap,

  // Settings & Configuration
  settings: "settings" as keyof typeof MaterialIcons.glyphMap,
  voice: "record-voice-over" as keyof typeof MaterialIcons.glyphMap,
  language: "translate" as keyof typeof MaterialIcons.glyphMap,
  accessibility: "accessibility" as keyof typeof MaterialIcons.glyphMap,
  notifications: "notifications" as keyof typeof MaterialIcons.glyphMap,

  // Map & Location
  map: "map" as keyof typeof MaterialIcons.glyphMap,
  location: "location-on" as keyof typeof MaterialIcons.glyphMap,
  nearMe: "near-me" as keyof typeof MaterialIcons.glyphMap,
  compass: "explore" as keyof typeof MaterialIcons.glyphMap,
  directions: "directions" as keyof typeof MaterialIcons.glyphMap,

  // Time & History
  history: "history" as keyof typeof MaterialIcons.glyphMap,
  calendar: "event" as keyof typeof MaterialIcons.glyphMap,
  timeline: "timeline" as keyof typeof MaterialIcons.glyphMap,
  clock: "access-time" as keyof typeof MaterialIcons.glyphMap,

  // Weather & Environment
  sunny: "wb-sunny" as keyof typeof MaterialIcons.glyphMap,
  cloudy: "cloud" as keyof typeof MaterialIcons.glyphMap,
  rainy: "weather-rainy" as keyof typeof MaterialIcons.glyphMap,
  night: "brightness-3" as keyof typeof MaterialIcons.glyphMap,

  // Social & Community
  group: "group" as keyof typeof MaterialIcons.glyphMap,
  community: "people" as keyof typeof MaterialIcons.glyphMap,
  guide: "tour" as keyof typeof MaterialIcons.glyphMap,
  expert: "school" as keyof typeof MaterialIcons.glyphMap,
} as const;

// Icon sizes for consistent usage
export const IconSizes = {
  tiny: 12,
  small: 16,
  medium: 20,
  large: 24,
  xl: 28,
  xxl: 32,
  huge: 48,
  massive: 64,
} as const;

// Icon color themes
export const IconColorThemes = {
  primary: "#2d5016", // Deep Forest Green
  secondary: "#b8860b", // Antique Gold
  success: "#28a745", // Trail Green
  warning: "#fd7e14", // Sunset Orange
  error: "#dc3545", // Heritage Red
  accent: "#8b4513", // Saddle Brown
  muted: "#6c757d", // Gray
  white: "#ffffff",
  black: "#000000",
} as const;

// Helper function to get themed icons
export const getThemedIcon = (
  iconName: keyof typeof EchoTrailIcons,
  size: keyof typeof IconSizes = "medium",
  colorTheme: keyof typeof IconColorThemes = "primary"
) => ({
  name: EchoTrailIcons[iconName],
  size: IconSizes[size],
  color: IconColorThemes[colorTheme],
});

// Common icon combinations for different contexts
export const IconCombinations = {
  storyActive: {
    icon: EchoTrailIcons.playStory,
    size: IconSizes.large,
    color: IconColorThemes.success,
  },
  storyPaused: {
    icon: EchoTrailIcons.pauseStory,
    size: IconSizes.large,
    color: IconColorThemes.warning,
  },
  aiPowered: {
    icon: EchoTrailIcons.ai,
    size: IconSizes.medium,
    color: IconColorThemes.secondary,
  },
  highQualityAudio: {
    icon: EchoTrailIcons.highQuality,
    size: IconSizes.small,
    color: IconColorThemes.success,
  },
  locationActive: {
    icon: EchoTrailIcons.gps,
    size: IconSizes.medium,
    color: IconColorThemes.primary,
  },
} as const;
