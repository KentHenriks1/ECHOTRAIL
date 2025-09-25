/**
 * Reusable components for HomeScreen
 * Modular UI components for better maintainability
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { Trail } from '../../services/api/TrailService';
import type { DashboardStats } from './useDashboardData';
import { formatDistance, formatDuration, formatDate, formatSpeed } from './utils';
import { styles } from './styles';
import { ThemeConfig } from '../../core/config';

// Loading State Component
export interface LoadingStateProps {
  isLoading: boolean;
  isAuthLoading: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ isLoading, isAuthLoading }) => {
  if (!isLoading && !isAuthLoading) return null;
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={ThemeConfig.primaryColor} />
      <Text style={styles.loadingText}>Loading dashboard...</Text>
    </View>
  );
};

// Authentication State Component
export interface AuthStateProps {
  isAuthenticated: boolean;
}

export const AuthState: React.FC<AuthStateProps> = ({ isAuthenticated }) => {
  if (isAuthenticated) return null;
  
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Welcome to EchoTrail</Text>
      <Text style={styles.subtitle}>
        Please log in to view your dashboard
      </Text>
    </View>
  );
};

// Header Component
export interface HeaderProps {
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({ userName }) => (
  <View style={styles.header}>
    <Text style={styles.greeting}>
      Welcome back{userName ? `, ${userName}` : ''}!
    </Text>
    <Text style={styles.subtitle}>Ready for your next adventure?</Text>
  </View>
);

// Quick Actions Component
export interface QuickActionsProps {
  onStartRecording: () => void;
  onViewAllTrails: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onStartRecording,
  onViewAllTrails,
}) => (
  <View style={styles.quickActions}>
    <Pressable
      style={[styles.actionButton, styles.primaryAction]}
      onPress={onStartRecording}
    >
      <Text style={styles.primaryActionText}>🎯 Start Recording</Text>
    </Pressable>

    <Pressable
      style={[styles.actionButton, styles.secondaryAction]}
      onPress={onViewAllTrails}
    >
      <Text style={styles.secondaryActionText}>📍 View All Trails</Text>
    </Pressable>
  </View>
);

// Statistics Component
export interface StatisticsProps {
  stats: DashboardStats;
}

export const Statistics: React.FC<StatisticsProps> = ({ stats }) => (
  <View style={styles.statsContainer}>
    <Text style={styles.sectionTitle}>Your Statistics</Text>

    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalTrails}</Text>
        <Text style={styles.statLabel}>Total Trails</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          {formatDistance(stats.totalDistance)}
        </Text>
        <Text style={styles.statLabel}>Distance</Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          {formatDuration(stats.totalDuration)}
        </Text>
        <Text style={styles.statLabel}>Total Time</Text>
      </View>
    </View>
  </View>
);

// Trail Card Component
export interface TrailCardProps {
  trail: Trail;
  onPress: (_trail: Trail) => void;
}

export const TrailCard: React.FC<TrailCardProps> = ({ trail, onPress }) => (
  <Pressable
    style={styles.trailCard}
    onPress={() => onPress(trail)}
  >
    <View style={styles.trailHeader}>
      <Text style={styles.trailName}>{trail.name}</Text>
      <Text style={styles.trailDate}>
        {formatDate(trail.createdAt)}
      </Text>
    </View>

    {trail.description && (
      <Text style={styles.trailDescription} numberOfLines={2}>
        {trail.description}
      </Text>
    )}

    <View style={styles.trailStats}>
      <Text style={styles.trailStat}>
        📏 {formatDistance(trail.metadata.distance || 0)}
      </Text>
      <Text style={styles.trailStat}>
        ⏱️ {formatDuration(trail.metadata.duration || 0)}
      </Text>
      {trail.metadata.avgSpeed && (
        <Text style={styles.trailStat}>
          🏃 {formatSpeed(trail.metadata.avgSpeed)}
        </Text>
      )}
    </View>
  </Pressable>
);

// Recent Trails Section Component
export interface RecentTrailsProps {
  trails: Trail[];
  onTrailPress: (_trail: Trail) => void;
  onViewAllTrails: () => void;
}

export const RecentTrails: React.FC<RecentTrailsProps> = ({
  trails,
  onTrailPress,
  onViewAllTrails,
}) => (
  <View style={styles.recentContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recent Trails</Text>
      <Pressable onPress={onViewAllTrails}>
        <Text style={styles.seeAllText}>See All</Text>
      </Pressable>
    </View>

    {trails.length > 0 ? (
      trails.map((trail) => (
        <TrailCard
          key={trail.id}
          trail={trail}
          onPress={onTrailPress}
        />
      ))
    ) : (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No trails yet</Text>
        <Text style={styles.emptySubtitle}>
          Start recording your first trail to see it here!
        </Text>
      </View>
    )}
  </View>
);

// Error State Component
export interface ErrorStateProps {
  error: string | null;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  if (!error) return null;
  
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>⚠️ {error}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
};