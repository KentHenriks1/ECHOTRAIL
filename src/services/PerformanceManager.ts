import { InteractionManager, Platform } from "react-native";
import { GPXPoint } from "./GPXService";
import { Trail } from "../types/Trail";
import { logger } from "../utils/logger";

interface CacheItem<T> {
  _data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PerformanceMetrics {
  memoryUsage: number;
  _cpuUsage: number;
  _batterySaver: boolean;
  networkType: "wifi" | "4g" | "3g" | "offline";
}

class PerformanceManager {
  private cache = new Map<string, CacheItem<any>>();
  private maxCacheSize = 100;
  private gpsPointsBuffer: GPXPoint[] = [];
  private bufferLimit = 100;
  private cleanupInterval: number | null = null;
  private performanceMonitoringInterval: number | null = null;

  constructor() {
    this.startPerformanceMonitoring();
    this.scheduleCleanup();
  }

  /**
   * Memory Management
   */
  async optimizeMemory(): Promise<void> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        // Clear expired cache items
        this.clearExpiredCache();

        // Compress GPS buffer if needed
        this.compressGPSBuffer();

        // Force garbage collection if available (Android)
        if (Platform.OS === "android" && global.gc) {
          global.gc();
        }

        resolve();
      });
    });
  }

  /**
   * Smart Caching System
   */
  setCache<T>(key: string, data: T, ttl: number = 300000): void {
    // 5 minutes default
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      _data: data,
      timestamp: Date.now(),
      ttl,
    });
  }

  getCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item._data;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * GPS Data Optimization
   */
  addGPSPoint(point: GPXPoint): void {
    // Apply spatial filtering to reduce redundant points
    if (this.shouldAddGPSPoint(point)) {
      this.gpsPointsBuffer.push(point);

      // Maintain buffer size
      if (this.gpsPointsBuffer.length > this.bufferLimit) {
        this.gpsPointsBuffer = this.gpsPointsBuffer.slice(-this.bufferLimit);
      }
    }
  }

  private shouldAddGPSPoint(newPoint: GPXPoint): boolean {
    if (this.gpsPointsBuffer.length === 0) return true;

    const lastPoint = this.gpsPointsBuffer[this.gpsPointsBuffer.length - 1];

    // Skip point if too close to last point (< 5 meters)
    const distance = this.calculateDistance(
      lastPoint.latitude,
      lastPoint.longitude,
      newPoint.latitude,
      newPoint.longitude
    );

    // Skip point if too recent (< 5 seconds) and too close
    const timeDiff = newPoint.time.getTime() - lastPoint.time.getTime();

    return distance > 5 || timeDiff > 5000;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private compressGPSBuffer(): void {
    if (this.gpsPointsBuffer.length <= this.bufferLimit) return;

    // Use Douglas-Peucker algorithm for GPS track simplification
    const simplified = this.douglasPeucker(this.gpsPointsBuffer, 10); // 10m tolerance
    this.gpsPointsBuffer = simplified;
  }

  private douglasPeucker(points: GPXPoint[], tolerance: number): GPXPoint[] {
    if (points.length < 3) return points;

    const simplified: GPXPoint[] = [];
    this.douglasPeuckerRecursive(
      points,
      0,
      points.length - 1,
      tolerance,
      simplified
    );

    return simplified;
  }

  private douglasPeuckerRecursive(
    points: GPXPoint[],
    start: number,
    end: number,
    tolerance: number,
    result: GPXPoint[]
  ): void {
    if (end <= start + 1) {
      result.push(points[start]);
      if (end > start) result.push(points[end]);
      return;
    }

    let maxDistance = 0;
    let maxIndex = start;

    for (let i = start + 1; i < end; i++) {
      const distance = this.perpendicularDistance(
        points[i],
        points[start],
        points[end]
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      this.douglasPeuckerRecursive(points, start, maxIndex, tolerance, result);
      this.douglasPeuckerRecursive(points, maxIndex, end, tolerance, result);
    } else {
      result.push(points[start]);
      result.push(points[end]);
    }
  }

  private perpendicularDistance(
    point: GPXPoint,
    lineStart: GPXPoint,
    lineEnd: GPXPoint
  ): number {
    // Calculate perpendicular distance from point to line
    const A = point.latitude - lineStart.latitude;
    const B = point.longitude - lineStart.longitude;
    const C = lineEnd.latitude - lineStart.latitude;
    const D = lineEnd.longitude - lineStart.longitude;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;
    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.latitude;
      yy = lineStart.longitude;
    } else if (param > 1) {
      xx = lineEnd.latitude;
      yy = lineEnd.longitude;
    } else {
      xx = lineStart.latitude + param * C;
      yy = lineStart.longitude + param * D;
    }

    const dx = point.latitude - xx;
    const dy = point.longitude - yy;

    return Math.sqrt(dx * dx + dy * dy) * 111320; // Convert to meters
  }

  getGPSBuffer(): GPXPoint[] {
    return [...this.gpsPointsBuffer];
  }

  clearGPSBuffer(): void {
    this.gpsPointsBuffer = [];
  }

  /**
   * Trail Data Optimization
   */
  optimizeTrailData(trails: Trail[]): Trail[] {
    return trails.map((trail) => ({
      ...trail,
      // Compress description if too long
      description:
        trail.description.length > 200
          ? `${trail.description.substring(0, 200)}...`
          : trail.description,
      // Limit audio guide points for performance
      audioGuidePoints: trail.audioGuidePoints.slice(0, 10),
      // Round coordinates to reasonable precision
      coordinates: trail.waypoints.map((coord) => ({
        latitude: Math.round(coord.latitude * 1000000) / 1000000,
        longitude: Math.round(coord.longitude * 1000000) / 1000000,
      })),
    }));
  }

  /**
   * Performance Monitoring
   */
  private startPerformanceMonitoring(): void {
    if (__DEV__) {
      // Only monitor in development
      this.performanceMonitoringInterval = setInterval(() => {
        this.logPerformanceMetrics();
      }, 30000); // Every 30 seconds
    }
  }

  private logPerformanceMetrics(): void {
    const metrics = this.getPerformanceMetrics();
    logger.debug("📊 Performance Metrics:", {
      cacheSize: this.cache.size,
      gpsBufferSize: this.gpsPointsBuffer.length,
      memoryUsage: `${metrics.memoryUsage}MB`,
      timestamp: new Date().toISOString(),
    });
  }

  getPerformanceMetrics(): PerformanceMetrics {
    // This would integrate with native performance APIs
    return {
      memoryUsage:
        Math.round(
          (performance as any)?.memory?.usedJSHeapSize / 1024 / 1024
        ) || 0,
      _cpuUsage: 0, // Would need native implementation
      _batterySaver: false, // Would check device settings
      networkType: "wifi", // Would check actual network type
    };
  }

  /**
   * Battery Optimization
   */
  enableBatterySaverMode(): void {
    // Reduce GPS accuracy
    // Increase location update intervals
    // Disable animations
    // Reduce cache sizes
    this.maxCacheSize = 50;
    this.bufferLimit = 50;

    logger.debug("🔋 Battery saver mode enabled");
  }

  disableBatterySaverMode(): void {
    this.maxCacheSize = 100;
    this.bufferLimit = 100;

    logger.debug("🔋 Battery saver mode disabled");
  }

  /**
   * Image Optimization
   */
  optimizeImageURL(url: string, width?: number, height?: number): string {
    if (!url) return url;

    // Add resize parameters for better performance
    const separator = url.includes("?") ? "&" : "?";
    let optimizedURL = url;

    if (width) optimizedURL += `${separator}w=${width}`;
    if (height) optimizedURL += `&h=${height}`;

    // Add compression
    optimizedURL += "&q=80"; // 80% quality

    return optimizedURL;
  }

  /**
   * Cleanup and Maintenance
   */
  private scheduleCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.optimizeMemory();
    }, 60000); // Every minute
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    this.clearCache();
    this.clearGPSBuffer();
  }

  /**
   * Adaptive Performance
   */
  adjustPerformanceBasedOnDevice(): void {
    const metrics = this.getPerformanceMetrics();

    // Automatically adjust settings based on performance
    if (metrics.memoryUsage > 150) {
      // Above 150MB
      this.enableBatterySaverMode();
      this.clearExpiredCache();
    }

    if (metrics._batterySaver) {
      this.enableBatterySaverMode();
    }
  }

  /**
   * Preloading Optimization
   */
  preloadTrailData(_trailIds: string[]): Promise<void[]> {
    const promises = _trailIds.map(async (id) => {
      const cacheKey = `trail_${id}`;

      if (!this.getCache(cacheKey)) {
        // Simulate loading trail data
        return new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            // This would load actual trail data
            this.setCache(cacheKey, { id, loaded: true }, 600000); // 10 minutes
            resolve();
          });
        });
      }
    });

    return Promise.all(promises);
  }
}

export default new PerformanceManager();
