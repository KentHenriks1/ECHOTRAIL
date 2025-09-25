/**
 * AI Services Export Hub for EchoTrail
 * Unified export point for all AI-related services
 * Created by: Kent Rune Henriksen
 */

// Import services for AIServiceManager
import { OpenAIService } from './OpenAIService';
import { storyCacheService } from './StoryCacheService';
import { storyFeedbackService } from './StoryFeedbackService';
import { aiPerformanceService } from './AIPerformanceService';
import { locationStoryCacheService } from '../location/LocationBasedStoryCacheService';
import type { LocationContext, UserPreferences } from './OpenAIService';

// Core AI Services
export { OpenAIService } from './OpenAIService';
export { StoryCacheService, storyCacheService } from './StoryCacheService';
export { StoryFeedbackService, storyFeedbackService } from './StoryFeedbackService';
export { AIPerformanceService, aiPerformanceService } from './AIPerformanceService';

// Location Services
export { LocationBasedStoryCacheService, locationStoryCacheService } from '../location/LocationBasedStoryCacheService';

// Type exports
export type {
  GeneratedStory,
  LocationContext,
  UserPreferences
} from './OpenAIService';

export type {
  CachedStory,
  StoryCache,
  CacheConfig
} from './StoryCacheService';

export type {
  StoryFeedback,
  FeedbackCategory,
  FeedbackAnalytics,
  UserFeedbackPreferences
} from './StoryFeedbackService';

export type {
  AIOperationMetrics,
  PerformanceAnalytics,
  PerformanceAlerts
} from './AIPerformanceService';

export type {
  LocationStoryCache,
  CacheRegion,
  CacheStats as LocationCacheStats,
  ProximitySearchOptions
} from '../location/LocationBasedStoryCacheService';

/**
 * Complete AI Service Manager
 * Provides a unified interface to all AI services
 */
export class AIServiceManager {
  public readonly openai: OpenAIService;
  public readonly cache: typeof storyCacheService;
  public readonly feedback: typeof storyFeedbackService;
  public readonly performance: typeof aiPerformanceService;
  public readonly locationCache: typeof locationStoryCacheService;

  constructor() {
    this.openai = new OpenAIService();
    this.cache = storyCacheService;
    this.feedback = storyFeedbackService;
    this.performance = aiPerformanceService;
    this.locationCache = locationStoryCacheService;
  }

  /**
   * Generate story with location-based caching and full monitoring
   */
  async generateStory(
    locationContext: LocationContext,
    preferences: UserPreferences,
    options: {
      useLocationCache?: boolean;
      useStoryCache?: boolean;
      trackPerformance?: boolean;
      previousStories?: string[];
      cacheRadius?: number;
    } = {}
  ) {
    const {
      useLocationCache = true,
      useStoryCache = true,
      trackPerformance = true,
      previousStories = [],
      cacheRadius = 1000
    } = options;

    try {
      // Check location cache first
      if (useLocationCache) {
        const nearbyStories = await this.locationCache.findNearbyStories(
          locationContext.latitude,
          locationContext.longitude,
          { radius: cacheRadius, limit: 1, minPopularity: 2.0 }
        );

        if (nearbyStories.length > 0) {
          const cachedStory = nearbyStories[0];
          if (trackPerformance) {
            await this.performance.trackAIOperation({
              operationType: 'story_generation',
              startTime: Date.now(),
              endTime: Date.now(),
              success: true,
              cached: true,
              location: locationContext.address
            });
          }

          return {
            story: cachedStory.story,
            fromCache: true,
            fromLocationCache: true,
            distance: this.calculateDistance(
              locationContext.latitude,
              locationContext.longitude,
              cachedStory.location.latitude,
              cachedStory.location.longitude
            ),
            metadata: {
              generated: cachedStory.metadata.cachedAt,
              location: locationContext.address,
              preferences: preferences,
              cacheHit: 'location'
            }
          };
        }
      }

      // Generate new story
      const story = await this.openai.generateTrailStory(
        locationContext,
        preferences,
        previousStories,
        useStoryCache
      );

      // Cache to location cache
      if (useLocationCache && story) {
        // We need location enrichment for the cache
        const enrichment = {
          address: locationContext.address || 'Ukjent lokasjon',
          nearbyPlaces: locationContext.nearbyPlaces || [],
          historicalContext: locationContext.historicalContext || '',
          culturalContext: 'Norwegian outdoor culture',
          localTerminology: ['fjell', 'skog', 'sti'],
          region: {
            municipality: 'Ukjent',
            county: 'Ukjent',
            country: 'Norge'
          }
        };

        await this.locationCache.cacheStory(
          story,
          locationContext.latitude,
          locationContext.longitude,
          enrichment,
          ['ai-generated', 'trail-story']
        );
      }

      return {
        story,
        fromCache: false,
        fromLocationCache: false,
        metadata: {
          generated: new Date().toISOString(),
          location: locationContext.address,
          preferences: preferences,
          cacheHit: null
        }
      };
    } catch (error) {
      if (trackPerformance) {
        await this.performance.trackAIOperation({
          operationType: 'story_generation',
          startTime: Date.now(),
          endTime: Date.now(),
          success: false,
          cached: false,
          error: (error as Error).message,
          location: locationContext.address
        });
      }
      throw error;
    }
  }

  /**
   * Find nearby cached stories
   */
  async findNearbyStories(
    latitude: number,
    longitude: number,
    radius: number = 1000,
    limit: number = 10
  ) {
    return await this.locationCache.findNearbyStories(
      latitude,
      longitude,
      { radius, limit, includeExpired: false }
    );
  }

  /**
   * Play story audio with error handling
   */
  async playStoryAudio(storyId: string) {
    try {
      // First check location cache
      const cachedStory = await this.locationCache.getCachedStory(storyId);
      if (cachedStory?.story.audioUrl) {
        return await this.openai.playAudio(cachedStory.story.audioUrl);
      }

      // Fall back to regular story cache - try to find by ID
      const allStories = await this.cache.getAllCachedStories();
      const story = allStories.stories.find(s => s.id === storyId);
      if (story?.audioUrl) {
        return await this.openai.playAudio(story.audioUrl);
      }

      throw new Error('Story audio not found');
    } catch (error) {
      throw new Error(`Failed to play story audio: ${error}`);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get comprehensive analytics across all services
   */
  async getComprehensiveAnalytics() {
    try {
      const [
        performanceAnalytics,
        feedbackAnalytics,
        cacheStats,
        locationCacheStats,
        performanceAlerts
      ] = await Promise.all([
        this.performance.getPerformanceAnalytics(),
        this.feedback.getFeedbackAnalytics(),
        this.openai.getCacheStats(),
        this.locationCache.getCacheStats(),
        this.performance.getPerformanceAlerts()
      ]);

      return {
        performance: performanceAnalytics,
        feedback: feedbackAnalytics,
        cache: cacheStats,
        locationCache: locationCacheStats,
        alerts: performanceAlerts,
        summary: {
          totalOperations: performanceAnalytics.totalOperations,
          successRate: performanceAnalytics.successRate,
          averageRating: feedbackAnalytics.averageRating,
          cacheHitRate: performanceAnalytics.cacheEfficiency.hitRate,
          locationCacheSize: locationCacheStats.totalStories,
          costEstimate: performanceAnalytics.tokenUsage.costEstimate
        }
      };
    } catch (error) {
      throw new Error(`Failed to get comprehensive analytics: ${error}`);
    }
  }

  /**
   * Get optimization recommendations from all services
   */
  async getOptimizationRecommendations() {
    try {
      const [
        performanceRecommendations,
        feedbackRecommendations
      ] = await Promise.all([
        this.performance.getOptimizationRecommendations(),
        this.feedback.getImprovementSuggestions()
      ]);

      return {
        performance: performanceRecommendations,
        feedback: feedbackRecommendations,
        combined: [
          ...performanceRecommendations.caching,
          ...performanceRecommendations.prompts,
          ...performanceRecommendations.models,
          ...performanceRecommendations.costs,
          ...feedbackRecommendations.promptAdjustments,
          ...feedbackRecommendations.voiceStyleRecommendations,
          ...feedbackRecommendations.lengthOptimizations,
          ...feedbackRecommendations.contentFocus
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get optimization recommendations: ${error}`);
    }
  }

  /**
   * Health check for all AI services
   */
  async healthCheck() {
    try {
      const checks = {
        openai: true, // Would implement actual health check
        cache: true,
        feedback: true,
        performance: true,
        overall: true
      };

      // You could add actual health checks here
      const analytics = await this.getComprehensiveAnalytics();
      
      return {
        status: 'healthy',
        services: checks,
        metrics: {
          totalOperations: analytics.performance.totalOperations,
          successRate: analytics.performance.successRate,
          lastActivity: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
        services: {
          openai: false,
          cache: false,
          feedback: false,
          performance: false,
          overall: false
        }
      };
    }
  }

  /**
   * Export all data for backup or analysis
   */
  async exportAllData() {
    try {
      const [
        cacheData,
        feedbackData,
        performanceData
      ] = await Promise.all([
        this.openai.getAllCachedStories(),
        this.feedback.exportFeedbackData(),
        this.performance.exportPerformanceData()
      ]);

      return {
        cache: cacheData,
        feedback: feedbackData,
        performance: performanceData,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to export all data: ${error}`);
    }
  }

  /**
   * Get location cache statistics
   */
  async getLocationCacheStats() {
    return await this.locationCache.getCacheStats();
  }

  /**
   * Clean up expired stories from location cache
   */
  async cleanupLocationCache() {
    return await this.locationCache.cleanupExpiredStories();
  }

  /**
   * Preload stories for popular regions
   */
  async preloadPopularRegions() {
    await this.locationCache.preloadPopularRegions();
  }

  /**
   * Get story cache statistics (combined)
   */
  async getStoryCacheStats() {
    const [storyCache, locationCache] = await Promise.all([
      this.openai.getCacheStats(),
      this.locationCache.getCacheStats()
    ]);

    return {
      storyCache,
      locationCache,
      combined: {
        totalStories: (storyCache.totalStories || 0) + locationCache.totalStories,
        totalSizeBytes: (storyCache.totalSize || 0) + locationCache.cacheSize,
        hitRate: locationCache.hitRate // Use location cache hit rate as primary metric
      }
    };
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAllData() {
    try {
      await Promise.all([
        this.openai.clearStoryCache(),
        this.feedback.clearFeedbackData(),
        this.performance.clearPerformanceData(),
        this.locationCache.clearCache()
      ]);

      return {
        success: true,
        message: 'All AI service data cleared successfully',
        clearedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to clear all data: ${error}`);
    }
  }
}

// Export singleton instance
export const aiServiceManager = new AIServiceManager();