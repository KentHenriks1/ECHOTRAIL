/**
 * FileSystem Cache Strategy
 * Persistent disk-based caching with compression support
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { CleanableCacheStrategy, CacheEntry, CacheConfig, CacheStats } from '../types';

export class FileSystemCacheStrategy implements CleanableCacheStrategy {
  private config: CacheConfig['levels']['filesystem'];
  private gzip = promisify(zlib.gzip);
  private gunzip = promisify(zlib.gunzip);

  constructor(config: CacheConfig['levels']['filesystem']) {
    this.config = config;
  }

  async get(key: string): Promise<CacheEntry | null> {
    if (!this.config.enabled) return null;

    try {
      const filePath = this.getFilePath(key);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      
      if (!exists) return null;

      let data = await fs.readFile(filePath);
      
      if (this.config.compression) {
        data = await this.gunzip(new Uint8Array(data));
      }

      const entry: CacheEntry = JSON.parse(data.toString());

      // Check TTL
      if (Date.now() - entry.metadata.timestamp > this.config.ttl) {
        await this.delete(key);
        return null;
      }

      // Update access tracking
      entry.metadata.lastAccessed = Date.now();
      entry.metadata.accessCount++;
      
      // Write back updated metadata
      await this.set(key, entry);

      return entry;
    } catch (error) {
      console.warn('FileSystem cache get error:', error);
      return null;
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await fs.mkdir(path.dirname(this.getFilePath(key)), { recursive: true });
      
      let data = Buffer.from(JSON.stringify(entry));
      
      if (this.config.compression) {
        const compressed = await this.gzip(new Uint8Array(data));
        data = Buffer.from(compressed);
      }

      await fs.writeFile(this.getFilePath(key), new Uint8Array(data));
    } catch (error) {
      console.error('FileSystem cache set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      await fs.unlink(this.getFilePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const files = await this.getAllCacheFiles();
      await Promise.all(files.map(file => fs.unlink(file).catch(() => {})));
    } catch (error) {
      console.error('FileSystem cache clear error:', error);
    }
  }

  async getStats(): Promise<Partial<CacheStats>> {
    if (!this.config.enabled) {
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
      const files = await this.getAllCacheFiles();
      let totalSize = 0;
      
      await Promise.all(
        files.map(async (file) => {
          try {
            const stats = await fs.stat(file);
            totalSize += stats.size;
          } catch {
            // File might have been deleted, ignore
          }
        })
      );

      return {
        size: { 
          memory: 0, 
          filesystem: totalSize, 
          redis: 0, 
          total: totalSize 
        },
        entries: { 
          memory: 0, 
          filesystem: files.length, 
          redis: 0, 
          total: files.length 
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

  async cleanup(maxAge: number, maxSize: number): Promise<void> {
    try {
      const files = await this.getAllCacheFiles();
      const now = Date.now();
      let currentSize = 0;
      const fileStats: { path: string; mtime: number; size: number }[] = [];

      // Collect file stats
      const statPromises = files.map(async (file) => {
        try {
          const stats = await fs.stat(file);
          return {
            path: file,
            mtime: stats.mtime.getTime(),
            size: stats.size,
          };
        } catch {
          return null; // File might have been deleted
        }
      });
      
      const statResults = await Promise.all(statPromises);
      const validFileStats = statResults.filter(result => result !== null) as { path: string; mtime: number; size: number }[];
      fileStats.push(...validFileStats);
      currentSize = fileStats.reduce((total, file) => total + file.size, 0);

      // Remove old files
      const filesToDelete = fileStats.filter(f => now - f.mtime > maxAge);
      
      // If still over size limit, remove oldest files
      if (currentSize > maxSize) {
        const remainingFiles = fileStats.filter(f => now - f.mtime <= maxAge);
        remainingFiles.sort((a, b) => a.mtime - b.mtime);
        
        let sizeToRemove = currentSize - maxSize;
        for (const file of remainingFiles) {
          if (sizeToRemove <= 0) break;
          filesToDelete.push(file);
          sizeToRemove -= file.size;
        }
      }

      // Delete files
      const deletePromises = filesToDelete.map(file => 
        fs.unlink(file.path).catch(() => {})
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('FileSystem cache cleanup error:', error);
    }
  }

  private getFilePath(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = hash.substring(0, 2);
    return path.join(this.config.path, prefix, `${hash}.cache`);
  }

  private async getAllCacheFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(this.config.path, { withFileTypes: true });
      
      const directoryPromises = entries
        .filter(entry => entry.isDirectory())
        .map(async (entry) => {
          try {
            const subPath = path.join(this.config.path, entry.name);
            const subFiles = await fs.readdir(subPath);
            return subFiles
              .filter(file => file.endsWith('.cache'))
              .map(file => path.join(subPath, file));
          } catch {
            return [];
          }
        });
      
      const directoryResults = await Promise.all(directoryPromises);
      files.push(...directoryResults.flat());
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Check if the cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}