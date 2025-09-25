/**
 * Home Screen - Enterprise Edition
 * Main dashboard with comprehensive trail overview and quick actions
 * 
 * Refactored for modularity and maintainability:
 * - Extracted data fetching to useDashboardData hook
 * - Extracted navigation actions to useNavigation hook 
 * - Extracted UI components to components.tsx
 * - Extracted utility functions to utils.ts
 * - Extracted styles to styles.ts
 */

import React, { useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { ThemeConfig } from '../core/config';

// Modular imports
import { useDashboardData } from './HomeScreen/useDashboardData';
import { useNavigation } from './HomeScreen/useNavigation';
import { styles } from './HomeScreen/styles';
import {
  LoadingState,
  AuthState,
  Header,
  QuickActions,
  Statistics,
  RecentTrails,
  ErrorState,
} from './HomeScreen/components';

export function HomeScreen(): React.ReactElement {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Data management
  const {
    stats,
    isLoading,
    refreshing,
    error,
    fetchDashboardData,
    onRefresh,
  } = useDashboardData(isAuthenticated);
  
  // Navigation actions
  const {
    handleTrailPress,
    handleStartRecording,
    handleViewAllTrails,
  } = useNavigation();

  // Initial load
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading, fetchDashboardData]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading State */}
      <LoadingState isLoading={isLoading} isAuthLoading={authLoading} />
      
      {/* Authentication State */}
      <AuthState isAuthenticated={isAuthenticated} />
      
      {/* Main Dashboard Content */}
      {isAuthenticated && !isLoading && !authLoading && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[ThemeConfig.primaryColor]}
              tintColor={ThemeConfig.primaryColor}
            />
          }
        >
          <Header userName={user?.name} />
          
          <QuickActions
            onStartRecording={handleStartRecording}
            onViewAllTrails={handleViewAllTrails}
          />
          
          <Statistics stats={stats} />
          
          <RecentTrails
            trails={stats.recentTrails}
            onTrailPress={handleTrailPress}
            onViewAllTrails={handleViewAllTrails}
          />
          
          <ErrorState
            error={error}
            onRetry={fetchDashboardData}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
