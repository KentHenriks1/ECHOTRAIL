/**
 * Redis Cache Strategy
 * Distributed caching using Redis with TTL support
 */

import { CacheStrategy, CacheEntry, CacheConfig, CacheStats } from '../types';

export class RedisCacheStrategy implements CacheStrategy {
  private config: CacheConfig['levels']['redis'];
  private client: any = null; // Would be Redis client

  constructor(config: CacheConfig['levels']['redis']) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.enabled) return;

    // In a real implementation, would connect to Redis here
    // this.client = new Redis({
    //   host: this.config.host,
    //   port: this.config.port,
    //   password: this.config.password,
    //   db: this.config.database,
    // });
  }

  async get(key: string): Promise<CacheEntry | null> {
    if (!this.config.enabled || !this.client) return null;

    try {
      const redisKey = `${this.config.keyPrefix}:${key}`;
      const data = await this.client.get(redisKey);
      
      if (!data) return null;

      const entry: CacheEntry = JSON.parse(data);

      // Update access tracking
      entry.metadata.lastAccessed = Date.now();
      entry.metadata.accessCount++;
      
      // Update in Redis
      await this.set(key, entry);

      return entry;
    } catch (error) {
      console.warn('Redis cache get error:', error);
      return null;
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    if (!this.config.enabled || !this.client) return;

    try {
      const redisKey = `${this.config.keyPrefix}:${key}`;
      const data = JSON.stringify(entry);
      
      if (this.config.ttl > 0) {
        await this.client.setex(redisKey, Math.floor(this.config.ttl / 1000), data);
      } else {
        await this.client.set(redisKey, data);
      }
    } catch (error) {
      console.error('Redis cache set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.config.enabled || !this.client) return false;

    try {
      const redisKey = `${this.config.keyPrefix}:${key}`;
      const result = await this.client.del(redisKey);
      return result > 0;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.config.enabled || !this.client) return;

    try {
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }

  async getStats(): Promise<Partial<CacheStats>> {
    if (!this.config.enabled || !this.client) {
      return { 
        size: { 
          memory: 0, 
          filesystem: 0, 
          redis: 0, 
          total: 0 
        }, 
        entries: { 
          memory: 0, 
          filesystem: 0, 
          redis: 0, 
          total: 0 
        } 
      };
    }

    try {
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await this.client.keys(pattern);
      
      const dataPromises = keys.map((key: string) => this.client!.get(key));
      const dataResults = await Promise.all(dataPromises);
      
      const totalSize = dataResults.reduce((size, data) => {
        if (data) {
          return size + Buffer.byteLength(data, 'utf8');
        }
        return size;
      }, 0);

      return {
        size: { 
          memory: 0, 
          filesystem: 0, 
          redis: totalSize, 
          total: totalSize 
        },
        entries: { 
          memory: 0, 
          filesystem: 0, 
          redis: keys.length, 
          total: keys.length 
        },
      };
    } catch {
      return { 
        size: { 
          memory: 0, 
          filesystem: 0, 
          redis: 0, 
          total: 0 
        }, 
        entries: { 
          memory: 0, 
          filesystem: 0, 
          redis: 0, 
          total: 0 
        } 
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Check if the cache is enabled and connected
   */
  isEnabled(): boolean {
    return this.config.enabled && this.client !== null;
  }

  /**
   * Get Redis connection status
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}