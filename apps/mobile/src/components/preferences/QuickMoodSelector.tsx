/**
 * Quick Mood Selector - Instantly accessible mood adjustment
 * Provides quick, one-tap access to change user's current mood and context
 * 
 * Author: Kent Rune Henriksen
 * Email: Kent@zentric.no
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useUserPreferences, MOOD_STATES, MoodState } from '../../contexts/UserPreferencesContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  style?: any;
  compact?: boolean; // Smaller version for nav bars etc
  onMoodChanged?: (mood: MoodState) => void;
}

export const QuickMoodSelector: React.FC<Props> = ({ 
  style, 
  compact = false,
  onMoodChanged 
}) => {
  const { 
    preferences, 
    updateMood, 
    getCurrentMoodProfile,
    applyMoodPreset 
  } = useUserPreferences();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  const currentMood = preferences.currentMood;
  const currentMoodData = MOOD_STATES[currentMood];
  const moodProfile = getCurrentMoodProfile();

  // Quick presets for common situations
  const quickPresets = [
    { id: 'morning_energy', emoji: '🌅', label: 'Morgen' },
    { id: 'work_focus', emoji: '🎯', label: 'Fokus' },
    { id: 'evening_relax', emoji: '🌙', label: 'Kveld' },
    { id: 'weekend_explore', emoji: '🗺️', label: 'Utforsk' },
  ] as const;

  const toggleExpanded = (): void => {
    const toValue = isExpanded ? 0 : 1;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
    
    Animated.timing(animatedValue, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleMoodChange = async (mood: MoodState, intensity?: number): Promise<void> => {
    await updateMood(mood, intensity);
    onMoodChanged?.(mood);
    
    // Auto-collapse after selection if expanded
    if (isExpanded) {
      setTimeout(() => {
        setIsExpanded(false);
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }, 1000);
    }
  };

  const handlePresetChange = async (preset: 'morning_energy' | 'work_focus' | 'evening_relax' | 'weekend_explore'): Promise<void> => {
    await applyMoodPreset(preset);
    const presetMoods = {
      morning_energy: 'glad' as MoodState,
      work_focus: 'nysjerrig' as MoodState,
      evening_relax: 'rolig' as MoodState,
      weekend_explore: 'eventyrlysten' as MoodState,
    };
    onMoodChanged?.(presetMoods[preset]);
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, style]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.compactEmoji}>{currentMoodData.emoji}</Text>
        <View style={styles.compactTextContainer}>
          <Text style={styles.compactLabel}>Stemning</Text>
          <Text style={styles.compactMood}>{currentMoodData.label}</Text>
        </View>
        
        {isExpanded && (
          <View style={styles.compactDropdown}>
            {Object.entries(MOOD_STATES).slice(0, 4).map(([mood, data]) => (
              <TouchableOpacity
                key={mood}
                style={styles.compactMoodOption}
                onPress={() => handleMoodChange(mood as MoodState)}
              >
                <Text style={styles.compactMoodEmoji}>{data.emoji}</Text>
                <Text style={styles.compactMoodLabel}>{data.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Current Mood Display */}
      <TouchableOpacity 
        style={styles.currentMoodContainer}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.currentMoodContent}>
          <Text style={styles.currentMoodEmoji}>{currentMoodData.emoji}</Text>
          <View style={styles.currentMoodTextContainer}>
            <Text style={styles.currentMoodLabel}>{currentMoodData.label}</Text>
            <Text style={styles.intensityText}>
              Intensitet: {preferences.moodIntensity}/10
            </Text>
          </View>
        </View>
        
        {/* Mood Profile Indicators */}
        <View style={styles.profileIndicators}>
          <View style={styles.indicator}>
            <Text style={styles.indicatorLabel}>Energi</Text>
            <View style={styles.indicatorBar}>
              <View 
                style={[
                  styles.indicatorFill, 
                  { width: `${moodProfile.energy * 10}%` }
                ]} 
              />
            </View>
          </View>
          <View style={styles.indicator}>
            <Text style={styles.indicatorLabel}>Eventyr</Text>
            <View style={styles.indicatorBar}>
              <View 
                style={[
                  styles.indicatorFill, 
                  { width: `${moodProfile.adventure * 10}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <Text style={styles.expandIcon}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Expanded Mood Options */}
      {isExpanded && (
        <Animated.View 
          style={[
            styles.expandedContainer,
            {
              opacity: animatedValue,
              transform: [
                {
                  scaleY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Quick Presets */}
          <View style={styles.presetsContainer}>
            <Text style={styles.sectionTitle}>Hurtigvalg</Text>
            <View style={styles.presetsGrid}>
              {quickPresets.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={styles.presetButton}
                  onPress={() => handlePresetChange(preset.id as any)}
                >
                  <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* All Mood Options */}
          <View style={styles.moodsContainer}>
            <Text style={styles.sectionTitle}>Alle stemninger</Text>
            <View style={styles.moodsGrid}>
              {Object.entries(MOOD_STATES).map(([mood, data]) => {
                const isSelected = mood === currentMood;
                
                return (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodOption,
                      isSelected && styles.selectedMoodOption,
                    ]}
                    onPress={() => handleMoodChange(mood as MoodState)}
                  >
                    <Text style={styles.moodOptionEmoji}>{data.emoji}</Text>
                    <Text style={[
                      styles.moodOptionLabel,
                      isSelected && styles.selectedMoodLabel,
                    ]}>
                      {data.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Compact version styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'relative',
  },
  compactEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  compactMood: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  compactDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  compactMoodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compactMoodEmoji: {
    fontSize: 18,
    marginRight: 12,
  },
  compactMoodLabel: {
    fontSize: 14,
    color: '#333',
  },

  // Full version styles
  currentMoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  currentMoodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentMoodEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  currentMoodTextContainer: {
    flex: 1,
  },
  currentMoodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  intensityText: {
    fontSize: 14,
    color: '#666',
  },
  profileIndicators: {
    marginRight: 16,
  },
  indicator: {
    marginBottom: 8,
    minWidth: 80,
  },
  indicatorLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  indicatorBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicatorFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },

  expandedContainer: {
    backgroundColor: '#fff',
  },
  presetsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  presetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 4,
    minWidth: 70,
  },
  presetEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },

  moodsContainer: {
    padding: 16,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  moodOption: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    margin: 4,
    minWidth: 90,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMoodOption: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  },
  moodOptionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodOptionLabel: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedMoodLabel: {
    color: '#007bff',
    fontWeight: '600',
  },
});

export default QuickMoodSelector;