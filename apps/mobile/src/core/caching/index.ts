/**
 * Cache Module Exports
 * Centralized exports for the modular cache system
 */

// Main cache manager
export { MetroCacheManager } from './MetroCacheManager';

// Strategy implementations
export { MemoryCacheStrategy } from './strategies/MemoryCacheStrategy';
export { FileSystemCacheStrategy } from './strategies/FileSystemCacheStrategy';
export { RedisCacheStrategy } from './strategies/RedisCacheStrategy';

// Types and interfaces
export type {
  CacheEntry,
  CacheConfig,
  CacheStats,
  CacheWarmingJob,
  CacheStrategy,
  CleanableCacheStrategy,
} from './types';