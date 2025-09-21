import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Trail } from "../types/Trail";
import { GPXTrack } from "./GPXService";
import { logger } from "../utils/logger";

export interface UserMetrics {
  totalTrailsCompleted: number;
  totalDistance: number; // in meters
  totalTime: number; // in seconds
  averageSpeed: number; // in m/s
  preferredDifficulty: Trail["difficulty"];
  preferredCategories: Trail["category"][];
  averageTrailRating: number;
  completionRate: number; // percentage of trails completed vs started
}

export interface TrailPerformance {
  trailId: string;
  completionTime: number;
  averageSpeed: number;
  difficulty: Trail["difficulty"];
  userRating: number;
  actualVsEstimatedTime: number; // ratio
  segmentPerformances: Array<{
    segmentId: string;
    distance: number;
    time: number;
    elevationGain: number;
    averageSpeed: number;
  }>;
  weatherConditions?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    condition: string;
  };
}

export interface PredictiveInsights {
  recommendedTrails: Array<{
    trailId: string;
    score: number;
    reasoning: string[];
  }>;
  estimatedCompletionTime: number;
  difficultyRecommendation: Trail["difficulty"];
  optimalStartTime: {
    hour: number;
    reasoning: string;
  };
  preparationTips: string[];
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high";
    mitigation: string;
  }>;
}

export interface SessionAnalytics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  trailId?: string;
  metrics: {
    steps?: number;
    heartRate?: number[];
    caloriesBurned?: number;
    activeTime: number;
    pauseTime: number;
    gpsAccuracy: number[];
    batteryUsage: number;
  };
  achievements: Array<{
    type: "distance" | "time" | "elevation" | "streak" | "exploration";
    name: string;
    description: string;
    unlockedAt: Date;
  }>;
}

export interface PerformanceTrends {
  period: "week" | "month" | "quarter" | "year";
  metrics: {
    distanceTrend: number; // percentage change
    speedTrend: number;
    difficultyTrend: number;
    consistencyScore: number; // 0-100
    improvementRate: number; // percentage per month
  };
  insights: string[];
  goals: Array<{
    type: "distance" | "time" | "trails" | "difficulty";
    target: number;
    current: number;
    deadline: Date;
    onTrack: boolean;
  }>;
}

class AnalyticsManager {
  private userMetrics: UserMetrics = {
    totalTrailsCompleted: 0,
    totalDistance: 0,
    totalTime: 0,
    averageSpeed: 0,
    preferredDifficulty: "easy",
    preferredCategories: [],
    averageTrailRating: 0,
    completionRate: 0,
  };

  private trailPerformances: TrailPerformance[] = [];
  private sessionAnalytics: SessionAnalytics[] = [];
  private currentSession: SessionAnalytics | null = null;

  async initialize(): Promise<void> {
    await this.loadStoredData();
    await this.calculateUserMetrics();
  }

  /**
   * Session Management
   */
  async startSession(trailId?: string): Promise<string> {
    const sessionId = `session_${Date.now()}`;

    this.currentSession = {
      sessionId,
      startTime: new Date(),
      trailId,
      metrics: {
        activeTime: 0,
        pauseTime: 0,
        gpsAccuracy: [],
        batteryUsage: 0,
      },
      achievements: [],
    };

    return sessionId;
  }

  async endSession(): Promise<SessionAnalytics | null> {
    if (!this.currentSession) return null;

    this.currentSession.endTime = new Date();

    // Calculate final metrics
    const totalTime =
      this.currentSession.endTime.getTime() -
      this.currentSession.startTime.getTime();
    this.currentSession.metrics.activeTime =
      totalTime - this.currentSession.metrics.pauseTime;

    // Check for achievements
    await this.checkAchievements(this.currentSession);

    // Save session
    this.sessionAnalytics.push(this.currentSession);
    await this.saveStoredData();

    const completedSession = this.currentSession;
    this.currentSession = null;

    return completedSession;
  }

  updateSessionMetrics(metrics: Partial<SessionAnalytics["metrics"]>): void {
    if (this.currentSession) {
      this.currentSession.metrics = {
        ...this.currentSession.metrics,
        ...metrics,
      };
    }
  }

  /**
   * Trail Performance Tracking
   */
  async recordTrailCompletion(
    trail: Trail,
    gpxTrack: GPXTrack,
    userRating: number,
    weatherConditions?: TrailPerformance["weatherConditions"]
  ): Promise<void> {
    const performance: TrailPerformance = {
      trailId: trail.id,
      completionTime: gpxTrack.duration,
      averageSpeed: gpxTrack.averageSpeed || 0,
      difficulty: trail.difficulty,
      userRating,
      actualVsEstimatedTime: gpxTrack.duration / (trail.estimatedDuration * 60),
      segmentPerformances: this.calculateSegmentPerformances(gpxTrack),
      weatherConditions,
    };

    this.trailPerformances.push(performance);
    await this.updateUserMetrics();
    await this.saveStoredData();
  }

  private calculateSegmentPerformances(
    gpxTrack: GPXTrack
  ): TrailPerformance["segmentPerformances"] {
    const segments: TrailPerformance["segmentPerformances"] = [];
    const segmentSize = Math.max(1, Math.floor(gpxTrack.points.length / 5)); // 5 segments

    for (let i = 0; i < gpxTrack.points.length; i += segmentSize) {
      const segmentPoints = gpxTrack.points.slice(i, i + segmentSize);
      if (segmentPoints.length < 2) continue;

      const startPoint = segmentPoints[0];
      const endPoint = segmentPoints[segmentPoints.length - 1];

      const distance = this.calculateDistance(
        startPoint.latitude,
        startPoint.longitude,
        endPoint.latitude,
        endPoint.longitude
      );

      const time = endPoint.time.getTime() - startPoint.time.getTime();
      const elevationGain = Math.max(
        0,
        (endPoint.elevation || 0) - (startPoint.elevation || 0)
      );

      segments.push({
        segmentId: `segment_${i / segmentSize}`,
        distance,
        time: time / 1000, // Convert to seconds
        elevationGain,
        averageSpeed: time > 0 ? distance / (time / 1000) : 0,
      });
    }

    return segments;
  }

  /**
   * User Metrics Calculation
   */
  private async updateUserMetrics(): Promise<void> {
    await this.calculateUserMetrics();
  }

  private async calculateUserMetrics(): Promise<void> {
    const completedTrails = this.trailPerformances;

    if (completedTrails.length === 0) return;

    // Basic statistics
    this.userMetrics.totalTrailsCompleted = completedTrails.length;
    this.userMetrics.totalDistance = completedTrails.reduce(
      (sum, p) =>
        sum + p.segmentPerformances.reduce((s, seg) => s + seg.distance, 0),
      0
    );
    this.userMetrics.totalTime = completedTrails.reduce(
      (sum, p) => sum + p.completionTime,
      0
    );
    this.userMetrics.averageSpeed =
      this.userMetrics.totalTime > 0
        ? this.userMetrics.totalDistance / this.userMetrics.totalTime
        : 0;

    // Preferred difficulty (most completed)
    const difficultyCount = completedTrails.reduce(
      (acc, p) => {
        acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
        return acc;
      },
      {} as Record<Trail["difficulty"], number>
    );

    this.userMetrics.preferredDifficulty =
      (Object.entries(difficultyCount).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] as Trail["difficulty"]) || "easy";

    // Average trail rating
    const validRatings = completedTrails.filter((p) => p.userRating > 0);
    this.userMetrics.averageTrailRating =
      validRatings.length > 0
        ? validRatings.reduce((sum, p) => sum + p.userRating, 0) /
          validRatings.length
        : 0;

    // Completion rate (assuming we track started trails)
    this.userMetrics.completionRate = 100; // Simplified for now
  }

  /**
   * Predictive Analytics
   */
  async generateInsights(
    availableTrails: Trail[]
  ): Promise<PredictiveInsights> {
    const recommendations =
      await this.generateTrailRecommendations(availableTrails);
    const timeEstimate = this.estimateCompletionTime(availableTrails[0]); // For first recommended trail
    const difficultyRec = this.recommendDifficulty();
    const startTime = this.calculateOptimalStartTime();
    const tips = this.generatePreparationTips();
    const risks = this.assessRiskFactors();

    return {
      recommendedTrails: recommendations,
      estimatedCompletionTime: timeEstimate,
      difficultyRecommendation: difficultyRec,
      optimalStartTime: startTime,
      preparationTips: tips,
      riskFactors: risks,
    };
  }

  private async generateTrailRecommendations(
    trails: Trail[]
  ): Promise<PredictiveInsights["recommendedTrails"]> {
    return trails
      .map((trail) => ({
        trailId: trail.id,
        score: this.calculateTrailScore(trail),
        reasoning: this.generateRecommendationReasoning(trail),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private calculateTrailScore(trail: Trail): number {
    let score = 50; // Base score

    // Difficulty preference
    if (trail.difficulty === this.userMetrics.preferredDifficulty) {
      score += 20;
    }

    // Category preference
    if (this.userMetrics.preferredCategories.includes(trail.category)) {
      score += 15;
    }

    // Rating boost
    score += trail.rating * 5;

    // Distance preference (based on user's average completed distances)
    const avgDistance =
      this.userMetrics.totalDistance /
      Math.max(this.userMetrics.totalTrailsCompleted, 1);
    const distanceDiff = Math.abs(trail.distance - avgDistance);
    const distanceScore = Math.max(0, 20 - distanceDiff / 1000); // Reduce score for distance difference
    score += distanceScore;

    return Math.round(score);
  }

  private generateRecommendationReasoning(trail: Trail): string[] {
    const reasons: string[] = [];

    if (trail.difficulty === this.userMetrics.preferredDifficulty) {
      reasons.push(
        `Matcher din foretrukne vanskelighetsgrad (${trail.difficulty})`
      );
    }

    if (trail.rating >= 4.0) {
      reasons.push("Høyt vurdert av andre brukere");
    }

    if (trail.audioGuidePoints.length > 0) {
      reasons.push("Har lydguide for rik opplevelse");
    }

    const avgDistance =
      this.userMetrics.totalDistance /
      Math.max(this.userMetrics.totalTrailsCompleted, 1);
    if (Math.abs(trail.distance - avgDistance) < 1000) {
      reasons.push("Tilpasset din vanlige distanse");
    }

    return reasons;
  }

  private estimateCompletionTime(trail: Trail): number {
    if (!trail) return 0;

    // Use user's historical performance to adjust estimates
    const userSpeedFactor =
      this.userMetrics.averageSpeed > 0
        ? this.userMetrics.averageSpeed / 1.4 // 1.4 m/s is average walking speed
        : 1;

    const adjustedTime = (trail.estimatedDuration * 60) / userSpeedFactor;
    return Math.round(adjustedTime);
  }

  private recommendDifficulty(): Trail["difficulty"] {
    const recentPerformances = this.trailPerformances.slice(-5);

    if (recentPerformances.length === 0) {
      return "easy";
    }

    // Analyze recent performance
    const avgCompletionRatio =
      recentPerformances.reduce((sum, p) => sum + p.actualVsEstimatedTime, 0) /
      recentPerformances.length;

    if (avgCompletionRatio < 0.8) {
      // User is faster than average - can handle harder trails
      const difficultyOrder: Trail["difficulty"][] = [
        "easy",
        "moderate",
        "hard",
        "extreme",
      ];
      const currentIndex = difficultyOrder.indexOf(
        this.userMetrics.preferredDifficulty
      );
      return difficultyOrder[
        Math.min(currentIndex + 1, difficultyOrder.length - 1)
      ];
    } else if (avgCompletionRatio > 1.2) {
      // User is slower than average - recommend easier trails
      const difficultyOrder: Trail["difficulty"][] = [
        "extreme",
        "hard",
        "moderate",
        "easy",
      ];
      const currentIndex = difficultyOrder.indexOf(
        this.userMetrics.preferredDifficulty
      );
      return difficultyOrder[
        Math.min(currentIndex + 1, difficultyOrder.length - 1)
      ];
    }

    return this.userMetrics.preferredDifficulty;
  }

  private calculateOptimalStartTime(): PredictiveInsights["optimalStartTime"] {
    const sessions = this.sessionAnalytics.filter((s) => s.endTime);

    if (sessions.length === 0) {
      return {
        hour: 9,
        reasoning: "Anbefalt morgenstart for beste værleksforhold",
      };
    }

    // Analyze historical start times and performance
    const hourPerformance = sessions.reduce(
      (acc, session) => {
        const hour = session.startTime.getHours();
        const performance =
          session.metrics.activeTime /
          (session.endTime!.getTime() - session.startTime.getTime());

        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(performance);
        return acc;
      },
      {} as Record<number, number[]>
    );

    // Find hour with best average performance
    let bestHour = 9;
    let bestPerformance = 0;

    Object.entries(hourPerformance).forEach(([hour, performances]) => {
      const avgPerformance =
        performances.reduce((a, b) => a + b, 0) / performances.length;
      if (avgPerformance > bestPerformance) {
        bestPerformance = avgPerformance;
        bestHour = parseInt(hour);
      }
    });

    return {
      hour: bestHour,
      reasoning: `Basert på din historiske ytelse presterer du best når du starter kl. ${bestHour}:00`,
    };
  }

  private generatePreparationTips(): string[] {
    const tips: string[] = [
      "Sjekk værmelding før avreise",
      "Ha med nok vann og snacks",
      "Informer noen om ruten din",
    ];

    if (this.userMetrics.averageSpeed < 1.2) {
      tips.push("Vurder å ta pauser oftere for optimal ytelse");
    }

    if (
      this.userMetrics.preferredDifficulty === "hard" ||
      this.userMetrics.preferredDifficulty === "extreme"
    ) {
      tips.push("Ha med førstehjelp-utstyr for krevende stier");
      tips.push("Start tidligere på dagen for å unngå mørke");
    }

    return tips;
  }

  private assessRiskFactors(): PredictiveInsights["riskFactors"] {
    const risks: PredictiveInsights["riskFactors"] = [];

    // Analyze recent performance for risk indicators
    const recentPerformances = this.trailPerformances.slice(-3);

    if (recentPerformances.some((p) => p.actualVsEstimatedTime > 1.5)) {
      risks.push({
        factor: "Sakte progresjon",
        severity: "medium",
        mitigation: "Vurder enklere stier eller ta flere pauser",
      });
    }

    const avgAccuracy = this.currentSession?.metrics.gpsAccuracy.length
      ? this.currentSession.metrics.gpsAccuracy.reduce((a, b) => a + b, 0) /
        this.currentSession.metrics.gpsAccuracy.length
      : 0;
    if (avgAccuracy > 10) {
      // Poor GPS accuracy
      risks.push({
        factor: "Dårlig GPS-nøyaktighet",
        severity: "high",
        mitigation: "Sjekk GPS-innstillinger og ha med papirkart som backup",
      });
    }

    return risks;
  }

  /**
   * Performance Trends
   */
  async getPerformanceTrends(
    period: PerformanceTrends["period"]
  ): Promise<PerformanceTrends> {
    const now = new Date();
    const startDate = this.getStartDateForPeriod(period, now);

    const periodPerformances = this.trailPerformances.filter((p) => {
      const completionDate = new Date(p.completionTime * 1000); // Assuming completion time is timestamp
      return completionDate >= startDate;
    });

    const metrics = this.calculateTrendMetrics(periodPerformances, period);
    const insights = this.generateTrendInsights(metrics);
    const goals = this.generateGoals(metrics, period);

    return {
      period,
      metrics,
      insights,
      goals,
    };
  }

  private getStartDateForPeriod(
    period: PerformanceTrends["period"],
    now: Date
  ): Date {
    const date = new Date(now);

    switch (period) {
      case "week":
        date.setDate(date.getDate() - 7);
        break;
      case "month":
        date.setMonth(date.getMonth() - 1);
        break;
      case "quarter":
        date.setMonth(date.getMonth() - 3);
        break;
      case "year":
        date.setFullYear(date.getFullYear() - 1);
        break;
    }

    return date;
  }

  private calculateTrendMetrics(
    performances: TrailPerformance[],
    period: PerformanceTrends["period"]
  ): PerformanceTrends["metrics"] {
    if (performances.length === 0) {
      return {
        distanceTrend: 0,
        speedTrend: 0,
        difficultyTrend: 0,
        consistencyScore: 0,
        improvementRate: 0,
      };
    }

    // Calculate trends (simplified)
    const totalDistance = performances.reduce(
      (sum, p) =>
        sum + p.segmentPerformances.reduce((s, seg) => s + seg.distance, 0),
      0
    );
    const avgSpeed =
      performances.reduce((sum, p) => sum + p.averageSpeed, 0) /
      performances.length;

    return {
      distanceTrend: totalDistance > 0 ? 10 : 0, // Simplified trend calculation
      speedTrend: avgSpeed > this.userMetrics.averageSpeed ? 5 : -2,
      difficultyTrend: 0, // Would calculate based on difficulty progression
      consistencyScore: Math.min(performances.length * 20, 100), // More activities = higher consistency
      improvementRate: 5, // Simplified
    };
  }

  private generateTrendInsights(
    metrics: PerformanceTrends["metrics"]
  ): string[] {
    const insights: string[] = [];

    if (metrics.speedTrend > 0) {
      insights.push(
        `Din gjennomsnittshastighet har økt med ${metrics.speedTrend.toFixed(1)}%`
      );
    }

    if (metrics.consistencyScore > 80) {
      insights.push("Du har opprettholdt en konsekvent treningsrutine");
    }

    if (metrics.distanceTrend > 0) {
      insights.push("Du går lengre distanser enn før");
    }

    return insights;
  }

  private generateGoals(
    metrics: PerformanceTrends["metrics"],
    period: PerformanceTrends["period"]
  ): PerformanceTrends["goals"] {
    const goals: PerformanceTrends["goals"] = [];

    // Generate realistic goals based on current performance
    const currentDistance = this.userMetrics.totalDistance;
    const targetDistance = currentDistance * 1.2; // 20% increase

    goals.push({
      type: "distance",
      target: targetDistance,
      current: currentDistance,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      onTrack: metrics.distanceTrend > 0,
    });

    return goals;
  }

  /**
   * Achievement System
   */
  private async checkAchievements(session: SessionAnalytics): Promise<void> {
    const achievements: SessionAnalytics["achievements"] = [];

    // Distance milestone
    if (
      this.userMetrics.totalDistance > 10000 &&
      this.userMetrics.totalTrailsCompleted === 1
    ) {
      achievements.push({
        type: "distance",
        name: "Første 10km",
        description: "Fullførte din første 10 kilometer!",
        unlockedAt: new Date(),
      });
    }

    // Trail completion milestones
    const trailMilestones = [5, 10, 25, 50, 100];
    trailMilestones.forEach((milestone) => {
      if (this.userMetrics.totalTrailsCompleted === milestone) {
        achievements.push({
          type: "exploration",
          name: `${milestone} Stier`,
          description: `Fullførte ${milestone} forskjellige stier!`,
          unlockedAt: new Date(),
        });
      }
    });

    session.achievements.push(...achievements);
  }

  /**
   * Data Management
   */
  private async loadStoredData(): Promise<void> {
    try {
      const [metricsData, performancesData, sessionsData] = await Promise.all([
        AsyncStorage.getItem("user_metrics"),
        AsyncStorage.getItem("trail_performances"),
        AsyncStorage.getItem("session_analytics"),
      ]);

      if (metricsData) {
        this.userMetrics = JSON.parse(metricsData);
      }

      if (performancesData) {
        this.trailPerformances = JSON.parse(performancesData);
      }

      if (sessionsData) {
        this.sessionAnalytics = JSON.parse(sessionsData).map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined,
          achievements: s.achievements.map((a: any) => ({
            ...a,
            unlockedAt: new Date(a.unlockedAt),
          })),
        }));
      }
    } catch (error) {
      logger.warn("Failed to load analytics data:", error);
    }
  }

  private async saveStoredData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem("user_metrics", JSON.stringify(this.userMetrics)),
        AsyncStorage.setItem(
          "trail_performances",
          JSON.stringify(this.trailPerformances)
        ),
        AsyncStorage.setItem(
          "session_analytics",
          JSON.stringify(this.sessionAnalytics)
        ),
      ]);
    } catch (error) {
      logger.warn("Failed to save analytics data:", error);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Public API
   */
  getUserMetrics(): UserMetrics {
    return { ...this.userMetrics };
  }

  getTrailPerformances(): TrailPerformance[] {
    return [...this.trailPerformances];
  }

  getCurrentSession(): SessionAnalytics | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  async exportAnalyticsData(): Promise<string> {
    return JSON.stringify(
      {
        userMetrics: this.userMetrics,
        trailPerformances: this.trailPerformances,
        sessionAnalytics: this.sessionAnalytics,
        exportedAt: new Date().toISOString(),
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
      },
      null,
      2
    );
  }

  async clearAllData(): Promise<void> {
    this.userMetrics = {
      totalTrailsCompleted: 0,
      totalDistance: 0,
      totalTime: 0,
      averageSpeed: 0,
      preferredDifficulty: "easy",
      preferredCategories: [],
      averageTrailRating: 0,
      completionRate: 0,
    };

    this.trailPerformances = [];
    this.sessionAnalytics = [];
    this.currentSession = null;

    await AsyncStorage.multiRemove([
      "user_metrics",
      "trail_performances",
      "session_analytics",
    ]);
  }
}

export default new AnalyticsManager();
