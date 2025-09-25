// SpeedDetector.ts - Intelligent movement analysis for EchoTrail
// Analyzes user movement patterns and categorizes speed for content adaptation

import { LocationObject } from "expo-location";

export type MovementMode = "STATIONARY" | "WALKING" | "CYCLING" | "DRIVING";

export interface SpeedAnalysis {
  currentSpeed: number; // km/h
  averageSpeed: number; // km/h over last 5 readings
  movementMode: MovementMode;
  confidence: number; // 0-1, how confident we are in the mode detection
  stationaryDuration: number; // minutes at current location
  trend: "ACCELERATING" | "DECELERATING" | "STABLE";
}

export interface LocationReading {
  location: LocationObject;
  timestamp: number;
  speed: number; // km/h
  accuracy: number;
}

/**
 * Intelligent speed detection and movement pattern analysis
 * Provides context-aware movement mode detection for adaptive content generation
 */
export class SpeedDetector {
  private locationHistory: LocationReading[] = [];
  private maxHistorySize = 10;
  private lastMovementMode: MovementMode = "STATIONARY";
  private modeChangeThreshold = 3; // Require 3 consistent readings before changing mode
  private modeVotes: Record<MovementMode, number> = {
    STATIONARY: 0,
    WALKING: 0,
    CYCLING: 0,
    DRIVING: 0,
  };

  /**
   * Analyze a new location reading and determine movement characteristics
   */
  analyzeSpeed(location: LocationObject): SpeedAnalysis {
    const reading: LocationReading = {
      location,
      timestamp: Date.now(),
      speed: this.calculateSpeed(location),
      accuracy: location.coords.accuracy || 50,
    };

    this.addLocationReading(reading);
    const movementMode = this.detectMovementMode();

    return {
      currentSpeed: reading.speed,
      averageSpeed: this.calculateAverageSpeed(),
      movementMode,
      confidence: this.calculateConfidence(movementMode),
      stationaryDuration: this.calculateStationaryDuration(),
      trend: this.detectSpeedTrend(),
    };
  }

  /**
   * Calculate instantaneous speed from location data
   */
  private calculateSpeed(currentLocation: LocationObject): number {
    if (this.locationHistory.length === 0) {
      return 0;
    }

    const lastReading = this.locationHistory[this.locationHistory.length - 1];
    const distance = this.calculateDistance(
      lastReading.location.coords.latitude,
      lastReading.location.coords.longitude,
      currentLocation.coords.latitude,
      currentLocation.coords.longitude
    );

    const timeDelta = (Date.now() - lastReading.timestamp) / 1000; // seconds

    if (timeDelta <= 0) return lastReading.speed; // Same or invalid timestamp

    // Convert m/s to km/h
    const speedKmh = (distance / timeDelta) * 3.6;

    // Handle GPS accuracy issues
    if (speedKmh > 200) return lastReading.speed; // Probably GPS error, use last reading
    if (timeDelta < 1.5) return lastReading.speed; // Too frequent reading

    return Math.max(0, speedKmh); // Ensure non-negative
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  /**
   * Detect movement mode based on speed patterns and consistency
   */
  private detectMovementMode(): MovementMode {
    if (this.locationHistory.length < 2) {
      return "STATIONARY";
    }

    const currentSpeed =
      this.locationHistory[this.locationHistory.length - 1].speed;
    const averageSpeed = this.calculateAverageSpeed();

    // Determine mode based on speed thresholds
    let detectedMode: MovementMode = "STATIONARY";

    if (averageSpeed < 2.0) {
      detectedMode = "STATIONARY";
    } else if (averageSpeed >= 2.0 && averageSpeed < 15) {
      detectedMode = "WALKING";
    } else if (averageSpeed >= 15 && averageSpeed < 35) {
      detectedMode = "CYCLING";
    } else if (averageSpeed >= 35) {
      detectedMode = "DRIVING";
    }

    // Vote for mode consistency
    this.modeVotes[detectedMode]++;

    // Decay votes for other modes more gradually
    Object.keys(this.modeVotes).forEach((mode) => {
      if (mode !== detectedMode) {
        this.modeVotes[mode as MovementMode] = Math.max(
          0,
          this.modeVotes[mode as MovementMode] * 0.8
        );
      }
    });

    // Only change mode if we have enough consistent votes or speeds are very clear
    if (
      this.modeVotes[detectedMode] >= this.modeChangeThreshold ||
      detectedMode === this.lastMovementMode ||
      (averageSpeed > 25 && detectedMode === "DRIVING") ||
      (averageSpeed < 1.0 && detectedMode === "STATIONARY")
    ) {
      this.lastMovementMode = detectedMode;
      return detectedMode;
    }

    return this.lastMovementMode;
  }

  /**
   * Calculate confidence in current mode detection
   */
  private calculateConfidence(mode: MovementMode): number {
    if (this.locationHistory.length === 0) return 0;

    const votes = this.modeVotes[mode];
    const totalReadings = this.locationHistory.length;

    // Base confidence from voting
    let confidence = Math.min(votes / this.modeChangeThreshold, 1.0);

    // Boost confidence for consistent speed readings
    const speeds = this.locationHistory.slice(-5).map((r) => r.speed);
    if (speeds.length > 1) {
      const speedVariance = this.calculateVariance(speeds);

      if (speedVariance < 4) {
        // Low variance = consistent speed, boost confidence
        confidence = Math.min(1, confidence * 1.3);
      } else if (speedVariance > 15) {
        // High variance = erratic readings, reduce confidence
        confidence *= 0.7;
      }
    }

    // Reduce confidence for poor GPS accuracy
    const recentReadings = this.locationHistory.slice(-3);
    if (recentReadings.length > 0) {
      const avgAccuracy =
        recentReadings.reduce((sum, r) => sum + r.accuracy, 0) /
        recentReadings.length;

      if (avgAccuracy > 30) {
        confidence *= 0.6; // Stronger penalty for very poor accuracy
      } else if (avgAccuracy > 20) {
        confidence *= 0.8;
      }
    }

    // Set minimum confidence based on clear mode indicators
    if (votes >= this.modeChangeThreshold) {
      confidence = Math.max(confidence, 0.7);
    } else if (totalReadings >= 3) {
      confidence = Math.max(confidence, 0.3);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate how long user has been stationary
   */
  private calculateStationaryDuration(): number {
    if (this.locationHistory.length < 2) {
      return 0;
    }

    // Only calculate if current mode is stationary
    if (this.lastMovementMode !== "STATIONARY") {
      return 0;
    }

    // Count consecutive stationary readings from the end
    let stationaryCount = 0;
    for (let i = this.locationHistory.length - 1; i >= 0; i--) {
      if (this.locationHistory[i].speed < 2.0) {
        stationaryCount++;
      } else {
        break;
      }
    }

    if (stationaryCount < 2) {
      return 0;
    }

    // Calculate duration based on time difference between first and last stationary reading
    const lastReading = this.locationHistory[this.locationHistory.length - 1];
    const firstStationaryIndex = Math.max(
      0,
      this.locationHistory.length - stationaryCount
    );
    const firstStationaryReading = this.locationHistory[firstStationaryIndex];

    return (
      (lastReading.timestamp - firstStationaryReading.timestamp) / (1000 * 60)
    ); // minutes
  }

  /**
   * Detect if speed is trending up, down, or stable
   */
  private detectSpeedTrend(): "ACCELERATING" | "DECELERATING" | "STABLE" {
    if (this.locationHistory.length < 4) return "STABLE";

    const recentSpeeds = this.locationHistory.slice(-4).map((r) => r.speed);

    // Simple trend detection: compare first half vs second half
    const firstHalf = recentSpeeds.slice(0, 2);
    const secondHalf = recentSpeeds.slice(2, 4);

    const firstAvg =
      firstHalf.reduce((sum, speed) => sum + speed, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, speed) => sum + speed, 0) / secondHalf.length;

    const speedDiff = secondAvg - firstAvg;

    if (Math.abs(speedDiff) < 2.0) return "STABLE"; // Less than 2 km/h difference
    return speedDiff > 0 ? "ACCELERATING" : "DECELERATING";
  }

  /**
   * Calculate average speed over recent readings
   */
  private calculateAverageSpeed(): number {
    if (this.locationHistory.length === 0) return 0;

    const recentReadings = this.locationHistory.slice(-5);
    return (
      recentReadings.reduce((sum, reading) => sum + reading.speed, 0) /
      recentReadings.length
    );
  }

  /**
   * Calculate variance of a number array
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  }

  /**
   * Add new location reading to history
   */
  private addLocationReading(reading: LocationReading): void {
    this.locationHistory.push(reading);

    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift();
    }
  }

  /**
   * Get current movement statistics
   */
  getMovementStats(): {
    totalReadings: number;
    averageSpeed: number;
    maxSpeed: number;
    currentMode: MovementMode;
    modeHistory: Record<MovementMode, number>;
  } {
    return {
      totalReadings: this.locationHistory.length,
      averageSpeed: this.calculateAverageSpeed(),
      maxSpeed: Math.max(...this.locationHistory.map((r) => r.speed), 0),
      currentMode: this.lastMovementMode,
      modeHistory: { ...this.modeVotes },
    };
  }

  /**
   * Reset detection state
   */
  reset(): void {
    this.locationHistory = [];
    this.lastMovementMode = "STATIONARY";
    this.modeVotes = {
      STATIONARY: 0,
      WALKING: 0,
      CYCLING: 0,
      DRIVING: 0,
    };
  }
}

export default SpeedDetector;
