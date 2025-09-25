/**
 * Dynamic Interest Slider - Real-time interest level adjustment
 * Allows users to quickly modify their interest levels with immediate feedback
 * 
 * Author: Kent Rune Henriksen
 * Email: Kent@zentric.no
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  State,
} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { 
  useUserPreferences, 
  INTEREST_CATEGORIES, 
  InterestCategory 
} from '../../contexts/UserPreferencesContext';

interface Props {
  category: InterestCategory;
  style?: any;
  compact?: boolean;
  showLabel?: boolean;
  onValueChange?: (category: InterestCategory, value: number) => void;
}

export const InterestSlider: React.FC<Props> = ({
  category,
  style,
  compact = false,
  showLabel = true,
  onValueChange,
}) => {
  const { preferences, updateInterest } = useUserPreferences();
  
  const currentValue = preferences.interests[category];
  const categoryData = INTEREST_CATEGORIES[category];
  
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(currentValue);
  
  // Animated values
  const translateX = useSharedValue(0);
  const sliderWidth = compact ? 120 : 200;
  const thumbSize = compact ? 20 : 24;
  
  // Calculate initial position
  const initialPosition = (currentValue / 10) * (sliderWidth - thumbSize);
  translateX.value = initialPosition;

  const updateValue = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(10, Math.round(value)));
    setDisplayValue(clampedValue);
    onValueChange?.(category, clampedValue);
  }, [category, onValueChange]);

  const commitValue = useCallback(async (value: number) => {
    const clampedValue = Math.max(0, Math.min(10, Math.round(value)));
    await updateInterest(category, clampedValue);
  }, [category, updateInterest]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(setIsDragging)(true);
    },
    onActive: (event) => {
      // Calculate new position
      const newX = Math.max(0, Math.min(sliderWidth - thumbSize, event.translationX + initialPosition));
      translateX.value = newX;
      
      // Calculate value (0-10)
      const newValue = (newX / (sliderWidth - thumbSize)) * 10;
      runOnJS(updateValue)(newValue);
    },
    onEnd: () => {
      runOnJS(setIsDragging)(false);
      
      // Commit the final value
      const finalValue = (translateX.value / (sliderWidth - thumbSize)) * 10;
      runOnJS(commitValue)(finalValue);
    },
  });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const trackFillStyle = useAnimatedStyle(() => {
    const fillWidth = translateX.value + thumbSize / 2;
    return {
      width: fillWidth,
    };
  });

  // Color based on value
  const getValueColor = (value: number): string => {
    if (value <= 3) return '#dc3545'; // Red for low interest
    if (value <= 6) return '#ffc107'; // Yellow for medium interest  
    return '#28a745'; // Green for high interest
  };

  const getIntensityLabel = (value: number): string => {
    if (value <= 2) return 'Ikke interessert';
    if (value <= 4) return 'Lav interesse';
    if (value <= 6) return 'Moderat interesse';
    if (value <= 8) return 'Høy interesse';
    return 'Brennende interesse';
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.emoji}>{categoryData.emoji}</Text>
          <View style={styles.labelTextContainer}>
            <Text style={[styles.label, compact && styles.compactLabel]}>
              {categoryData.label}
            </Text>
            {!compact && (
              <Text style={[
                styles.intensityLabel,
                { color: getValueColor(displayValue) }
              ]}>
                {getIntensityLabel(displayValue)}
              </Text>
            )}
          </View>
        </View>
      )}
      
      <View style={styles.sliderContainer}>
        <View style={[
          styles.sliderTrack,
          { width: sliderWidth },
          compact && styles.compactTrack
        ]}>
          {/* Background track */}
          <View style={styles.trackBackground} />
          
          {/* Filled track */}
          <Animated.View 
            style={[
              styles.trackFill,
              trackFillStyle,
              { backgroundColor: getValueColor(displayValue) }
            ]} 
          />
          
          {/* Value markers */}
          {!compact && (
            <View style={styles.markersContainer}>
              {[0, 2, 4, 6, 8, 10].map((marker) => (
                <View
                  key={marker}
                  style={[
                    styles.marker,
                    { 
                      left: (marker / 10) * (sliderWidth - thumbSize) + thumbSize / 2 - 1,
                      backgroundColor: displayValue >= marker ? getValueColor(displayValue) : '#e9ecef'
                    }
                  ]}
                />
              ))}
            </View>
          )}
          
          {/* Draggable thumb */}
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View
              style={[
                styles.thumb,
                { 
                  width: thumbSize,
                  height: thumbSize,
                  backgroundColor: getValueColor(displayValue)
                },
                thumbStyle,
                isDragging && styles.thumbDragging,
                compact && styles.compactThumb
              ]}
            >
              {!compact && (
                <Text style={styles.thumbText}>{displayValue}</Text>
              )}
            </Animated.View>
          </PanGestureHandler>
        </View>
        
        {/* Value display */}
        <View style={styles.valueContainer}>
          <Text style={[
            styles.valueText,
            { color: getValueColor(displayValue) },
            compact && styles.compactValueText
          ]}>
            {displayValue}/10
          </Text>
          {compact && (
            <Text style={styles.compactIntensity}>
              {getIntensityLabel(displayValue)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  compactContainer: {
    marginVertical: 8,
  },
  
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
  },
  labelTextContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  compactLabel: {
    fontSize: 14,
    marginBottom: 0,
  },
  intensityLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderTrack: {
    height: 32,
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    marginRight: 16,
  },
  compactTrack: {
    height: 24,
  },
  
  trackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  
  markersContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 16,
    height: 12,
  },
  marker: {
    position: 'absolute',
    width: 2,
    height: 8,
    borderRadius: 1,
  },
  
  thumb: {
    position: 'absolute',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  compactThumb: {
    borderRadius: 10,
  },
  thumbDragging: {
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  thumbText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  
  valueContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactValueText: {
    fontSize: 14,
  },
  compactIntensity: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
});

export default InterestSlider;