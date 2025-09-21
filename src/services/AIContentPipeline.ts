import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LocationContext,
  MovementMode,
  EnvironmentType,
  Interest,
} from "./IntelligentLocationService";
import { logger } from "../utils/logger";
import AIStoryService from "./AIStoryService";

export interface ContentRequest {
  locationContext: LocationContext;
  interests: Interest[];
  currentContent?: GeneratedContent;
  forceRefresh?: boolean;
}

export interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  duration: number; // seconds
  movementMode: MovementMode;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  interests: string[];
  createdAt: Date;
  priority: number; // 0-1, higher = more relevant
  audioUrl?: string;
  isPlaying?: boolean;
}

export interface ContentStrategy {
  movementMode: MovementMode;
  contentLength: "short" | "medium" | "long";
  contentType: "story" | "fact" | "legend" | "history";
  refreshInterval: number; // seconds
  priority: number;
}

export class AIContentPipeline {
  private static instance: AIContentPipeline;

  private contentQueue: GeneratedContent[] = [];
  private contentHistory: GeneratedContent[] = [];
  private currentStrategy: ContentStrategy | null = null;
  private lastGenerationTime: number = 0;
  private isGenerating = false;

  // Content generation rules based on movement mode
  private readonly CONTENT_STRATEGIES: Record<MovementMode, ContentStrategy> = {
    [MovementMode.STATIONARY]: {
      movementMode: MovementMode.STATIONARY,
      contentLength: "long",
      contentType: "story",
      refreshInterval: 300, // 5 minutes
      priority: 0.9,
    },
    [MovementMode.WALKING]: {
      movementMode: MovementMode.WALKING,
      contentLength: "medium",
      contentType: "history",
      refreshInterval: 120, // 2 minutes
      priority: 0.8,
    },
    [MovementMode.CYCLING]: {
      movementMode: MovementMode.CYCLING,
      contentLength: "short",
      contentType: "fact",
      refreshInterval: 60, // 1 minute
      priority: 0.6,
    },
    [MovementMode.DRIVING]: {
      movementMode: MovementMode.DRIVING,
      contentLength: "short",
      contentType: "legend",
      refreshInterval: 45, // 45 seconds
      priority: 0.7,
    },
  };

  private constructor() {
    this.loadContentHistory();
  }

  static getInstance(): AIContentPipeline {
    if (!AIContentPipeline.instance) {
      AIContentPipeline.instance = new AIContentPipeline();
    }
    return AIContentPipeline.instance;
  }

  /**
   * Generate content based on current location context
   */
  async generateContent(
    request: ContentRequest
  ): Promise<GeneratedContent | null> {
    const { locationContext, interests, currentContent, forceRefresh } =
      request;

    // Determine content strategy based on movement mode
    const strategy = this.CONTENT_STRATEGIES[locationContext.movementMode];
    this.currentStrategy = strategy;

    // Check if we need to generate new content
    const shouldGenerate = this.shouldGenerateNewContent(
      locationContext,
      strategy,
      currentContent,
      forceRefresh || false
    );

    if (!shouldGenerate) {
      return this.getBestQueuedContent(locationContext, interests);
    }

    // Prevent concurrent generation
    if (this.isGenerating) {
      return this.getBestQueuedContent(locationContext, interests);
    }

    this.isGenerating = true;

    try {
      const content = await this.createIntelligentContent(
        locationContext,
        interests,
        strategy
      );

      if (content) {
        // Add to queue and history
        this.contentQueue.push(content);
        this.contentHistory.push(content);

        // Maintain queue size
        if (this.contentQueue.length > 10) {
          this.contentQueue.shift();
        }

        // Maintain history size
        if (this.contentHistory.length > 50) {
          this.contentHistory.shift();
        }

        this.lastGenerationTime = Date.now();
        await this.saveContentHistory();

        logger.info(
          `Generated content: ${content.title} (${content.movementMode})`
        );
        return content;
      }
    } catch (error) {
      logger.error("Content generation failed:", error);
    } finally {
      this.isGenerating = false;
    }

    return this.getBestQueuedContent(locationContext, interests);
  }

  /**
   * Get the next best content from queue
   */
  getNextContent(
    currentContext: LocationContext,
    interests: Interest[]
  ): GeneratedContent | null {
    return this.getBestQueuedContent(currentContext, interests);
  }

  /**
   * Mark content as played/consumed
   */
  markContentAsPlayed(contentId: string): void {
    // Remove from queue
    this.contentQueue = this.contentQueue.filter(
      (content) => content.id !== contentId
    );

    // Update in history
    const historyItem = this.contentHistory.find(
      (content) => content.id === contentId
    );
    if (historyItem) {
      historyItem.isPlaying = false;
    }

    logger.info(`Content marked as played: ${contentId}`);
  }

  /**
   * Get content history for analytics
   */
  getContentHistory(): GeneratedContent[] {
    return [...this.contentHistory];
  }

  /**
   * Clear all content and reset
   */
  async clearAllContent(): Promise<void> {
    this.contentQueue = [];
    this.contentHistory = [];
    this.lastGenerationTime = 0;
    await AsyncStorage.removeItem("echotrail_content_history");
    logger.info("All content cleared");
  }

  /**
   * Determine if new content should be generated
   */
  private shouldGenerateNewContent(
    context: LocationContext,
    strategy: ContentStrategy,
    currentContent?: GeneratedContent,
    forceRefresh = false
  ): boolean {
    if (forceRefresh) return true;

    // Check time since last generation
    const timeSinceLastGeneration =
      (Date.now() - this.lastGenerationTime) / 1000;
    if (timeSinceLastGeneration < strategy.refreshInterval) {
      return false;
    }

    // Check if movement mode changed significantly
    if (
      currentContent &&
      currentContent.movementMode !== context.movementMode
    ) {
      return true;
    }

    // Check if location changed significantly (for stationary mode)
    if (
      context.movementMode === MovementMode.STATIONARY &&
      context.stationaryDuration > 5
    ) {
      return true;
    }

    // Check queue size - generate if running low
    const relevantQueueSize = this.contentQueue.filter(
      (content) => content.movementMode === context.movementMode
    ).length;

    return relevantQueueSize < 2;
  }

  /**
   * Create intelligent content using AI service
   */
  private async createIntelligentContent(
    context: LocationContext,
    interests: Interest[],
    strategy: ContentStrategy
  ): Promise<GeneratedContent | null> {
    try {
      // Prepare context for AI generation
      const aiRequest = this.buildAIRequest(context, interests, strategy);

      // Generate story using existing AI service
      const mockLocationObject = {
        coords: {
          latitude: aiRequest.latitude,
          longitude: aiRequest.longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      const story = await AIStoryService.generateStory(
        mockLocationObject,
        interests.map((i) => ({ id: `${i.name}_${i.category}`, name: i.name }))
      );

      if (!story) {
        logger.warn("AI service returned no story");
        return null;
      }

      // Calculate content priority based on context
      const priority = this.calculateContentPriority(
        context,
        interests,
        strategy
      );

      // Estimate content duration (words per minute for TTS)
      const wordCount = story._content.split(" ").length;
      const estimatedDuration = Math.ceil((wordCount / 150) * 60); // 150 WPM average TTS

      return {
        id: this.generateContentId(),
        title: story._title,
        content: story._content,
        duration: estimatedDuration,
        movementMode: context.movementMode,
        location: {
          latitude: context.currentLocation.coords.latitude,
          longitude: context.currentLocation.coords.longitude,
        },
        interests: interests.map((i) => i.name),
        createdAt: new Date(),
        priority,
        isPlaying: false,
      };
    } catch (error) {
      logger.error("Failed to create intelligent content:", error);
      return null;
    }
  }

  /**
   * Build AI request with intelligent context
   */
  private buildAIRequest(
    context: LocationContext,
    interests: Interest[],
    strategy: ContentStrategy
  ): any {
    const location = context.currentLocation.coords;

    // Build context-aware prompt
    let contextPrompt = "";

    switch (context.movementMode) {
      case MovementMode.STATIONARY:
        contextPrompt = `Personen har stoppet opp på denne lokasjonen i ${context.stationaryDuration} minutter. `;
        contextPrompt +=
          "De har tid til å lytte til en detaljert historie eller dyp utforskning av området.";
        break;
      case MovementMode.WALKING:
        contextPrompt = `Personen går rolig gjennom området med hastighet ${context.speed.toFixed(1)} km/t. `;
        contextPrompt +=
          "De kan følge med på en medium-lengde historie mens de beveger seg.";
        break;
      case MovementMode.CYCLING:
        contextPrompt = `Personen sykler gjennom området med hastighet ${context.speed.toFixed(1)} km/t. `;
        contextPrompt +=
          "De trenger kort, engasjerende innhold de kan følge med på mens de fokuserer på sykling.";
        break;
      case MovementMode.DRIVING:
        contextPrompt = `Personen kjører bil gjennom området med hastighet ${context.speed.toFixed(1)} km/t. `;
        contextPrompt +=
          "De trenger kort, fengslende innhold som ikke avleder oppmerksomheten fra kjøring.";
        break;
    }

    // Add environment context
    switch (context.environment) {
      case EnvironmentType.NATURE:
        contextPrompt += " De befinner seg i et naturområde.";
        break;
      case EnvironmentType.HISTORIC:
        contextPrompt += " De befinner seg i et historisk område.";
        break;
      case EnvironmentType.URBAN:
        contextPrompt += " De befinner seg i et urbant område.";
        break;
    }

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      interests: interests.map((i) => ({ name: i.name, category: i.category })),
      template: strategy.contentType,
      contextPrompt,
      contentLength: strategy.contentLength,
      movementMode: context.movementMode,
      speed: context.speed,
      environment: context.environment,
    };
  }

  /**
   * Calculate content priority based on relevance
   */
  private calculateContentPriority(
    context: LocationContext,
    interests: Interest[],
    strategy: ContentStrategy
  ): number {
    let priority = strategy.priority;

    // Boost priority for user's top interests
    const topInterests = interests.filter((i) => i.weight > 0.7);
    if (topInterests.length > 0) {
      priority += 0.1;
    }

    // Boost for stationary content (more engagement opportunity)
    if (
      context.movementMode === MovementMode.STATIONARY &&
      context.stationaryDuration > 2
    ) {
      priority += 0.1;
    }

    // Reduce priority for repeat locations
    const recentSimilarContent = this.contentHistory
      .filter((content) => {
        const distance = this.calculateDistance(
          content.location.latitude,
          content.location.longitude,
          context.currentLocation.coords.latitude,
          context.currentLocation.coords.longitude
        );
        return distance < 0.1; // Within 100 meters
      })
      .filter((content) => {
        const age =
          (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60); // Hours
        return age < 24; // Within 24 hours
      });

    if (recentSimilarContent.length > 0) {
      priority *= 0.7; // Reduce by 30%
    }

    return Math.min(1, Math.max(0, priority));
  }

  /**
   * Get best queued content for current context
   */
  private getBestQueuedContent(
    context: LocationContext,
    interests: Interest[]
  ): GeneratedContent | null {
    if (this.contentQueue.length === 0) return null;

    // Filter content suitable for current movement mode
    const suitableContent = this.contentQueue.filter((content) => {
      // Exact match is best
      if (content.movementMode === context.movementMode) return true;

      // Allow some flexibility for content consumption
      if (
        context.movementMode === MovementMode.WALKING &&
        content.movementMode === MovementMode.STATIONARY
      )
        return true;

      if (
        context.movementMode === MovementMode.CYCLING &&
        content.movementMode === MovementMode.WALKING
      )
        return true;

      return false;
    });

    if (suitableContent.length === 0) {
      // If no suitable content, take the best available
      return this.contentQueue.reduce((best, content) =>
        content.priority > best.priority ? content : best
      );
    }

    // Sort by priority and recency
    suitableContent.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (Math.abs(priorityDiff) > 0.1) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return suitableContent[0];
  }

  /**
   * Generate unique content ID
   */
  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate distance between two points (simple version)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Save content history to storage
   */
  private async saveContentHistory(): Promise<void> {
    try {
      const historyToSave = this.contentHistory.slice(-20); // Keep last 20 items
      await AsyncStorage.setItem(
        "echotrail_content_history",
        JSON.stringify(historyToSave)
      );
    } catch (error) {
      logger.warn("Failed to save content history:", error);
    }
  }

  /**
   * Load content history from storage
   */
  private async loadContentHistory(): Promise<void> {
    try {
      const historyJson = await AsyncStorage.getItem(
        "echotrail_content_history"
      );
      if (historyJson) {
        const history = JSON.parse(historyJson);
        this.contentHistory = history.map((content: any) => ({
          ...content,
          createdAt: new Date(content.createdAt),
        }));
      }
    } catch (error) {
      logger.warn("Failed to load content history:", error);
    }
  }
}

export default AIContentPipeline.getInstance();
