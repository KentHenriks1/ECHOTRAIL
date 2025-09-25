/**
 * Memory Cache Strategy
 * LRU-based in-memory caching with size and TTL limits
 */

import { CacheStrategy, CacheEntry, CacheConfig, CacheStats } from '../types';

export class MemoryCacheStrategy implements CacheStrategy {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Set<string>();
  private config: CacheConfig['levels']['memory'];

  constructor(config: CacheConfig['levels']['memory']) {
    this.config = config;
  }

  async get(key: string): Promise<CacheEntry | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.metadata.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access tracking
    entry.metadata.lastAccessed = Date.now();
    entry.metadata.accessCount++;

    // Update LRU order
    this.accessOrder.delete(key);
    this.accessOrder.add(key);

    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    if (!this.config.enabled) return;

    // Check size limits
    while (this.cache.size >= this.config.maxEntries) {
      await this.evictLRU();
    }

    // Check memory size limit
    const entrySize = Buffer.byteLength(entry.value, 'utf8');
    while (this.getCurrentSize() + entrySize > this.config.maxSize) {
      await this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.add(key);
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
  }

  async getStats(): Promise<Partial<CacheStats>> {
    const size = this.getCurrentSize();
    const entries = this.cache.size;

    return {
      size: { 
        memory: size, 
        filesystem: 0, 
        redis: 0, 
        total: size 
      },
      entries: { 
        memory: entries, 
        filesystem: 0, 
        redis: 0, 
        total: entries 
      },
    };
  }

  private async evictLRU(): Promise<void> {
    const oldestKey = this.accessOrder.values().next().value;
    if (oldestKey) {
      await this.delete(oldestKey);
    }
  }

  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += Buffer.byteLength(entry.value, 'utf8');
    }
    return size;
  }

  /**
   * Get the number of entries in the cache
   */
  getEntryCount(): number {
    return this.cache.size;
  }

  /**
   * Check if the cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}