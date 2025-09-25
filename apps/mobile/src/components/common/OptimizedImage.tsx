/**
 * OptimizedImage Component for EchoTrail
 * 
 * Features:
 * - Automatic format optimization (WebP/AVIF with fallbacks)
 * - Progressive loading with blur effect
 * - Adaptive quality based on device and network
 * - Error handling with graceful fallbacks
 * - Memory management and cleanup
 * - Accessibility support
 * - Performance monitoring
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ImageProps,
  View,
  StyleSheet,
  ImageURISource,
  ViewStyle,
} from 'react-native';
import { ImageOptimizationOptions, LoadingStrategy, OptimizedImageSource } from '../../core/assets/AssetOptimizer';
import { OptimizedImageState, useOptimizedImageCore } from './OptimizedImageCore';
import { LoadingState, ErrorState, OptimizedImageDisplay } from './OptimizedImageUI';

export interface OptimizedImageProps extends Omit<ImageProps, 'source' | 'onError'> {
  // Source configuration
  source: string | ImageURISource;
  
  // Optimization options
  quality?: 'low' | 'medium' | 'high' | 'ultra' | 'auto';
  strategy?: LoadingStrategy;
  priority?: 'low' | 'normal' | 'high';
  
  // Progressive loading
  enableProgressiveLoading?: boolean;
  blurRadius?: number;
  
  // Fallback options
  fallbackSource?: string | ImageURISource;
  enableFallback?: boolean;
  
  // Loading states
  showLoadingIndicator?: boolean;
  LoadingComponent?: React.ComponentType<any>;
  
  // Error handling
  showErrorState?: boolean;
  ErrorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (_error: Error) => void;
  
  // Performance
  preload?: boolean;
  lazy?: boolean;
  
  // Styling
  containerStyle?: ViewStyle;
  loadingStyle?: ViewStyle;
  errorStyle?: ViewStyle;
  
  // Accessibility
  alt?: string;
  
  // Callbacks
  onLoadStart?: () => void;
  onLoadProgress?: (_progress: number) => void;
  onLoadComplete?: (_source: OptimizedImageSource) => void;
  onLoadError?: (_error: Error) => void;
}

const DEFAULT_BLUR_RADIUS = 10;

/**
 * Initialize optimized image state and handlers
 */
const useOptimizedImageState = (
  sourceUri: string,
  loadImage: () => Promise<OptimizedImageSource | null>,
  retryLoad: () => Promise<OptimizedImageSource | null>,
  startFadeInAnimation: () => void,
  mounted: React.MutableRefObject<boolean>
) => {
  const [state, setState] = useState<OptimizedImageState>({
    isLoading: true,
    isError: false,
    error: null,
    currentSource: null,
    loadingProgress: 0,
  });
  
  const handleLoadImage = async () => {
    if (!sourceUri) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
      
      const optimizedSource = await loadImage();
      
      if (optimizedSource && mounted.current) {
        setState(prev => ({
          ...prev,
          currentSource: optimizedSource,
          isLoading: false,
          loadingProgress: 100,
        }));
        
        startFadeInAnimation();
      }
    } catch (error) {
      if (mounted.current) {
        setState(prev => ({
          ...prev,
          isError: true,
          error: error as Error,
          isLoading: false,
        }));
      }
    }
  };
  
  const handleRetry = async () => {
    try {
      const optimizedSource = await retryLoad();
      
      if (optimizedSource && mounted.current) {
        setState(prev => ({
          ...prev,
          currentSource: optimizedSource,
          isError: false,
          error: null,
          isLoading: false,
        }));
        
        startFadeInAnimation();
      }
    } catch (error) {
      if (mounted.current) {
        setState(prev => ({
          ...prev,
          isError: true,
          error: error as Error,
          isLoading: false,
        }));
      }
    }
  };
  
  return { state, handleLoadImage, handleRetry };
};

/**
 * Render optimized image with all UI components
 */
const OptimizedImageRenderer: React.FC<{
  state: OptimizedImageState;
  fadeAnim: any;
  blurAnim: any;
  enableProgressiveLoading: boolean;
  sourceUri: string;
  alt?: string;
  style?: any;
  imageProps: any;
  showLoadingIndicator?: boolean;
  LoadingComponent?: React.ComponentType<any>;
  loadingStyle?: ViewStyle;
  showErrorState?: boolean;
  ErrorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  errorStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  handleRetry: () => void;
}> = ({
  state,
  fadeAnim,
  blurAnim,
  enableProgressiveLoading,
  sourceUri,
  alt,
  style,
  imageProps,
  showLoadingIndicator,
  LoadingComponent,
  loadingStyle,
  showErrorState,
  ErrorComponent,
  errorStyle,
  containerStyle,
  handleRetry,
}) => (
  <View style={[styles.container, containerStyle]}>
    <OptimizedImageDisplay
      currentSource={state.currentSource}
      isError={state.isError}
      fadeAnim={fadeAnim}
      blurAnim={blurAnim}
      enableProgressiveLoading={enableProgressiveLoading}
      sourceUri={sourceUri}
      alt={alt}
      style={style}
      imageProps={imageProps}
    />
    
    <LoadingState
      isLoading={state.isLoading}
      showLoadingIndicator={showLoadingIndicator ?? true}
      LoadingComponent={LoadingComponent}
      loadingStyle={loadingStyle}
    />
    
    <ErrorState
      isError={state.isError}
      showErrorState={showErrorState ?? true}
      error={state.error}
      retryLoad={handleRetry}
      ErrorComponent={ErrorComponent}
      errorStyle={errorStyle}
    />
  </View>
);
/**
 * Initialize URI values from props
 */
const useOptimizedImageURIs = (source: string | ImageURISource, fallbackSource?: string | ImageURISource) => {
  const sourceUri = useMemo(() => {
    if (typeof source === 'string') {
      return source;
    }
    return source?.uri || '';
  }, [source]);
  
  const fallbackUri = useMemo(() => {
    if (!fallbackSource) return undefined;
    if (typeof fallbackSource === 'string') {
      return fallbackSource;
    }
    return fallbackSource?.uri;
  }, [fallbackSource]);
  
  return { sourceUri, fallbackUri };
};

/**
 * Initialize optimization configuration
 */
const useOptimizationConfig = (
  quality: 'low' | 'medium' | 'high' | 'ultra' | 'auto',
  strategy: LoadingStrategy,
  priority: 'low' | 'normal' | 'high',
  enableFallback: boolean
) => {
  return useMemo((): ImageOptimizationOptions => ({
    quality: quality as any,
    strategy: strategy as any,
    priority: priority as any,
    enableFallback,
  }), [quality, strategy, priority, enableFallback]);
};

/**
 * High-performance optimized image component
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = (props) => {
  const {
    source,
    quality = 'auto',
    strategy = 'adaptive',
    priority = 'normal',
    enableProgressiveLoading = true,
    blurRadius = DEFAULT_BLUR_RADIUS,
    fallbackSource,
    enableFallback = true,
    lazy = false,
    onLoadStart,
    onLoadProgress,
    onLoadComplete,
    onLoadError,
    onError,
    ...renderProps
  } = props;
  
  // Initialize URIs
  const { sourceUri, fallbackUri } = useOptimizedImageURIs(source, fallbackSource);
  
  // Initialize optimization options
  const optimizationOptions = useOptimizationConfig(quality, strategy, priority, enableFallback);
  
  // Core image optimization logic
  const coreHooks = useOptimizedImageCore({
    sourceUri,
    optimizationOptions,
    enableProgressiveLoading,
    blurRadius,
    enableFallback,
    fallbackSource: fallbackUri,
    onLoadStart,
    onLoadProgress,
    onLoadComplete,
    onLoadError,
    onError,
  });
  
  // State management
  const stateHooks = useOptimizedImageState(
    sourceUri,
    coreHooks.loadImage,
    coreHooks.retryLoad,
    coreHooks.startFadeInAnimation,
    coreHooks.mounted
  );
  
  // Load image on mount or when source changes
  useEffect(() => {
    if (!lazy) {
      stateHooks.handleLoadImage();
    }
  }, [sourceUri, lazy, stateHooks]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      coreHooks.mounted.current = false;
    };
  }, [coreHooks.mounted]);
  
  return (
    <OptimizedImageRenderer
      state={stateHooks.state}
      fadeAnim={coreHooks.fadeAnim}
      blurAnim={coreHooks.blurAnim}
      enableProgressiveLoading={enableProgressiveLoading}
      sourceUri={sourceUri}
      alt={renderProps.alt}
      style={renderProps.style}
      imageProps={renderProps}
      showLoadingIndicator={renderProps.showLoadingIndicator ?? true}
      LoadingComponent={renderProps.LoadingComponent}
      loadingStyle={renderProps.loadingStyle}
      showErrorState={renderProps.showErrorState ?? true}
      ErrorComponent={renderProps.ErrorComponent}
      errorStyle={renderProps.errorStyle}
      containerStyle={renderProps.containerStyle}
      handleRetry={stateHooks.handleRetry}
    />
  );
};

// Default styles
const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});

/**
 * Fast Image component for simpler use cases
 */
export const FastImage: React.FC<Omit<OptimizedImageProps, 'strategy' | 'enableProgressiveLoading'>> = (props) => (
  <OptimizedImage
    {...props}
    strategy="eager"
    enableProgressiveLoading={false}
  />
);

/**
 * Progressive Image component for better UX
 */
export const ProgressiveImage: React.FC<Omit<OptimizedImageProps, 'strategy' | 'enableProgressiveLoading'>> = (props) => (
  <OptimizedImage
    {...props}
    strategy="progressive"
    enableProgressiveLoading={true}
  />
);

/**
 * Lazy Image component for performance
 */
export const LazyImage: React.FC<Omit<OptimizedImageProps, 'lazy' | 'strategy'>> = (props) => (
  <OptimizedImage
    {...props}
    lazy={true}
    strategy="lazy"
  />
);
