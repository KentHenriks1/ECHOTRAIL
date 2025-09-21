// AdaptiveContentEngine.ts - Intelligent content adaptation for EchoTrail
// Adapts story content based on movement mode, environmental context, and user preferences

import {
  ContextualEnvironment,
  ContextualInsights,
  ContentSuggestion,
} from "./ContextAnalyzer";
import { MovementMode } from "./SpeedDetector";

export type ContentFormat = "AUDIO" | "TEXT" | "VISUAL" | "INTERACTIVE";
export type ContentLength = "MICRO" | "SHORT" | "MEDIUM" | "LONG" | "EXTENDED";
export type ContentComplexity = "SIMPLE" | "MODERATE" | "COMPLEX" | "EXPERT";
export type DeliveryTiming =
  | "IMMEDIATE"
  | "QUEUED"
  | "SCHEDULED"
  | "OPPORTUNISTIC";

export interface StoryContent {
  id: string;
  title: string;
  originalText: string;
  adaptedVersions: Map<string, AdaptedContent>;
  metadata: ContentMetadata;
  tags: string[];
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // meters
  };
}

export interface AdaptedContent {
  text: string;
  audioScript?: string;
  duration: number; // seconds
  format: ContentFormat;
  length: ContentLength;
  complexity: ContentComplexity;
  interactionPoints: InteractionPoint[];
  adaptationContext: string;
  confidence: number; // 0-1, how well adapted this version is
}

export interface ContentMetadata {
  type: "HISTORICAL" | "NATURAL" | "CULTURAL" | "PERSONAL" | "INFORMATIONAL";
  era?: string;
  themes: string[];
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimatedReadTime: number; // minutes
  keywords: string[];
  emotionalTone:
    | "NEUTRAL"
    | "INSPIRING"
    | "MYSTERIOUS"
    | "DRAMATIC"
    | "PEACEFUL";
  ageAppropriate: boolean;
}

export interface InteractionPoint {
  timestamp: number; // seconds into content
  type: "QUESTION" | "CHOICE" | "PAUSE" | "REFLECTION" | "ACTION";
  content: string;
  options?: string[];
  expectedDuration: number; // seconds
  optional: boolean;
}

export interface AdaptationStrategy {
  contextHash: string;
  lengthReduction: number; // 0-1, how much to reduce length
  complexityAdjustment: number; // -2 to +2, complexity change
  interactionLevel: number; // 0-1, amount of interaction to include
  focusAreas: string[]; // Which aspects to emphasize
  avoidAreas: string[]; // Which aspects to de-emphasize
  deliverySpeed: number; // 0.5-2.0, relative speed multiplier
  formatPreference: ContentFormat[];
}

export interface ContentRecommendation {
  content: StoryContent;
  adaptedVersion: AdaptedContent;
  relevanceScore: number; // 0-1
  deliveryTiming: DeliveryTiming;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  estimatedEngagement: number; // 0-1
}

export interface AdaptationMetrics {
  totalAdaptations: number;
  successfulAdaptations: number;
  averageConfidence: number;
  contextTypes: Map<string, number>;
  adaptationLatency: number; // ms
  cacheHitRate: number;
}

/**
 * Intelligent content adaptation engine that modifies story content
 * based on user context, movement patterns, and environmental factors
 */
export class AdaptiveContentEngine {
  private contentLibrary: Map<string, StoryContent> = new Map();
  private adaptationCache: Map<string, AdaptedContent> = new Map();
  private strategyCache: Map<string, AdaptationStrategy> = new Map();
  private adaptationMetrics: AdaptationMetrics = {
    totalAdaptations: 0,
    successfulAdaptations: 0,
    averageConfidence: 0,
    contextTypes: new Map(),
    adaptationLatency: 0,
    cacheHitRate: 0,
  };

  private readonly maxCacheSize = 100;
  private readonly confidenceThreshold = 0.7;

  /**
   * Adapt story content based on current context and insights
   */
  async adaptContent(
    contentId: string,
    context: ContextualEnvironment,
    insights: ContextualInsights,
    userPreferences?: UserContentPreferences
  ): Promise<AdaptedContent | null> {
    const startTime = Date.now();

    const story = this.contentLibrary.get(contentId);
    if (!story) {
      return null;
    }

    // Generate context hash for caching
    const contextHash = this.generateContextHash(context, insights);
    const cacheKey = `${contentId}_${contextHash}`;

    // Check cache first
    const cached = this.adaptationCache.get(cacheKey);
    if (cached) {
      this.updateMetrics(Date.now() - startTime, true, cached.confidence);
      return cached;
    }

    // Create adaptation strategy
    const strategy = this.createAdaptationStrategy(
      context,
      insights,
      story,
      userPreferences
    );

    // Perform adaptation
    const adaptedContent = await this.performAdaptation(
      story,
      strategy,
      context
    );

    // Cache the result
    this.cacheAdaptation(cacheKey, adaptedContent);

    // Update metrics
    this.updateMetrics(
      Date.now() - startTime,
      false,
      adaptedContent.confidence
    );

    return adaptedContent;
  }

  /**
   * Get content recommendations based on context
   */
  getContentRecommendations(
    context: ContextualEnvironment,
    insights: ContextualInsights,
    maxRecommendations: number = 5
  ): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = [];

    for (const [contentId, story] of Array.from(
      this.contentLibrary.entries()
    )) {
      const relevanceScore = this.calculateRelevanceScore(
        story,
        context,
        insights
      );

      if (relevanceScore > 0.3) {
        // Minimum relevance threshold
        const adaptedVersion = this.adaptationCache.get(
          `${contentId}_${this.generateContextHash(context, insights)}`
        );

        if (adaptedVersion || relevanceScore > 0.6) {
          const recommendation: ContentRecommendation = {
            content: story,
            adaptedVersion:
              adaptedVersion || this.createQuickAdaptation(story, context),
            relevanceScore,
            deliveryTiming: this.determineDeliveryTiming(context, story),
            priority: this.calculatePriority(relevanceScore, context),
            reason: this.generateRecommendationReason(story, context, insights),
            estimatedEngagement: this.estimateEngagement(story, context),
          };

          recommendations.push(recommendation);
        }
      }
    }

    // Sort by relevance and priority
    return recommendations
      .sort((a, b) => {
        const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const priorityDiff =
          priorityWeight[b.priority] - priorityWeight[a.priority];
        return priorityDiff !== 0
          ? priorityDiff
          : b.relevanceScore - a.relevanceScore;
      })
      .slice(0, maxRecommendations);
  }

  /**
   * Add story content to the library
   */
  addStoryContent(story: StoryContent): void {
    this.contentLibrary.set(story.id, story);
  }

  /**
   * Remove story content from library
   */
  removeStoryContent(contentId: string): boolean {
    return this.contentLibrary.delete(contentId);
  }

  /**
   * Create adaptation strategy based on context
   */
  private createAdaptationStrategy(
    context: ContextualEnvironment,
    insights: ContextualInsights,
    story: StoryContent,
    userPreferences?: UserContentPreferences
  ): AdaptationStrategy {
    const contextHash = this.generateContextHash(context, insights);
    const cached = this.strategyCache.get(contextHash);

    if (cached) {
      return cached;
    }

    let lengthReduction = 0;
    let complexityAdjustment = 0;
    let interactionLevel = 0.5;
    let deliverySpeed = 1.0;
    const focusAreas: string[] = [];
    const avoidAreas: string[] = [];
    const formatPreference: ContentFormat[] = [];

    // Adapt based on movement mode
    switch (context.movement.movementMode) {
      case "DRIVING":
        lengthReduction = 0.7; // Significant reduction
        complexityAdjustment = -2;
        interactionLevel = 0.1; // Minimal interaction
        deliverySpeed = 0.8; // Slower delivery
        formatPreference.push("AUDIO");
        avoidAreas.push("complex-details", "visual-elements");
        break;

      case "CYCLING":
        lengthReduction = 0.5;
        complexityAdjustment = -1;
        interactionLevel = 0.2;
        deliverySpeed = 0.9;
        formatPreference.push("AUDIO");
        avoidAreas.push("long-descriptions");
        break;

      case "WALKING":
        lengthReduction = 0.2;
        complexityAdjustment = 0;
        interactionLevel = 0.7;
        deliverySpeed = 1.0;
        formatPreference.push("AUDIO", "VISUAL");
        focusAreas.push("immersive-details");
        break;

      case "STATIONARY":
        lengthReduction = 0;
        complexityAdjustment = 1;
        interactionLevel = 1.0;
        deliverySpeed = 1.0;
        formatPreference.push("INTERACTIVE", "VISUAL", "TEXT");
        focusAreas.push("detailed-exploration");
        break;
    }

    // Adapt based on available time
    switch (context.availableTime) {
      case "SHORT":
        lengthReduction = Math.max(lengthReduction, 0.6);
        focusAreas.push("key-points", "highlights");
        avoidAreas.push("background-context", "detailed-explanations");
        break;

      case "MEDIUM":
        lengthReduction = Math.max(lengthReduction, 0.3);
        focusAreas.push("main-story", "context");
        break;

      case "LONG":
        focusAreas.push("full-narrative", "rich-details", "exploration");
        break;
    }

    // Adapt based on attention level
    switch (context.attentionLevel) {
      case "LOW":
        complexityAdjustment = Math.min(complexityAdjustment, -1);
        interactionLevel = Math.min(interactionLevel, 0.2);
        focusAreas.push("simple-concepts", "clear-narrative");
        avoidAreas.push("complex-analysis", "multiple-themes");
        break;

      case "HIGH":
        complexityAdjustment = Math.max(complexityAdjustment, 0);
        interactionLevel = Math.max(interactionLevel, 0.6);
        focusAreas.push("deep-analysis", "connections", "implications");
        break;
    }

    // Apply user preferences
    if (userPreferences) {
      if (userPreferences.prefersBriefContent) {
        lengthReduction = Math.max(lengthReduction, 0.4);
      }
      if (userPreferences.prefersDetailedContent) {
        lengthReduction = Math.min(lengthReduction, 0.2);
        complexityAdjustment = Math.max(complexityAdjustment, 0);
      }
      if (userPreferences.prefersInteractive) {
        interactionLevel = Math.max(interactionLevel, 0.6);
      }
    }

    const strategy: AdaptationStrategy = {
      contextHash,
      lengthReduction,
      complexityAdjustment,
      interactionLevel,
      focusAreas,
      avoidAreas,
      deliverySpeed,
      formatPreference,
    };

    this.strategyCache.set(contextHash, strategy);
    return strategy;
  }

  /**
   * Perform content adaptation based on strategy
   */
  private async performAdaptation(
    story: StoryContent,
    strategy: AdaptationStrategy,
    context: ContextualEnvironment
  ): Promise<AdaptedContent> {
    const originalText = story.originalText;
    let adaptedText = originalText;

    // Apply length reduction
    if (strategy.lengthReduction > 0) {
      adaptedText = this.reduceContentLength(
        adaptedText,
        strategy.lengthReduction,
        strategy.focusAreas
      );
    }

    // Apply complexity adjustment
    adaptedText = this.adjustComplexity(
      adaptedText,
      strategy.complexityAdjustment
    );

    // Generate interaction points
    const interactionPoints = this.generateInteractionPoints(
      adaptedText,
      strategy.interactionLevel,
      context
    );

    // Determine content properties
    const duration = this.estimateContentDuration(
      adaptedText,
      strategy.deliverySpeed
    );
    const length = this.categorizeLength(adaptedText, duration);
    const complexity = this.categorizeComplexity(strategy.complexityAdjustment);
    const format = this.selectFormat(strategy.formatPreference, context);

    // Generate audio script if needed
    let audioScript: string | undefined;
    if (format === "AUDIO") {
      audioScript = this.generateAudioScript(adaptedText, context);
    }

    // Calculate adaptation confidence
    const confidence = this.calculateAdaptationConfidence(
      originalText,
      adaptedText,
      strategy,
      context
    );

    return {
      text: adaptedText,
      audioScript,
      duration,
      format,
      length,
      complexity,
      interactionPoints,
      adaptationContext: strategy.contextHash,
      confidence,
    };
  }

  /**
   * Reduce content length while preserving key information
   */
  private reduceContentLength(
    text: string,
    reductionFactor: number,
    focusAreas: string[]
  ): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const targetLength = Math.ceil(sentences.length * (1 - reductionFactor));

    // Score sentences by importance
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence: sentence.trim(),
      score: this.scoreSentenceImportance(
        sentence,
        focusAreas,
        index,
        sentences.length
      ),
    }));

    // Select top sentences
    const selectedSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, targetLength)
      .sort(
        (a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
      );

    return selectedSentences.map((s) => s.sentence).join(". ") + ".";
  }

  /**
   * Score sentence importance for content reduction
   */
  private scoreSentenceImportance(
    sentence: string,
    focusAreas: string[],
    position: number,
    totalSentences: number
  ): number {
    let score = 1;

    // Position-based scoring (beginning and end are more important)
    const positionRatio = position / totalSentences;
    if (positionRatio < 0.2 || positionRatio > 0.8) {
      score += 0.5;
    }

    // Length-based scoring (moderate length sentences preferred)
    const words = sentence.split(" ").length;
    if (words >= 8 && words <= 20) {
      score += 0.3;
    }

    // Focus area scoring
    focusAreas.forEach((area) => {
      const keywords = this.getFocusAreaKeywords(area);
      keywords.forEach((keyword) => {
        if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
          score += 0.4;
        }
      });
    });

    // Keyword density (avoid overly keyword-heavy sentences)
    const keywordDensity = this.calculateKeywordDensity(sentence);
    if (keywordDensity > 0.3) {
      score -= 0.2;
    }

    return Math.max(0, score);
  }

  /**
   * Get keywords for focus areas
   */
  private getFocusAreaKeywords(area: string): string[] {
    const keywordMap: Record<string, string[]> = {
      "key-points": ["important", "significant", "notable", "crucial", "main"],
      highlights: [
        "remarkable",
        "fascinating",
        "unique",
        "special",
        "extraordinary",
      ],
      "historical-context": ["history", "historical", "past", "ancient", "era"],
      "cultural-significance": [
        "culture",
        "tradition",
        "heritage",
        "customs",
        "society",
      ],
      "natural-features": [
        "natural",
        "landscape",
        "environment",
        "wildlife",
        "scenic",
      ],
    };

    return keywordMap[area] || [];
  }

  /**
   * Calculate keyword density in text
   */
  private calculateKeywordDensity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  /**
   * Adjust content complexity
   */
  private adjustComplexity(text: string, adjustment: number): string {
    if (adjustment === 0) return text;

    // Simple complexity adjustment - in practice would use NLP
    if (adjustment < 0) {
      // Simplify: shorter sentences, simpler words
      return text
        .replace(/([.!?])\s+([A-Z])/g, "$1 $2") // Keep sentence breaks
        .replace(/\b(however|nevertheless|furthermore|consequently)\b/gi, "but")
        .replace(/\b(utilize|commence|terminate)\b/gi, (match) => {
          const replacements: Record<string, string> = {
            utilize: "use",
            commence: "start",
            terminate: "end",
          };
          return replacements[match.toLowerCase()] || match;
        });
    } else {
      // Add complexity: more sophisticated vocabulary and structure
      return text
        .replace(/\bbut\b/gi, "however")
        .replace(/\bstart\b/gi, "commence")
        .replace(/\bend\b/gi, "conclude");
    }
  }

  /**
   * Generate interaction points in content
   */
  private generateInteractionPoints(
    text: string,
    interactionLevel: number,
    context: ContextualEnvironment
  ): InteractionPoint[] {
    const interactions: InteractionPoint[] = [];
    const sentences = text.split(/[.!?]+/);
    const targetInteractions = Math.floor(
      sentences.length * interactionLevel * 0.3
    );

    for (let i = 0; i < targetInteractions; i++) {
      const position = ((i + 1) / (targetInteractions + 1)) * text.length;
      const timestamp =
        (position / text.length) * this.estimateContentDuration(text, 1.0);

      let interaction: InteractionPoint;

      if (
        context.movement.movementMode === "STATIONARY" &&
        Math.random() > 0.5
      ) {
        interaction = {
          timestamp,
          type: "CHOICE",
          content: "What would you like to explore next?",
          options: ["Continue story", "Learn more details", "Skip to end"],
          expectedDuration: 10,
          optional: true,
        };
      } else if (context.attentionLevel === "HIGH" && Math.random() > 0.7) {
        interaction = {
          timestamp,
          type: "QUESTION",
          content: "Can you imagine what this place looked like back then?",
          expectedDuration: 5,
          optional: true,
        };
      } else {
        interaction = {
          timestamp,
          type: "PAUSE",
          content: "Take a moment to look around...",
          expectedDuration: 3,
          optional: true,
        };
      }

      interactions.push(interaction);
    }

    return interactions;
  }

  /**
   * Estimate content duration in seconds
   */
  private estimateContentDuration(
    text: string,
    speedMultiplier: number
  ): number {
    const wordsPerMinute = 160; // Average speaking rate
    const words = text.split(/\s+/).length;
    const baseMinutes = words / wordsPerMinute;
    return Math.ceil((baseMinutes * 60) / speedMultiplier);
  }

  /**
   * Categorize content length
   */
  private categorizeLength(text: string, duration: number): ContentLength {
    const words = text.split(/\s+/).length;

    if (words < 50 || duration < 30) return "MICRO";
    if (words < 150 || duration < 90) return "SHORT";
    if (words < 400 || duration < 240) return "MEDIUM";
    if (words < 800 || duration < 480) return "LONG";
    return "EXTENDED";
  }

  /**
   * Categorize complexity level
   */
  private categorizeComplexity(adjustment: number): ContentComplexity {
    if (adjustment <= -2) return "SIMPLE";
    if (adjustment <= 0) return "MODERATE";
    if (adjustment <= 1) return "COMPLEX";
    return "EXPERT";
  }

  /**
   * Select appropriate content format
   */
  private selectFormat(
    preferences: ContentFormat[],
    context: ContextualEnvironment
  ): ContentFormat {
    // Safety first - no visual content while driving
    if (context.movement.movementMode === "DRIVING") {
      return "AUDIO";
    }

    // Return first preference that's appropriate
    for (const format of preferences) {
      if (this.isFormatAppropriate(format, context)) {
        return format;
      }
    }

    // Default fallback
    return "AUDIO";
  }

  /**
   * Check if format is appropriate for context
   */
  private isFormatAppropriate(
    format: ContentFormat,
    context: ContextualEnvironment
  ): boolean {
    switch (format) {
      case "VISUAL":
        return (
          context.movement.movementMode !== "DRIVING" &&
          context.attentionLevel !== "LOW" &&
          context.timeOfDay !== "NIGHT"
        );
      case "INTERACTIVE":
        return (
          context.movement.movementMode === "STATIONARY" &&
          context.attentionLevel === "HIGH" &&
          context.availableTime !== "SHORT"
        );
      case "TEXT":
        return (
          context.movement.movementMode === "STATIONARY" &&
          context.attentionLevel !== "LOW"
        );
      case "AUDIO":
        return true; // Always appropriate
      default:
        return true;
    }
  }

  /**
   * Generate audio script optimized for speech
   */
  private generateAudioScript(
    text: string,
    context: ContextualEnvironment
  ): string {
    let script = text;

    // Add pauses for better audio flow
    script = script.replace(/([.!?])\s+/g, "$1... ");

    // Add emphasis markers
    script = script.replace(
      /\b(important|significant|remarkable|fascinating)\b/gi,
      "**$1**"
    );

    // Add pronunciation guides if needed
    script = this.addPronunciationGuides(script);

    // Add ambient sound cues based on context
    if (context.location.environmentType === "FOREST") {
      script = "[Sound: Gentle forest ambience] " + script;
    } else if (context.location.environmentType === "COASTAL") {
      script = "[Sound: Ocean waves] " + script;
    }

    return script;
  }

  /**
   * Add pronunciation guides for difficult words
   */
  private addPronunciationGuides(text: string): string {
    const pronunciationMap: Record<string, string> = {
      queue: "queue (cue)",
      colonel: "colonel (kernel)",
      Wednesday: "Wednesday (WENZ-day)",
    };

    let result = text;
    Object.entries(pronunciationMap).forEach(([word, guide]) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      result = result.replace(regex, guide);
    });

    return result;
  }

  /**
   * Calculate adaptation confidence
   */
  private calculateAdaptationConfidence(
    originalText: string,
    adaptedText: string,
    strategy: AdaptationStrategy,
    context: ContextualEnvironment
  ): number {
    let confidence = 0.5; // Base confidence

    // Content preservation (how much of original meaning is retained)
    const lengthRatio = adaptedText.length / originalText.length;
    const expectedRatio = 1 - strategy.lengthReduction;
    const lengthScore = 1 - Math.abs(lengthRatio - expectedRatio);
    confidence += lengthScore * 0.3;

    // Strategy appropriateness
    const contextScore = this.evaluateStrategyAppropriate(strategy, context);
    confidence += contextScore * 0.4;

    // Adaptation quality (semantic similarity would be measured in practice)
    const qualityScore = this.estimateAdaptationQuality(
      originalText,
      adaptedText
    );
    confidence += qualityScore * 0.3;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Evaluate how appropriate the strategy is for the context
   */
  private evaluateStrategyAppropriate(
    strategy: AdaptationStrategy,
    context: ContextualEnvironment
  ): number {
    let score = 0.5;

    // Check format appropriateness
    const format = strategy.formatPreference[0];
    if (format && this.isFormatAppropriate(format, context)) {
      score += 0.2;
    }

    // Check length reduction appropriateness
    if (context.availableTime === "SHORT" && strategy.lengthReduction > 0.4) {
      score += 0.2;
    }
    if (context.availableTime === "LONG" && strategy.lengthReduction < 0.3) {
      score += 0.2;
    }

    // Check interaction level appropriateness
    if (
      context.movement.movementMode === "STATIONARY" &&
      strategy.interactionLevel > 0.6
    ) {
      score += 0.1;
    }
    if (
      context.movement.movementMode === "DRIVING" &&
      strategy.interactionLevel < 0.3
    ) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Estimate adaptation quality
   */
  private estimateAdaptationQuality(
    originalText: string,
    adaptedText: string
  ): number {
    // Simple heuristic-based quality assessment
    // In practice, would use semantic similarity models

    const originalWords = new Set(originalText.toLowerCase().split(/\s+/));
    const adaptedWords = new Set(adaptedText.toLowerCase().split(/\s+/));

    const intersection = new Set(
      Array.from(originalWords).filter((x) => adaptedWords.has(x))
    );
    const union = new Set([
      ...Array.from(originalWords),
      ...Array.from(adaptedWords),
    ]);

    const jaccardSimilarity = intersection.size / union.size;

    // Penalize if adaptation is too short or too long
    const lengthRatio = adaptedText.length / originalText.length;
    const lengthPenalty = lengthRatio > 1.5 || lengthRatio < 0.1 ? -0.3 : 0;

    return Math.max(0, Math.min(1, jaccardSimilarity + lengthPenalty));
  }

  /**
   * Calculate relevance score for content recommendation
   */
  private calculateRelevanceScore(
    story: StoryContent,
    context: ContextualEnvironment,
    insights: ContextualInsights
  ): number {
    let score = 0;

    // Location-based relevance
    if (story.location && this.isLocationRelevant(story.location, context)) {
      score += 0.4;
    }

    // Content type relevance
    const contentSuggestions = insights.contentSuggestions;
    for (const suggestion of contentSuggestions) {
      if (story.metadata.type.toLowerCase() === suggestion.type.toLowerCase()) {
        const priorityWeight = { HIGH: 0.3, MEDIUM: 0.2, LOW: 0.1 };
        score += priorityWeight[suggestion.priority];
      }
    }

    // Activity context relevance
    score += this.getActivityRelevance(story, context.activityContext);

    // Time of day relevance
    score += this.getTimeRelevance(story, context.timeOfDay);

    // Weather relevance
    if (context.weather) {
      score += this.getWeatherRelevance(story, context.weather.condition);
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if story location is relevant to current location
   */
  private isLocationRelevant(
    storyLocation: { latitude: number; longitude: number; radius: number },
    context: ContextualEnvironment
  ): boolean {
    // Simple distance check - in practice would use proper geospatial functions
    return true; // Simplified for this implementation
  }

  /**
   * Get activity-based relevance score
   */
  private getActivityRelevance(story: StoryContent, activity: string): number {
    const activityRelevance: Record<string, Record<string, number>> = {
      HISTORICAL: {
        SIGHTSEEING: 0.3,
        LEISURE: 0.2,
        COMMUTING: 0.1,
      },
      NATURAL: {
        EXERCISE: 0.3,
        LEISURE: 0.2,
        SIGHTSEEING: 0.2,
      },
      CULTURAL: {
        SIGHTSEEING: 0.3,
        LEISURE: 0.2,
      },
    };

    return activityRelevance[story.metadata.type]?.[activity] || 0;
  }

  /**
   * Get time-based relevance score
   */
  private getTimeRelevance(story: StoryContent, timeOfDay: string): number {
    // Different story types might be more relevant at different times
    const timeRelevance: Record<string, Record<string, number>> = {
      HISTORICAL: {
        AFTERNOON: 0.1,
        EVENING: 0.05,
      },
      NATURAL: {
        MORNING: 0.1,
        EVENING: 0.1,
      },
    };

    return timeRelevance[story.metadata.type]?.[timeOfDay] || 0;
  }

  /**
   * Get weather-based relevance score
   */
  private getWeatherRelevance(story: StoryContent, weather: string): number {
    // Some content might be more relevant in certain weather
    if (story.metadata.themes.includes("indoor") && weather === "RAINY") {
      return 0.1;
    }
    if (story.metadata.themes.includes("outdoor") && weather === "CLEAR") {
      return 0.1;
    }

    return 0;
  }

  /**
   * Create quick adaptation for recommendations
   */
  private createQuickAdaptation(
    story: StoryContent,
    context: ContextualEnvironment
  ): AdaptedContent {
    // Simple adaptation for quick recommendations
    const lengthReduction = context.availableTime === "SHORT" ? 0.5 : 0.2;
    const adaptedText = this.reduceContentLength(
      story.originalText,
      lengthReduction,
      ["key-points"]
    );

    return {
      text: adaptedText,
      duration: this.estimateContentDuration(adaptedText, 1.0),
      format: context.movement.movementMode === "DRIVING" ? "AUDIO" : "TEXT",
      length: this.categorizeLength(
        adaptedText,
        this.estimateContentDuration(adaptedText, 1.0)
      ),
      complexity: "MODERATE",
      interactionPoints: [],
      adaptationContext: "quick_adaptation",
      confidence: 0.6,
    };
  }

  /**
   * Determine delivery timing for content
   */
  private determineDeliveryTiming(
    context: ContextualEnvironment,
    story: StoryContent
  ): DeliveryTiming {
    if (context.movement.movementMode === "DRIVING") {
      return "OPPORTUNISTIC"; // Wait for safe moment
    }

    if (context.attentionLevel === "LOW") {
      return "QUEUED"; // Wait for better attention
    }

    if (story.location && this.isLocationRelevant(story.location, context)) {
      return "IMMEDIATE"; // Location-relevant content should be immediate
    }

    return "SCHEDULED"; // Standard scheduling
  }

  /**
   * Calculate content priority
   */
  private calculatePriority(
    relevanceScore: number,
    context: ContextualEnvironment
  ): "URGENT" | "HIGH" | "MEDIUM" | "LOW" {
    if (relevanceScore > 0.8 && context.availableTime !== "SHORT") {
      return "URGENT";
    }
    if (relevanceScore > 0.6) {
      return "HIGH";
    }
    if (relevanceScore > 0.4) {
      return "MEDIUM";
    }
    return "LOW";
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    story: StoryContent,
    context: ContextualEnvironment,
    insights: ContextualInsights
  ): string {
    const reasons = [];

    if (story.location) {
      reasons.push("You are near this location");
    }

    if (context.activityContext === "SIGHTSEEING") {
      reasons.push("Perfect for sightseeing");
    }

    if (context.availableTime === "LONG") {
      reasons.push("You have time for a detailed story");
    }

    if (
      insights.contentSuggestions.some(
        (s) => s.type.toLowerCase() === story.metadata.type.toLowerCase()
      )
    ) {
      reasons.push("Matches your current interests");
    }

    return reasons.length > 0
      ? reasons.join(", ")
      : "Recommended based on your context";
  }

  /**
   * Estimate user engagement for content
   */
  private estimateEngagement(
    story: StoryContent,
    context: ContextualEnvironment
  ): number {
    let engagement = 0.5;

    // Content type engagement
    if (
      context.activityContext === "SIGHTSEEING" &&
      story.metadata.type === "HISTORICAL"
    ) {
      engagement += 0.2;
    }

    // Attention level impact
    if (context.attentionLevel === "HIGH") {
      engagement += 0.2;
    } else if (context.attentionLevel === "LOW") {
      engagement -= 0.1;
    }

    // Time availability impact
    if (context.availableTime === "LONG") {
      engagement += 0.1;
    } else if (context.availableTime === "SHORT") {
      engagement -= 0.1;
    }

    return Math.max(0, Math.min(1, engagement));
  }

  /**
   * Generate context hash for caching
   */
  private generateContextHash(
    context: ContextualEnvironment,
    insights: ContextualInsights
  ): string {
    const keyFactors = [
      context.movement.movementMode,
      context.availableTime,
      context.attentionLevel,
      context.contentPreference,
      context.location.environmentType,
      context.activityContext,
    ];

    return keyFactors.join("_").toLowerCase();
  }

  /**
   * Cache adaptation result
   */
  private cacheAdaptation(cacheKey: string, content: AdaptedContent): void {
    if (this.adaptationCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.adaptationCache.keys().next().value;
      if (firstKey !== undefined) {
        this.adaptationCache.delete(firstKey);
      }
    }

    this.adaptationCache.set(cacheKey, content);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(
    latency: number,
    cacheHit: boolean,
    confidence: number
  ): void {
    this.adaptationMetrics.totalAdaptations++;

    if (confidence >= this.confidenceThreshold) {
      this.adaptationMetrics.successfulAdaptations++;
    }

    // Update average confidence
    const total = this.adaptationMetrics.totalAdaptations;
    this.adaptationMetrics.averageConfidence =
      (this.adaptationMetrics.averageConfidence * (total - 1) + confidence) /
      total;

    // Update latency
    this.adaptationMetrics.adaptationLatency =
      (this.adaptationMetrics.adaptationLatency * (total - 1) + latency) /
      total;

    // Update cache hit rate
    const cacheHits = cacheHit ? 1 : 0;
    this.adaptationMetrics.cacheHitRate =
      (this.adaptationMetrics.cacheHitRate * (total - 1) + cacheHits) / total;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): AdaptationMetrics {
    return { ...this.adaptationMetrics };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.adaptationCache.clear();
    this.strategyCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    adaptationCacheSize: number;
    strategyCacheSize: number;
    contentLibrarySize: number;
  } {
    return {
      adaptationCacheSize: this.adaptationCache.size,
      strategyCacheSize: this.strategyCache.size,
      contentLibrarySize: this.contentLibrary.size,
    };
  }
}

export interface UserContentPreferences {
  prefersBriefContent: boolean;
  prefersDetailedContent: boolean;
  prefersInteractive: boolean;
  preferredFormats: ContentFormat[];
  maxContentDuration: number; // seconds
  complexityPreference: ContentComplexity;
  interactionFrequency: "MINIMAL" | "MODERATE" | "FREQUENT";
}

export default AdaptiveContentEngine;
