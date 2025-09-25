/**
 * Trail Service for EchoTrail
 * Complete integration with backend trails API
 */

import { ApiClient, ApiResponse } from "./ApiClient";
import { Logger, ErrorHandler, PerformanceMonitor } from "../../core/utils";

// Types matching our backend API schema
export interface TrackPoint {
  readonly id: string;
  readonly coordinate: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly timestamp: string;
  readonly accuracy?: number;
  readonly altitude?: number;
  readonly speed?: number;
  readonly heading?: number;
  readonly createdAt: string;
}

export interface TrackPointInput {
  readonly coordinate: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly timestamp: string;
  readonly accuracy?: number;
  readonly altitude?: number;
  readonly speed?: number;
  readonly heading?: number;
}

export interface Trail {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly userId: string;
  readonly isPublic: boolean;
  readonly metadata: {
    readonly distance?: number;
    readonly duration?: number;
    readonly avgSpeed?: number;
    readonly maxSpeed?: number;
    readonly elevationGain?: number;
    readonly elevationLoss?: number;
  };
  readonly trackPoints?: TrackPoint[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TrailCreateData {
  readonly name: string;
  readonly description?: string;
  readonly isPublic?: boolean;
}

export interface TrailUpdateData {
  readonly name?: string;
  readonly description?: string;
  readonly isPublic?: boolean;
}

export interface TrailQuery extends Record<string, unknown> {
  readonly page?: number;
  readonly limit?: number;
  readonly sort?: "createdAt" | "updatedAt" | "name" | "distance" | "duration";
  readonly order?: "asc" | "desc";
  readonly search?: string;
  readonly isPublic?: boolean;
  readonly filters?: TrailFilters;
  readonly sortBy?: TrailSortOption;
  readonly includeTrackPoints?: boolean;
}

export interface TrailFilters {
  readonly isPublic?: boolean;
  readonly createdBy?: string;
  readonly dateRange?: {
    readonly start: Date;
    readonly end: Date;
  };
}

export type TrailSortOption =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "distance"
  | "duration";

export interface TrailsResponse {
  readonly success: boolean;
  readonly data: Trail[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface ShareLink {
  readonly id: string;
  readonly trailId: string;
  readonly token: string;
  readonly shareUrl: string;
  readonly expiresAt?: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

/**
 * Enterprise Trail Service
 */
export class TrailService {
  private readonly apiClient: ApiClient;
  private readonly logger: Logger;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.logger = new Logger("TrailService");
  }

  /**
   * Get paginated list of user trails
   */
  async getTrails(query?: TrailQuery): Promise<ApiResponse<Trail[]>> {
    this.logger.info("Fetching trails", query);

    const startTime = performance.now();

    try {
      const response = await this.apiClient.get<Trail[]>("/trails", query);

      const duration = performance.now() - startTime;
      PerformanceMonitor.trackApiCall("/trails", "GET", duration, 200);

      this.logger.info("Trails fetched successfully", {
        count: response.data?.length || 0,
        duration,
      });

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: "/trails", method: "GET" },
        { query }
      );
      throw error;
    }
  }

  /**
   * Get specific trail by ID with track points
   */
  async getTrail(trailId: string): Promise<ApiResponse<Trail>> {
    this.logger.info("Fetching trail", { trailId });

    try {
      const response = await this.apiClient.get<Trail>(`/trails/${trailId}`);

      if (response.success && response.data) {
        this.logger.info("Trail fetched successfully", {
          trailId,
          trackPointCount: response.data.trackPoints?.length || 0,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/trails/${trailId}`, method: "GET" },
        { trailId }
      );
      throw error;
    }
  }

  /**
   * Create new trail
   */
  async createTrail(data: TrailCreateData): Promise<ApiResponse<Trail>> {
    this.logger.info("Creating new trail", { name: data.name });

    try {
      const response = await this.apiClient.post<Trail>("/trails", data);

      if (response.success && response.data) {
        this.logger.info("Trail created successfully", {
          trailId: response.data.id,
          name: response.data.name,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: "/trails", method: "POST" },
        { trailData: data }
      );
      throw error;
    }
  }

  /**
   * Update existing trail
   */
  async updateTrail(
    trailId: string,
    data: TrailUpdateData
  ): Promise<ApiResponse<Trail>> {
    this.logger.info("Updating trail", { trailId, updates: Object.keys(data) });

    try {
      const response = await this.apiClient.put<Trail>(
        `/trails/${trailId}`,
        data
      );

      if (response.success && response.data) {
        this.logger.info("Trail updated successfully", { trailId });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/trails/${trailId}`, method: "PUT" },
        { trailId, updateData: data }
      );
      throw error;
    }
  }

  /**
   * Delete trail
   */
  async deleteTrail(trailId: string): Promise<ApiResponse<void>> {
    this.logger.info("Deleting trail", { trailId });

    try {
      const response = await this.apiClient.delete<void>(`/trails/${trailId}`);

      if (response.success) {
        this.logger.info("Trail deleted successfully", { trailId });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/trails/${trailId}`, method: "DELETE" },
        { trailId }
      );
      throw error;
    }
  }

  /**
   * Get track points for a specific trail
   */
  async getTrackPoints(trailId: string): Promise<ApiResponse<TrackPoint[]>> {
    this.logger.info("Fetching track points for trail", { trailId });

    try {
      const response = await this.apiClient.get<TrackPoint[]>(
        `/trails/${trailId}/track-points`
      );

      if (response.success && response.data) {
        this.logger.info("Track points fetched successfully", {
          trailId,
          count: response.data.length,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/trails/${trailId}/track-points`, method: "GET" },
        { trailId }
      );
      throw error;
    }
  }

  /**
   * Add track points to trail (batch upload)
   */
  async addTrackPoints(
    trailId: string,
    trackPoints: TrackPointInput[]
  ): Promise<ApiResponse<{ message: string }>> {
    this.logger.info("Adding track points to trail", {
      trailId,
      pointCount: trackPoints.length,
    });

    const startTime = performance.now();

    try {
      // Validate track points
      if (trackPoints.length === 0) {
        throw new Error("No track points provided");
      }

      if (trackPoints.length > 1000) {
        throw new Error("Too many track points - maximum 1000 per batch");
      }

      const response = await this.apiClient.post<{ message: string }>(
        `/trails/${trailId}/track-points`,
        { trackPoints }
      );

      const duration = performance.now() - startTime;

      if (response.success) {
        this.logger.info("Track points added successfully", {
          trailId,
          pointCount: trackPoints.length,
          duration,
        });

        // Track performance for GPS uploads
        PerformanceMonitor.trackCustomMetric(
          "gps_upload",
          trackPoints.length,
          "count",
          undefined,
          { duration, trailId }
        );
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/trails/${trailId}/track-points`, method: "POST" },
        { trailId, pointCount: trackPoints.length }
      );
      throw error;
    }
  }

  /**
   * Create share link for trail
   */
  async createShareLink(
    trailId: string,
    expiresAt?: string
  ): Promise<ApiResponse<ShareLink>> {
    this.logger.info("Creating share link for trail", { trailId });

    try {
      const response = await this.apiClient.post<ShareLink>(
        `/trails/${trailId}/share`,
        expiresAt ? { expiresAt } : undefined
      );

      if (response.success && response.data) {
        this.logger.info("Share link created successfully", {
          trailId,
          shareToken: response.data.token,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/trails/${trailId}/share`, method: "POST" },
        { trailId, expiresAt }
      );
      throw error;
    }
  }

  /**
   * Get shared trail using share token (public endpoint)
   */
  async getSharedTrail(shareToken: string): Promise<ApiResponse<Trail>> {
    this.logger.info("Fetching shared trail", { shareToken });

    try {
      const response = await this.apiClient.get<Trail>(`/shared/${shareToken}`);

      if (response.success && response.data) {
        this.logger.info("Shared trail fetched successfully", {
          trailId: response.data.id,
          shareToken,
        });
      }

      return response;
    } catch (error) {
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: `/shared/${shareToken}`, method: "GET" },
        { shareToken }
      );
      throw error;
    }
  }

  /**
   * Calculate trail statistics from track points
   */
  calculateTrailStats(trackPoints: TrackPoint[]): Trail["metadata"] {
    if (trackPoints.length === 0) {
      return {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      };
    }

    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxSpeed = 0;

    // Sort by timestamp to ensure correct order
    const sortedPoints = [...trackPoints].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate distance and elevation changes
    for (let i = 1; i < sortedPoints.length; i++) {
      const prev = sortedPoints[i - 1];
      const curr = sortedPoints[i];

      // Calculate distance between points
      const distance = this.calculateDistance(
        prev.coordinate.latitude,
        prev.coordinate.longitude,
        curr.coordinate.latitude,
        curr.coordinate.longitude
      );
      totalDistance += distance;

      // Calculate elevation changes
      if (prev.altitude !== undefined && curr.altitude !== undefined) {
        const elevDiff = curr.altitude - prev.altitude;
        if (elevDiff > 0) {
          elevationGain += elevDiff;
        } else {
          elevationLoss += Math.abs(elevDiff);
        }
      }

      // Track maximum speed
      if (curr.speed !== undefined && curr.speed > maxSpeed) {
        maxSpeed = curr.speed;
      }
    }

    // Calculate duration
    const startTime = new Date(sortedPoints[0].timestamp).getTime();
    const endTime = new Date(
      sortedPoints[sortedPoints.length - 1].timestamp
    ).getTime();
    const duration = (endTime - startTime) / 1000; // seconds

    // Calculate average speed
    const avgSpeed = duration > 0 ? totalDistance / duration : 0;

    return {
      distance: Math.round(totalDistance),
      duration: Math.round(duration),
      avgSpeed: Math.round(avgSpeed * 100) / 100,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
    };
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
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

  /**
   * Format trail statistics for display
   */
  formatTrailStats(metadata: Trail["metadata"]): {
    distance: string;
    duration: string;
    avgSpeed: string;
    maxSpeed: string;
    elevation: string;
  } {
    return {
      distance: metadata.distance
        ? `${(metadata.distance / 1000).toFixed(2)} km`
        : "0 km",
      duration: metadata.duration
        ? this.formatDuration(metadata.duration)
        : "0:00",
      avgSpeed: metadata.avgSpeed
        ? `${metadata.avgSpeed.toFixed(1)} m/s`
        : "0 m/s",
      maxSpeed: metadata.maxSpeed
        ? `${metadata.maxSpeed.toFixed(1)} m/s`
        : "0 m/s",
      elevation:
        metadata.elevationGain && metadata.elevationLoss
          ? `+${metadata.elevationGain}m / -${metadata.elevationLoss}m`
          : "No elevation data",
    };
  }

  /**
   * Format duration in seconds to human-readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
  }

  /**
   * Validate track point data
   */
  validateTrackPoint(point: TrackPointInput): boolean {
    // Check required fields
    if (!point.coordinate || !point.timestamp) {
      return false;
    }

    // Check coordinate object has required latitude and longitude
    if (
      typeof point.coordinate.latitude !== "number" ||
      typeof point.coordinate.longitude !== "number"
    ) {
      return false;
    }

    // Validate coordinate ranges
    if (
      point.coordinate.latitude < -90 ||
      point.coordinate.latitude > 90 ||
      point.coordinate.longitude < -180 ||
      point.coordinate.longitude > 180
    ) {
      return false;
    }

    // Validate timestamp
    const timestamp = new Date(point.timestamp);
    if (isNaN(timestamp.getTime())) {
      return false;
    }

    return true;
  }

  /**
   * Batch process track points for efficient upload
   */
  async batchUploadTrackPoints(
    trailId: string,
    trackPoints: TrackPointInput[],
    batchSize: number = 100
  ): Promise<void> {
    this.logger.info("Starting batch upload of track points", {
      trailId,
      totalPoints: trackPoints.length,
      batchSize,
    });

    const batches: TrackPointInput[][] = [];
    for (let i = 0; i < trackPoints.length; i += batchSize) {
      batches.push(trackPoints.slice(i, i + batchSize));
    }

    this.logger.info(`Processing ${batches.length} batches`);

    // Sequential processing needed to avoid server overload
    // eslint-disable-next-line no-await-in-loop
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        await this.addTrackPoints(trailId, batch);
        this.logger.debug(
          `Batch ${i + 1}/${batches.length} uploaded successfully`
        );

        // Add small delay between batches to avoid overwhelming the server
        if (i < batches.length - 1) {
          await new Promise((resolve) => {
            setTimeout(resolve, 100);
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to upload batch ${i + 1}/${batches.length}`,
          undefined,
          error as Error
        );
        throw error;
      }
    }

    this.logger.info("Batch upload completed successfully");
  }
}
