/**
 * Story Cache Service for EchoTrail
 * Handles local storage and offline capabilities for AI-generated stories
 * Created by: Kent Rune Henriksen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Logger } from '../../core/utils';
import type { GeneratedStory, LocationContext, UserPreferences } from './OpenAIService';

export interface CachedStory extends GeneratedStory {
  cacheId: string;
  locationId: string;
  preferences: UserPreferences;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  localAudioPath?: string;
  fileSize: number;
}

export interface StoryCache {
  stories: Record<string, CachedStory>;
  metadata: {
    totalSize: number;
    lastCleanup: string;
    version: string;
  };
}

export interface CacheConfig {
  maxCacheSize: number; // MB
  maxStories: number;
  maxAge: number; // days
  cleanupThreshold: number; // MB
}

export class StoryCacheService {
  private readonly logger: Logger;
  private readonly config: CacheConfig;
  private readonly cacheDir: string;
  private readonly metadataKey = '@echotrail_story_cache';

  constructor() {
    this.logger = new Logger('StoryCacheService');
    this.config = {
      maxCacheSize: 50, // 50MB
      maxStories: 100,
      maxAge: 30, // 30 days
      cleanupThreshold: 40, // Cleanup when 40MB reached
    };
    this.cacheDir = `${FileSystem.documentDirectory}story_cache/`;
    
    this.ensureCacheDirectoryExists();
  }

  /**
   * Cache a generated story with audio
   */
  async cacheStory(
    story: GeneratedStory,
    location: LocationContext,
    preferences: UserPreferences
  ): Promise<string> {
    try {
      const cacheId = this.generateCacheId(location, preferences);
      const locationId = this.generateLocationId(location);
      
      // Download and cache audio if available
      let localAudioPath: string | undefined;
      let audioFileSize = 0;
      
      if (story.audioUrl) {
        try {
          localAudioPath = await this.cacheAudioFile(cacheId, story.audioUrl);
          const fileInfo = await FileSystem.getInfoAsync(localAudioPath);
          audioFileSize = fileInfo.exists ? fileInfo.size || 0 : 0;
          
          this.logger.info('Audio cached locally', {
            cacheId,
            localPath: localAudioPath,
            sizeKB: Math.round(audioFileSize / 1024)
          });
        } catch (audioError) {
          this.logger.warn('Failed to cache audio, story will be cached without audio', {
            error: audioError,
            cacheId
          });
        }
      }

      const cachedStory: CachedStory = {
        ...story,
        cacheId,
        locationId,
        preferences,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 1,
        localAudioPath,
        fileSize: this.estimateStorySize(story) + audioFileSize,
      };

      await this.saveCachedStory(cachedStory);
      
      // Cleanup if needed
      await this.cleanupIfNeeded();
      
      this.logger.info('Story cached successfully', {
        cacheId,
        hasAudio: !!localAudioPath,
        sizeKB: Math.round(cachedStory.fileSize / 1024)
      });

      return cacheId;
    } catch (error) {
      this.logger.error('Failed to cache story', { error, location: location.address });
      throw error;
    }
  }

  /**
   * Retrieve cached story
   */
  async getCachedStory(
    location: LocationContext,
    preferences: UserPreferences
  ): Promise<CachedStory | null> {
    try {
      const cacheId = this.generateCacheId(location, preferences);
      const cache = await this.loadCache();
      const story = cache.stories[cacheId];
      
      if (!story) {
        return null;
      }

      // Check if story is expired
      const ageInDays = this.getAgeInDays(story.createdAt);
      if (ageInDays > this.config.maxAge) {
        await this.removeCachedStory(cacheId);
        return null;
      }

      // Update access metadata
      story.lastAccessed = new Date().toISOString();
      story.accessCount++;
      await this.saveCachedStory(story);

      this.logger.info('Story retrieved from cache', {
        cacheId,
        ageInDays,
        accessCount: story.accessCount
      });

      return story;
    } catch (error) {
      this.logger.error('Failed to get cached story', { error });
      return null;
    }
  }

  /**
   * Get stories for a specific location (regardless of preferences)
   */
  async getCachedStoriesForLocation(location: LocationContext): Promise<CachedStory[]> {
    try {
      const locationId = this.generateLocationId(location);
      const cache = await this.loadCache();
      
      return Object.values(cache.stories)
        .filter(story => story.locationId === locationId)
        .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
    } catch (error) {
      this.logger.error('Failed to get cached stories for location', { error });
      return [];
    }
  }

  /**
   * Get all cached stories with metadata
   */
  async getAllCachedStories(): Promise<{
    stories: CachedStory[];
    totalSize: number;
    count: number;
  }> {
    try {
      const cache = await this.loadCache();
      const stories = Object.values(cache.stories);
      
      return {
        stories: stories.sort((a, b) => 
          new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
        ),
        totalSize: cache.metadata.totalSize,
        count: stories.length
      };
    } catch (error) {
      this.logger.error('Failed to get all cached stories', { error });
      return { stories: [], totalSize: 0, count: 0 };
    }
  }

  /**
   * Remove specific cached story
   */
  async removeCachedStory(cacheId: string): Promise<void> {
    try {
      const cache = await this.loadCache();
      const story = cache.stories[cacheId];
      
      if (!story) return;

      // Remove audio file if exists
      if (story.localAudioPath) {
        try {
          await FileSystem.deleteAsync(story.localAudioPath, { idempotent: true });
        } catch (audioError) {
          this.logger.warn('Failed to delete audio file', { 
            error: audioError, 
            path: story.localAudioPath 
          });
        }
      }

      // Remove from cache
      delete cache.stories[cacheId];
      cache.metadata.totalSize -= story.fileSize;
      
      await this.saveCache(cache);
      
      this.logger.info('Story removed from cache', { cacheId });
    } catch (error) {
      this.logger.error('Failed to remove cached story', { error, cacheId });
    }
  }

  /**
   * Clear all cached stories
   */
  async clearCache(): Promise<void> {
    try {
      // Remove all audio files
      try {
        await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
        await this.ensureCacheDirectoryExists();
      } catch (fsError) {
        this.logger.warn('Failed to delete cache directory', { error: fsError });
      }

      // Clear metadata
      await AsyncStorage.removeItem(this.metadataKey);
      
      this.logger.info('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalStories: number;
    totalSize: number; // bytes
    oldestStory: string | null;
    newestStory: string | null;
    mostAccessedStory: CachedStory | null;
  }> {
    try {
      const cache = await this.loadCache();
      const stories = Object.values(cache.stories);
      
      if (stories.length === 0) {
        return {
          totalStories: 0,
          totalSize: 0,
          oldestStory: null,
          newestStory: null,
          mostAccessedStory: null
        };
      }

      const sortedByDate = stories.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const mostAccessed = stories.reduce((prev, current) => 
        current.accessCount > prev.accessCount ? current : prev
      );

      return {
        totalStories: stories.length,
        totalSize: cache.metadata.totalSize,
        oldestStory: sortedByDate[0]?.createdAt || null,
        newestStory: sortedByDate[sortedByDate.length - 1]?.createdAt || null,
        mostAccessedStory: mostAccessed
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', { error });
      return {
        totalStories: 0,
        totalSize: 0,
        oldestStory: null,
        newestStory: null,
        mostAccessedStory: null
      };
    }
  }

  /**
   * Private methods
   */
  
  private generateCacheId(location: LocationContext, preferences: UserPreferences): string {
    const locationStr = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const prefsStr = `${preferences.language}-${preferences.storyLength}-${preferences.voiceStyle}`;
    const interestsStr = preferences.interests.sort().join(',');
    
    return `${locationStr}_${prefsStr}_${interestsStr}`.replace(/[^a-zA-Z0-9,.-]/g, '_');
  }

  private generateLocationId(location: LocationContext): string {
    return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  }

  private async cacheAudioFile(cacheId: string, audioUrl: string): Promise<string> {
    const audioFileName = `${cacheId}_audio.mp3`;
    const localPath = `${this.cacheDir}${audioFileName}`;
    
    const downloadResult = await FileSystem.downloadAsync(audioUrl, localPath);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download audio: ${downloadResult.status}`);
    }
    
    return localPath;
  }

  private async ensureCacheDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
    } catch (error) {
      this.logger.warn('Failed to create cache directory', { error });
    }
  }

  private async loadCache(): Promise<StoryCache> {
    try {
      const cacheData = await AsyncStorage.getItem(this.metadataKey);
      if (cacheData) {
        return JSON.parse(cacheData);
      }
    } catch (error) {
      this.logger.warn('Failed to load cache metadata', { error });
    }

    return {
      stories: {},
      metadata: {
        totalSize: 0,
        lastCleanup: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  private async saveCache(cache: StoryCache): Promise<void> {
    try {
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(cache));
    } catch (error) {
      this.logger.error('Failed to save cache metadata', { error });
    }
  }

  private async saveCachedStory(story: CachedStory): Promise<void> {
    const cache = await this.loadCache();
    const oldStory = cache.stories[story.cacheId];
    
    cache.stories[story.cacheId] = story;
    
    // Update total size
    if (oldStory) {
      cache.metadata.totalSize = cache.metadata.totalSize - oldStory.fileSize + story.fileSize;
    } else {
      cache.metadata.totalSize += story.fileSize;
    }
    
    await this.saveCache(cache);
  }

  private async cleanupIfNeeded(): Promise<void> {
    const cache = await this.loadCache();
    const sizeMB = cache.metadata.totalSize / (1024 * 1024);
    
    if (sizeMB > this.config.cleanupThreshold || 
        Object.keys(cache.stories).length > this.config.maxStories) {
      await this.performCleanup(cache);
    }
  }

  private async performCleanup(cache: StoryCache): Promise<void> {
    const stories = Object.values(cache.stories);
    const now = new Date();

    // Remove expired stories first
    const validStories = stories.filter(story => {
      const age = this.getAgeInDays(story.createdAt);
      return age <= this.config.maxAge;
    });

    // If still over limits, remove least accessed stories
    if (validStories.length > this.config.maxStories * 0.8) {
      validStories.sort((a, b) => a.accessCount - b.accessCount);
      const toKeep = validStories.slice(0, Math.floor(this.config.maxStories * 0.8));
      
      // Remove files for stories we're discarding
      const toRemove = validStories.slice(Math.floor(this.config.maxStories * 0.8));
      for (const story of toRemove) {
        if (story.localAudioPath) {
          try {
            await FileSystem.deleteAsync(story.localAudioPath, { idempotent: true });
          } catch (error) {
            this.logger.warn('Failed to delete audio during cleanup', { error });
          }
        }
      }

      // Update cache
      cache.stories = {};
      let totalSize = 0;
      for (const story of toKeep) {
        cache.stories[story.cacheId] = story;
        totalSize += story.fileSize;
      }
      cache.metadata.totalSize = totalSize;
    }

    cache.metadata.lastCleanup = now.toISOString();
    await this.saveCache(cache);
    
    this.logger.info('Cache cleanup completed', {
      storiesRemaining: Object.keys(cache.stories).length,
      totalSizeMB: Math.round(cache.metadata.totalSize / (1024 * 1024) * 100) / 100
    });
  }

  private estimateStorySize(story: GeneratedStory): number {
    // Rough estimate: title + content + metadata in bytes
    const textSize = new Blob([JSON.stringify(story)]).size;
    return textSize;
  }

  private getAgeInDays(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const storyCacheService = new StoryCacheService();
export default storyCacheService;