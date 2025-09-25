/**
 * Cache Strategy Types and Interfaces
 * Shared types for the cache strategy pattern implementation
 */

export interface CacheEntry {
  key: string;
  value: string;
  metadata: {
    timestamp: number;
    size: number;
    dependencies: string[];
    version: string;
    platform?: string;
    environment?: string;
    checksum: string;
    accessCount: number;
    lastAccessed: number;
  };
}

export interface CacheConfig {
  enabled: boolean;
  levels: {
    memory: {
      enabled: boolean;
      maxSize: number;
      maxEntries: number;
      ttl: number;
    };
    filesystem: {
      enabled: boolean;
      path: string;
      maxSize: number;
      compression: boolean;
      ttl: number;
    };
    redis: {
      enabled: boolean;
      host: string;
      port: number;
      password?: string;
      database: number;
      ttl: number;
      keyPrefix: string;
    };
  };
  invalidation: {
    watchFiles: boolean;
    watchDirectories: string[];
    dependencyTracking: boolean;
    checksumValidation: boolean;
  };
  warming: {
    enabled: boolean;
    preloadPatterns: string[];
    maxConcurrency: number;
  };
  analytics: {
    enabled: boolean;
    reportInterval: number;
    trackMetrics: boolean;
  };
  garbage_collection: {
    enabled: boolean;
    interval: number;
    maxAge: number;
    maxSize: number;
  };
}

export interface CacheStats {
  hits: {
    memory: number;
    filesystem: number;
    redis: number;
    total: number;
  };
  misses: number;
  evictions: number;
  size: {
    memory: number;
    filesystem: number;
    redis: number;
    total: number;
  };
  entries: {
    memory: number;
    filesystem: number;
    redis: number;
    total: number;
  };
  hitRate: number;
  averageAccessTime: number;
  invalidations: number;
}

export interface CacheWarmingJob {
  pattern: string;
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

/**
 * Base Cache Strategy Interface
 * All cache implementations must implement this interface
 */
export interface CacheStrategy {
  get(_key: string): Promise<CacheEntry | null>;
  set(_key: string, _entry: CacheEntry): Promise<void>;
  delete(_key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): Promise<Partial<CacheStats>>;
}

/**
 * Extended Cache Strategy Interface for strategies that support cleanup
 */
export interface CleanableCacheStrategy extends CacheStrategy {
  cleanup(_maxAge: number, _maxSize: number): Promise<void>;
}
