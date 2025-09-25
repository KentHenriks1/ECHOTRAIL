/**
 * AI Test Screen - Demonstrates AI/TTS Integration
 * Testing interface for the OpenAI service functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aiServiceManager } from '../services/ai';
import { ThemeConfig } from '../core/config';
import { getFontWeight } from '../core/theme/utils';
import type { 
  GeneratedStory, 
  UserPreferences, 
  LocationContext 
} from '../services/ai/OpenAIService';
import { Audio } from 'expo-av';

export function AITestScreen(): React.ReactElement {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  // Feedback functionality removed for simplification

  // Mock location data for Oslo, Norway
  const mockLocation: LocationContext = {
    latitude: 59.9139,
    longitude: 10.7522,
    address: 'Karl Johans gate, Oslo, Norway',
    nearbyPlaces: ['Royal Palace', 'Parliament', 'National Theatre'],
    historicalContext: 'Historic main street in Oslo city center',
    trail: {
      id: 'test-trail-001',
      name: 'Oslo City Walk',
      trackPoints: [
        {
          id: 'tp-1',
          coordinate: { latitude: 59.9139, longitude: 10.7522 },
          timestamp: new Date().toISOString(),
          accuracy: 10,
          altitude: 94,
          speed: 1.2,
          heading: 180,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tp-2',
          coordinate: { latitude: 59.9145, longitude: 10.7530 },
          timestamp: new Date(Date.now() + 60000).toISOString(),
          accuracy: 8,
          altitude: 96,
          speed: 1.4,
          heading: 185,
          createdAt: new Date(Date.now() + 60000).toISOString(),
        },
      ],
      distance: 500,
      duration: 300,
    },
  };

  const mockPreferences: UserPreferences = {
    interests: ['history', 'architecture', 'culture'],
    language: 'nb',
    storyLength: 'medium',
    voiceStyle: 'vennlig',
  };

  const testAIStoryGeneration = useCallback(async () => {
    try {
      setIsGenerating(true);
      console.log('🤖 Testing AI story generation...');

      const result = await aiServiceManager.generateStory(
        mockLocation,
        mockPreferences
      );
      const story = result.story;

      setCurrentStory(story);
      console.log('✅ AI story generated:', story.title);

      Alert.alert(
        '🎭 AI Story Generated!',
        `"${story.title}"\n\n${story.audioUrl ? 'Audio is ready to play!' : 'Story generated without audio.'}`,
        [{ text: 'Great!', style: 'default' }]
      );

    } catch (error) {
      console.error('❌ AI generation failed:', error);
      Alert.alert(
        'AI Generation Failed',
        'Could not generate AI story. This may be because:\n\n• OpenAI API key is not configured\n• Network connection issues\n• AI features are disabled\n\nCheck the console for more details.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const playStoryAudio = useCallback(async () => {
    if (!currentStory?.audioUrl) {
      Alert.alert('No Audio', 'No audio is available for this story.');
      return;
    }

    try {
      if (currentSound) {
        await currentSound.unloadAsync();
        setCurrentSound(null);
      }

      setIsPlaying(true);
      console.log('🔊 Playing AI-generated audio...');

      await aiServiceManager.playStoryAudio(currentStory.id);
      // Note: AIServiceManager handles audio playback internally
      console.log('✅ Audio playback started via AIServiceManager');

    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      setIsPlaying(false);
      Alert.alert('Playback Error', 'Could not play the story audio.');
    }
  }, [currentStory, currentSound]);

  const stopAudio = useCallback(async () => {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      setCurrentSound(null);
    }
    setIsPlaying(false);
  }, [currentSound]);

  // Feedback functionality simplified for demo

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>🤖 AI/TTS Test</Text>
          <Text style={styles.subtitle}>
            Test the integrated AI story generation and Text-to-Speech system
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Mock Location</Text>
          <View style={styles.locationCard}>
            <Text style={styles.locationText}>
              <Text style={styles.label}>Address: </Text>
              {mockLocation.address}
            </Text>
            <Text style={styles.locationText}>
              <Text style={styles.label}>Coordinates: </Text>
              {mockLocation.latitude.toFixed(4)}, {mockLocation.longitude.toFixed(4)}
            </Text>
            <Text style={styles.locationText}>
              <Text style={styles.label}>Trail: </Text>
              {mockLocation.trail?.name} ({mockLocation.trail?.distance}m)
            </Text>
            <Text style={styles.locationText}>
              <Text style={styles.label}>Points of Interest: </Text>
              {mockLocation.nearbyPlaces?.join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ User Preferences</Text>
          <View style={styles.preferencesCard}>
            <Text style={styles.preferenceText}>
              <Text style={styles.label}>Language: </Text>
              {mockPreferences.language} (Norwegian)
            </Text>
            <Text style={styles.preferenceText}>
              <Text style={styles.label}>Story Length: </Text>
              {mockPreferences.storyLength}
            </Text>
            <Text style={styles.preferenceText}>
              <Text style={styles.label}>Voice Style: </Text>
              {mockPreferences.voiceStyle}
            </Text>
            <Text style={styles.preferenceText}>
              <Text style={styles.label}>Interests: </Text>
              {mockPreferences.interests.join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 AI Generation Test</Text>
          
          <Pressable
            style={[
              styles.testButton,
              styles.generateButton,
              isGenerating && styles.disabledButton,
            ]}
            onPress={testAIStoryGeneration}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Generating Story...</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>✨ Generate AI Story</Text>
            )}
          </Pressable>
        </View>

        {currentStory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 Generated Story</Text>
            <View style={styles.storyCard}>
              <Text style={styles.storyTitle}>"{currentStory.title}"</Text>
              <Text style={styles.storyContent}>{currentStory.content}</Text>
              
              <View style={styles.storyMeta}>
                <Text style={styles.metaText}>
                  <Text style={styles.label}>Theme: </Text>
                  {currentStory.theme}
                </Text>
                <Text style={styles.metaText}>
                  <Text style={styles.label}>Historical Accuracy: </Text>
                  {currentStory.historicalAccuracy}
                </Text>
                <Text style={styles.metaText}>
                  <Text style={styles.label}>Tags: </Text>
                  {currentStory.interestTags.join(', ')}
                </Text>
                {currentStory.cost && (
                  <Text style={styles.metaText}>
                    <Text style={styles.label}>Cost: </Text>
                    {currentStory.cost.tokens} tokens 
                    {currentStory.cost.estimatedCost > 0 && 
                      ` (≈$${currentStory.cost.estimatedCost.toFixed(4)})`
                    }
                  </Text>
                )}
                {currentStory.duration && (
                  <Text style={styles.metaText}>
                    <Text style={styles.label}>Duration: </Text>
                    {Math.round(currentStory.duration / 60)} minutes
                  </Text>
                )}
              </View>

              {currentStory.audioUrl && (
                <View style={styles.audioControls}>
                  <Pressable
                    style={[
                      styles.testButton,
                      styles.playButton,
                      isPlaying && styles.stopButton,
                    ]}
                    onPress={isPlaying ? stopAudio : playStoryAudio}
                  >
                    <Text style={styles.buttonText}>
                      {isPlaying ? '⏹️ Stop Audio' : '🔊 Play Story'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Information</Text>
          <Text style={styles.infoText}>
            This screen tests the integrated AI/TTS system with:
            {'\n'}• OpenAI GPT-4o-mini for story generation
            {'\n'}• OpenAI TTS-1-HD for audio synthesis
            {'\n'}• Norwegian language support
            {'\n'}• Trail-specific context integration
            {'\n'}• Performance and cost tracking
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: ThemeConfig.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: ThemeConfig.spacing.xl,
  },
  title: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight('bold'),
    color: '#1e293b',
    marginBottom: ThemeConfig.spacing.xs,
  },
  subtitle: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: ThemeConfig.spacing.xl,
  },
  sectionTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('bold'),
    color: '#374151',
    marginBottom: ThemeConfig.spacing.md,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: '#4b5563',
    marginBottom: ThemeConfig.spacing.xs,
  },
  preferencesCard: {
    backgroundColor: '#ffffff',
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: '#4b5563',
    marginBottom: ThemeConfig.spacing.xs,
  },
  label: {
    fontWeight: getFontWeight('medium'),
    color: '#374151',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.lg,
    borderRadius: 8,
    minHeight: 48,
  },
  generateButton: {
    backgroundColor: '#6366f1',
  },
  playButton: {
    backgroundColor: '#059669',
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight('medium'),
  },
  storyCard: {
    backgroundColor: '#ffffff',
    padding: ThemeConfig.spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  storyTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('bold'),
    color: '#1e293b',
    marginBottom: ThemeConfig.spacing.md,
    textAlign: 'center',
  },
  storyContent: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: '#374151',
    lineHeight: 22,
    marginBottom: ThemeConfig.spacing.lg,
  },
  storyMeta: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: ThemeConfig.spacing.md,
    marginBottom: ThemeConfig.spacing.md,
  },
  metaText: {
    fontSize: ThemeConfig.typography.fontSize.xs,
    color: '#6b7280',
    marginBottom: ThemeConfig.spacing.xs,
  },
  audioControls: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: '#6b7280',
    lineHeight: 20,
    backgroundColor: '#ffffff',
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
});