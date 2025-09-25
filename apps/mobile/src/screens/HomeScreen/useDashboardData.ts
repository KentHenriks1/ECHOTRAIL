/**
 * Dashboard Data Hook for HomeScreen
 * Handles fetching and managing dashboard statistics and recent trails
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { ApiServices } from '../../services/api';
import type { Trail } from '../../services/api/TrailService';
import { Logger, PerformanceMonitor } from '../../core/utils';

export interface DashboardStats {
  totalTrails: number;
  totalDistance: number;
  totalDuration: number;
  recentTrails: Trail[];
}

export interface DashboardData {
  stats: DashboardStats;
  isLoading: boolean;
  refreshing: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const useDashboardData = (isAuthenticated: boolean): DashboardData => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTrails: 0,
    totalDistance: 0,
    totalDuration: 0,
    recentTrails: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logger = useMemo(() => new Logger('HomeScreen'), []);

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      logger.info('Fetching dashboard data');
      const startTime = performance.now();

      // Fetch recent trails
      const response = await ApiServices.trails.getTrails({
        page: 1,
        limit: 5,
        sort: 'createdAt',
        order: 'desc',
      });

      const duration = performance.now() - startTime;
      PerformanceMonitor.trackCustomMetric('dashboard_load', duration, 'ms');

      if (response.success && response.data) {
        const trails = response.data;

        // Calculate statistics
        const totalDistance = trails.reduce(
          (sum, trail) => sum + (trail.metadata.distance || 0),
          0
        );
        const totalDuration = trails.reduce(
          (sum, trail) => sum + (trail.metadata.duration || 0),
          0
        );

        setStats({
          totalTrails: response.data.length,
          totalDistance,
          totalDuration,
          recentTrails: trails,
        });

        setError(null);
        logger.info('Dashboard data loaded successfully', {
          trailCount: trails.length,
          totalTrails: response.data.length,
          duration,
        });
      } else {
        throw new Error(
          response.error?.message || 'Failed to load dashboard data'
        );
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      logger.error('Failed to load dashboard data', undefined, err as Error);

      Alert.alert('Error Loading Dashboard', errorMessage, [
        { text: 'OK', style: 'default' },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, logger]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    isLoading,
    refreshing,
    error,
    fetchDashboardData,
    onRefresh,
  };
};