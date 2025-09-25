/**
 * Story Feedback Service for EchoTrail
 * Handles user feedback, ratings, and story improvement analytics
 * Created by: Kent Rune Henriksen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../../core/utils';
import type { GeneratedStory, UserPreferences } from './OpenAIService';

export interface StoryFeedback {
  storyId: string;
  userId?: string;
  rating: number; // 1-5 stars
  feedback: FeedbackCategory[];
  comments?: string;
  timestamp: string;
  userPreferences: UserPreferences;
  storyMetadata: {
    theme: string;
    length: 'kort' | 'medium' | 'lang';
    voiceStyle: string;
    hasAudio: boolean;
  };
}

export type FeedbackCategory = 
  | 'historically_accurate'
  | 'culturally_authentic'
  | 'engaging_content'
  | 'appropriate_length'
  | 'good_pronunciation'
  | 'relevant_interests'
  | 'clear_audio'
  | 'too_long'
  | 'too_short'
  | 'inaccurate_info'
  | 'poor_audio'
  | 'not_interesting'
  | 'language_issues';

export interface FeedbackAnalytics {
  averageRating: number;
  totalFeedback: number;
  categoryBreakdown: Record<FeedbackCategory, number>;
  ratingDistribution: Record<number, number>;
  commonIssues: FeedbackCategory[];
  improvementSuggestions: string[];
}

export interface UserFeedbackPreferences {
  preferredStoryLength: 'kort' | 'medium' | 'lang';
  favoriteThemes: string[];
  dislikedElements: string[];
  languagePreferences: {
    formalLevel: 'casual' | 'formal' | 'mixed';
    dialectPreference?: string;
    avoidTerms: string[];
  };
  feedbackHistory: {
    totalRatings: number;
    averageRating: number;
    lastFeedback: string;
  };
}

export class StoryFeedbackService {
  private readonly logger: Logger;
  private readonly feedbackKey = '@echotrail_story_feedback';
  private readonly userPrefsKey = '@echotrail_user_feedback_prefs';
  private readonly analyticsKey = '@echotrail_feedback_analytics';

  constructor() {
    this.logger = new Logger('StoryFeedbackService');
  }

  /**
   * Submit user feedback for a story
   */
  async submitFeedback(
    story: GeneratedStory,
    rating: number,
    categories: FeedbackCategory[],
    comments?: string,
    userId?: string
  ): Promise<void> {
    try {
      const feedback: StoryFeedback = {
        storyId: this.generateStoryId(story),
        userId,
        rating: Math.max(1, Math.min(5, rating)), // Ensure 1-5 range
        feedback: categories,
        comments,
        timestamp: new Date().toISOString(),
        userPreferences: {
          interests: [], // Will be filled from context
          language: 'nb',
          storyLength: 'medium',
          voiceStyle: 'vennlig'
        },
        storyMetadata: {
          theme: story.theme,
          length: story.content.length < 200 ? 'kort' : 
                  story.content.length > 500 ? 'lang' : 'medium',
          voiceStyle: 'vennlig', // Default, should come from generation context
          hasAudio: !!story.audioUrl
        }
      };

      // Save individual feedback
      await this.saveFeedback(feedback);

      // Update analytics
      await this.updateAnalytics(feedback);

      // Update user preferences
      await this.updateUserPreferences(feedback);

      this.logger.info('Feedback submitted successfully', {
        storyId: feedback.storyId,
        rating: feedback.rating,
        categories: feedback.feedback.length
      });

    } catch (error) {
      this.logger.error('Failed to submit feedback', { error });
      throw error;
    }
  }

  /**
   * Get feedback analytics for improvement insights
   */
  async getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
    try {
      const analyticsData = await AsyncStorage.getItem(this.analyticsKey);
      if (analyticsData) {
        return JSON.parse(analyticsData);
      }

      // Return default analytics if none exist
      return {
        averageRating: 0,
        totalFeedback: 0,
        categoryBreakdown: {} as Record<FeedbackCategory, number>,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        commonIssues: [],
        improvementSuggestions: []
      };

    } catch (error) {
      this.logger.error('Failed to get feedback analytics', { error });
      return {
        averageRating: 0,
        totalFeedback: 0,
        categoryBreakdown: {} as Record<FeedbackCategory, number>,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        commonIssues: [],
        improvementSuggestions: []
      };
    }
  }

  /**
   * Get user's personalized feedback preferences
   */
  async getUserFeedbackPreferences(userId?: string): Promise<UserFeedbackPreferences> {
    try {
      const key = userId ? `${this.userPrefsKey}_${userId}` : this.userPrefsKey;
      const prefsData = await AsyncStorage.getItem(key);
      
      if (prefsData) {
        return JSON.parse(prefsData);
      }

      // Return default preferences
      return {
        preferredStoryLength: 'medium',
        favoriteThemes: [],
        dislikedElements: [],
        languagePreferences: {
          formalLevel: 'mixed',
          avoidTerms: []
        },
        feedbackHistory: {
          totalRatings: 0,
          averageRating: 0,
          lastFeedback: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to get user feedback preferences', { error });
      return {
        preferredStoryLength: 'medium',
        favoriteThemes: [],
        dislikedElements: [],
        languagePreferences: {
          formalLevel: 'mixed',
          avoidTerms: []
        },
        feedbackHistory: {
          totalRatings: 0,
          averageRating: 0,
          lastFeedback: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get improvement suggestions based on feedback patterns
   */
  async getImprovementSuggestions(): Promise<{
    promptAdjustments: string[];
    voiceStyleRecommendations: string[];
    lengthOptimizations: string[];
    contentFocus: string[];
  }> {
    try {
      const analytics = await this.getFeedbackAnalytics();
      const suggestions = {
        promptAdjustments: [] as string[],
        voiceStyleRecommendations: [] as string[],
        lengthOptimizations: [] as string[],
        contentFocus: [] as string[]
      };

      // Analyze common issues and generate suggestions
      if (analytics.commonIssues.includes('historically_accurate')) {
        suggestions.promptAdjustments.push(
          'Be mer spesifikk om historisk nøyaktighet i system prompt'
        );
        suggestions.contentFocus.push(
          'Inkluder flere dokumenterte historiske fakta'
        );
      }

      if (analytics.commonIssues.includes('culturally_authentic')) {
        suggestions.promptAdjustments.push(
          'Styrk norske kulturelle referanser og lokale tradisjoner'
        );
        suggestions.contentFocus.push(
          'Bruk mer autentisk norsk terminologi og uttrykk'
        );
      }

      if (analytics.commonIssues.includes('too_long')) {
        suggestions.lengthOptimizations.push(
          'Reduser standard maksimal token-lengde for medium historier'
        );
        suggestions.promptAdjustments.push(
          'Be om mer konsise fortellinger'
        );
      }

      if (analytics.commonIssues.includes('too_short')) {
        suggestions.lengthOptimizations.push(
          'Øk minimum token-lengde og be om mer detaljer'
        );
        suggestions.contentFocus.push(
          'Inkluder flere beskrivende elementer og bakgrunnskontext'
        );
      }

      if (analytics.commonIssues.includes('poor_audio')) {
        suggestions.voiceStyleRecommendations.push(
          'Optimaliser tekst for TTS med bedre punktsetting og pauser'
        );
      }

      if (analytics.commonIssues.includes('not_interesting')) {
        suggestions.contentFocus.push(
          'Fokuser mer på unike og engasjerende lokale historier'
        );
        suggestions.promptAdjustments.push(
          'Be om mer dramatiske eller personlige narrativer'
        );
      }

      return suggestions;

    } catch (error) {
      this.logger.error('Failed to get improvement suggestions', { error });
      return {
        promptAdjustments: [],
        voiceStyleRecommendations: [],
        lengthOptimizations: [],
        contentFocus: []
      };
    }
  }

  /**
   * Get recent feedback for a specific story type or theme
   */
  async getFeedbackForTheme(theme: string, limit: number = 10): Promise<StoryFeedback[]> {
    try {
      const feedbackData = await AsyncStorage.getItem(this.feedbackKey);
      if (!feedbackData) return [];

      const allFeedback: StoryFeedback[] = JSON.parse(feedbackData);
      
      return allFeedback
        .filter(f => f.storyMetadata.theme.toLowerCase().includes(theme.toLowerCase()))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      this.logger.error('Failed to get feedback for theme', { error, theme });
      return [];
    }
  }

  /**
   * Export feedback data for analysis
   */
  async exportFeedbackData(): Promise<{
    feedback: StoryFeedback[];
    analytics: FeedbackAnalytics;
    userPreferences: UserFeedbackPreferences;
  }> {
    try {
      const [feedback, analytics, userPrefs] = await Promise.all([
        this.getAllFeedback(),
        this.getFeedbackAnalytics(),
        this.getUserFeedbackPreferences()
      ]);

      return { feedback, analytics, userPreferences: userPrefs };
    } catch (error) {
      this.logger.error('Failed to export feedback data', { error });
      return {
        feedback: [],
        analytics: {
          averageRating: 0,
          totalFeedback: 0,
          categoryBreakdown: {} as Record<FeedbackCategory, number>,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          commonIssues: [],
          improvementSuggestions: []
        },
        userPreferences: {
          preferredStoryLength: 'medium',
          favoriteThemes: [],
          dislikedElements: [],
          languagePreferences: { formalLevel: 'mixed', avoidTerms: [] },
          feedbackHistory: { totalRatings: 0, averageRating: 0, lastFeedback: new Date().toISOString() }
        }
      };
    }
  }

  /**
   * Clear all feedback data
   */
  async clearFeedbackData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.feedbackKey),
        AsyncStorage.removeItem(this.analyticsKey),
        AsyncStorage.removeItem(this.userPrefsKey)
      ]);

      this.logger.info('Feedback data cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear feedback data', { error });
      throw error;
    }
  }

  /**
   * Private methods
   */

  private generateStoryId(story: GeneratedStory): string {
    return `story_${Date.now()}_${story.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`;
  }

  private async saveFeedback(feedback: StoryFeedback): Promise<void> {
    const existingData = await AsyncStorage.getItem(this.feedbackKey);
    const allFeedback: StoryFeedback[] = existingData ? JSON.parse(existingData) : [];
    
    allFeedback.push(feedback);
    
    // Keep only last 1000 feedback entries to manage storage
    if (allFeedback.length > 1000) {
      allFeedback.splice(0, allFeedback.length - 1000);
    }
    
    await AsyncStorage.setItem(this.feedbackKey, JSON.stringify(allFeedback));
  }

  private async updateAnalytics(feedback: StoryFeedback): Promise<void> {
    const analytics = await this.getFeedbackAnalytics();
    
    // Update totals and averages
    const newTotal = analytics.totalFeedback + 1;
    const newAverage = ((analytics.averageRating * analytics.totalFeedback) + feedback.rating) / newTotal;
    
    // Update rating distribution
    analytics.ratingDistribution[feedback.rating] = (analytics.ratingDistribution[feedback.rating] || 0) + 1;
    
    // Update category breakdown
    feedback.feedback.forEach(category => {
      analytics.categoryBreakdown[category] = (analytics.categoryBreakdown[category] || 0) + 1;
    });
    
    // Update common issues (categories mentioned more than 20% of the time)
    const threshold = newTotal * 0.2;
    analytics.commonIssues = Object.entries(analytics.categoryBreakdown)
      .filter(([_, count]) => count > threshold)
      .map(([category]) => category as FeedbackCategory);

    analytics.totalFeedback = newTotal;
    analytics.averageRating = newAverage;
    
    await AsyncStorage.setItem(this.analyticsKey, JSON.stringify(analytics));
  }

  private async updateUserPreferences(feedback: StoryFeedback): Promise<void> {
    const prefs = await this.getUserFeedbackPreferences(feedback.userId);
    
    // Update feedback history
    prefs.feedbackHistory.totalRatings++;
    prefs.feedbackHistory.averageRating = 
      ((prefs.feedbackHistory.averageRating * (prefs.feedbackHistory.totalRatings - 1)) + feedback.rating) 
      / prefs.feedbackHistory.totalRatings;
    prefs.feedbackHistory.lastFeedback = feedback.timestamp;
    
    // Learn from positive feedback
    if (feedback.rating >= 4) {
      if (!prefs.favoriteThemes.includes(feedback.storyMetadata.theme)) {
        prefs.favoriteThemes.push(feedback.storyMetadata.theme);
      }
      prefs.preferredStoryLength = feedback.storyMetadata.length;
    }
    
    // Learn from negative feedback
    if (feedback.rating <= 2) {
      feedback.feedback.forEach(category => {
        if (['too_long', 'too_short', 'not_interesting', 'inaccurate_info'].includes(category)) {
          if (!prefs.dislikedElements.includes(category)) {
            prefs.dislikedElements.push(category);
          }
        }
      });
    }
    
    const key = feedback.userId ? `${this.userPrefsKey}_${feedback.userId}` : this.userPrefsKey;
    await AsyncStorage.setItem(key, JSON.stringify(prefs));
  }

  private async getAllFeedback(): Promise<StoryFeedback[]> {
    try {
      const feedbackData = await AsyncStorage.getItem(this.feedbackKey);
      return feedbackData ? JSON.parse(feedbackData) : [];
    } catch (error) {
      this.logger.error('Failed to get all feedback', { error });
      return [];
    }
  }
}

// Export singleton instance
export const storyFeedbackService = new StoryFeedbackService();
export default storyFeedbackService;