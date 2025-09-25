/**
 * Enterprise-grade Lazy Screen Wrapper
 * Implements proper lazy loading with Suspense, Error Boundaries, and loading states
 */

import React, { Suspense, type ComponentType } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';

import { Logger } from '../../core/utils';

interface LazyScreenProps {
  fallback?: React.ReactElement;
  errorFallback?: React.ReactElement;
  screenName: string;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  screenName: string;
}

const logger = new Logger('LazyScreen');

/**
 * Default Loading Component
 */
const DefaultLoadingFallback: React.FC<{ screenName: string }> = ({ 
  screenName 
}) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2563eb" />
    <Text style={styles.loadingText}>Loading {screenName}...</Text>
  </View>
);

/**
 * Default Error Fallback Component
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary, 
  screenName 
}) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Failed to load {screenName}</Text>
    <Text style={styles.errorMessage}>{error.message}</Text>
    <Text style={styles.retryButton} onPress={resetErrorBoundary}>
      Tap to retry
    </Text>
  </View>
);

/**
 * Higher-Order Component for Lazy Screen Loading
 */
export function withLazyScreen<P extends object>(
  WrappedComponent: ComponentType<P>,
  screenName: string,
  options: Partial<LazyScreenProps> = {}
): React.FC<P> {
  const LazyScreenComponent: React.FC<P> = (props) => {
    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      logger.error(`Screen lazy loading failed: ${screenName}`, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack || 'N/A',
      });
    };

    const handleReset = () => {
      logger.info(`Retrying screen load: ${screenName}`);
    };

    return (
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => 
          options.errorFallback || (
            <DefaultErrorFallback {...fallbackProps} screenName={screenName} />
          )
        }
        onError={handleError}
        onReset={handleReset}
      >
        <Suspense
          fallback={
            options.fallback || (
              <DefaultLoadingFallback screenName={screenName} />
            )
          }
        >
          <WrappedComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  LazyScreenComponent.displayName = `LazyScreen(${screenName})`;
  return LazyScreenComponent;
}


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});