// IntelligenceSystem.integration.test.ts - Integration tests for the complete intelligence system
// Tests how SpeedDetector, ContextAnalyzer, and AdaptiveContentEngine work together

import { SpeedDetector, MovementMode, SpeedAnalysis } from "../SpeedDetector";
import {
  ContextAnalyzer,
  ContextualEnvironment,
  ContextualInsights,
  WeatherData,
} from "../ContextAnalyzer";
import {
  AdaptiveContentEngine,
  StoryContent,
  AdaptedContent,
  UserContentPreferences,
} from "../AdaptiveContentEngine";
import { LocationObject } from "expo-location";

// Helper class for creating consistent test scenarios
class IntelligenceTestScenario {
  private speedDetector: SpeedDetector;
  private contextAnalyzer: ContextAnalyzer;
  private contentEngine: AdaptiveContentEngine;
  private mockStoryContent: StoryContent;

  constructor() {
    this.speedDetector = new SpeedDetector();
    this.contextAnalyzer = new ContextAnalyzer();
    this.contentEngine = new AdaptiveContentEngine();
    this.mockStoryContent = this.createMockStoryContent();
    this.contentEngine.addStoryContent(this.mockStoryContent);
  }

  private createMockStoryContent(): StoryContent {
    return {
      id: "test-story-1",
      title: "The Old Oak Tree",
      originalText: `Long ago, in the heart of what is now downtown Oslo, there stood a magnificent oak tree that was over 300 years old. This ancient guardian watched over the land through seasons of change, witnessing the transformation from a small medieval town to a bustling modern city. The tree's massive trunk, nearly three meters in diameter, housed countless creatures and provided shelter for weary travelers. Local folklore claimed that the tree possessed magical properties, and that those who sat beneath its branches would receive wisdom and clarity. Many important decisions in the town's history were made in its shade, from marriage proposals to business agreements. The oak's deep roots extended far underground, creating a network that helped prevent erosion and flooding in the area. Even today, though the original tree is long gone, its memory lives on in the street names and local traditions of the neighborhood. The spot where it once stood is now marked by a small bronze plaque, reminding passersby of the natural history that once flourished here.`,
      adaptedVersions: new Map(),
      metadata: {
        type: "HISTORICAL",
        era: "Medieval to Modern",
        themes: ["nature", "history", "urban-development", "folklore"],
        difficulty: "INTERMEDIATE",
        estimatedReadTime: 3,
        keywords: ["oak", "tree", "Oslo", "history", "medieval", "folklore"],
        emotionalTone: "PEACEFUL",
        ageAppropriate: true,
      },
      tags: ["historical", "nature", "oslo", "landmark"],
      location: {
        latitude: 59.9139,
        longitude: 10.7522,
        radius: 100,
      },
    };
  }

  async runFullScenario(
    locations: LocationObject[],
    weatherData?: WeatherData,
    userPreferences?: UserContentPreferences
  ): Promise<{
    speedAnalyses: SpeedAnalysis[];
    contexts: ContextualEnvironment[];
    insights: ContextualInsights[];
    adaptedContents: (AdaptedContent | null)[];
    errors: Error[];
  }> {
    const speedAnalyses: SpeedAnalysis[] = [];
    const contexts: ContextualEnvironment[] = [];
    const insights: ContextualInsights[] = [];
    const adaptedContents: (AdaptedContent | null)[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < locations.length; i++) {
      try {
        // Step 1: Analyze speed and movement
        const speedAnalysis = this.speedDetector.analyzeSpeed(locations[i]);
        speedAnalyses.push(speedAnalysis);

        // Step 2: Analyze environmental context
        const context = await this.contextAnalyzer.analyzeContext(
          locations[i],
          speedAnalysis,
          weatherData
        );
        contexts.push(context);

        // Step 3: Generate contextual insights
        const contextInsights = this.contextAnalyzer.generateInsights(context);
        insights.push(contextInsights);

        // Step 4: Adapt content based on context
        const adaptedContent = await this.contentEngine.adaptContent(
          this.mockStoryContent.id,
          context,
          contextInsights,
          userPreferences
        );
        adaptedContents.push(adaptedContent);

        // Add delay to simulate real-world timing
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        errors.push(error as Error);
      }
    }

    return {
      speedAnalyses,
      contexts,
      insights,
      adaptedContents,
      errors,
    };
  }

  getServices() {
    return {
      speedDetector: this.speedDetector,
      contextAnalyzer: this.contextAnalyzer,
      contentEngine: this.contentEngine,
    };
  }
}

// Test data generators
class TestLocationGenerator {
  static generateWalkingSequence(): LocationObject[] {
    const baseLocation = { lat: 59.9139, lon: 10.7522 };
    const locations: LocationObject[] = [];
    const walkingSpeed = 5; // km/h
    const intervalMs = 5000; // 5 seconds

    for (let i = 0; i < 6; i++) {
      // Move roughly 7 meters north each interval (walking speed)
      const latChange = 7 / 111320; // meters to degrees

      locations.push({
        coords: {
          latitude: baseLocation.lat + latChange * i,
          longitude: baseLocation.lon,
          altitude: 50,
          accuracy: 5,
          altitudeAccuracy: 5,
          heading: 0,
          speed: walkingSpeed / 3.6, // Convert to m/s
        },
        timestamp: Date.now() + i * intervalMs,
      });
    }

    return locations;
  }

  static generateDrivingSequence(): LocationObject[] {
    const baseLocation = { lat: 59.9139, lon: 10.7522 };
    const locations: LocationObject[] = [];
    const drivingSpeed = 50; // km/h
    const intervalMs = 3000; // 3 seconds

    for (let i = 0; i < 5; i++) {
      // Move roughly 42 meters each interval (driving speed)
      const latChange = 42 / 111320;

      locations.push({
        coords: {
          latitude: baseLocation.lat + latChange * i,
          longitude: baseLocation.lon,
          altitude: 20,
          accuracy: 3,
          altitudeAccuracy: 3,
          heading: 0,
          speed: drivingSpeed / 3.6,
        },
        timestamp: Date.now() + i * intervalMs,
      });
    }

    return locations;
  }

  static generateStationarySequence(): LocationObject[] {
    const baseLocation = { lat: 59.9139, lon: 10.7522 };
    const locations: LocationObject[] = [];
    const intervalMs = 4000; // 4 seconds

    for (let i = 0; i < 5; i++) {
      // Minimal movement (GPS noise)
      const noise = (Math.random() - 0.5) * 0.0001;

      locations.push({
        coords: {
          latitude: baseLocation.lat + noise,
          longitude: baseLocation.lon + noise,
          altitude: 25,
          accuracy: 8,
          altitudeAccuracy: 8,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now() + i * intervalMs,
      });
    }

    return locations;
  }

  static generateTransitionSequence(): LocationObject[] {
    // Walking -> Stationary -> Driving sequence
    const walkingLocs = this.generateWalkingSequence().slice(0, 3);
    const stationaryLocs = this.generateStationarySequence().slice(0, 3);
    const drivingLocs = this.generateDrivingSequence().slice(0, 3);

    // Adjust timestamps to be sequential
    const allLocs = [...walkingLocs, ...stationaryLocs, ...drivingLocs];
    allLocs.forEach((loc, index) => {
      loc.timestamp = Date.now() + index * 4000;
    });

    return allLocs;
  }
}

describe("Intelligence System Integration", () => {
  let scenario: IntelligenceTestScenario;

  beforeEach(() => {
    scenario = new IntelligenceTestScenario();
    // Mock Date.now for consistent testing
    jest.spyOn(Date, "now").mockReturnValue(1640000000000); // Fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
    const { contextAnalyzer, contentEngine } = scenario.getServices();
    contextAnalyzer.clearCaches();
    contentEngine.clearCaches();
  });

  describe("Walking Scenario Integration", () => {
    it("should process walking scenario end-to-end successfully", async () => {
      const locations = TestLocationGenerator.generateWalkingSequence();
      const weatherData: WeatherData = {
        condition: "CLEAR",
        temperature: 18,
        humidity: 65,
        windSpeed: 8,
        visibility: 10,
        pressure: 1015,
        uvIndex: 4,
        lastUpdated: Date.now(),
      };

      const result = await scenario.runFullScenario(locations, weatherData);

      expect(result.errors).toHaveLength(0);
      expect(result.speedAnalyses).toHaveLength(locations.length);
      expect(result.contexts).toHaveLength(locations.length);
      expect(result.insights).toHaveLength(locations.length);
      expect(result.adaptedContents).toHaveLength(locations.length);

      // Verify walking mode detection
      const finalSpeedAnalysis =
        result.speedAnalyses[result.speedAnalyses.length - 1];
      expect(finalSpeedAnalysis.movementMode).toBe("WALKING");
      expect(finalSpeedAnalysis.confidence).toBeGreaterThan(0.5);

      // Verify context analysis
      const finalContext = result.contexts[result.contexts.length - 1];
      expect(finalContext.movement.movementMode).toBe("WALKING");
      expect(finalContext.weather).toBeDefined();
      expect(finalContext.attentionLevel).toBe("MEDIUM"); // Walking typically allows medium attention

      // Verify content adaptation
      const finalContent =
        result.adaptedContents[result.adaptedContents.length - 1];
      expect(finalContent).toBeTruthy();
      expect(finalContent!.format).toMatch(/AUDIO|VISUAL/); // Appropriate for walking
      expect(finalContent!.confidence).toBeGreaterThan(0.5);
    });

    it("should maintain data consistency across all components", async () => {
      const locations = TestLocationGenerator.generateWalkingSequence();
      const result = await scenario.runFullScenario(locations);

      for (let i = 0; i < result.speedAnalyses.length; i++) {
        const speedAnalysis = result.speedAnalyses[i];
        const context = result.contexts[i];
        const insights = result.insights[i];
        const adaptedContent = result.adaptedContents[i];

        // Verify data flow consistency
        expect(context.movement).toEqual(speedAnalysis);
        expect(insights.confidence).toBeGreaterThanOrEqual(0);
        expect(insights.confidence).toBeLessThanOrEqual(1);

        if (adaptedContent) {
          expect(adaptedContent.confidence).toBeGreaterThanOrEqual(0);
          expect(adaptedContent.confidence).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("Driving Scenario Integration", () => {
    it("should adapt appropriately for driving conditions", async () => {
      const locations = TestLocationGenerator.generateDrivingSequence();
      const result = await scenario.runFullScenario(locations);

      expect(result.errors).toHaveLength(0);

      const finalSpeedAnalysis =
        result.speedAnalyses[result.speedAnalyses.length - 1];
      const finalContext = result.contexts[result.contexts.length - 1];
      const finalInsights = result.insights[result.insights.length - 1];
      const finalContent =
        result.adaptedContents[result.adaptedContents.length - 1];

      // Verify driving mode detection
      expect(finalSpeedAnalysis.movementMode).toBe("DRIVING");

      // Verify context adaptations for driving
      expect(finalContext.attentionLevel).toBe("LOW"); // Driving requires focus on road
      expect(finalContext.availableTime).toBe("SHORT"); // Limited time for content

      // Verify safety-focused adaptations
      expect(finalInsights.adaptationRecommendations).toContainEqual(
        expect.objectContaining({
          aspect: "SPEED",
          adjustment: "DECREASE",
          reason: expect.stringContaining("driving"),
        })
      );

      // Verify content format is audio-only
      expect(finalContent?.format).toBe("AUDIO");
      expect(finalContent?.length).toMatch(/MICRO|SHORT/); // Brief content for driving
    });

    it("should generate appropriate environmental factors for driving", async () => {
      const locations = TestLocationGenerator.generateDrivingSequence();
      const result = await scenario.runFullScenario(locations);

      const finalInsights = result.insights[result.insights.length - 1];

      expect(finalInsights.environmentalFactors).toContain(
        "Driving requires primary attention for safety"
      );

      // Should have specific recommendations for safety
      const safetyRecommendations =
        finalInsights.adaptationRecommendations.filter(
          (rec) => rec.importance > 0.8
        );
      expect(safetyRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Stationary Scenario Integration", () => {
    it("should optimize for immersive experience when stationary", async () => {
      const locations = TestLocationGenerator.generateStationarySequence();
      const result = await scenario.runFullScenario(locations);

      expect(result.errors).toHaveLength(0);

      const finalSpeedAnalysis =
        result.speedAnalyses[result.speedAnalyses.length - 1];
      const finalContext = result.contexts[result.contexts.length - 1];
      const finalContent =
        result.adaptedContents[result.adaptedContents.length - 1];

      // Verify stationary detection
      expect(finalSpeedAnalysis.movementMode).toBe("STATIONARY");
      expect(finalSpeedAnalysis.stationaryDuration).toBeGreaterThan(0);

      // Verify optimization for stationary context
      expect(finalContext.attentionLevel).toBe("HIGH"); // Can give full attention
      expect(finalContext.contentPreference).toMatch(/DETAILED|IMMERSIVE/);

      // Verify rich content adaptation
      expect(finalContent?.format).toMatch(/INTERACTIVE|VISUAL|TEXT/);
      expect(finalContent?.interactionPoints.length).toBeGreaterThan(0);
    });
  });

  describe("Transition Scenario Integration", () => {
    it("should handle movement mode transitions smoothly", async () => {
      const locations = TestLocationGenerator.generateTransitionSequence();
      const result = await scenario.runFullScenario(locations);

      expect(result.errors).toHaveLength(0);

      // Verify we captured different movement modes
      const movementModes = result.speedAnalyses.map(
        (analysis) => analysis.movementMode
      );
      const uniqueModes = new Set(movementModes);

      expect(uniqueModes.size).toBeGreaterThan(1); // Should have detected transitions
      expect(uniqueModes.has("WALKING")).toBeTruthy();
      expect(uniqueModes.has("STATIONARY")).toBeTruthy();

      // Verify content adaptations changed appropriately
      const formats = result.adaptedContents
        .filter((content) => content !== null)
        .map((content) => content!.format);

      // Should have variety in formats based on context changes
      expect(new Set(formats).size).toBeGreaterThan(1);
    });

    it("should maintain confidence levels during transitions", async () => {
      const locations = TestLocationGenerator.generateTransitionSequence();
      const result = await scenario.runFullScenario(locations);

      // All adaptations should have reasonable confidence
      result.adaptedContents
        .filter((content) => content !== null)
        .forEach((content) => {
          expect(content!.confidence).toBeGreaterThan(0.3);
          expect(content!.confidence).toBeLessThanOrEqual(1.0);
        });

      // Context confidence should be reasonable
      result.insights.forEach((insight) => {
        expect(insight.confidence).toBeGreaterThan(0.3);
        expect(insight.confidence).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe("User Preferences Integration", () => {
    it("should respect user preferences across all components", async () => {
      const locations = TestLocationGenerator.generateWalkingSequence();
      const userPreferences: UserContentPreferences = {
        prefersBriefContent: true,
        prefersDetailedContent: false,
        prefersInteractive: false,
        preferredFormats: ["AUDIO"],
        maxContentDuration: 120, // 2 minutes
        complexityPreference: "SIMPLE",
        interactionFrequency: "MINIMAL",
      };

      const result = await scenario.runFullScenario(
        locations,
        undefined,
        userPreferences
      );

      expect(result.errors).toHaveLength(0);

      // Verify preferences are applied
      result.adaptedContents
        .filter((content) => content !== null)
        .forEach((content) => {
          expect(content!.format).toBe("AUDIO");
          expect(content!.duration).toBeLessThanOrEqual(
            userPreferences.maxContentDuration
          );
          expect(content!.complexity).toBe("SIMPLE");
          expect(content!.interactionPoints.length).toBe(0); // Minimal interaction
        });
    });

    it("should balance user preferences with safety requirements", async () => {
      const locations = TestLocationGenerator.generateDrivingSequence();
      const userPreferences: UserContentPreferences = {
        prefersBriefContent: false, // User wants detailed content
        prefersDetailedContent: true,
        prefersInteractive: true, // User wants interaction
        preferredFormats: ["INTERACTIVE", "VISUAL"], // Unsafe while driving
        maxContentDuration: 600, // 10 minutes
        complexityPreference: "COMPLEX",
        interactionFrequency: "FREQUENT",
      };

      const result = await scenario.runFullScenario(
        locations,
        undefined,
        userPreferences
      );

      expect(result.errors).toHaveLength(0);

      // Safety should override user preferences
      const finalContent =
        result.adaptedContents[result.adaptedContents.length - 1];
      expect(finalContent?.format).toBe("AUDIO"); // Safety override
      expect(finalContent?.interactionPoints.length).toBe(0); // No interaction while driving
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle malformed location data gracefully", async () => {
      const malformedLocations: LocationObject[] = [
        {
          coords: {
            latitude: NaN,
            longitude: 10.7522,
            altitude: null as any,
            accuracy: -5, // Invalid accuracy
            altitudeAccuracy: 0,
            heading: 0,
            speed: null as any,
          },
          timestamp: Date.now(),
        },
        {
          coords: {
            latitude: 59.9139,
            longitude: 10.7522,
            altitude: 50,
            accuracy: 5,
            altitudeAccuracy: 5,
            heading: 0,
            speed: 5,
          },
          timestamp: Date.now() + 5000,
        },
      ];

      const result = await scenario.runFullScenario(malformedLocations);

      // Should handle errors gracefully without crashing
      expect(result.speedAnalyses.length).toBeGreaterThan(0);
      expect(result.contexts.length).toBeGreaterThan(0);
    });

    it("should continue processing after individual component failures", async () => {
      const locations = TestLocationGenerator.generateWalkingSequence();
      const { contentEngine } = scenario.getServices();

      // Remove story content to cause adaptation failure
      contentEngine.removeStoryContent("test-story-1");

      const result = await scenario.runFullScenario(locations);

      // Speed detection and context analysis should still work
      expect(result.speedAnalyses.length).toBe(locations.length);
      expect(result.contexts.length).toBe(locations.length);
      expect(result.insights.length).toBe(locations.length);

      // Content adaptation should fail gracefully
      expect(
        result.adaptedContents.every((content) => content === null)
      ).toBeTruthy();
    });

    it("should maintain performance under load", async () => {
      const locations = TestLocationGenerator.generateTransitionSequence();
      const startTime = Date.now();

      // Run multiple scenarios in parallel
      const promises = Array(5)
        .fill(null)
        .map(() => scenario.runFullScenario(locations));

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // All scenarios should succeed
      results.forEach((result) => {
        expect(result.errors.length).toBeLessThanOrEqual(1); // Allow minimal errors
        expect(result.speedAnalyses.length).toBe(locations.length);
      });
    });
  });

  describe("Caching and Performance Integration", () => {
    it("should utilize caching across components effectively", async () => {
      const locations = TestLocationGenerator.generateWalkingSequence();
      const { contextAnalyzer, contentEngine } = scenario.getServices();

      // First run
      await scenario.runFullScenario(locations);

      const initialStats = {
        contextCacheStats: contextAnalyzer.getCacheStats(),
        contentCacheStats: contentEngine.getCacheStats(),
        contentMetrics: contentEngine.getMetrics(),
      };

      // Second run with same locations (should hit cache)
      await scenario.runFullScenario(locations);

      const finalStats = {
        contextCacheStats: contextAnalyzer.getCacheStats(),
        contentCacheStats: contentEngine.getCacheStats(),
        contentMetrics: contentEngine.getMetrics(),
      };

      // Verify caching is working
      expect(finalStats.contextCacheStats.weatherCacheSize).toBeGreaterThan(0);
      expect(finalStats.contentCacheStats.adaptationCacheSize).toBeGreaterThan(
        0
      );
      expect(finalStats.contentMetrics.cacheHitRate).toBeGreaterThan(0);
    });

    it("should maintain reasonable memory usage", async () => {
      const locations = TestLocationGenerator.generateWalkingSequence();
      const { contextAnalyzer, contentEngine } = scenario.getServices();

      // Run multiple scenarios to fill caches
      for (let i = 0; i < 10; i++) {
        await scenario.runFullScenario(locations);
      }

      const cacheStats = {
        context: contextAnalyzer.getCacheStats(),
        content: contentEngine.getCacheStats(),
      };

      // Verify caches don't grow indefinitely
      expect(cacheStats.context.weatherCacheSize).toBeLessThan(50);
      expect(cacheStats.context.locationCacheSize).toBeLessThan(50);
      expect(cacheStats.content.adaptationCacheSize).toBeLessThan(150);
    });
  });

  describe("Real-world Scenario Simulation", () => {
    it("should handle a complete user journey", async () => {
      // Simulate: User starts walking, stops to look at something, then continues
      const journeyLocations: LocationObject[] = [];

      // Phase 1: Walking (3 locations)
      const walkingPhase =
        TestLocationGenerator.generateWalkingSequence().slice(0, 3);
      journeyLocations.push(...walkingPhase);

      // Phase 2: Stop and look around (3 locations)
      const stationaryPhase =
        TestLocationGenerator.generateStationarySequence().slice(0, 3);
      // Adjust timestamps to be sequential
      stationaryPhase.forEach((loc, index) => {
        loc.timestamp =
          walkingPhase[walkingPhase.length - 1].timestamp + (index + 1) * 5000;
      });
      journeyLocations.push(...stationaryPhase);

      // Phase 3: Continue walking (2 locations)
      const continuedWalking =
        TestLocationGenerator.generateWalkingSequence().slice(0, 2);
      continuedWalking.forEach((loc, index) => {
        loc.timestamp =
          stationaryPhase[stationaryPhase.length - 1].timestamp +
          (index + 1) * 4000;
      });
      journeyLocations.push(...continuedWalking);

      const weatherData: WeatherData = {
        condition: "PARTLY_CLOUDY",
        temperature: 16,
        humidity: 70,
        windSpeed: 12,
        visibility: 9,
        pressure: 1012,
        uvIndex: 3,
        lastUpdated: Date.now(),
      };

      const result = await scenario.runFullScenario(
        journeyLocations,
        weatherData
      );

      expect(result.errors).toHaveLength(0);

      // Verify the journey shows different contexts
      const movementModes = result.speedAnalyses.map((a) => a.movementMode);
      expect(movementModes).toContain("WALKING");
      expect(movementModes).toContain("STATIONARY");

      // Verify content recommendations change with context
      const contentRecommendations = result.insights.map((i) =>
        scenario
          .getServices()
          .contentEngine.getContentRecommendations(
            result.contexts[result.insights.indexOf(i)],
            i,
            3
          )
      );

      expect(contentRecommendations.length).toBe(journeyLocations.length);
      expect(
        contentRecommendations.some((recs) => recs.length > 0)
      ).toBeTruthy();
    });
  });
});

describe("Intelligence System Performance", () => {
  it("should meet performance benchmarks", async () => {
    const scenario = new IntelligenceTestScenario();
    const locations = TestLocationGenerator.generateTransitionSequence();

    const startTime = process.hrtime.bigint();
    const result = await scenario.runFullScenario(locations);
    const endTime = process.hrtime.bigint();

    const executionTimeMs = Number(endTime - startTime) / 1_000_000;

    // Performance benchmarks
    expect(executionTimeMs).toBeLessThan(2000); // Complete processing in under 2 seconds
    expect(result.errors).toHaveLength(0);

    const metrics = scenario.getServices().contentEngine.getMetrics();
    expect(metrics.adaptationLatency).toBeLessThan(100); // Average adaptation under 100ms
  });
});
