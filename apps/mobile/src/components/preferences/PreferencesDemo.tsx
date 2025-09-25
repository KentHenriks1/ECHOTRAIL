/**
 * Preferences Demo - Showcase dynamic user preferences system
 * Demonstrates how easily accessible and responsive the preference system is
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
  ScrollView,
  Alert,
} from 'react-native';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import QuickMoodSelector from './QuickMoodSelector';
import InterestSlider from './InterestSlider';
import FloatingPreferencesPanel from './FloatingPreferencesPanel';

export const PreferencesDemo: React.FC = () => {
  const { 
    preferences, 
    getTopInterests, 
    getCurrentMoodProfile,
    getContextScore,
    applyMoodPreset,
    resetToDefaults,
    exportPreferences,
  } = useUserPreferences();

  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  
  const topInterests = getTopInterests(3);
  const moodProfile = getCurrentMoodProfile();

  const handleExportPreferences = async (): Promise<void> => {
    try {
      const exported = await exportPreferences();
      Alert.alert(
        'Preferanser eksportert',
        `Dine preferanser er klare:\n\n${exported.substring(0, 200)}...`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke eksportere preferanser');
    }
  };

  const getPersonalityDescription = (): string => {
    const { energy, curiosity, social, adventure, reflection } = moodProfile;
    
    let description = 'Du er ';
    
    if (energy >= 7) description += 'energisk og livlig, ';
    else if (energy <= 3) description += 'rolig og avslappet, ';
    else description += 'balansert i energi, ';
    
    if (curiosity >= 7) description += 'svært nysgjerrig og lærevillig, ';
    else if (curiosity <= 3) description += 'fornøyd med det kjente, ';
    else description += 'moderat nysgjerrig, ';
    
    if (social >= 7) description += 'sosial og utadvendt, ';
    else if (social <= 3) description += 'mer introvert og privat, ';
    else description += 'balansert sosialt, ';
    
    if (adventure >= 7) description += 'og elsker eventyr og utfordringer.';
    else if (adventure <= 3) description += 'og foretrekker trygghet og rutiner.';
    else description += 'og liker en blanding av eventyr og stabilitet.';
    
    return description;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Dynamiske Brukerpreferanser</Text>
        <Text style={styles.subtitle}>
          Juster dine preferanser i sanntid og se hvordan de påvirker AI-historier
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Hurtighandlinger</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => applyMoodPreset('morning_energy')}
          >
            <Text style={styles.actionEmoji}>🌅</Text>
            <Text style={styles.actionLabel}>Morgen-energi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => applyMoodPreset('work_focus')}
          >
            <Text style={styles.actionEmoji}>🎯</Text>
            <Text style={styles.actionLabel}>Arbeidsfokus</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => applyMoodPreset('evening_relax')}
          >
            <Text style={styles.actionEmoji}>🌙</Text>
            <Text style={styles.actionLabel}>Kveldsslapning</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => applyMoodPreset('weekend_explore')}
          >
            <Text style={styles.actionEmoji}>🗺️</Text>
            <Text style={styles.actionLabel}>Helg-utforsking</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Mood */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>😊 Nåværende stemning</Text>
        <QuickMoodSelector />
      </View>

      {/* Top Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⭐ Topp interesser</Text>
        {topInterests.map((interest) => (
          <InterestSlider
            key={interest.category}
            category={interest.category}
            style={styles.interestSlider}
          />
        ))}
      </View>

      {/* Personality Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 Din personlighetsprofil</Text>
        <Text style={styles.personalityText}>
          {getPersonalityDescription()}
        </Text>
        
        <View style={styles.profileGrid}>
          {Object.entries({
            '⚡ Energi': moodProfile.energy,
            '🤔 Nysgjerrighet': moodProfile.curiosity,
            '👥 Sosial': moodProfile.social,
            '🗺️ Eventyr': moodProfile.adventure,
            '💭 Refleksjon': moodProfile.reflection,
          }).map(([label, value]) => (
            <View key={label} style={styles.profileItem}>
              <Text style={styles.profileLabel}>{label}</Text>
              <View style={styles.profileBar}>
                <View 
                  style={[
                    styles.profileFill, 
                    { 
                      width: `${value * 10}%`,
                      backgroundColor: value >= 7 ? '#28a745' : value >= 4 ? '#ffc107' : '#dc3545'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.profileValue}>{value}/10</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Context Matching */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Kontekst-matching</Text>
        <Text style={styles.contextDescription}>
          Slik matcher dine interesser med din nåværende stemning:
        </Text>
        
        <View style={styles.contextGrid}>
          {topInterests.map((interest) => {
            const contextScore = getContextScore(interest.category);
            return (
              <View key={interest.category} style={styles.contextItem}>
                <Text style={styles.contextEmoji}>
                  {INTEREST_CATEGORIES[interest.category].emoji}
                </Text>
                <Text style={styles.contextLabel}>{interest.label}</Text>
                <View style={styles.contextScoreBar}>
                  <View 
                    style={[
                      styles.contextScoreFill,
                      { 
                        width: `${contextScore * 100}%`,
                        backgroundColor: contextScore >= 0.7 ? '#28a745' : contextScore >= 0.4 ? '#ffc107' : '#dc3545'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.contextScore}>
                  {Math.round(contextScore * 100)}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Session Context */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Øktinformasjon</Text>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Tid på dagen:</Text>
            <Text style={styles.sessionValue}>
              {preferences.sessionContext.timeOfDay}
            </Text>
          </View>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Situasjon:</Text>
            <Text style={styles.sessionValue}>
              {preferences.sessionContext.isAlone ? 'Alene' : 'Med andre'}
            </Text>
          </View>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Aktivitet:</Text>
            <Text style={styles.sessionValue}>
              {preferences.sessionContext.activityLevel}
            </Text>
          </View>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Værpåvirkning:</Text>
            <Text style={styles.sessionValue}>
              {preferences.sessionContext.weatherInfluence ? 'Aktivert' : 'Deaktivert'}
            </Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Kontroller</Text>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setShowFloatingPanel(true)}
          >
            <Text style={styles.controlButtonText}>🎛️ Vis flytende panel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleExportPreferences}
          >
            <Text style={styles.controlButtonText}>💾 Eksporter preferanser</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, styles.dangerButton]}
            onPress={() => {
              Alert.alert(
                'Tilbakestill preferanser',
                'Er du sikker på at du vil tilbakestille alle preferanser til standard?',
                [
                  { text: 'Avbryt', style: 'cancel' },
                  { 
                    text: 'Tilbakestill', 
                    style: 'destructive',
                    onPress: resetToDefaults
                  }
                ]
              );
            }}
          >
            <Text style={styles.controlButtonText}>🔄 Tilbakestill alt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Impact Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI-påvirkning preview</Text>
        <Text style={styles.aiPreview}>
          Basert på dine nåværende preferanser vil AI-systemet:
        </Text>
        <View style={styles.aiImpacts}>
          <Text style={styles.aiImpact}>
            • Prioritere {topInterests[0]?.label.toLowerCase() || 'dine interesser'}
          </Text>
          <Text style={styles.aiImpact}>
            • Bruke en {moodProfile.toneKeywords[0] || 'tilpasset'} tone
          </Text>
          <Text style={styles.aiImpact}>
            • Levere {preferences.preferredStoryLength} historier
          </Text>
          <Text style={styles.aiImpact}>
            • {moodProfile.energy >= 7 ? 'Energiske' : moodProfile.energy <= 3 ? 'Rolige' : 'Balanserte'} narrativer
          </Text>
        </View>
      </View>

      {/* Floating Panel */}
      {showFloatingPanel && (
        <FloatingPreferencesPanel
          onClose={() => setShowFloatingPanel(false)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 6,
    minWidth: 100,
  },
  actionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Interest slider
  interestSlider: {
    marginVertical: 8,
  },

  // Personality
  personalityText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  profileGrid: {
    marginTop: 8,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 14,
    color: '#333',
    width: 100,
  },
  profileBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  profileFill: {
    height: '100%',
    borderRadius: 4,
  },
  profileValue: {
    fontSize: 12,
    color: '#666',
    minWidth: 30,
    textAlign: 'right',
  },

  // Context
  contextDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  contextGrid: {
    marginTop: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contextEmoji: {
    fontSize: 18,
    marginRight: 12,
  },
  contextLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  contextScoreBar: {
    width: 60,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  contextScoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  contextScore: {
    fontSize: 12,
    color: '#666',
    minWidth: 30,
    textAlign: 'right',
  },

  // Session info
  sessionInfo: {},
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionLabel: {
    fontSize: 14,
    color: '#666',
  },
  sessionValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  // Controls
  controls: {
    marginTop: 8,
  },
  controlButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // AI Impact
  aiPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  aiImpacts: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  aiImpact: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default PreferencesDemo;