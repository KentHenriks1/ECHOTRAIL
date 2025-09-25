/**
 * Styles for HomeScreen components
 * Centralized styling for better maintainability
 */

import { StyleSheet } from 'react-native';
import { ThemeConfig } from '../../core/config';
import { getFontWeight } from '../../core/theme/utils';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      ThemeConfig.primaryColor === '#2563eb' ? '#f8fafc' : '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ThemeConfig.spacing.md,
    paddingBottom: ThemeConfig.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ThemeConfig.spacing.lg,
  },
  header: {
    marginVertical: ThemeConfig.spacing.lg,
  },
  greeting: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight('bold'),
    color: '#1e293b',
    marginBottom: ThemeConfig.spacing.xs,
  },
  title: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight('bold'),
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: ThemeConfig.spacing.sm,
  },
  subtitle: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: ThemeConfig.spacing.lg,
  },
  actionButton: {
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.lg,
    borderRadius: 12,
    marginBottom: ThemeConfig.spacing.sm,
    alignItems: 'center',
  },
  primaryAction: {
    backgroundColor: ThemeConfig.primaryColor,
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: ThemeConfig.primaryColor,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('medium'),
  },
  secondaryActionText: {
    color: ThemeConfig.primaryColor,
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('medium'),
  },
  statsContainer: {
    marginBottom: ThemeConfig.spacing.lg,
  },
  sectionTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('bold'),
    color: '#1e293b',
    marginBottom: ThemeConfig.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ThemeConfig.spacing.md,
  },
  seeAllText: {
    color: ThemeConfig.primaryColor,
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight('medium'),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: ThemeConfig.spacing.md,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: ThemeConfig.typography.fontSize.xl,
    fontWeight: getFontWeight('bold'),
    color: ThemeConfig.primaryColor,
    marginBottom: ThemeConfig.spacing.xs,
  },
  statLabel: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
  },
  recentContainer: {
    marginBottom: ThemeConfig.spacing.lg,
  },
  trailCard: {
    backgroundColor: '#ffffff',
    padding: ThemeConfig.spacing.md,
    borderRadius: 12,
    marginBottom: ThemeConfig.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ThemeConfig.spacing.xs,
  },
  trailName: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('medium'),
    color: '#1e293b',
    flex: 1,
  },
  trailDate: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  trailDescription: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    marginBottom: ThemeConfig.spacing.sm,
    lineHeight:
      ThemeConfig.typography.lineHeight.normal *
      ThemeConfig.typography.fontSize.md,
  },
  trailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trailStat: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: ThemeConfig.spacing.xl,
  },
  emptyTitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight('medium'),
    color: '#1e293b',
    marginBottom: ThemeConfig.spacing.xs,
  },
  emptySubtitle: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: ThemeConfig.errorColor,
    marginBottom: ThemeConfig.spacing.md,
  },
  errorText: {
    color: ThemeConfig.errorColor,
    fontSize: ThemeConfig.typography.fontSize.md,
    marginBottom: ThemeConfig.spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: ThemeConfig.spacing.xs,
    paddingHorizontal: ThemeConfig.spacing.sm,
    backgroundColor: ThemeConfig.errorColor,
    borderRadius: 6,
  },
  retryText: {
    color: '#ffffff',
    fontSize: ThemeConfig.typography.fontSize.sm,
    fontWeight: getFontWeight('medium'),
  },
});