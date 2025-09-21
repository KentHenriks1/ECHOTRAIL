import * as Location from "expo-location";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface TrailPoint extends Coordinate {
  elevation?: number;
  timestamp?: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

// For compatibility with @echotrail/types
export interface TrackPoint {
  id?: string;
  coordinate: Coordinate;
  timestamp: Date;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface AudioGuidePoint {
  id: string;
  coordinate: Coordinate;
  location?: Coordinate; // For backward compatibility
  title: string;
  description: string;
  content?: string; // Main content for TTS
  audioScript: string; // Alternative script
  triggerRadius: number; // meters
  category:
    | "history"
    | "nature"
    | "culture"
    | "legends"
    | "architecture"
    | "mystery";
}

export interface Trail {
  id: string;
  name: string;
  description?: string; // Make optional for new trails
  userId?: string; // For user association
  difficulty?: "easy" | "moderate" | "hard" | "extreme"; // Make optional
  category?:
    | "hiking"
    | "walking"
    | "cycling"
    | "cultural"
    | "historical"
    | "nature"; // Make optional

  // Location data
  startPoint?: Coordinate;
  endPoint?: Coordinate;
  waypoints?: TrailPoint[];
  trackPoints?: TrackPoint[]; // For compatibility with @echotrail/types
  bounds?: {
    northeast: Coordinate;
    southwest: Coordinate;
  };

  // Trail metadata (flexible structure for recording)
  distance?: number; // in meters
  estimatedDuration?: number; // in minutes
  elevationGain?: number; // in meters
  maxElevation?: number; // in meters
  minElevation?: number; // in meters
  metadata?: {
    distance?: number;
    duration?: number;
    elevationGain?: number;
    elevationLoss?: number;
    [key: string]: any;
  };

  // Public/private flag
  isPublic?: boolean;

  // Content
  images?: string[];
  audioGuidePoints?: AudioGuidePoint[];

  // User experience
  rating?: number; // 1-5 stars
  reviewCount?: number;
  popularity?: number; // 1-100

  // Technical
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  requiresPermits?: boolean;
  seasonality?: {
    bestMonths: number[]; // 1-12
    warnings: string[];
  };

  // Features
  features?: {
    hasWater: boolean;
    hasRestrooms: boolean;
    hasParking: boolean;
    isPetFriendly: boolean;
    isAccessible: boolean;
    hasWifi: boolean;
  };
}

export interface UserTrailProgress {
  trailId: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  currentPosition?: Coordinate;
  visitedAudioPoints: string[];
  totalDistance: number;
  totalDuration: number; // in minutes
  recordedPath: TrailPoint[];
  isCompleted: boolean;
}

export interface TrailFilter {
  categories?: Trail["category"][];
  difficulties?: Trail["difficulty"][];
  maxDistance?: number;
  maxDuration?: number;
  nearLocation?: {
    coordinate: Coordinate;
    radius: number; // in meters
  };
  features?: Partial<Trail["features"]>;
  rating?: number;
  searchQuery?: string;
}
