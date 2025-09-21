// ContextAnalyzer.ts - Intelligent environmental context analysis for EchoTrail
// Combines location, time, weather, and movement patterns to understand user's current situation

import { LocationObject } from "expo-location";
import { SpeedAnalysis, MovementMode } from "./SpeedDetector";

export type TimeOfDay =
  | "DAWN"
  | "MORNING"
  | "MIDDAY"
  | "AFTERNOON"
  | "EVENING"
  | "NIGHT";
export type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
export type WeatherCondition =
  | "CLEAR"
  | "PARTLY_CLOUDY"
  | "CLOUDY"
  | "RAINY"
  | "STORMY"
  | "FOGGY"
  | "SNOWY";
export type EnvironmentType =
  | "URBAN"
  | "SUBURBAN"
  | "RURAL"
  | "FOREST"
  | "COASTAL"
  | "MOUNTAIN"
  | "PARK";
export type ActivityContext =
  | "COMMUTING"
  | "LEISURE"
  | "EXERCISE"
  | "SIGHTSEEING"
  | "SHOPPING"
  | "WORK"
  | "UNKNOWN";

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number; // Celsius
  humidity: number; // Percentage 0-100
  windSpeed: number; // km/h
  visibility: number; // km
  pressure: number; // hPa
  uvIndex: number; // 0-11+
  lastUpdated: number; // timestamp
}

export interface LocationContext {
  environmentType: EnvironmentType;
  elevation: number; // meters above sea level
  nearbyPois: PointOfInterest[];
  populationDensity: "LOW" | "MEDIUM" | "HIGH";
  noiseLevel: "QUIET" | "MODERATE" | "LOUD";
  safetyLevel: "HIGH" | "MEDIUM" | "LOW";
}

export interface PointOfInterest {
  type:
    | "HISTORICAL"
    | "NATURAL"
    | "CULTURAL"
    | "COMMERCIAL"
    | "TRANSPORT"
    | "RECREATIONAL";
  name: string;
  distance: number; // meters
  relevance: number; // 0-1
  description?: string;
}

export interface ContextualEnvironment {
  timeOfDay: TimeOfDay;
  season: Season;
  weather: WeatherData | null;
  location: LocationContext;
  movement: SpeedAnalysis;
  activityContext: ActivityContext;
  availableTime: "SHORT" | "MEDIUM" | "LONG"; // Estimated time user has available
  attentionLevel: "LOW" | "MEDIUM" | "HIGH"; // How much attention user can give
  contentPreference: "BRIEF" | "DETAILED" | "IMMERSIVE";
}

export interface ContextualInsights {
  primaryContext: string;
  contentSuggestions: ContentSuggestion[];
  environmentalFactors: string[];
  adaptationRecommendations: AdaptationRecommendation[];
  confidence: number; // 0-1
}

export interface ContentSuggestion {
  type: "HISTORICAL" | "NATURAL" | "CULTURAL" | "PERSONAL";
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  timeRequired: number; // minutes
  interactionLevel: "PASSIVE" | "INTERACTIVE" | "IMMERSIVE";
}

export interface AdaptationRecommendation {
  aspect: "VOLUME" | "SPEED" | "COMPLEXITY" | "DURATION" | "INTERACTION";
  adjustment: "INCREASE" | "DECREASE" | "MAINTAIN";
  reason: string;
  importance: number; // 0-1
}

/**
 * Intelligent context analysis combining environmental, temporal, and behavioral factors
 * Provides comprehensive understanding of user's current situation for adaptive content delivery
 */
export class ContextAnalyzer {
  private weatherCache: Map<string, WeatherData> = new Map();
  private weatherCacheDuration = 30 * 60 * 1000; // 30 minutes
  private locationCache: Map<string, LocationContext> = new Map();
  private locationCacheDuration = 60 * 60 * 1000; // 1 hour
  private activityHistory: ActivityContext[] = [];
  private maxActivityHistory = 10;

  /**
   * Analyze comprehensive context from location, movement, and environmental data
   */
  async analyzeContext(
    location: LocationObject,
    speedAnalysis: SpeedAnalysis,
    weatherData?: WeatherData
  ): Promise<ContextualEnvironment> {
    const timeOfDay = this.determineTimeOfDay(new Date());
    const season = this.determineSeason(new Date());
    const weather = weatherData || (await this.getWeatherData(location));
    const locationContext = await this.analyzeLocationContext(location);
    const activityContext = this.inferActivityContext(
      speedAnalysis,
      locationContext,
      timeOfDay
    );

    // Update activity history
    this.updateActivityHistory(activityContext);

    const availableTime = this.estimateAvailableTime(
      speedAnalysis,
      activityContext,
      timeOfDay
    );
    const attentionLevel = this.assessAttentionLevel(
      speedAnalysis,
      locationContext,
      weather
    );
    const contentPreference = this.determineContentPreference(
      speedAnalysis,
      attentionLevel,
      availableTime,
      activityContext
    );

    return {
      timeOfDay,
      season,
      weather,
      location: locationContext,
      movement: speedAnalysis,
      activityContext,
      availableTime,
      attentionLevel,
      contentPreference,
    };
  }

  /**
   * Generate contextual insights and recommendations
   */
  generateInsights(context: ContextualEnvironment): ContextualInsights {
    const primaryContext = this.identifyPrimaryContext(context);
    const contentSuggestions = this.generateContentSuggestions(context);
    const environmentalFactors = this.identifyEnvironmentalFactors(context);
    const adaptationRecommendations =
      this.generateAdaptationRecommendations(context);
    const confidence = this.calculateInsightConfidence(context);

    return {
      primaryContext,
      contentSuggestions,
      environmentalFactors,
      adaptationRecommendations,
      confidence,
    };
  }

  /**
   * Determine time of day based on solar position and local time
   */
  private determineTimeOfDay(date: Date): TimeOfDay {
    const hour = date.getHours();

    if (hour >= 5 && hour < 7) return "DAWN";
    if (hour >= 7 && hour < 11) return "MORNING";
    if (hour >= 11 && hour < 14) return "MIDDAY";
    if (hour >= 14 && hour < 18) return "AFTERNOON";
    if (hour >= 18 && hour < 21) return "EVENING";
    return "NIGHT";
  }

  /**
   * Determine season based on date and hemisphere
   */
  private determineSeason(date: Date): Season {
    const month = date.getMonth() + 1; // 1-12

    // Northern hemisphere seasons (Norway)
    if (month >= 3 && month <= 5) return "SPRING";
    if (month >= 6 && month <= 8) return "SUMMER";
    if (month >= 9 && month <= 11) return "AUTUMN";
    return "WINTER";
  }

  /**
   * Get or fetch weather data with caching
   */
  private async getWeatherData(
    location: LocationObject
  ): Promise<WeatherData | null> {
    const cacheKey = `${Math.round(location.coords.latitude * 100)}_${Math.round(location.coords.longitude * 100)}`;
    const cached = this.weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.lastUpdated < this.weatherCacheDuration) {
      return cached;
    }

    // In a real implementation, this would fetch from a weather API
    // For now, return a simulated weather data based on location and time
    const mockWeather = this.generateMockWeatherData(location);
    this.weatherCache.set(cacheKey, mockWeather);

    return mockWeather;
  }

  /**
   * Generate mock weather data for testing and development
   */
  private generateMockWeatherData(location: LocationObject): WeatherData {
    const hour = new Date().getHours();
    const season = this.determineSeason(new Date());

    // Simple weather simulation based on time and season
    let temperature = 15; // Base temperature
    if (season === "SUMMER") temperature += 10;
    if (season === "WINTER") temperature -= 10;
    if (hour < 6 || hour > 20) temperature -= 5;

    return {
      condition: hour >= 6 && hour <= 18 ? "CLEAR" : "PARTLY_CLOUDY",
      temperature,
      humidity: 60 + Math.random() * 20,
      windSpeed: 5 + Math.random() * 10,
      visibility: 8 + Math.random() * 2,
      pressure: 1013 + (Math.random() - 0.5) * 40,
      uvIndex: hour >= 10 && hour <= 16 ? Math.round(3 + Math.random() * 5) : 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Analyze location context including environment type and nearby POIs
   */
  private async analyzeLocationContext(
    location: LocationObject
  ): Promise<LocationContext> {
    const cacheKey = `${Math.round(location.coords.latitude * 1000)}_${Math.round(location.coords.longitude * 1000)}`;
    const cached = this.locationCache.get(cacheKey);

    if (
      cached &&
      Date.now() - (cached as any).lastUpdated < this.locationCacheDuration
    ) {
      return cached;
    }

    // Simulate location analysis based on coordinates
    const environmentType = this.classifyEnvironmentType(location);
    const elevation = location.coords.altitude || 0;
    const nearbyPois = await this.findNearbyPOIs(location);
    const populationDensity = this.estimatePopulationDensity(
      location,
      environmentType
    );
    const noiseLevel = this.estimateNoiseLevel(
      environmentType,
      populationDensity
    );
    const safetyLevel = this.assessSafetyLevel(
      environmentType,
      populationDensity
    );

    const context: LocationContext = {
      environmentType,
      elevation,
      nearbyPois,
      populationDensity,
      noiseLevel,
      safetyLevel,
    };

    this.locationCache.set(cacheKey, context);
    return context;
  }

  /**
   * Classify environment type based on location characteristics
   */
  private classifyEnvironmentType(location: LocationObject): EnvironmentType {
    // Simple classification based on coordinates - in reality would use map data
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;

    // Oslo area detection
    if (lat >= 59.8 && lat <= 60.0 && lon >= 10.6 && lon <= 10.9) {
      return "URBAN";
    }

    // Coastal areas (simplified)
    if (lat > 60.5) {
      return "COASTAL";
    }

    // Mountain areas (simplified)
    if ((location.coords.altitude || 0) > 500) {
      return "MOUNTAIN";
    }

    return "SUBURBAN"; // Default
  }

  /**
   * Find nearby points of interest
   */
  private async findNearbyPOIs(
    location: LocationObject
  ): Promise<PointOfInterest[]> {
    // Mock POI data - in reality would query a POI database or API
    const mockPOIs: PointOfInterest[] = [
      {
        type: "HISTORICAL",
        name: "Historic Site",
        distance: 150 + Math.random() * 300,
        relevance: 0.7 + Math.random() * 0.3,
        description: "A place of historical significance",
      },
      {
        type: "NATURAL",
        name: "Park Area",
        distance: 80 + Math.random() * 200,
        relevance: 0.6 + Math.random() * 0.4,
        description: "Natural area with scenic views",
      },
    ];

    return mockPOIs.filter(() => Math.random() > 0.5); // Randomly filter for variety
  }

  /**
   * Estimate population density
   */
  private estimatePopulationDensity(
    location: LocationObject,
    environment: EnvironmentType
  ): "LOW" | "MEDIUM" | "HIGH" {
    switch (environment) {
      case "URBAN":
        return "HIGH";
      case "SUBURBAN":
      case "PARK":
        return "MEDIUM";
      default:
        return "LOW";
    }
  }

  /**
   * Estimate noise level based on environment
   */
  private estimateNoiseLevel(
    environment: EnvironmentType,
    density: "LOW" | "MEDIUM" | "HIGH"
  ): "QUIET" | "MODERATE" | "LOUD" {
    if (environment === "URBAN" && density === "HIGH") return "LOUD";
    if (environment === "FOREST" || environment === "MOUNTAIN") return "QUIET";
    return "MODERATE";
  }

  /**
   * Assess safety level
   */
  private assessSafetyLevel(
    environment: EnvironmentType,
    density: "LOW" | "MEDIUM" | "HIGH"
  ): "HIGH" | "MEDIUM" | "LOW" {
    if (environment === "PARK" || environment === "SUBURBAN") return "HIGH";
    if (environment === "URBAN" && density === "HIGH") return "MEDIUM";
    if (environment === "FOREST" || environment === "MOUNTAIN") return "MEDIUM";
    return "HIGH"; // Default to safe
  }

  /**
   * Infer activity context from movement and location
   */
  private inferActivityContext(
    speedAnalysis: SpeedAnalysis,
    locationContext: LocationContext,
    timeOfDay: TimeOfDay
  ): ActivityContext {
    const { movementMode, trend } = speedAnalysis;
    const { environmentType } = locationContext;

    // Commuting detection
    if (
      (timeOfDay === "MORNING" || timeOfDay === "EVENING") &&
      (movementMode === "DRIVING" || movementMode === "CYCLING") &&
      environmentType === "URBAN"
    ) {
      return "COMMUTING";
    }

    // Exercise detection
    if (movementMode === "CYCLING" && environmentType === "PARK") {
      return "EXERCISE";
    }

    if (
      movementMode === "WALKING" &&
      (trend === "STABLE" || trend === "ACCELERATING") &&
      (environmentType === "PARK" || environmentType === "FOREST")
    ) {
      return "EXERCISE";
    }

    // Leisure/Sightseeing detection
    if (
      movementMode === "WALKING" &&
      speedAnalysis.averageSpeed < 4 &&
      locationContext.nearbyPois.length > 0 &&
      locationContext.nearbyPois.some(
        (poi) => poi.type === "HISTORICAL" || poi.type === "CULTURAL"
      )
    ) {
      return "SIGHTSEEING";
    }

    // Shopping detection
    if (
      movementMode === "WALKING" &&
      environmentType === "URBAN" &&
      speedAnalysis.stationaryDuration > 5
    ) {
      return "SHOPPING";
    }

    // Work detection
    if (
      movementMode === "STATIONARY" &&
      (timeOfDay === "MORNING" ||
        timeOfDay === "MIDDAY" ||
        timeOfDay === "AFTERNOON") &&
      speedAnalysis.stationaryDuration > 30
    ) {
      return "WORK";
    }

    return "LEISURE";
  }

  /**
   * Update activity history for pattern detection
   */
  private updateActivityHistory(activity: ActivityContext): void {
    this.activityHistory.push(activity);
    if (this.activityHistory.length > this.maxActivityHistory) {
      this.activityHistory.shift();
    }
  }

  /**
   * Estimate available time based on activity and movement
   */
  private estimateAvailableTime(
    speedAnalysis: SpeedAnalysis,
    activity: ActivityContext,
    timeOfDay: TimeOfDay
  ): "SHORT" | "MEDIUM" | "LONG" {
    if (activity === "COMMUTING" || speedAnalysis.movementMode === "DRIVING") {
      return "SHORT";
    }

    if (activity === "WORK" || timeOfDay === "MORNING") {
      return "SHORT";
    }

    if (activity === "SIGHTSEEING" || activity === "LEISURE") {
      return "LONG";
    }

    if (
      speedAnalysis.movementMode === "WALKING" &&
      speedAnalysis.averageSpeed < 3
    ) {
      return "MEDIUM";
    }

    return "MEDIUM";
  }

  /**
   * Assess user's attention level
   */
  private assessAttentionLevel(
    speedAnalysis: SpeedAnalysis,
    locationContext: LocationContext,
    weather: WeatherData | null
  ): "LOW" | "MEDIUM" | "HIGH" {
    let attentionScore = 0.5; // Base score

    // Movement factors
    if (speedAnalysis.movementMode === "DRIVING") attentionScore -= 0.4;
    if (speedAnalysis.movementMode === "CYCLING") attentionScore -= 0.2;
    if (speedAnalysis.movementMode === "STATIONARY") attentionScore += 0.3;

    // Environment factors
    if (locationContext.noiseLevel === "LOUD") attentionScore -= 0.2;
    if (locationContext.safetyLevel === "LOW") attentionScore -= 0.2;

    // Weather factors
    if (weather?.condition === "RAINY" || weather?.condition === "STORMY") {
      attentionScore -= 0.2;
    }

    if (attentionScore < 0.3) return "LOW";
    if (attentionScore > 0.7) return "HIGH";
    return "MEDIUM";
  }

  /**
   * Determine content preference based on context
   */
  private determineContentPreference(
    speedAnalysis: SpeedAnalysis,
    attentionLevel: "LOW" | "MEDIUM" | "HIGH",
    availableTime: "SHORT" | "MEDIUM" | "LONG",
    activity: ActivityContext
  ): "BRIEF" | "DETAILED" | "IMMERSIVE" {
    if (attentionLevel === "LOW" || availableTime === "SHORT") {
      return "BRIEF";
    }

    if (
      activity === "SIGHTSEEING" &&
      attentionLevel === "HIGH" &&
      availableTime === "LONG"
    ) {
      return "IMMERSIVE";
    }

    if (
      speedAnalysis.movementMode === "WALKING" &&
      attentionLevel === "MEDIUM"
    ) {
      return "DETAILED";
    }

    return "DETAILED";
  }

  /**
   * Identify primary context for content adaptation
   */
  private identifyPrimaryContext(context: ContextualEnvironment): string {
    const factors = [];

    factors.push(`${context.movement.movementMode.toLowerCase()} user`);
    factors.push(
      `in ${context.location.environmentType.toLowerCase()} environment`
    );
    factors.push(`during ${context.timeOfDay.toLowerCase()}`);

    if (context.weather?.condition && context.weather.condition !== "CLEAR") {
      factors.push(`in ${context.weather.condition.toLowerCase()} weather`);
    }

    factors.push(
      `engaging in ${context.activityContext.toLowerCase()} activity`
    );

    return factors.join(", ");
  }

  /**
   * Generate content suggestions based on context
   */
  private generateContentSuggestions(
    context: ContextualEnvironment
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    // Historical content for areas with POIs
    if (context.location.nearbyPois.some((poi) => poi.type === "HISTORICAL")) {
      suggestions.push({
        type: "HISTORICAL",
        priority: context.activityContext === "SIGHTSEEING" ? "HIGH" : "MEDIUM",
        reason: "Historical points of interest nearby",
        timeRequired: context.availableTime === "LONG" ? 10 : 3,
        interactionLevel:
          context.attentionLevel === "HIGH" ? "INTERACTIVE" : "PASSIVE",
      });
    }

    // Natural content for outdoor environments
    if (
      ["FOREST", "COASTAL", "MOUNTAIN", "PARK"].includes(
        context.location.environmentType
      )
    ) {
      suggestions.push({
        type: "NATURAL",
        priority: "HIGH",
        reason: "Natural environment detected",
        timeRequired: context.availableTime === "SHORT" ? 2 : 5,
        interactionLevel: "PASSIVE",
      });
    }

    // Personal content for leisure time
    if (
      context.activityContext === "LEISURE" &&
      context.availableTime === "LONG"
    ) {
      suggestions.push({
        type: "PERSONAL",
        priority: "MEDIUM",
        reason: "Leisure time detected, good for personal stories",
        timeRequired: 8,
        interactionLevel: "IMMERSIVE",
      });
    }

    return suggestions;
  }

  /**
   * Identify environmental factors affecting content delivery
   */
  private identifyEnvironmentalFactors(
    context: ContextualEnvironment
  ): string[] {
    const factors = [];

    if (context.location.noiseLevel === "LOUD") {
      factors.push("High noise environment may affect audio clarity");
    }

    if (context.weather?.condition === "RAINY") {
      factors.push("Rainy weather may reduce user attention to device");
    }

    if (context.movement.movementMode === "DRIVING") {
      factors.push("Driving requires primary attention for safety");
    }

    if (context.timeOfDay === "NIGHT") {
      factors.push("Low light conditions may affect visual content");
    }

    return factors;
  }

  /**
   * Generate adaptation recommendations
   */
  private generateAdaptationRecommendations(
    context: ContextualEnvironment
  ): AdaptationRecommendation[] {
    const recommendations: AdaptationRecommendation[] = [];

    // Volume adjustments
    if (context.location.noiseLevel === "LOUD") {
      recommendations.push({
        aspect: "VOLUME",
        adjustment: "INCREASE",
        reason: "High ambient noise level detected",
        importance: 0.8,
      });
    }

    // Speed adjustments
    if (context.movement.movementMode === "DRIVING") {
      recommendations.push({
        aspect: "SPEED",
        adjustment: "DECREASE",
        reason: "User is driving and needs brief, clear information",
        importance: 0.9,
      });
    }

    // Duration adjustments
    if (context.availableTime === "SHORT") {
      recommendations.push({
        aspect: "DURATION",
        adjustment: "DECREASE",
        reason: "Limited time availability detected",
        importance: 0.7,
      });
    }

    // Complexity adjustments
    if (context.attentionLevel === "LOW") {
      recommendations.push({
        aspect: "COMPLEXITY",
        adjustment: "DECREASE",
        reason: "Low attention level, prefer simple content",
        importance: 0.8,
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence in context analysis
   */
  private calculateInsightConfidence(context: ContextualEnvironment): number {
    let confidence = 0.5; // Base confidence

    // Movement analysis confidence
    confidence += context.movement.confidence * 0.3;

    // Location accuracy
    if (context.location.nearbyPois.length > 0) confidence += 0.1;

    // Weather data availability
    if (context.weather) confidence += 0.1;

    // Activity history consistency
    const recentActivities = this.activityHistory.slice(-3);
    const consistentActivity = recentActivities.every(
      (a) => a === context.activityContext
    );
    if (consistentActivity) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Clear caches to free memory
   */
  clearCaches(): void {
    this.weatherCache.clear();
    this.locationCache.clear();
    this.activityHistory = [];
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): {
    weatherCacheSize: number;
    locationCacheSize: number;
    activityHistorySize: number;
  } {
    return {
      weatherCacheSize: this.weatherCache.size,
      locationCacheSize: this.locationCache.size,
      activityHistorySize: this.activityHistory.length,
    };
  }
}

export default ContextAnalyzer;
