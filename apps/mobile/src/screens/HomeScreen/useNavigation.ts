/**
 * Navigation actions hook for HomeScreen
 * Handles all navigation logic and logging
 */

import { useCallback, useMemo } from 'react';
import { useNavigation as useRNNavigation } from '@react-navigation/native';
import type { Trail } from '../../services/api/TrailService';
import { Logger } from '../../core/utils';

export interface NavigationActions {
  handleTrailPress: (_trail: Trail) => void;
  handleStartRecording: () => void;
  handleViewAllTrails: () => void;
}

export const useNavigation = (): NavigationActions => {
  const navigation = useRNNavigation();
  const logger = useMemo(() => new Logger('HomeScreen'), []);

  // Handle trail press
  const handleTrailPress = useCallback(
    (trail: Trail) => {
      logger.userAction('trail_selected', 'HomeScreen', { trailId: trail.id });
      // Navigate to Trails screen which will show trail details
      navigation.navigate('Trails' as never);
      logger.info('Navigated to trail details from HomeScreen', {
        trailId: trail.id,
      });
    },
    [logger, navigation]
  );

  // Handle start recording action
  const handleStartRecording = useCallback(() => {
    logger.userAction('start_recording', 'HomeScreen');
    // Navigate directly to TrailRecordingScreen
    navigation.navigate('Record' as never);
    logger.info('Navigated to TrailRecordingScreen from HomeScreen');
  }, [logger, navigation]);

  // Handle view all trails action
  const handleViewAllTrails = useCallback(() => {
    logger.userAction('view_all_trails', 'HomeScreen');
    // Navigate directly to TrailsScreen
    navigation.navigate('Trails' as never);
    logger.info('Navigated to TrailsScreen from HomeScreen');
  }, [logger, navigation]);

  return {
    handleTrailPress,
    handleStartRecording,
    handleViewAllTrails,
  };
};