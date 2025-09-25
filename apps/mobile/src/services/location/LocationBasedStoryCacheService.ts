/**
 * Location-Based Story Cache Service
 * Intelligent geographical caching system for AI-generated stories
 * Created by: Kent Rune Henriksen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../../core/utils';
import type { GeneratedStory } from '../ai';
import type { LocationEnrichment } from './LocationContextService';

export interface LocationStoryCache {
  id: string;
  story: GeneratedStory;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  enrichment: LocationEnrichment;
  metadata: {
    cachedAt: string;
    lastAccessed: string;
    accessCount: number;
    popularityScore: number;
    expiresAt: string;
  };
  tags: string[];
}

export interface CacheRegion {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    latitude: number;
    longitude: number;
  };
  stories: LocationStoryCache[];
  metadata: {
    createdAt: string;
    lastUpdated: string;
    popularityScore: number;
    storyCount: number;
  };
}

export interface CacheStats {
  totalStories: number;
  totalRegions: number;
  cacheSize: number; // in bytes
  hitRate: number;
  averageAge: number; // in hours
  popularRegions: string[];
  recentStories: LocationStoryCache[];
}

export interface ProximitySearchOptions {
  radius: number; // in meters
  limit?: number;
  minPopularity?: number;
  maxAge?: number; // in hours
  includeExpired?: boolean;
}

export class LocationBasedStoryCacheService {
  private readonly logger: Logger;
  private readonly CACHE_PREFIX = '@echotrail_location_stories';
  private readonly REGION_PREFIX = '@echotrail_cache_regions';
  private readonly STATS_KEY = '@echotrail_cache_stats';
  
  // Cache configuration
  // private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB // For future cache size management
  private readonly MAX_STORIES_PER_REGION = 100;
  private readonly DEFAULT_EXPIRY_HOURS = 168; // 7 days
  // private readonly POPULAR_EXPIRY_HOURS = 720; // 30 days // For future cache expiry
  // private readonly PROXIMITY_THRESHOLD = 100; // meters // For future proximity filtering
  private readonly REGION_SIZE = 0.01; // approximately 1km

  constructor() {
    this.logger = new Logger('LocationStoryCacheService');
  }

  /**
   * Cache a story at specific location
   */
  async cacheStory(
    story: GeneratedStory,
    latitude: number,
    longitude: number,
    enrichment: LocationEnrichment,
    tags: string[] = []
  ): Promise<void> {
    try {
      const cacheEntry: LocationStoryCache = {
        id: this.generateCacheId(latitude, longitude, story.id),
        story,
        location: {
          latitude,
          longitude,
          accuracy: 10 // default accuracy
        },
        enrichment,
        metadata: {
          cachedAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          accessCount: 1,
          popularityScore: this.calculateInitialPopularity(enrichment),
          expiresAt: this.calculateExpiryDate(this.DEFAULT_EXPIRY_HOURS)
        },
        tags: [...tags, ...this.generateAutoTags(enrichment)]
      };

      // Add to region cache
      const regionId = this.getRegionId(latitude, longitude);
      await this.addToRegion(regionId, cacheEntry);

      // Store individual cache entry
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}:${cacheEntry.id}`,
        JSON.stringify(cacheEntry)
      );

      // Update statistics
      await this.updateCacheStats('story_cached');

      this.logger.info('Story cached successfully', {
        storyId: story.id,
        location: { latitude, longitude },
        region: regionId,
        tags: tags.length
      });

    } catch (error) {
      this.logger.error('Failed to cache story', { error, storyId: story.id });
      throw error;
    }
  }

  /**
   * Find stories near a specific location
   */
  async findNearbyStories(
    latitude: number,
    longitude: number,
    options: ProximitySearchOptions = { radius: 1000 }
  ): Promise<LocationStoryCache[]> {
    try {
      const regionIds = this.getSearchRegions(latitude, longitude, options.radius);
      const nearbyStories: LocationStoryCache[] = [];

      for (const regionId of regionIds) {
        const regionStories = await this.getStoriesInRegion(regionId);
        
        for (const story of regionStories) {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            story.location.latitude,
            story.location.longitude
          );

          if (distance <= options.radius) {
            // Update access metadata
            await this.updateAccess(story.id);
            nearbyStories.push(story);
          }
        }
      }

      // Filter and sort results
      let filteredStories = nearbyStories;

      if (!options.includeExpired) {
        filteredStories = filteredStories.filter(story => 
          new Date(story.metadata.expiresAt) > new Date()
        );
      }

      if (options.minPopularity !== undefined) {
        filteredStories = filteredStories.filter(story => 
          story.metadata.popularityScore >= options.minPopularity!
        );
      }

      if (options.maxAge) {
        const maxAgeMs = options.maxAge * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - maxAgeMs);
        filteredStories = filteredStories.filter(story => 
          new Date(story.metadata.cachedAt) > cutoff
        );
      }

      // Sort by distance and popularity
      filteredStories.sort((a, b) => {
        const distanceA = this.calculateDistance(latitude, longitude, a.location.latitude, a.location.longitude);
        const distanceB = this.calculateDistance(latitude, longitude, b.location.latitude, b.location.longitude);
        
        // Combine distance and popularity for ranking
        const rankA = distanceA / 100 - a.metadata.popularityScore;
        const rankB = distanceB / 100 - b.metadata.popularityScore;
        
        return rankA - rankB;
      });

      const results = options.limit ? filteredStories.slice(0, options.limit) : filteredStories;

      this.logger.info('Nearby stories found', {
        location: { latitude, longitude },
        radius: options.radius,
        found: results.length,
        totalSearched: nearbyStories.length
      });

      return results;

    } catch (error) {
      this.logger.error('Failed to find nearby stories', { error, latitude, longitude });
      return [];
    }
  }

  /**
   * Get cached story by ID
   */
  async getCachedStory(storyId: string): Promise<LocationStoryCache | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}:${storyId}`);
      if (cached) {
        const story: LocationStoryCache = JSON.parse(cached);
        
        // Check if expired
        if (new Date(story.metadata.expiresAt) < new Date()) {
          await this.removeCachedStory(storyId);
          return null;
        }

        // Update access
        await this.updateAccess(storyId);
        return story;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached story', { error, storyId });
      return null;
    }
  }

  /**
   * Pre-load stories for popular regions
   */
  async preloadPopularRegions(): Promise<void> {
    try {
      const popularRegions = await this.getPopularRegions();
      this.logger.info('Starting preload for popular regions', { count: popularRegions.length });

      for (const region of popularRegions) {
        // This would integrate with AI service to generate stories for popular locations
        // For now, we'll just update the region metadata
        await this.updateRegionPopularity(region.id);
      }

      this.logger.info('Popular regions preload completed');
    } catch (error) {
      this.logger.error('Failed to preload popular regions', { error });
    }
  }

  /**
   * Clean up expired stories
   */
  async cleanupExpiredStories(): Promise<number> {
    try {
      let cleanedCount = 0;
      const allKeys = await AsyncStorage.getAllKeys();
      const storyKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));

      for (const key of storyKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const story: LocationStoryCache = JSON.parse(cached);
            
            if (new Date(story.metadata.expiresAt) < new Date()) {
              await AsyncStorage.removeItem(key);
              await this.removeFromRegion(story.id);
              cleanedCount++;
            }
          }
        } catch (itemError) {
          // Remove corrupted entries
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }

      await this.updateCacheStats('cleanup', cleanedCount);

      this.logger.info('Cache cleanup completed', { cleaned: cleanedCount });
      return cleanedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup expired stories', { error });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const statsData = await AsyncStorage.getItem(this.STATS_KEY);
      const baseStats = statsData ? JSON.parse(statsData) : {
        totalStories: 0,
        totalRegions: 0,
        cacheSize: 0,
        hitRate: 0,
        averageAge: 0,
        popularRegions: [],
        recentStories: []
      };

      // Calculate current stats
      const allKeys = await AsyncStorage.getAllKeys();
      const storyKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let totalAge = 0;
      const recentStories: LocationStoryCache[] = [];

      for (const key of storyKeys.slice(0, 50)) { // Sample for performance
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            const story: LocationStoryCache = JSON.parse(cached);
            const ageHours = (Date.now() - new Date(story.metadata.cachedAt).getTime()) / (1000 * 60 * 60);
            totalAge += ageHours;
            
            if (recentStories.length < 10) {
              recentStories.push(story);
            }
          }
        } catch (itemError) {
          // Skip corrupted entries
        }
      }

      const stats: CacheStats = {
        ...baseStats,
        totalStories: storyKeys.length,
        cacheSize: totalSize,
        averageAge: storyKeys.length > 0 ? totalAge / storyKeys.length : 0,
        recentStories: recentStories.sort((a, b) => 
          new Date(b.metadata.cachedAt).getTime() - new Date(a.metadata.cachedAt).getTime()
        )
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get cache stats', { error });
      return {
        totalStories: 0,
        totalRegions: 0,
        cacheSize: 0,
        hitRate: 0,
        averageAge: 0,
        popularRegions: [],
        recentStories: []
      };
    }
  }

  /**
   * Clear all cached stories
   */
  async clearCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) || 
        key.startsWith(this.REGION_PREFIX) ||
        key === this.STATS_KEY
      );

      await AsyncStorage.multiRemove(cacheKeys);
      
      this.logger.info('Cache cleared successfully', { removedKeys: cacheKeys.length });

    } catch (error) {
      this.logger.error('Failed to clear cache', { error });
      throw error;
    }
  }

  // Private helper methods

  private generateCacheId(latitude: number, longitude: number, storyId: string): string {
    const latRounded = latitude.toFixed(4);
    const lonRounded = longitude.toFixed(4);
    return `${latRounded}_${lonRounded}_${storyId}`;
  }

  private getRegionId(latitude: number, longitude: number): string {
    const latGrid = Math.floor(latitude / this.REGION_SIZE);
    const lonGrid = Math.floor(longitude / this.REGION_SIZE);
    return `region_${latGrid}_${lonGrid}`;
  }

  private getSearchRegions(latitude: number, longitude: number, radius: number): string[] {
    const regionRadius = Math.ceil(radius / (this.REGION_SIZE * 111000)); // approximate meters per degree
    const regions: string[] = [];

    const centerLatGrid = Math.floor(latitude / this.REGION_SIZE);
    const centerLonGrid = Math.floor(longitude / this.REGION_SIZE);

    for (let latOffset = -regionRadius; latOffset <= regionRadius; latOffset++) {
      for (let lonOffset = -regionRadius; lonOffset <= regionRadius; lonOffset++) {
        regions.push(`region_${centerLatGrid + latOffset}_${centerLonGrid + lonOffset}`);
      }
    }

    return regions;
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

  private calculateInitialPopularity(enrichment: LocationEnrichment): number {
    let score = 1.0;

    // Boost for well-known places
    if (enrichment.nearbyPlaces.length > 0) {
      score += enrichment.nearbyPlaces.length * 0.2;
    }

    // Boost for cultural/historical significance
    if (enrichment.historicalContext.length > 50) {
      score += 0.5;
    }

    // Regional boosts
    const popularCounties = ['Oslo', 'Vestland', 'Trøndelag'];
    if (popularCounties.includes(enrichment.region.county)) {
      score += 1.0;
    }

    return Math.min(score, 10.0); // Cap at 10
  }

  private calculateExpiryDate(hours: number): string {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  private generateAutoTags(enrichment: LocationEnrichment): string[] {
    const tags: string[] = [];
    
    tags.push(enrichment.region.county.toLowerCase());
    tags.push(enrichment.region.municipality.toLowerCase());
    
    // Add landmark tags
    for (const place of enrichment.nearbyPlaces) {
      tags.push(place.toLowerCase().replace(/\s+/g, '_'));
    }

    // Add terminology tags
    for (const term of enrichment.localTerminology.slice(0, 3)) {
      tags.push(term);
    }

    return tags;
  }

  private async addToRegion(regionId: string, story: LocationStoryCache): Promise<void> {
    try {
      const regionKey = `${this.REGION_PREFIX}:${regionId}`;
      const regionData = await AsyncStorage.getItem(regionKey);
      
      let region: CacheRegion;
      if (regionData) {
        region = JSON.parse(regionData);
      } else {
        region = this.createNewRegion(regionId, story.location.latitude, story.location.longitude);
      }

      // Add story and maintain size limit
      region.stories.push(story);
      if (region.stories.length > this.MAX_STORIES_PER_REGION) {
        // Remove oldest stories first
        region.stories.sort((a, b) => 
          new Date(a.metadata.cachedAt).getTime() - new Date(b.metadata.cachedAt).getTime()
        );
        region.stories = region.stories.slice(-this.MAX_STORIES_PER_REGION);
      }

      region.metadata.lastUpdated = new Date().toISOString();
      region.metadata.storyCount = region.stories.length;

      await AsyncStorage.setItem(regionKey, JSON.stringify(region));

    } catch (error) {
      this.logger.error('Failed to add story to region', { error, regionId });
    }
  }

  private createNewRegion(regionId: string, latitude: number, longitude: number): CacheRegion {
    return {
      id: regionId,
      name: `Region ${regionId}`,
      bounds: {
        north: latitude + this.REGION_SIZE / 2,
        south: latitude - this.REGION_SIZE / 2,
        east: longitude + this.REGION_SIZE / 2,
        west: longitude - this.REGION_SIZE / 2
      },
      center: { latitude, longitude },
      stories: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        popularityScore: 0,
        storyCount: 0
      }
    };
  }

  private async getStoriesInRegion(regionId: string): Promise<LocationStoryCache[]> {
    try {
      const regionData = await AsyncStorage.getItem(`${this.REGION_PREFIX}:${regionId}`);
      if (regionData) {
        const region: CacheRegion = JSON.parse(regionData);
        return region.stories;
      }
      return [];
    } catch (error) {
      this.logger.error('Failed to get stories in region', { error, regionId });
      return [];
    }
  }

  private async updateAccess(storyId: string): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}:${storyId}`);
      if (cached) {
        const story: LocationStoryCache = JSON.parse(cached);
        story.metadata.lastAccessed = new Date().toISOString();
        story.metadata.accessCount++;
        story.metadata.popularityScore += 0.1;

        await AsyncStorage.setItem(`${this.CACHE_PREFIX}:${storyId}`, JSON.stringify(story));
      }
    } catch (error) {
      this.logger.error('Failed to update access', { error, storyId });
    }
  }

  private async removeCachedStory(storyId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}:${storyId}`);
      await this.removeFromRegion(storyId);
    } catch (error) {
      this.logger.error('Failed to remove cached story', { error, storyId });
    }
  }

  private async removeFromRegion(storyId: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const regionKeys = allKeys.filter(key => key.startsWith(this.REGION_PREFIX));

      for (const regionKey of regionKeys) {
        const regionData = await AsyncStorage.getItem(regionKey);
        if (regionData) {
          const region: CacheRegion = JSON.parse(regionData);
          const originalLength = region.stories.length;
          region.stories = region.stories.filter(story => story.id !== storyId);
          
          if (region.stories.length !== originalLength) {
            region.metadata.storyCount = region.stories.length;
            region.metadata.lastUpdated = new Date().toISOString();
            await AsyncStorage.setItem(regionKey, JSON.stringify(region));
            break;
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to remove story from region', { error, storyId });
    }
  }

  private async getPopularRegions(): Promise<CacheRegion[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const regionKeys = allKeys.filter(key => key.startsWith(this.REGION_PREFIX));
      const regions: CacheRegion[] = [];

      for (const regionKey of regionKeys) {
        const regionData = await AsyncStorage.getItem(regionKey);
        if (regionData) {
          regions.push(JSON.parse(regionData));
        }
      }

      return regions.sort((a, b) => b.metadata.popularityScore - a.metadata.popularityScore);

    } catch (error) {
      this.logger.error('Failed to get popular regions', { error });
      return [];
    }
  }

  private async updateRegionPopularity(regionId: string): Promise<void> {
    try {
      const regionKey = `${this.REGION_PREFIX}:${regionId}`;
      const regionData = await AsyncStorage.getItem(regionKey);
      
      if (regionData) {
        const region: CacheRegion = JSON.parse(regionData);
        region.metadata.popularityScore += 1;
        region.metadata.lastUpdated = new Date().toISOString();
        await AsyncStorage.setItem(regionKey, JSON.stringify(region));
      }
    } catch (error) {
      this.logger.error('Failed to update region popularity', { error, regionId });
    }
  }

  private async updateCacheStats(operation: string, value?: number): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(this.STATS_KEY);
      const stats = statsData ? JSON.parse(statsData) : { operations: {} };
      
      if (!stats.operations) stats.operations = {};
      if (!stats.operations[operation]) stats.operations[operation] = 0;
      
      stats.operations[operation] += value || 1;
      stats.lastUpdated = new Date().toISOString();

      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      this.logger.error('Failed to update cache stats', { error });
    }
  }
}

// Export singleton instance
export const locationStoryCacheService = new LocationBasedStoryCacheService();
export default locationStoryCacheService;