/**
 * TrailService Tests - Enterprise Edition
 * Comprehensive testing of trail API integration
 */

import { TrailService } from "../../../services/api/TrailService";
import { ApiClient } from "../../../services/api/ApiClient";
// import { Logger } from "../../../core/utils";
import type {
  Trail,
  TrackPoint,
  TrailCreateData,
} from "../../../services/api/TrailService";

// Mock the dependencies
jest.mock("../../../core/utils/Logger");
jest.mock("../../../core/utils/PerformanceMonitor");
jest.mock("../../../core/utils/ErrorHandler");

describe("TrailService", () => {
  let trailService: TrailService;
  let mockApiClient: jest.Mocked<ApiClient>;

  const mockTrail: Trail = {
    id: "trail-123",
    name: "Test Trail",
    description: "A test trail",
    userId: "user-456",
    isPublic: true,
    metadata: {
      distance: 5000,
      duration: 3600,
      avgSpeed: 1.39,
      maxSpeed: 2.5,
      elevationGain: 100,
      elevationLoss: 50,
    },
    trackPoints: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockTrackPoint: TrackPoint = {
    id: "tp-789",
    coordinate: {
      latitude: 59.9139,
      longitude: 10.7522,
    },
    timestamp: "2024-01-01T00:00:00Z",
    accuracy: 10,
    altitude: 100,
    speed: 1.5,
    heading: 180,
    createdAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    // Create mock ApiClient
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Create TrailService with mocked ApiClient
    trailService = new TrailService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getTrails", () => {
    it("should fetch trails successfully", async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: [mockTrail],
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.getTrails();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTrail]);
      expect(mockApiClient.get).toHaveBeenCalledWith("/trails", undefined);
    });

    it("should handle query parameters", async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: [mockTrail],
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const query = {
        limit: 10,
        sort: "createdAt" as const,
        search: "test",
        isPublic: true,
      };

      // Act
      await trailService.getTrails(query);

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith("/trails", query);
    });

    it("should handle API errors", async () => {
      // Arrange
      const mockError = new Error("API Error");
      mockApiClient.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(trailService.getTrails()).rejects.toThrow("API Error");
    });
  });

  describe("getTrail", () => {
    it("should fetch a single trail successfully", async () => {
      // Arrange
      const trailId = "trail-123";
      const mockResponse = {
        success: true,
        data: mockTrail,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.getTrail(trailId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrail);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/trails/${trailId}`);
    });

    it("should handle trail not found", async () => {
      // Arrange
      const trailId = "nonexistent";
      const mockResponse = {
        success: false,
        error: { code: "NOT_FOUND", message: "Trail not found" },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.getTrail(trailId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Trail not found");
    });
  });

  describe("createTrail", () => {
    it("should create a trail successfully", async () => {
      // Arrange
      const trailData: TrailCreateData = {
        name: "New Trail",
        description: "A new trail",
        isPublic: false,
      };

      const mockResponse = {
        success: true,
        data: { ...mockTrail, ...trailData },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.createTrail(trailData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(trailData.name);
      expect(mockApiClient.post).toHaveBeenCalledWith("/trails", trailData);
    });

    it("should handle validation errors", async () => {
      // Arrange
      const invalidTrailData = {
        name: "", // Invalid empty name
        description: "A trail",
      } as TrailCreateData;

      const mockResponse = {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name is required" },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.createTrail(invalidTrailData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Name is required");
    });
  });

  describe("updateTrail", () => {
    it("should update a trail successfully", async () => {
      // Arrange
      const trailId = "trail-123";
      const updateData = {
        name: "Updated Trail Name",
        isPublic: false,
      };

      const mockResponse = {
        success: true,
        data: { ...mockTrail, ...updateData },
      };
      mockApiClient.put.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.updateTrail(trailId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(updateData.name);
      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/trails/${trailId}`,
        updateData
      );
    });
  });

  describe("deleteTrail", () => {
    it("should delete a trail successfully", async () => {
      // Arrange
      const trailId = "trail-123";
      const mockResponse = {
        success: true,
        data: undefined,
      };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.deleteTrail(trailId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/trails/${trailId}`);
    });

    it("should handle unauthorized deletion", async () => {
      // Arrange
      const trailId = "trail-123";
      const mockResponse = {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.deleteTrail(trailId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Unauthorized");
    });
  });

  describe("getTrackPoints", () => {
    it("should fetch track points for a trail", async () => {
      // Arrange
      const trailId = "trail-123";
      const mockResponse = {
        success: true,
        data: [mockTrackPoint],
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.getTrackPoints(trailId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTrackPoint]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/trails/${trailId}/track-points`
      );
    });
  });

  describe("addTrackPoints", () => {
    it("should add track points to a trail", async () => {
      // Arrange
      const trailId = "trail-123";
      const trackPointInputs = [
        {
          coordinate: {
            latitude: 59.9139,
            longitude: 10.7522,
          },
          timestamp: "2024-01-01T00:00:00Z",
          accuracy: 10,
          altitude: 100,
          speed: 1.5,
          heading: 180,
        },
      ];

      const mockResponse = {
        success: true,
        data: { message: "Track points added successfully" },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await trailService.addTrackPoints(
        trailId,
        trackPointInputs
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/trails/${trailId}/track-points`,
        { trackPoints: trackPointInputs }
      );
    });

    it("should handle empty track points array", async () => {
      // Arrange
      const trailId = "trail-123";
      const emptyTrackPoints: any[] = [];

      // Act & Assert
      await expect(
        trailService.addTrackPoints(trailId, emptyTrackPoints)
      ).rejects.toThrow("No track points provided");
    });

    it("should handle too many track points", async () => {
      // Arrange
      const trailId = "trail-123";
      const tooManyTrackPoints = new Array(1001).fill({
        coordinate: { latitude: 0, longitude: 0 },
        timestamp: "2024-01-01T00:00:00Z",
      });

      // Act & Assert
      await expect(
        trailService.addTrackPoints(trailId, tooManyTrackPoints)
      ).rejects.toThrow("Too many track points - maximum 1000 per batch");
    });
  });

  describe("batchUploadTrackPoints", () => {
    it("should upload track points in batches", async () => {
      // Arrange
      const trailId = "trail-123";
      const trackPoints = new Array(250).fill(null).map((_, i) => ({
        coordinate: {
          latitude: 59.9139 + i * 0.001,
          longitude: 10.7522 + i * 0.001,
        },
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));

      const mockResponse = {
        success: true,
        data: { message: "Track points added successfully" },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      // Act
      await trailService.batchUploadTrackPoints(trailId, trackPoints, 100);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledTimes(3); // 250 points / 100 batch size = 3 batches
      expect(mockApiClient.post).toHaveBeenNthCalledWith(
        1,
        `/trails/${trailId}/track-points`,
        { trackPoints: trackPoints.slice(0, 100) }
      );
      expect(mockApiClient.post).toHaveBeenNthCalledWith(
        2,
        `/trails/${trailId}/track-points`,
        { trackPoints: trackPoints.slice(100, 200) }
      );
      expect(mockApiClient.post).toHaveBeenNthCalledWith(
        3,
        `/trails/${trailId}/track-points`,
        { trackPoints: trackPoints.slice(200, 250) }
      );
    });

    it("should handle batch upload failure", async () => {
      // Arrange
      const trailId = "trail-123";
      const trackPoints = new Array(150).fill({
        coordinate: { latitude: 0, longitude: 0 },
        timestamp: "2024-01-01T00:00:00Z",
      });

      // Mock first batch success, second batch failure
      mockApiClient.post
        .mockResolvedValueOnce({
          success: true,
          data: { message: "Success" },
        })
        .mockRejectedValueOnce(new Error("Network error"));

      // Act & Assert
      await expect(
        trailService.batchUploadTrackPoints(trailId, trackPoints, 100)
      ).rejects.toThrow("Network error");

      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe("calculateTrailStats", () => {
    it("should calculate stats from track points", () => {
      // Arrange
      const trackPoints: TrackPoint[] = [
        {
          ...mockTrackPoint,
          id: "tp-1",
          coordinate: { latitude: 0, longitude: 0 },
          timestamp: "2024-01-01T00:00:00Z",
          altitude: 100,
          speed: 1.0,
        },
        {
          ...mockTrackPoint,
          id: "tp-2",
          coordinate: { latitude: 0.001, longitude: 0.001 },
          timestamp: "2024-01-01T00:01:00Z",
          altitude: 110,
          speed: 1.5,
        },
        {
          ...mockTrackPoint,
          id: "tp-3",
          coordinate: { latitude: 0.002, longitude: 0.002 },
          timestamp: "2024-01-01T00:02:00Z",
          altitude: 105,
          speed: 2.0,
        },
      ];

      // Act
      const stats = trailService.calculateTrailStats(trackPoints);

      // Assert
      expect(stats.distance).toBeGreaterThan(0);
      expect(stats.duration).toBe(120); // 2 minutes
      expect(stats.avgSpeed).toBeGreaterThan(0);
      expect(stats.maxSpeed).toBe(2.0);
      expect(stats.elevationGain).toBe(10); // 100 -> 110
      expect(stats.elevationLoss).toBe(5); // 110 -> 105
    });

    it("should handle empty track points array", () => {
      // Act
      const stats = trailService.calculateTrailStats([]);

      // Assert
      expect(stats).toEqual({
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      });
    });
  });

  describe("validateTrackPoint", () => {
    it("should validate valid track point", () => {
      // Arrange
      const validTrackPoint = {
        coordinate: {
          latitude: 59.9139,
          longitude: 10.7522,
        },
        timestamp: "2024-01-01T00:00:00Z",
      };

      // Act
      const isValid = trailService.validateTrackPoint(validTrackPoint);

      // Assert
      expect(isValid).toBe(true);
    });

    it("should reject track point with invalid coordinates", () => {
      // Arrange
      const invalidTrackPoint = {
        coordinate: {
          latitude: 91, // Invalid latitude (> 90)
          longitude: 10.7522,
        },
        timestamp: "2024-01-01T00:00:00Z",
      };

      // Act
      const isValid = trailService.validateTrackPoint(invalidTrackPoint);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should reject track point with invalid timestamp", () => {
      // Arrange
      const invalidTrackPoint = {
        coordinate: {
          latitude: 59.9139,
          longitude: 10.7522,
        },
        timestamp: "invalid-date",
      };

      // Act
      const isValid = trailService.validateTrackPoint(invalidTrackPoint);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should reject track point missing required fields", () => {
      // Arrange
      const incompleteTrackPoint = {
        coordinate: {
          latitude: 59.9139,
          // longitude missing
        },
        timestamp: "2024-01-01T00:00:00Z",
      } as any;

      // Act
      const isValid = trailService.validateTrackPoint(incompleteTrackPoint);

      // Assert
      expect(isValid).toBe(false);
    });
  });
});
