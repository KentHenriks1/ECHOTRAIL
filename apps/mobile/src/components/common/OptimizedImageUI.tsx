/**
 * UI rendering components for OptimizedImage
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Text,
  ViewStyle,
} from 'react-native';
import { OptimizedImageSource } from '../../core/assets/AssetOptimizer';

interface LoadingStateProps {
  isLoading: boolean;
  showLoadingIndicator: boolean;
  LoadingComponent?: React.ComponentType<any>;
  loadingStyle?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  showLoadingIndicator,
  LoadingComponent,
  loadingStyle,
}) => {
  if (!showLoadingIndicator || !isLoading) return null;
  
  if (LoadingComponent) {
    return <LoadingComponent />;
  }
  
  return (
    <View style={[styles.loadingContainer, loadingStyle]}>
      <ActivityIndicator size="small" color="#666" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

interface ErrorStateProps {
  isError: boolean;
  showErrorState: boolean;
  error: Error | null;
  retryLoad: () => void;
  ErrorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  errorStyle?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  isError,
  showErrorState,
  error,
  retryLoad,
  ErrorComponent,
  errorStyle,
}) => {
  if (!showErrorState || !isError) return null;
  
  if (ErrorComponent && error) {
    return <ErrorComponent error={error} retry={retryLoad} />;
  }
  
  return (
    <View style={[styles.errorContainer, errorStyle]}>
      <Text style={styles.errorText}>Failed to load image</Text>
      <Text style={styles.retryText} onPress={retryLoad}>
        Tap to retry
      </Text>
    </View>
  );
};

interface OptimizedImageDisplayProps {
  currentSource: OptimizedImageSource | null;
  isError: boolean;
  fadeAnim: Animated.Value;
  blurAnim: Animated.Value;
  enableProgressiveLoading: boolean;
  sourceUri: string;
  alt?: string;
  style: any;
  imageProps: any;
}

export const OptimizedImageDisplay: React.FC<OptimizedImageDisplayProps> = ({
  currentSource,
  isError,
  fadeAnim,
  blurAnim,
  enableProgressiveLoading,
  sourceUri,
  alt,
  style,
  imageProps,
}) => {
  if (!currentSource || isError) return null;
  
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Animated.Image
        {...imageProps}
        source={{ uri: currentSource.uri }}
        style={[
          style,
          enableProgressiveLoading && {
            // Blur effect during loading
            transform: [{ blur: blurAnim }] as any,
          },
        ]}
        accessible={true}
        accessibilityLabel={alt || `Optimized image ${sourceUri}`}
        accessibilityRole="image"
      />
    </Animated.View>
  );
};

// Default styles
const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#2563eb',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export { styles as optimizedImageUIStyles };