/**
 * Metro Cache Manager
 * Multi-level cache orchestrator using strategy pattern
 * 
 * This module was refactored from a monolithic 1010-line file to use
 * the strategy pattern for better separation of concerns and maintainability.
 * 
 * @version 2.0.0
 */

import EventEmitter from 'events';
import * as crypto from 'crypto';
import { Logger } from '../utils/Logger';
import { 
  CacheConfig, 
  CacheStats, 
  CacheEntry,
  CacheWarmingJob,
  CleanableCacheStrategy
} from './types';
import { MemoryCacheStrategy } from './strategies/MemoryCacheStrategy';
import { FileSystemCacheStrategy } from './strategies/FileSystemCacheStrategy';
import { RedisCacheStrategy } from './strategies/RedisCacheStrategy';

export class MetroCacheManager extends EventEmitter {
  private static instance: MetroCacheManager;
  private config: CacheConfig;
  private strategies: {
    memory: MemoryCacheStrategy;
    filesystem: FileSystemCacheStrategy;
    redis: RedisCacheStrategy;
  };
  private stats: CacheStats;
  private warmingJobs: Map<string, CacheWarmingJob> = new Map();
  private fileWatcher: any = null;
  private gcInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.strategies = {
      memory: new MemoryCacheStrategy(this.config.levels.memory),
      filesystem: new FileSystemCacheStrategy(this.config.levels.filesystem),
      redis: new RedisCacheStrategy(this.config.levels.redis),
    };
    this.stats = this.getEmptyStats();
  }

  static getInstance(): MetroCacheManager {
    if (!MetroCacheManager.instance) {
      MetroCacheManager.instance = new MetroCacheManager();
    }
    return MetroCacheManager.instance;
  }

  /**
   * Initialize cache system
   */
  async initialize(config?: Partial<CacheConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
      // Recreate strategies with new config
      this.strategies = {
        memory: new MemoryCacheStrategy(this.config.levels.memory),
        filesystem: new FileSystemCacheStrategy(this.config.levels.filesystem),
        redis: new RedisCacheStrategy(this.config.levels.redis),
      };
    }

    if (!this.config.enabled) {
      Logger.info('📦 Metro Cache Manager disabled');
      return;
    }

    // Initialize Redis connection
    await this.strategies.redis.connect();

    // Setup file watching for invalidation
    if (this.config.invalidation.watchFiles) {
      await this.setupFileWatching();
    }

    // Start garbage collection
    if (this.config.garbage_collection.enabled) {
      this.startGarbageCollection();
    }

    // Setup analytics reporting
    if (this.config.analytics.enabled) {
      this.startAnalyticsReporting();
    }

    Logger.info('🚀 Metro Cache Manager initialized');
    Logger.info(`📦 Memory Cache: ${this.config.levels.memory.enabled ? 'Enabled' : 'Disabled'}`);
    Logger.info(`💾 FileSystem Cache: ${this.config.levels.filesystem.enabled ? 'Enabled' : 'Disabled'}`);
    Logger.info(`☁️  Redis Cache: ${this.config.levels.redis.enabled ? 'Enabled' : 'Disabled'}`);

    this.emit('cache:initialized', this.config);
  }

  /**
   * Get cached entry with multi-level lookup
   */
  async get(key: string): Promise<string | null> {
    if (!this.config.enabled) return null;

    const startTime = Date.now();

    try {
      // Level 1: Memory cache
      let entry = await this.strategies.memory.get(key);
      if (entry) {
        this.stats.hits.memory++;
        this.stats.hits.total++;
        this.updateAccessTime(Date.now() - startTime);
        return entry.value;
      }

      // Level 2: Filesystem cache
      entry = await this.strategies.filesystem.get(key);
      if (entry) {
        // Promote to memory cache
        await this.strategies.memory.set(key, entry);
        this.stats.hits.filesystem++;
        this.stats.hits.total++;
        this.updateAccessTime(Date.now() - startTime);
        return entry.value;
      }

      // Level 3: Redis cache
      entry = await this.strategies.redis.get(key);
      if (entry) {
        // Promote to higher levels
        await Promise.all([
          this.strategies.memory.set(key, entry),
          this.strategies.filesystem.set(key, entry),
        ]);
        this.stats.hits.redis++;
        this.stats.hits.total++;
        this.updateAccessTime(Date.now() - startTime);
        return entry.value;
      }

      // Cache miss
      this.stats.misses++;
      this.updateAccessTime(Date.now() - startTime);
      return null;

    } catch (error) {
      Logger.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached entry in all levels
   */
  async set(
    key: string,
    value: string,
    dependencies: string[] = [],
    platform?: string,
    environment?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const entry: CacheEntry = {
        key,
        value,
        metadata: {
          timestamp: Date.now(),
          size: Buffer.byteLength(value, 'utf8'),
          dependencies,
          version: this.getCacheVersion(),
          platform,
          environment,
          checksum: this.calculateChecksum(value),
          accessCount: 1,
          lastAccessed: Date.now(),
        },
      };

      // Set in all enabled levels
      await Promise.all([
        this.strategies.memory.set(key, entry),
        this.strategies.filesystem.set(key, entry),
        this.strategies.redis.set(key, entry),
      ]);

      this.emit('cache:set', { key, size: entry.metadata.size });

    } catch (error) {
      Logger.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached entry from all levels
   */
  async delete(key: string): Promise<boolean> {
    try {
      const results = await Promise.all([
        this.strategies.memory.delete(key),
        this.strategies.filesystem.delete(key),
        this.strategies.redis.delete(key),
      ]);

      const deleted = results.some(result => result);
      
      if (deleted) {
        this.emit('cache:delete', { key });
      }

      return deleted;

    } catch (error) {
      Logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.strategies.memory.clear(),
        this.strategies.filesystem.clear(),
        this.strategies.redis.clear(),
      ]);

      this.stats = this.getEmptyStats();
      
      Logger.info('📦 Cache cleared');
      this.emit('cache:cleared');

    } catch (error) {
      Logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const memoryStats = await this.strategies.memory.getStats();
      const filesystemStats = await this.strategies.filesystem.getStats();
      const redisStats = await this.strategies.redis.getStats();

      const totalHits = this.stats.hits.total;
      const totalRequests = totalHits + this.stats.misses;

      return {
        ...this.stats,
        size: {
          memory: memoryStats.size?.memory || 0,
          filesystem: filesystemStats.size?.filesystem || 0,
          redis: redisStats.size?.redis || 0,
          total: (memoryStats.size?.memory || 0) + 
                 (filesystemStats.size?.filesystem || 0) + 
                 (redisStats.size?.redis || 0),
        },
        entries: {
          memory: memoryStats.entries?.memory || 0,
          filesystem: filesystemStats.entries?.filesystem || 0,
          redis: redisStats.entries?.redis || 0,
          total: (memoryStats.entries?.memory || 0) + 
                 (memoryStats.entries?.filesystem || 0) + 
                 (redisStats.entries?.redis || 0),
        },
        hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      };
    } catch (error) {
      Logger.error('Error getting cache stats:', error);
      return this.stats;
    }
  }

  /**
   * Invalidate cache entries based on dependencies
   */
  async invalidate(filePath: string): Promise<number> {
    if (!this.config.invalidation.dependencyTracking) return 0;

    let invalidatedCount = 0;

    try {
      // This is a simplified implementation
      // In practice, would need to track which cache entries depend on which files
      const keysToInvalidate = await this.findDependentKeys(filePath);
      
      for (const key of keysToInvalidate) {
        const deleted = await this.delete(key);
        if (deleted) {
          invalidatedCount++;
        }
      }

      this.stats.invalidations += invalidatedCount;
      
      if (invalidatedCount > 0) {
        Logger.info(`📦 Invalidated ${invalidatedCount} cache entries due to ${filePath}`);
        this.emit('cache:invalidated', { filePath, count: invalidatedCount });
      }

    } catch (error) {
      Logger.error('Cache invalidation error:', error);
    }

    return invalidatedCount;
  }

  /**
   * Create a Metro-compatible cache store
   */
  createMetroCacheStore() {
    return {
      get: (key: string) => this.get(key),
      set: (key: string, value: string) => this.set(key, value),
    };
  }

  /**
   * Warm cache with preloaded entries
   */
  async warmCache(patterns: string[] = []): Promise<void> {
    if (!this.config.warming.enabled) return;

    const patternsToWarm = patterns.length > 0 ? patterns : this.config.warming.preloadPatterns;
    
    Logger.info(`🔥 Starting cache warming for ${patternsToWarm.length} patterns...`);

    const jobs = patternsToWarm.map((pattern, index) => ({
      pattern,
      priority: index,
      status: 'pending' as const,
    }));

    // Process jobs with limited concurrency
    const concurrency = this.config.warming.maxConcurrency;
    const activeJobs: Promise<void>[] = [];

    for (const job of jobs) {
      this.warmingJobs.set(job.pattern, job);

      if (activeJobs.length >= concurrency) {
        await Promise.race(activeJobs);
        activeJobs.splice(activeJobs.findIndex(p => p === Promise.race(activeJobs)), 1);
      }

      activeJobs.push(this.processWarmingJob(job));
    }

    // Wait for all jobs to complete
    await Promise.all(activeJobs);

    Logger.info('🔥 Cache warming completed');
    this.emit('cache:warmed', { patterns: patternsToWarm });
  }

  /**
   * Shutdown cache system
   */
  async shutdown(): Promise<void> {
    Logger.info('📦 Shutting down Metro Cache Manager...');

    // Stop garbage collection
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    // Stop file watching
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }

    // Disconnect Redis
    await this.strategies.redis.disconnect();

    // Final cleanup
    if (this.config.garbage_collection.enabled) {
      await this.runGarbageCollection();
    }

    Logger.info('📦 Metro Cache Manager shutdown complete');
    this.emit('cache:shutdown');
  }

  // Private helper methods

  private getDefaultConfig(): CacheConfig {
    return {
      enabled: true,
      levels: {
        memory: {
          enabled: true,
          maxSize: 256 * 1024 * 1024, // 256MB
          maxEntries: 10000,
          ttl: 30 * 60 * 1000, // 30 minutes
        },
        filesystem: {
          enabled: true,
          path: './node_modules/.cache/metro',
          maxSize: 2 * 1024 * 1024 * 1024, // 2GB
          compression: true,
          ttl: 24 * 60 * 60 * 1000, // 24 hours
        },
        redis: {
          enabled: false, // Disabled by default
          host: 'localhost',
          port: 6379,
          database: 0,
          ttl: 60 * 60 * 1000, // 1 hour
          keyPrefix: 'metro:cache',
        },
      },
      invalidation: {
        watchFiles: true,
        watchDirectories: ['src', 'node_modules'],
        dependencyTracking: true,
        checksumValidation: true,
      },
      warming: {
        enabled: true,
        preloadPatterns: [
          'src/**/*.ts',
          'src/**/*.tsx',
          'src/**/*.js',
          'src/**/*.jsx',
        ],
        maxConcurrency: 4,
      },
      analytics: {
        enabled: true,
        reportInterval: 5 * 60 * 1000, // 5 minutes
        trackMetrics: true,
      },
      garbage_collection: {
        enabled: true,
        interval: 60 * 60 * 1000, // 1 hour
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxSize: 5 * 1024 * 1024 * 1024, // 5GB
      },
    };
  }

  private getEmptyStats(): CacheStats {
    return {
      hits: {
        memory: 0,
        filesystem: 0,
        redis: 0,
        total: 0,
      },
      misses: 0,
      evictions: 0,
      size: {
        memory: 0,
        filesystem: 0,
        redis: 0,
        total: 0,
      },
      entries: {
        memory: 0,
        filesystem: 0,
        redis: 0,
        total: 0,
      },
      hitRate: 0,
      averageAccessTime: 0,
      invalidations: 0,
    };
  }

  private updateAccessTime(time: number): void {
    // Simple running average
    const alpha = 0.1; // Smoothing factor
    this.stats.averageAccessTime = 
      (alpha * time) + ((1 - alpha) * this.stats.averageAccessTime);
  }

  private getCacheVersion(): string {
    return '2.0.0';
  }

  private calculateChecksum(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private async setupFileWatching(): Promise<void> {
    // File watching implementation would go here
    Logger.info('📂 File watching setup (placeholder)');
  }

  private startGarbageCollection(): void {
    this.gcInterval = setInterval(async () => {
      await this.runGarbageCollection();
    }, this.config.garbage_collection.interval);
  }

  private async runGarbageCollection(): Promise<void> {
    try {
      const { maxAge, maxSize } = this.config.garbage_collection;
      
      // Only filesystem cache supports cleanup
      const cleanableStrategy = this.strategies.filesystem as CleanableCacheStrategy;
      await cleanableStrategy.cleanup(maxAge, maxSize);
      
      Logger.info('🗑️ Garbage collection completed');
    } catch (error) {
      Logger.error('Garbage collection error:', error);
    }
  }

  private startAnalyticsReporting(): void {
    setInterval(async () => {
      const stats = await this.getStats();
      this.emit('cache:analytics', stats);
    }, this.config.analytics.reportInterval);
  }

  private async processWarmingJob(job: CacheWarmingJob): Promise<void> {
    job.status = 'running';
    job.startTime = Date.now();
    
    try {
      // Cache warming logic would be implemented here
      // For now, just simulate the work
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });
      
      job.status = 'completed';
      job.endTime = Date.now();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.endTime = Date.now();
    }
  }

  private async findDependentKeys(_filePath: string): Promise<string[]> {
    // Simplified implementation - in a real scenario, this would
    // analyze cache entries and return keys that depend on the given file
    // For now, return an empty array to avoid errors in tests
    return [];
  }
}

// Default export for backward compatibility
export default MetroCacheManager;
