/**
 * OpenAI Service for EchoTrail - Enterprise Edition
 * Advanced AI/ML TTS and Context Pool Integration
 * Adapted from EchoTrail-Fresh with enterprise features
 */

import OpenAI from 'openai';
import { Audio } from 'expo-av';
import { Logger, ErrorHandler, PerformanceMonitor } from '../../core/utils';
import { AIConfig, logAIConfigStatus } from '../../config/ai';
import { storyCacheService } from './StoryCacheService';
import { aiPerformanceService } from './AIPerformanceService';
import type { TrackPoint } from '../api/TrailService';

export interface LocationContext {
  latitude: number;
  longitude: number;
  address?: string;
  nearbyPlaces?: string[];
  historicalContext?: string;
  trail?: {
    id: string;
    name: string;
    trackPoints: TrackPoint[];
    distance?: number;
    duration?: number;
  };
}

export interface UserPreferences {
  interests: string[];
  language: 'nb' | 'en' | 'de' | 'fr' | 'es' | 'sv';
  storyLength: 'kort' | 'medium' | 'lang';
  voiceStyle: 'vennlig' | 'mystisk' | 'entusiastisk' | 'rolig';
}

export interface GeneratedStory {
  id: string;
  title: string;
  content: string;
  audioUrl?: string;
  duration?: number;
  theme: string;
  historicalAccuracy: string;
  interestTags: string[];
  contextId?: string;
  locationContext?: LocationContext;
  cost?: {
    tokens: number;
    estimatedCost: number;
  };
}

interface TTSOptions {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed: number;
  pitch?: number;
  volume?: number;
}

export class OpenAIService {
  private openai: OpenAI;
  private readonly logger: Logger;
  private readonly isEnabled: boolean;

  constructor() {
    this.logger = new Logger('OpenAIService');
    this.isEnabled = AIConfig.features.storyGeneration && !!AIConfig.openai.apiKey;
    
    // Log configuration status in development
    logAIConfigStatus();
    
    if (this.isEnabled && AIConfig.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: AIConfig.openai.apiKey,
        baseURL: AIConfig.openai.baseURL,
        organization: AIConfig.openai.organization,
      });
      this.logger.info('OpenAI Service initialized with AI features enabled');
    } else {
      this.logger.warn('OpenAI Service initialized in demo mode - AI features disabled');
    }
  }

  /**
   * Generate location-based story from trail data with caching
   */
  async generateTrailStory(
    trailData: LocationContext,
    preferences: UserPreferences,
    previousStories: string[] = [],
    useCache: boolean = true
  ): Promise<GeneratedStory> {
    // Check cache first if enabled
    if (useCache && AIConfig.features.contextAwareness) {
      try {
        const cachedStory = await storyCacheService.getCachedStory(trailData, preferences);
        if (cachedStory) {
          this.logger.info('Story retrieved from cache', {
            cacheId: cachedStory.cacheId,
            ageInDays: Math.floor(
              (Date.now() - new Date(cachedStory.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            )
          });
          return cachedStory;
        }
      } catch (cacheError) {
        this.logger.warn('Cache retrieval failed, generating new story', { error: cacheError });
      }
    }

    if (!this.isEnabled || !this.openai) {
      return this.generateFallbackStory(trailData, preferences);
    }

    const startTime = performance.now();
    const performanceId = aiPerformanceService.startOperation('story_generation', {
      location: trailData.address,
      language: preferences.language,
      model: AIConfig.openai.models.chat
    });

    try {
      this.logger.info('Generating trail story with OpenAI', {
        location: trailData.address,
        trailId: trailData.trail?.id,
        language: preferences.language,
        storyLength: preferences.storyLength,
      });

      const prompt = this.buildTrailStoryPrompt(trailData, preferences, previousStories);
      
      const response = await this.openai.chat.completions.create({
        model: AIConfig.openai.models.chat,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(preferences.language)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: AIConfig.openai.defaults.maxTokens,
        temperature: AIConfig.openai.defaults.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      const story = this.parseGeneratedContent(content, trailData);
      const duration = performance.now() - startTime;

      // Generate TTS if enabled
      if (AIConfig.features.textToSpeech) {
        try {
          story.audioUrl = await this.generateTTS(story.content, preferences);
          story.duration = this.estimateAudioDuration(story.content);
        } catch (ttsError) {
          this.logger.warn('TTS generation failed, continuing without audio', { error: ttsError });
        }
      }

      // Track performance and cost
      PerformanceMonitor.trackCustomMetric('ai_story_generation', duration, 'ms', undefined, {
        model: AIConfig.openai.models.chat,
        tokens: response.usage?.total_tokens || 0,
        language: preferences.language,
      });

      story.cost = {
        tokens: response.usage?.total_tokens || 0,
        estimatedCost: this.estimateCost(response.usage?.total_tokens || 0),
      };

      this.logger.info('Trail story generated successfully', {
        duration: `${duration.toFixed(2)}ms`,
        tokens: response.usage?.total_tokens,
        hasAudio: !!story.audioUrl,
      });

      // Cache the story if enabled
      if (useCache && AIConfig.features.contextAwareness) {
        try {
          await storyCacheService.cacheStory(story, trailData, preferences);
        } catch (cacheError) {
          this.logger.warn('Failed to cache story', { error: cacheError });
          // Continue without caching - don't fail the main operation
        }
      }

      // Complete performance tracking
      await aiPerformanceService.completeOperation(
        performanceId,
        true,
        {
          tokens: response.usage?.total_tokens || 0,
          cost: story.cost?.estimatedCost || 0
        }
      );

      return story;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.logger.error('Failed to generate trail story', {
        error: (error as Error).message,
        duration: `${duration.toFixed(2)}ms`,
        location: trailData.address,
      });

      // Complete performance tracking with error
      await aiPerformanceService.completeOperation(
        performanceId,
        false,
        {},
        (error as Error).message
      );

      // Handle network errors and fallbacks
      await ErrorHandler.handleNetworkError(
        error as Error,
        { url: 'openai-api', method: 'POST' },
        { location: trailData.address, preferences }
      );

      // Return fallback story
      return this.generateFallbackStory(trailData, preferences);
    }
  }

  /**
   * Generate TTS audio from text content
   */
  async generateTTS(
    text: string,
    preferences: UserPreferences,
    options?: Partial<TTSOptions>
  ): Promise<string> {
    if (!this.isEnabled || !this.openai) {
      throw new Error('TTS service not available - OpenAI not initialized');
    }

    try {
      const ttsOptions: TTSOptions = {
        voice: this.selectVoiceForPreferences(preferences),
        speed: options?.speed || AIConfig.openai.defaults.ttsSpeed,
        ...options,
      };

      this.logger.info('Generating TTS audio', {
        textLength: text.length,
        voice: ttsOptions.voice,
        speed: ttsOptions.speed,
        language: preferences.language,
      });

      const mp3Response = await this.openai.audio.speech.create({
        model: AIConfig.openai.models.tts,
        voice: ttsOptions.voice,
        input: this.optimizeTextForTTS(text, preferences.language),
        speed: ttsOptions.speed,
      });

      // Convert response to audio file URL
      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      const audioUrl = await this.saveAudioBuffer(audioBuffer);

      PerformanceMonitor.trackCustomMetric('ai_tts_generation', text.length, 'count', undefined, {
        voice: ttsOptions.voice,
        language: preferences.language,
      });

      this.logger.info('TTS audio generated successfully', {
        audioUrl,
        sizeKB: Math.round(audioBuffer.length / 1024),
      });

      return audioUrl;

    } catch (error) {
      this.logger.error('Failed to generate TTS audio', {
        error: (error as Error).message,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Play generated audio
   */
  async playAudio(audioUrl: string): Promise<Audio.Sound> {
    try {
      this.logger.info('Playing generated audio', { audioUrl });
      
      // Create and play audio using expo-av
      const sound = new Audio.Sound();
      await sound.loadAsync(audioUrl);
      await sound.playAsync();
      await sound.setVolumeAsync(1.0);
      
      this.logger.info('Audio loaded and playing successfully');
      return sound;
    } catch (error) {
      this.logger.error('Failed to play audio', { error, audioUrl });
      throw error;
    }
  }

  /**
   * Build story prompt optimized for trail context
   */
  private buildTrailStoryPrompt(
    trailData: LocationContext,
    preferences: UserPreferences,
    previousStories: string[]
  ): string {
    const elements = [];

    // Location context
    elements.push(`Location: ${trailData.address}`);
    if (trailData.nearbyPlaces?.length) {
      elements.push(`Nearby points of interest: ${trailData.nearbyPlaces.join(', ')}`);
    }

    // Trail context
    if (trailData.trail) {
      elements.push(`Trail: "${trailData.trail.name}"`);
      if (trailData.trail.distance) {
        elements.push(`Distance: ${(trailData.trail.distance / 1000).toFixed(1)}km`);
      }
      if (trailData.trail.duration) {
        elements.push(`Duration: ${Math.round(trailData.trail.duration / 60)} minutes`);
      }
      if (trailData.trail.trackPoints.length > 0) {
        const firstPoint = trailData.trail.trackPoints[0];
        const lastPoint = trailData.trail.trackPoints[trailData.trail.trackPoints.length - 1];
        elements.push(`Trail starts near ${firstPoint.coordinate.latitude}, ${firstPoint.coordinate.longitude} and ends near ${lastPoint.coordinate.latitude}, ${lastPoint.coordinate.longitude}`);
      }
    }

    // Historical context
    if (trailData.historicalContext) {
      elements.push(`Historical context: ${trailData.historicalContext}`);
    }

    // User preferences
    elements.push(`Target interests: ${preferences.interests.join(', ')}`);
    elements.push(`Story length: ${preferences.storyLength}`);
    elements.push(`Voice style: ${preferences.voiceStyle}`);

    // Avoid repetition
    if (previousStories.length > 0) {
      elements.push(`Previous story themes to avoid: ${previousStories.join(', ')}`);
    }

    const prompt = preferences.language === 'nb' ? 
      this.buildNorwegianStoryPrompt(elements, preferences) :
      this.buildEnglishStoryPrompt(elements, preferences);

    return prompt;
  }

  /**
   * Build specialized Norwegian story prompt with cultural context
   */
  private buildNorwegianStoryPrompt(
    elements: string[],
    preferences: UserPreferences
  ): string {
    const storyStyleGuide = {
      vennlig: 'varmt og imøtekommende som en gammel turguide',
      mystisk: 'med hint av norske sagn og folkeeventyr',
      entusiastisk: 'som en lidenskapelig naturelsker',
      rolig: 'som en erfaren fjellguide med dyp naturkunnskap'
    };

    const lengthGuide = {
      kort: '2-3 korte avsnitt (150-200 ord)',
      medium: '3-4 avsnitt med god detalj (300-400 ord)',
      lang: '4-5 rike avsnitt med dypere historisk kontekst (500-600 ord)'
    };

    return `Skriv en autentisk norsk historie om dette stedet og turløypa:

${elements.join('\n')}

Historien skal være:
- Lengde: ${lengthGuide[preferences.storyLength]}
- Stil: ${storyStyleGuide[preferences.voiceStyle]}
- Interesser: ${preferences.interests.join(', ')}

Inkluder norske kulturelle elementer som:
- Lokale stedsnavn og deres opprinnelse
- Historiske hendelser eller personer knyttet til området
- Naturens betydning i norsk kultur og tradisjon
- Sesongvariasjoner og deres kulturelle betydning
- Referanser til norsk turkultur og friluftsliv
- Lokale sagn, myter eller folkeeventyr hvis passende
- Typisk norsk terminologi (fjell, fjord, vidde, seter, etc.)

Skriv på en måte som:
- Skaper følelse av stolthet over norsk natur og kultur
- Bygger bro mellom fortid og nåtid
- Gjør lytteren til del av en større norsk fortelling
- Bruker naturlig norsk språk med lokale uttrykk
- Reflekterer "allemansretten" og norsk naturrespekt

Svar i JSON-format:
{
  "title": "Norsk tittel som fanger essensen",
  "content": "Full historie på norsk",
  "theme": "Hovedtema",
  "historicalAccuracy": "Kort notat om historisk nøyaktighet",
  "interestTags": ["relevante", "interesse", "tags"]
}`;
  }

  /**
   * Build English story prompt for international users
   */
  private buildEnglishStoryPrompt(
    elements: string[],
    preferences: UserPreferences
  ): string {
    return `Generate an engaging English story about this location and trail:

${elements.join('\n')}

Create a compelling narrative that:
- Connects the physical trail with historical/cultural significance
- Matches the ${preferences.voiceStyle} style
- Is appropriate for ${preferences.storyLength} length
- Focuses on the specified interests: ${preferences.interests.join(', ')}
- Includes specific details about the route and landscape
- Makes the listener feel connected to the place
- Respects local culture and traditions

Format the response as JSON:
{
  "title": "Story title",
  "content": "Full story text",
  "theme": "Main theme/topic",
  "historicalAccuracy": "Brief note on historical accuracy",
  "interestTags": ["relevant", "interest", "tags"]
}`;
  }

  /**
   * Get system prompt for different languages with cultural optimization
   */
  private getSystemPrompt(language: string): string {
    const prompts = {
      nb: `Du er en ekspert norsk historieforteller og kulturbærer som skaper autentiske, engasjerende historier om norske steder og turløyper. 

Din ekspertise inkluderer:
- Norsk historie fra vikingtid til moderne tid
- Lokale sagn, folkeeventyr og tradisjonelle fortellinger
- Norsk natur og landskap (fjord, fjell, skog, vidde)
- Kulturelle referanser (staver, seter, bygdetradisjon)
- Historiske hendelser og personer
- Norsk språk, dialekter og uttrykk
- Sesongvariasjon og naturopplevelser

Skap historier som:
- Vever sammen fakta med tradisjonell norsk fortellerkunst
- Inkluderer autentiske kulturelle referanser
- Bruker riktig terminologi for norsk natur og kultur
- Reflekterer norsk mentalitet og forhold til naturen
- Bygger bro mellom fortid og nåtid
- Skaper følelse av tilhørighet til det norske landskapet`,
      en: 'You are an expert storyteller who creates engaging, fact-based stories about places and trails. Your stories are accurate, culturally sensitive, and designed to connect people with the places they visit.',
      de: 'Sie sind ein Experte im Geschichtenerzählen, der fesselnde, auf Fakten basierende Geschichten über Orte und Wanderwege erstellt.',
      fr: 'Vous êtes un expert conteur qui crée des histoires engageantes et factuelles sur les lieux et les sentiers.',
      es: 'Eres un narrador experto que crea historias atractivas y basadas en hechos sobre lugares y senderos.',
      sv: 'Du är en expert berättare som skapar engagerande, faktabaserade berättelser om platser och vandringsleder.',
    };

    return prompts[language as keyof typeof prompts] || prompts.en;
  }

  /**
   * Parse generated content from OpenAI response
   */
  private parseGeneratedContent(content: string, trailData?: LocationContext): GeneratedStory {
    // Generate unique ID for the story
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const parsed = JSON.parse(content);
      return {
        id: storyId,
        title: parsed.title || 'Untitled Story',
        content: parsed.content || content,
        theme: parsed.theme || 'general',
        historicalAccuracy: parsed.historicalAccuracy || 'narrative',
        interestTags: parsed.interestTags || [],
        locationContext: trailData,
      };
    } catch {
      // If JSON parsing fails, treat as plain text
      return {
        id: storyId,
        title: 'Trail Story',
        content,
        theme: 'narrative',
        historicalAccuracy: 'creative',
        interestTags: ['trail', 'adventure'],
        locationContext: trailData,
      };
    }
  }

  /**
   * Generate fallback story when AI is unavailable
   */
  private generateFallbackStory(
    trailData: LocationContext,
    preferences: UserPreferences
  ): GeneratedStory {
    const language = preferences.language;
    const isNorwegian = language === 'nb';

    const title = isNorwegian ? 'Oppdagelsesreise' : 'Discovery Journey';
    const content = isNorwegian
      ? `Velkommen til denne fantastiske turen! Du er nå på ${trailData.address || 'et spesielt sted'}, et område som har sin egen unike historie og karakter. 

Mens du går denne ruten, kan du forestille deg alle de som har gått denne veien før deg. Hvert skritt tar deg gjennom et landskap formet av både natur og mennesker gjennom generasjoner.

${trailData.trail ? `Denne ruten "${trailData.trail.name}" strekker seg over ${trailData.trail.distance ? (trailData.trail.distance / 1000).toFixed(1) + ' kilometer' : 'en flott distanse'}.` : ''}

Ta deg tid til å nyte omgivelsene og la fantasien blomstre mens du utforsker dette området.`
      : `Welcome to this amazing journey! You're now at ${trailData.address || 'a special place'}, an area with its own unique history and character.

As you walk this route, imagine all those who have walked this path before you. Every step takes you through a landscape shaped by both nature and people across generations.

${trailData.trail ? `This route "${trailData.trail.name}" extends over ${trailData.trail.distance ? (trailData.trail.distance / 1000).toFixed(1) + ' kilometers' : 'a wonderful distance'}.` : ''}

Take time to enjoy your surroundings and let your imagination flourish as you explore this area.`;

    return {
      id: `fallback_story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      theme: 'exploration',
      historicalAccuracy: 'creative',
      interestTags: ['adventure', 'exploration', 'nature'],
      locationContext: trailData,
    };
  }

  /**
   * Select appropriate voice based on user preferences
   */
  private selectVoiceForPreferences(preferences: UserPreferences): TTSOptions['voice'] {
    const voiceMap: Record<string, TTSOptions['voice']> = {
      vennlig: 'alloy',
      mystisk: 'echo',
      entusiastisk: 'nova',
      rolig: 'fable',
    };

    return voiceMap[preferences.voiceStyle] || 'alloy';
  }

  /**
   * Optimize text for TTS pronunciation
   */
  private optimizeTextForTTS(text: string, language: string): string {
    if (language === 'nb') {
      // Norwegian pronunciation optimizations
      return text
        .replace(/(\d{4})/g, (match) => {
          // Convert years to spoken Norwegian
          const year = parseInt(match);
          if (year >= 1000 && year <= 2100) {
            return this.numberToNorwegianYear(year);
          }
          return match;
        })
        .replace(/km/g, 'kilometer')
        .replace(/m\b/g, 'meter');
    }

    return text;
  }

  /**
   * Convert numbers to Norwegian year pronunciation
   */
  private numberToNorwegianYear(year: number): string {
    // Simplified Norwegian year conversion
    const yearStr = year.toString();
    if (year >= 1800 && year <= 2000) {
      const century = yearStr.substring(0, 2);
      const rest = yearStr.substring(2);
      return `${century} ${rest}`;
    }
    return yearStr;
  }

  /**
   * Estimate audio duration based on text length
   */
  private estimateAudioDuration(text: string): number {
    // Approximate words per minute for TTS (Norwegian tends to be slower)
    const wordsPerMinute = 160;
    const words = text.split(' ').length;
    return Math.round((words / wordsPerMinute) * 60); // Return seconds
  }

  /**
   * Estimate API cost based on token usage
   */
  private estimateCost(tokens: number): number {
    const model = AIConfig.openai.models.chat;
    const costs = AIConfig.costs[model as keyof typeof AIConfig.costs];
    
    if (costs && 'input' in costs) {
      // Simplified: assume 50/50 input/output token ratio
      const inputCost = (tokens * 0.5 / 1000) * costs.input;
      const outputCost = (tokens * 0.5 / 1000) * costs.output;
      return inputCost + outputCost;
    }
    
    // Fallback to default pricing
    const costPerKToken = 0.00015;
    return (tokens / 1000) * costPerKToken;
  }

  /**
   * Save audio buffer to temporary storage
   */
  private async saveAudioBuffer(buffer: Buffer): Promise<string> {
    // In a real implementation, this would save to device storage or cloud
    // For now, create a blob URL using Uint8Array for compatibility
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }

  /**
   * Get cached stories for a location
   */
  async getCachedStories(location: LocationContext) {
    try {
      return await storyCacheService.getCachedStoriesForLocation(location);
    } catch (error) {
      this.logger.error('Failed to get cached stories', { error });
      return [];
    }
  }

  /**
   * Get all cached stories with metadata
   */
  async getAllCachedStories() {
    try {
      return await storyCacheService.getAllCachedStories();
    } catch (error) {
      this.logger.error('Failed to get all cached stories', { error });
      return { stories: [], totalSize: 0, count: 0 };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      return await storyCacheService.getCacheStats();
    } catch (error) {
      this.logger.error('Failed to get cache stats', { error });
      return {
        totalStories: 0,
        totalSize: 0,
        oldestStory: null,
        newestStory: null,
        mostAccessedStory: null
      };
    }
  }

  /**
   * Clear story cache
   */
  async clearStoryCache() {
    try {
      await storyCacheService.clearCache();
      this.logger.info('Story cache cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear story cache', { error });
      throw error;
    }
  }

  /**
   * Remove specific cached story
   */
  async removeCachedStory(cacheId: string) {
    try {
      await storyCacheService.removeCachedStory(cacheId);
      this.logger.info('Cached story removed', { cacheId });
    } catch (error) {
      this.logger.error('Failed to remove cached story', { error, cacheId });
      throw error;
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
export default openAIService;