/**
 * Dynamic User Preferences Context
 * Provides real-time, easily accessible user preferences throughout the app
 * 
 * Author: Kent Rune Henriksen
 * Email: Kent@zentric.no
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interest categories with emoji and weights
export const INTEREST_CATEGORIES = {
  historie: { emoji: '📚', label: 'Historie & Kultur', weight: 1.0 },
  arkitektur: { emoji: '🏛️', label: 'Arkitektur & Byggverk', weight: 1.0 },
  natur: { emoji: '🌿', label: 'Natur & Miljø', weight: 1.0 },
  kunst: { emoji: '🎭', label: 'Kunst & Kreativitet', weight: 1.0 },
  sport: { emoji: '⚽', label: 'Sport & Aktiviteter', weight: 0.8 },
  mat: { emoji: '🍽️', label: 'Mat & Drikke', weight: 0.8 },
  musikk: { emoji: '🎶', label: 'Musikk & Performance', weight: 0.8 },
  vitenskap: { emoji: '🔬', label: 'Vitenskap & Teknologi', weight: 0.9 },
  sosialt: { emoji: '👥', label: 'Sosialt & Samfunn', weight: 0.9 },
  mystikk: { emoji: '✨', label: 'Mystikk & Folklore', weight: 1.0 },
} as const;

// Mood states with dynamic properties
export const MOOD_STATES = {
  glad: { 
    emoji: '😊', 
    label: 'Glad og energisk',
    energy: 8, curiosity: 7, social: 8, adventure: 7, reflection: 4,
    toneKeywords: ['oppløftende', 'energisk', 'positiv', 'inspirerende']
  },
  rolig: { 
    emoji: '🧘', 
    label: 'Rolig og avslappet',
    energy: 3, curiosity: 5, social: 4, adventure: 2, reflection: 8,
    toneKeywords: ['rolig', 'fredelig', 'kontemplativ', 'harmonisk']
  },
  nysjerrig: { 
    emoji: '🤔', 
    label: 'Nysgjerrig og lærende',
    energy: 6, curiosity: 9, social: 5, adventure: 6, reflection: 7,
    toneKeywords: ['utforskende', 'lærerik', 'informativ', 'oppdagende']
  },
  eventyrlysten: { 
    emoji: '😮', 
    label: 'Eventyrlysten og dristig',
    energy: 9, curiosity: 8, social: 6, adventure: 10, reflection: 4,
    toneKeywords: ['spennende', 'dristig', 'actionfylt', 'utfordrende']
  },
  reflekterende: { 
    emoji: '💭', 
    label: 'Reflekterende og dyptenktende',
    energy: 4, curiosity: 7, social: 3, adventure: 3, reflection: 10,
    toneKeywords: ['dyptgående', 'filosofisk', 'ettertenkssom', 'kontemplativ']
  },
  sosial: { 
    emoji: '🎉', 
    label: 'Sosial og utadvendt',
    energy: 7, curiosity: 6, social: 10, adventure: 6, reflection: 4,
    toneKeywords: ['varm', 'sosial', 'involverende', 'felleskapsorientert']
  },
  kreativ: { 
    emoji: '🌅', 
    label: 'Inspirert og kreativ',
    energy: 7, curiosity: 8, social: 5, adventure: 7, reflection: 8,
    toneKeywords: ['inspirerende', 'kreativ', 'kunstnerisk', 'fantasifull']
  },
  nostalgisk: { 
    emoji: '😌', 
    label: 'Nostalgisk og romantisk',
    energy: 5, curiosity: 6, social: 4, adventure: 3, reflection: 9,
    toneKeywords: ['nostalgisk', 'romantisk', 'følelsesladet', 'melankolsk']
  },
} as const;

export type InterestCategory = keyof typeof INTEREST_CATEGORIES;
export type MoodState = keyof typeof MOOD_STATES;

export interface UserPreferences {
  // Core interests (0-10 scale)
  interests: Record<InterestCategory, number>;
  
  // Current mood and dynamic state  
  currentMood: MoodState;
  moodIntensity: number; // 1-10, how strongly they feel this mood
  
  // Context preferences
  preferredStoryLength: 'kort' | 'medium' | 'lang';
  voiceStyle: 'vennlig' | 'mystisk' | 'energisk' | 'rolig' | 'auto';
  complexityLevel: 'enkel' | 'moderat' | 'avansert' | 'auto';
  
  // Dynamic session data
  sessionContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    isAlone: boolean;
    activityLevel: 'stationary' | 'walking' | 'traveling' | 'exploring';
    weatherInfluence: boolean; // Should weather affect story mood?
  };
  
  // Learning and adaptation
  adaptiveSettings: {
    learningEnabled: boolean;
    explorationRate: number; // 0-1, how often to try new content
    feedbackSensitivity: number; // 0-1, how quickly to adapt to feedback
  };
  
  // Meta info
  lastUpdated: Date;
  version: string;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  
  // Quick actions for dynamic updates
  updateMood: (mood: MoodState, intensity?: number) => Promise<void>;
  updateInterest: (category: InterestCategory, value: number) => Promise<void>;
  updateSessionContext: (context: Partial<UserPreferences['sessionContext']>) => Promise<void>;
  toggleWeatherInfluence: () => Promise<void>;
  
  // Computed values for AI system
  getTopInterests: (count?: number) => Array<{ category: InterestCategory; value: number; label: string }>;
  getCurrentMoodProfile: () => {
    energy: number;
    curiosity: number; 
    social: number;
    adventure: number;
    reflection: number;
    toneKeywords: string[];
    intensity: number;
  };
  getContextScore: (category: InterestCategory) => number; // Interest + mood + context
  
  // Quick presets
  applyMoodPreset: (preset: 'morning_energy' | 'work_focus' | 'evening_relax' | 'weekend_explore') => Promise<void>;
  
  // Storage and sync
  resetToDefaults: () => Promise<void>;
  exportPreferences: () => Promise<string>;
  importPreferences: (data: string) => Promise<boolean>;
  
  // Loading state
  isLoading: boolean;
}

const defaultPreferences: UserPreferences = {
  interests: {
    historie: 7,
    arkitektur: 6,
    natur: 8,
    kunst: 5,
    sport: 4,
    mat: 6,
    musikk: 5,
    vitenskap: 6,
    sosialt: 7,
    mystikk: 5,
  },
  currentMood: 'nysjerrig',
  moodIntensity: 6,
  preferredStoryLength: 'medium',
  voiceStyle: 'auto',
  complexityLevel: 'auto',
  sessionContext: {
    timeOfDay: 'afternoon',
    isAlone: true,
    activityLevel: 'walking',
    weatherInfluence: true,
  },
  adaptiveSettings: {
    learningEnabled: true,
    explorationRate: 0.2,
    feedbackSensitivity: 0.7,
  },
  lastUpdated: new Date(),
  version: '1.0.0',
};

const UserPreferencesContext = createContext<PreferencesContextType | null>(null);

export const useUserPreferences = (): PreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const UserPreferencesProvider: React.FC<Props> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem('@echotrail_user_preferences');
      if (stored) {
        const parsed: UserPreferences = JSON.parse(stored);
        
        // Migrate if needed
        const migrated = migratePreferences(parsed);
        setPreferences(migrated);
      }
    } catch (error) {
      console.warn('Failed to load user preferences, using defaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: UserPreferences): Promise<void> => {
    try {
      newPreferences.lastUpdated = new Date();
      await AsyncStorage.setItem('@echotrail_user_preferences', JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  };

  // Quick mood update
  const updateMood = useCallback(async (mood: MoodState, intensity: number = 6): Promise<void> => {
    const updated = {
      ...preferences,
      currentMood: mood,
      moodIntensity: Math.max(1, Math.min(10, intensity)),
    };
    await savePreferences(updated);
  }, [preferences]);

  // Update individual interest
  const updateInterest = useCallback(async (category: InterestCategory, value: number): Promise<void> => {
    const updated = {
      ...preferences,
      interests: {
        ...preferences.interests,
        [category]: Math.max(0, Math.min(10, value)),
      },
    };
    await savePreferences(updated);
  }, [preferences]);

  // Update session context
  const updateSessionContext = useCallback(async (context: Partial<UserPreferences['sessionContext']>): Promise<void> => {
    const updated = {
      ...preferences,
      sessionContext: {
        ...preferences.sessionContext,
        ...context,
      },
    };
    await savePreferences(updated);
  }, [preferences]);

  // Toggle weather influence
  const toggleWeatherInfluence = useCallback(async (): Promise<void> => {
    await updateSessionContext({ 
      weatherInfluence: !preferences.sessionContext.weatherInfluence 
    });
  }, [preferences.sessionContext.weatherInfluence, updateSessionContext]);

  // Get top interests
  const getTopInterests = useCallback((count: number = 3): Array<{ category: InterestCategory; value: number; label: string }> => {
    return Object.entries(preferences.interests)
      .map(([category, value]) => ({
        category: category as InterestCategory,
        value,
        label: INTEREST_CATEGORIES[category as InterestCategory].label,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, count);
  }, [preferences.interests]);

  // Get current mood profile
  const getCurrentMoodProfile = useCallback(() => {
    const moodData = MOOD_STATES[preferences.currentMood];
    const intensity = preferences.moodIntensity / 10;
    
    return {
      energy: Math.round(moodData.energy * intensity),
      curiosity: Math.round(moodData.curiosity * intensity),
      social: Math.round(moodData.social * intensity),
      adventure: Math.round(moodData.adventure * intensity),
      reflection: Math.round(moodData.reflection * intensity),
      toneKeywords: moodData.toneKeywords,
      intensity: preferences.moodIntensity,
    };
  }, [preferences.currentMood, preferences.moodIntensity]);

  // Calculate context score (combines interest + mood + session context)
  const getContextScore = useCallback((category: InterestCategory): number => {
    const baseInterest = preferences.interests[category] / 10; // 0-1
    const moodProfile = getCurrentMoodProfile();
    
    // Mood influence on different categories
    const moodInfluence = {
      historie: (moodProfile.curiosity + moodProfile.reflection) / 20,
      arkitektur: (moodProfile.curiosity + moodProfile.energy) / 20,
      natur: (moodProfile.reflection + moodProfile.energy) / 20,
      kunst: (moodProfile.curiosity + moodProfile.reflection) / 20,
      sport: (moodProfile.energy + moodProfile.adventure) / 20,
      mat: (moodProfile.social + moodProfile.energy) / 20,
      musikk: (moodProfile.social + moodProfile.reflection) / 20,
      vitenskap: (moodProfile.curiosity + moodProfile.reflection) / 20,
      sosialt: (moodProfile.social + moodProfile.energy) / 20,
      mystikk: (moodProfile.curiosity + moodProfile.reflection) / 20,
    };
    
    // Combine base interest with mood influence
    const combinedScore = baseInterest * 0.7 + moodInfluence[category] * 0.3;
    
    return Math.max(0, Math.min(1, combinedScore));
  }, [preferences.interests, getCurrentMoodProfile]);

  // Quick mood presets
  const applyMoodPreset = useCallback(async (preset: 'morning_energy' | 'work_focus' | 'evening_relax' | 'weekend_explore'): Promise<void> => {
    const presets = {
      morning_energy: { mood: 'glad' as MoodState, intensity: 8 },
      work_focus: { mood: 'nysjerrig' as MoodState, intensity: 7 },
      evening_relax: { mood: 'rolig' as MoodState, intensity: 6 },
      weekend_explore: { mood: 'eventyrlysten' as MoodState, intensity: 8 },
    };
    
    const { mood, intensity } = presets[preset];
    await updateMood(mood, intensity);
  }, [updateMood]);

  // Reset to defaults
  const resetToDefaults = useCallback(async (): Promise<void> => {
    await savePreferences(defaultPreferences);
  }, []);

  // Export/Import
  const exportPreferences = useCallback(async (): Promise<string> => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  const importPreferences = useCallback(async (data: string): Promise<boolean> => {
    try {
      const imported = JSON.parse(data) as UserPreferences;
      const migrated = migratePreferences(imported);
      await savePreferences(migrated);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }, []);

  const contextValue: PreferencesContextType = {
    preferences,
    updateMood,
    updateInterest,
    updateSessionContext,
    toggleWeatherInfluence,
    getTopInterests,
    getCurrentMoodProfile,
    getContextScore,
    applyMoodPreset,
    resetToDefaults,
    exportPreferences,
    importPreferences,
    isLoading,
  };

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// Helper function to migrate old preference formats
function migratePreferences(preferences: any): UserPreferences {
  // Add migration logic here when preferences schema changes
  return {
    ...defaultPreferences,
    ...preferences,
    version: '1.0.0',
    lastUpdated: new Date(preferences.lastUpdated || Date.now()),
  };
}

export default UserPreferencesProvider;