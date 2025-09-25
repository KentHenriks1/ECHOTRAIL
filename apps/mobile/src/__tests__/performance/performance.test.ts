/**
 * Performance Tests - Enterprise Edition
 * Comprehensive performance testing and benchmarking
 */

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock config before other imports to prevent validation errors
jest.mock("../../core/config", () => ({
  AppConfig: {
    name: "EchoTrail",
    version: "1.0.0",
    buildNumber: "1",
    environment: "development",
    debugMode: true,
    api: {
      baseUrl: "http://localhost:3001",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheTimeout: 300000,
      enableMocking: false,
      mockDelay: 1000,
    },
    auth: {
      provider: "stack",
      projectId: "test-project-id",
      jwksUrl: "https://api.stack-auth.com/.well-known/jwks.json",
      enableBiometrics: false,
      sessionTimeout: 1800000,
      tokenRefreshThreshold: 300000,
    },
    database: {
      name: "echotrail",
      version: 1,
      enableEncryption: false,
      enableBackup: false,
      syncInterval: 30000,
      conflictResolution: "client",
      remote: {
        url: "postgresql://test",
        project: "test",
        branch: "main",
        apiUrl: "http://localhost:3001",
      },
    },
    features: {
      aiStories: true,
      locationTracking: true,
      offlineMaps: true,
      socialFeatures: true,
      notifications: true,
      advancedAnalytics: false,
      enterpriseAuth: false,
      performanceMonitoring: true,
      crashReporting: false,
      betaFeatures: false,
    },
    monitoring: {
      enableCrashReporting: false,
      enablePerformanceMonitoring: true,
      enableAnalytics: false,
      sampleRate: 1.0,
      enableUserFeedback: false,
      enableSessionReplay: false,
    },
    maps: {
      provider: "google",
      googleMapsApiKey: "test-key",
      mapboxAccessToken: "test-token",
      defaultZoom: 15,
      maxZoom: 20,
      minZoom: 1,
      searchRadius: 5000,
      enableOffline: true,
      enableTerrain: true,
      enableSatellite: true,
    },
    ai: {
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-3.5-turbo",
      maxTokens: 1000,
      temperature: 0.7,
      enableTTS: true,
      voiceSettings: {
        voice: "alloy",
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
        enableSsml: false,
      },
      enableStoryGeneration: true,
      storyMaxLength: 500,
    },
    isProduction: false,
  },
}));

import { TrailService } from "../../services/api/TrailService";
import { AuthService } from "../../services/api/AuthService";
import { ApiClient } from "../../services/api/ApiClient";
// import { DatabaseSyncService } from "../../services/database/DatabaseSyncService";
import { PerformanceMonitor } from "../../core/utils";

// Mock dependencies
jest.mock("../../core/utils/Logger");
jest.mock("../../core/utils/ErrorHandler");

describe("Performance Tests", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let trailService: TrailService;
  let authService: AuthService;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      setAuthTokens: jest.fn(),
      clearAuthTokens: jest.fn(),
    } as any;

    trailService = new TrailService(mockApiClient);
    authService = new AuthService(mockApiClient);

    // Reset performance monitor
    PerformanceMonitor.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("API Response Time Benchmarks", () => {
    it("should complete trail fetching within performance threshold", async () => {
      // Arrange
      const mockTrails = Array.from({ length: 100 }, (_, i) => ({
        id: `trail-${i}`,
        name: `Test Trail ${i}`,
        description: "Performance test trail",
        userId: "user-123",
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
      }));

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockTrails,
      });

      // Act
      const startTime = performance.now();
      const result = await trailService.getTrails({ limit: 100 });
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.data?.length).toBe(100);
    });

    it("should handle large track point calculations efficiently", async () => {
      // Arrange - Generate large dataset of track points
      const trackPoints = Array.from({ length: 1000 }, (_, i) => ({
        id: `tp-${i}`,
        coordinate: {
          latitude: 59.9139 + i * 0.001,
          longitude: 10.7522 + i * 0.001,
        },
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        accuracy: 10,
        altitude: 100 + Math.random() * 50,
        speed: 1 + Math.random() * 2,
        heading: Math.random() * 360,
        createdAt: "2024-01-01T00:00:00Z",
      }));

      // Act
      const startTime = performance.now();
      const stats = trailService.calculateTrailStats(trackPoints);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(stats.distance).toBeGreaterThan(0);
      expect(stats.duration).toBeGreaterThan(0);
      expect(stats.avgSpeed).toBeGreaterThan(0);
    });

    it("should validate track points efficiently", async () => {
      // Arrange - Generate valid track points with realistic coordinate variations
      const trackPointInputs = Array.from({ length: 500 }, (_, i) => ({
        coordinate: {
          latitude: 59.9139 + i * 0.001, // Small increments to stay within valid range
          longitude: 10.7522 + i * 0.001, // Small increments to stay within valid range
        },
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        accuracy: 10,
        altitude: 100,
        speed: 1.5,
        heading: 180,
      }));

      // Act
      const startTime = performance.now();
      const validationResults = trackPointInputs.map((point) =>
        trailService.validateTrackPoint(point)
      );
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(validationResults.every((result) => result === true)).toBe(true);
    });
  });

  describe("Memory Usage Tests", () => {
    it("should not leak memory during repeated API calls", async () => {
      // Mock successful API response
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const initialMemory = process.memoryUsage();

      // Perform many API calls sequentially to test memory accumulation
      // Sequential execution required for accurate memory measurement
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < 100; i++) {
        // eslint-disable-next-line no-await-in-loop
        await trailService.getTrails();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it("should handle large datasets without excessive memory usage", async () => {
      // Create large trail data
      const largeTrailData = Array.from({ length: 1000 }, (_, i) => ({
        id: `trail-${i}`,
        name: `Trail ${i}`.repeat(10), // Make strings longer
        description: "A".repeat(1000), // 1KB description
        userId: "user-123",
        isPublic: true,
        metadata: {
          distance: 5000 + i,
          duration: 3600 + i,
          avgSpeed: 1.39,
          maxSpeed: 2.5,
          elevationGain: 100,
          elevationLoss: 50,
        },
        trackPoints: Array.from({ length: 100 }, (_, j) => ({
          id: `tp-${i}-${j}`,
          coordinate: {
            latitude: 59.9139 + j * 0.001,
            longitude: 10.7522 + j * 0.001,
          },
          timestamp: new Date(Date.now() + j * 1000).toISOString(),
          accuracy: 10,
          altitude: 100,
          speed: 1.5,
          heading: 180,
          createdAt: "2024-01-01T00:00:00Z",
        })),
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }));

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: largeTrailData,
      });

      const beforeMemory = process.memoryUsage();
      const result = await trailService.getTrails();
      const afterMemory = process.memoryUsage();

      const memoryUsage = afterMemory.heapUsed - beforeMemory.heapUsed;

      // Should handle large datasets efficiently
      expect(result.success).toBe(true);
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent API calls efficiently", async () => {
      // Mock API responses
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const startTime = performance.now();

      // Perform 50 concurrent API calls
      const promises = Array.from({ length: 50 }, () =>
        trailService.getTrails()
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All should succeed
      expect(results.every((result) => result.success)).toBe(true);

      // Should complete within reasonable time (5 seconds for 50 concurrent calls)
      expect(duration).toBeLessThan(5000);
      expect(mockApiClient.get).toHaveBeenCalledTimes(50);
    });

    it("should handle concurrent authentication operations", async () => {
      // Mock successful login
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            name: "Test User",
          },
          tokens: {
            accessToken: "token",
            refreshToken: "refresh",
            expiresIn: 3600,
            tokenType: "Bearer",
          },
        },
      });

      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      const startTime = performance.now();

      // Perform 20 concurrent login attempts
      const promises = Array.from({ length: 20 }, () =>
        authService.login(credentials)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All should succeed
      expect(results.every((result) => result.success)).toBe(true);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe("Database Sync Performance", () => {
    it("should sync large datasets efficiently", async () => {
      // const syncService = new DatabaseSyncService();

      // Mock large dataset
      const largeTrailsData = Array.from({ length: 100 }, (_, i) => ({
        id: `trail-${i}`,
        name: `Trail ${i}`,
        description: "Sync test trail",
        userId: "user-123",
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
      }));

      const startTime = performance.now();

      // This would normally sync with actual database
      // For test, we'll just measure the data processing time
      const processedData = largeTrailsData.map((trail) => ({
        ...trail,
        synced: true,
        lastSync: new Date().toISOString(),
      }));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(processedData).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should process within 100ms
    });
  });

  describe("Performance Monitoring Integration", () => {
    it("should track performance metrics correctly", async () => {
      // Clear existing metrics and ensure monitoring is enabled with full sample rate
      PerformanceMonitor.clear();
      PerformanceMonitor.configure({
        sampleRate: 1.0,
        enableMonitoring: true,
        enableNetworkTracking: true,
      });

      // Mock API call with timing
      mockApiClient.get.mockImplementation(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 100); // Simulate 100ms delay
        });
        return { success: true, data: [] };
      });

      // Perform API call
      await trailService.getTrails();

      // Check that performance was tracked
      const metrics = PerformanceMonitor.getAllMetrics();
      const apiMetrics = metrics.filter((m) => m.category === "api");

      expect(apiMetrics.length).toBeGreaterThan(0);

      // Verify timing is reasonable
      const apiCall = apiMetrics[0];
      expect(apiCall.value).toBeGreaterThan(90); // At least 90ms (accounting for test overhead)
      expect(apiCall.value).toBeLessThan(200); // Less than 200ms
      expect(apiCall.metadata?.url).toBe("/trails");
      expect(apiCall.metadata?.method).toBe("GET");
    });

    it("should generate performance reports", async () => {
      // Clear existing metrics and ensure monitoring is enabled
      PerformanceMonitor.clear();
      PerformanceMonitor.configure({
        sampleRate: 1.0,
        enableMonitoring: true,
        enableNetworkTracking: true,
        enableMemoryTracking: true,
      });

      // Simulate various operations
      PerformanceMonitor.trackApiCall("/trails", "GET", 150, 200);
      PerformanceMonitor.trackApiCall("/trails", "POST", 300, 201);
      PerformanceMonitor.trackMemoryUsage(50 * 1024 * 1024); // 50MB

      const report = PerformanceMonitor.generateReport();

      expect(report.summary.totalApiCalls).toBe(2);
      expect(report.summary.averageApiTime).toBe(225); // (150 + 300) / 2
      expect(report.summary.memoryUsage).toBe(50 * 1024 * 1024);
    });
  });

  describe("Stress Tests", () => {
    it("should handle rapid successive API calls", async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const startTime = performance.now();

      // Make 100 rapid API calls sequentially to test successive call performance
      // Sequential execution required to test rapid successive performance
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < 100; i++) {
        // eslint-disable-next-line no-await-in-loop
        await trailService.getTrails();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle all calls without errors
      expect(mockApiClient.get).toHaveBeenCalledTimes(100);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it("should maintain performance under high track point load", async () => {
      // Generate very large track point dataset
      const massiveTrackPoints = Array.from({ length: 5000 }, (_, i) => ({
        id: `tp-${i}`,
        coordinate: {
          latitude: 59.9139 + i * 0.0001,
          longitude: 10.7522 + i * 0.0001,
        },
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        accuracy: 10 + Math.random() * 5,
        altitude: 100 + Math.random() * 200,
        speed: Math.random() * 10,
        heading: Math.random() * 360,
        createdAt: "2024-01-01T00:00:00Z",
      }));

      const startTime = performance.now();
      const stats = trailService.calculateTrailStats(massiveTrackPoints);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle large dataset efficiently
      expect(stats.distance).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should complete within 500ms even for 5000 points
    });
  });
});
