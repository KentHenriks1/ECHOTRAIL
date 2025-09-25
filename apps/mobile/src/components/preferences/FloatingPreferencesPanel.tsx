/**
 * Floating Preferences Panel - Always accessible preference adjustments
 * Provides a floating, minimizable panel for quick preference changes anywhere in app
 * 
 * Author: Kent Rune Henriksen
 * Email: Kent@zentric.no
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { 
  useUserPreferences, 
  INTEREST_CATEGORIES, 
  InterestCategory 
} from '../../contexts/UserPreferencesContext';
import QuickMoodSelector from './QuickMoodSelector';
import InterestSlider from './InterestSlider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  onClose?: () => void;
  initiallyMinimized?: boolean;
}

export const FloatingPreferencesPanel: React.FC<Props> = ({ 
  onClose,
  initiallyMinimized = false 
}) => {
  const { 
    preferences, 
    getTopInterests, 
    updateSessionContext,
    toggleWeatherInfluence 
  } = useUserPreferences();

  const [isMinimized, setIsMinimized] = useState(initiallyMinimized);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTab, setCurrentTab] = useState<'mood' | 'interests' | 'context'>('mood');
  
  // Animation values
  const panelAnimation = useRef(new Animated.Value(isMinimized ? 0 : 1)).current;
  const positionAnimation = useRef(new Animated.ValueXY({
    x: screenWidth - 80, // Start at right edge
    y: screenHeight / 2 - 100, // Center vertically
  })).current;
  
  const topInterests = getTopInterests(5);

  // Pan responder for dragging the panel
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        positionAnimation.setOffset({
          x: positionAnimation.x._value,
          y: positionAnimation.y._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: positionAnimation.x, dy: positionAnimation.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        positionAnimation.flattenOffset();
        
        // Snap to edges
        const finalX = gestureState.moveX < screenWidth / 2 ? 20 : screenWidth - (isMinimized ? 80 : 320);
        const finalY = Math.max(50, Math.min(screenHeight - 200, positionAnimation.y._value));
        
        Animated.spring(positionAnimation, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const toggleMinimize = (): void => {
    const toValue = isMinimized ? 1 : 0;
    setIsMinimized(!isMinimized);
    
    Animated.spring(panelAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleClose = (): void => {
    Animated.timing(panelAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      onClose?.();
    });
  };

  const animatedStyle = {
    transform: positionAnimation.getTranslateTransform(),
    width: panelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [60, 300],
    }),
    height: panelAnimation.interpolate({
      inputRange: [0, 1], 
      outputRange: [60, 400],
    }),
    opacity: panelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
  };

  if (isMinimized) {
    return (
      <Animated.View
        style={[styles.minimizedPanel, animatedStyle]}
        {...panResponder.panHandlers}
      >
        <BlurView intensity={80} style={styles.blurContainer}>
          <TouchableOpacity 
            style={styles.minimizedContent}
            onPress={toggleMinimize}
          >
            <Text style={styles.minimizedEmoji}>
              {MOOD_STATES[preferences.currentMood].emoji}
            </Text>
            <Text style={styles.minimizedText}>⚙️</Text>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.expandedPanel, animatedStyle]}
    >
      <BlurView intensity={95} style={styles.blurContainer}>
        {/* Header */}
        <View style={styles.header} {...panResponder.panHandlers}>
          <Text style={styles.headerTitle}>Preferanser</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={toggleMinimize} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { id: 'mood', label: 'Stemning', emoji: '😊' },
            { id: 'interests', label: 'Interesser', emoji: '🎯' },
            { id: 'context', label: 'Kontekst', emoji: '⚙️' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                currentTab === tab.id && styles.activeTab,
              ]}
              onPress={() => setCurrentTab(tab.id as any)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[
                styles.tabLabel,
                currentTab === tab.id && styles.activeTabLabel,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentTab === 'mood' && (
            <View style={styles.tabContent}>
              <QuickMoodSelector compact />
              
              {/* Quick context toggles */}
              <View style={styles.quickToggles}>
                <TouchableOpacity 
                  style={[
                    styles.quickToggle,
                    preferences.sessionContext.weatherInfluence && styles.activeToggle
                  ]}
                  onPress={toggleWeatherInfluence}
                >
                  <Text style={styles.toggleEmoji}>🌤️</Text>
                  <Text style={styles.toggleLabel}>Vær påvirker stemning</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.quickToggle,
                    !preferences.sessionContext.isAlone && styles.activeToggle
                  ]}
                  onPress={() => updateSessionContext({ 
                    isAlone: !preferences.sessionContext.isAlone 
                  })}
                >
                  <Text style={styles.toggleEmoji}>👥</Text>
                  <Text style={styles.toggleLabel}>
                    {preferences.sessionContext.isAlone ? 'Alene' : 'Med andre'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentTab === 'interests' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Topp interesser</Text>
              {topInterests.map((interest) => (
                <InterestSlider
                  key={interest.category}
                  category={interest.category}
                  compact
                />
              ))}
              
              {/* Quick interest adjustments */}
              <View style={styles.quickInterests}>
                <Text style={styles.sectionTitle}>Hurtigjustering</Text>
                <View style={styles.interestButtons}>
                  {Object.entries(INTEREST_CATEGORIES).slice(0, 6).map(([category, data]) => (
                    <TouchableOpacity
                      key={category}
                      style={styles.interestButton}
                      onPress={() => {
                        const current = preferences.interests[category as InterestCategory];
                        const newValue = current >= 7 ? Math.max(1, current - 2) : Math.min(10, current + 2);
                        updateInterest(category as InterestCategory, newValue);
                      }}
                    >
                      <Text style={styles.interestEmoji}>{data.emoji}</Text>
                      <Text style={styles.interestValue}>
                        {preferences.interests[category as InterestCategory]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {currentTab === 'context' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Situasjon</Text>
              
              {/* Activity Level */}
              <View style={styles.contextSection}>
                <Text style={styles.contextLabel}>Aktivitetsnivå</Text>
                <View style={styles.contextOptions}>
                  {[
                    { id: 'stationary', emoji: '🪑', label: 'Stille' },
                    { id: 'walking', emoji: '🚶', label: 'Gående' },
                    { id: 'traveling', emoji: '🚗', label: 'Reisende' },
                    { id: 'exploring', emoji: '🔍', label: 'Utforsker' },
                  ].map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.contextOption,
                        preferences.sessionContext.activityLevel === activity.id && styles.activeContextOption,
                      ]}
                      onPress={() => updateSessionContext({ 
                        activityLevel: activity.id as any 
                      })}
                    >
                      <Text style={styles.contextEmoji}>{activity.emoji}</Text>
                      <Text style={styles.contextOptionLabel}>{activity.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Story preferences */}
              <View style={styles.contextSection}>
                <Text style={styles.contextLabel}>Historielengde</Text>
                <View style={styles.contextOptions}>
                  {[
                    { id: 'kort', label: 'Kort', time: '1-2 min' },
                    { id: 'medium', label: 'Medium', time: '3-5 min' },
                    { id: 'lang', label: 'Lang', time: '5-10 min' },
                  ].map((length) => (
                    <TouchableOpacity
                      key={length.id}
                      style={[
                        styles.lengthOption,
                        preferences.preferredStoryLength === length.id && styles.activeLengthOption,
                      ]}
                      onPress={() => updateSessionContext({ 
                        preferredStoryLength: length.id as any 
                      })}
                    >
                      <Text style={styles.lengthLabel}>{length.label}</Text>
                      <Text style={styles.lengthTime}>{length.time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sist oppdatert: {new Date().toLocaleTimeString('nb-NO', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Base panel styles
  minimizedPanel: {
    position: 'absolute',
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  expandedPanel: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Minimized state
  minimizedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizedEmoji: {
    fontSize: 24,
  },
  minimizedText: {
    fontSize: 12,
    marginTop: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
  },
  activeTabLabel: {
    color: '#333',
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },

  // Quick toggles
  quickToggles: {
    marginTop: 16,
  },
  quickToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  activeToggle: {
    backgroundColor: 'rgba(0,123,255,0.2)',
  },
  toggleEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#333',
  },

  // Interest buttons
  quickInterests: {
    marginTop: 16,
  },
  interestButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  interestButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    margin: 4,
    minWidth: 50,
  },
  interestEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  interestValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#007bff',
  },

  // Context sections
  contextSection: {
    marginBottom: 16,
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contextOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  contextOption: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeContextOption: {
    backgroundColor: 'rgba(0,123,255,0.2)',
    borderColor: '#007bff',
  },
  contextEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  contextOptionLabel: {
    fontSize: 10,
    color: '#333',
  },

  // Length options
  lengthOption: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  activeLengthOption: {
    backgroundColor: 'rgba(0,123,255,0.2)',
    borderColor: '#007bff',
  },
  lengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  lengthTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});

export default FloatingPreferencesPanel;