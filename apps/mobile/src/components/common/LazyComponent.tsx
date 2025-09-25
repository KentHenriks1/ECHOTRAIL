/**
 * Component-Level Lazy Loading Helper
 * Implements lazy loading for heavy components within screens
 */

import React, { Suspense, type ComponentType } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { Logger } from '../../core/utils';

interface LazyComponentProps {
  fallback?: React.ReactElement;
  errorFallback?: React.ReactElement;
  componentName: string;
  loadingHeight?: number;
  loadingWidth?: number;
}

interface ComponentErrorFallbackProps extends FallbackProps {
  componentName: string;
}

const logger = new Logger('LazyComponent');

/**
 * Default Loading Component for individual components
 */
const DefaultComponentLoadingFallback: React.FC<{ 
  componentName: string; 
  height?: number;
  width?: number;
}> = ({ componentName, height = 100, width }) => (
  <View style={[
    styles.componentLoadingContainer, 
    { height, width: width || '100%' }
  ]}>
    <ActivityIndicator size="small" color="#007AFF" />
    <Text style={styles.componentLoadingText}>Loading {componentName}...</Text>
  </View>
);

/**
 * Default Error Fallback Component for individual components
 */
const DefaultComponentErrorFallback: React.FC<ComponentErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary, 
  componentName 
}) => {
  logger.error(`Component loading failed: ${componentName}`, error);
  
  return (
    <View style={styles.componentErrorContainer}>
      <Text style={styles.componentErrorTitle}>
        Failed to load {componentName}
      </Text>
      <Text style={styles.componentErrorMessage}>
        {__DEV__ ? error.message : 'Component unavailable'}
      </Text>
      <Text style={styles.componentRetryButton} onPress={resetErrorBoundary}>
        Retry
      </Text>
    </View>
  );
};

/**
 * Higher-Order Component for Component-Level Lazy Loading
 */
export function withLazyComponent<P extends object>(
  LazyComponent: ComponentType<P>,
  componentName: string,
  options: Partial<LazyComponentProps> = {}
): React.FC<P> {
  const WrappedLazyComponent: React.FC<P> = (props) => {
    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      logger.error(`Component lazy loading failed: ${componentName}`, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack || 'N/A',
      });
    };

    const handleReset = () => {
      logger.info(`Retrying component load: ${componentName}`);
    };

    return (
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => 
          options.errorFallback || (
            <DefaultComponentErrorFallback {...fallbackProps} componentName={componentName} />
          )
        }
        onError={handleError}
        onReset={handleReset}
      >
        <Suspense
          fallback={
            options.fallback || (
              <DefaultComponentLoadingFallback 
                componentName={componentName} 
                height={options.loadingHeight}
                width={options.loadingWidth}
              />
            )
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  WrappedLazyComponent.displayName = `LazyComponent(${componentName})`;
  return WrappedLazyComponent;
}

/**
 * Create Lazy Component with proper TypeScript support
 */
export function createLazyComponent<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  componentName: string,
  options: Partial<LazyComponentProps> = {}
): React.FC<P> {
  const LazyComponent = React.lazy(factory);
  return withLazyComponent(LazyComponent, componentName, options);
}

/**
 * Conditional Lazy Component Loader
 * Only loads the component when a condition is met
 */
export function createConditionalLazyComponent<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  condition: (props: P) => boolean,
  componentName: string,
  fallbackComponent?: ComponentType<P>
): React.FC<P> {
  const LazyComponent = React.lazy(factory);
  const WrappedComponent = withLazyComponent(LazyComponent, componentName);
  
  return function ConditionalLazyComponent(props: P) {
    if (condition(props)) {
      return <WrappedComponent {...props} />;
    }
    
    if (fallbackComponent) {
      const FallbackComponent = fallbackComponent;
      return <FallbackComponent {...props} />;
    }
    
    return null;
  };
}


/**
 * Performance-monitored Lazy Component
 * Tracks loading times and performance metrics
 */
export function createPerformanceLazyComponent<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  componentName: string,
  options: Partial<LazyComponentProps> = {}
): React.FC<P> {
  const LazyComponent = React.lazy(() => {
    const startTime = performance.now();
    
    return factory().then((module) => {
      const loadTime = performance.now() - startTime;
      logger.info(`Component ${componentName} loaded`, {
        loadTime: `${loadTime.toFixed(2)}ms`,
        component: componentName
      });
      
      // Track performance metrics
      if (loadTime > 1000) {
        logger.warn(`Slow component load: ${componentName}`, {
          loadTime: `${loadTime.toFixed(2)}ms`
        });
      }
      
      return module;
    });
  });
  
  return withLazyComponent(LazyComponent, componentName, options);
}

const styles = StyleSheet.create({
  componentLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginVertical: 4,
  },
  componentLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '400',
  },
  componentErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  componentErrorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
    textAlign: 'center',
  },
  componentErrorMessage: {
    fontSize: 12,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 12,
  },
  componentRetryButton: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  viewportPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  viewportPlaceholderText: {
    fontSize: 12,
    color: '#64748b',
  },
});