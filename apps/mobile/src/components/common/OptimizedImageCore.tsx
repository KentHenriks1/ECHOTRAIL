/**
 * Core image optimization logic extracted from OptimizedImage
 */

import { useRef, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import { AssetOptimizer, OptimizedImageSource, ImageOptimizationOptions } from '../../core/assets/AssetOptimizer';
import { Logger } from '../../core/utils/Logger';
import { PerformanceMonitor } from '../../core/utils/PerformanceMonitor';

export interface OptimizedImageState {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  currentSource: OptimizedImageSource | null;
  loadingProgress: number;
}

export interface OptimizedImageCoreProps {
  sourceUri: string;
  optimizationOptions: ImageOptimizationOptions;
  enableProgressiveLoading: boolean;
  blurRadius: number;
  enableFallback: boolean;
  fallbackSource?: string;
  onLoadStart?: () => void;
  onLoadProgress?: (_progress: number) => void;
  onLoadComplete?: (_source: OptimizedImageSource) => void;
  onLoadError?: (_error: Error) => void;
  onError?: (_error: Error) => void;
}

/**
 * Hook for image animation controls
 */
const useImageAnimation = (enableProgressiveLoading: boolean, blurRadius: number) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(blurRadius)).current;

  const startFadeInAnimation = useCallback(() => {
    // Fade in the image
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Remove blur effect if progressive loading is enabled
    if (enableProgressiveLoading) {
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false, // Blur radius doesn't support native driver
      }).start();
    }
  }, [fadeAnim, blurAnim, enableProgressiveLoading]);

  const retryLoad = useCallback((loadImageFn: () => Promise<OptimizedImageSource | null>) => {
    fadeAnim.setValue(0);
    blurAnim.setValue(enableProgressiveLoading ? blurRadius : 0);
    return loadImageFn();
  }, [fadeAnim, blurAnim, enableProgressiveLoading, blurRadius]);

  return { fadeAnim, blurAnim, startFadeInAnimation, retryLoad };
};

/**
 * Hook for core services and utilities
 */
const useImageServices = () => {
  const logger = useMemo(() => new Logger('OptimizedImageCore'), []);
  const assetOptimizer = useMemo(() => AssetOptimizer.getInstance(), []);
  const mounted = useRef(true);
  
  return { logger, assetOptimizer, mounted };
};

/**
 * Hook for fallback image loading
 */
const useFallbackLoader = (
  fallbackSource: string | undefined,
  optimizationOptions: ImageOptimizationOptions
) => {
  const { logger, assetOptimizer, mounted } = useImageServices();

  return useCallback(async (): Promise<OptimizedImageSource | null> => {
    if (!fallbackSource) return null;
    
    try {
      logger.info('Loading fallback image', { fallbackSource });
      
      const optimizedSource = await assetOptimizer.optimizeImage(fallbackSource, {
        ...optimizationOptions,
        quality: 'medium',
      });
      
      return mounted.current ? optimizedSource : null;
    } catch (error) {
      logger.error('Fallback image loading failed', { fallbackSource }, error as Error);
      return null;
    }
  }, [fallbackSource, optimizationOptions, logger, assetOptimizer, mounted]);
};

/**
 * Hook for main image loading
 */
const useImageLoading = (props: {
  sourceUri: string;
  optimizationOptions: ImageOptimizationOptions;
  enableFallback: boolean;
  fallbackSource?: string;
  callbacks: {
    onLoadStart?: () => void;
    onLoadProgress?: (_progress: number) => void;
    onLoadComplete?: (_source: OptimizedImageSource) => void;
    onLoadError?: (_error: Error) => void;
    onError?: (_error: Error) => void;
  };
}) => {
  const { sourceUri, optimizationOptions, callbacks } = props;
  const { onLoadStart, onLoadComplete } = callbacks;
  const { logger, assetOptimizer, mounted } = useImageServices();
  const loadFallback = useFallbackLoader(props.fallbackSource, optimizationOptions);

  const loadImage = useCallback(async (): Promise<OptimizedImageSource | null> => {
    if (!sourceUri) throw new Error('No source provided');
    
    try {
      onLoadStart?.();
      logger.debug('Loading optimized image', { sourceUri });
      
      const optimizedSource = await assetOptimizer.optimizeImage(sourceUri, optimizationOptions);
      
      if (!mounted.current) return null;
      
      onLoadComplete?.(optimizedSource);
      callbacks.onLoadProgress?.(100);
      
      // Track performance
      if (optimizedSource.loadTime) {
        PerformanceMonitor.trackCustomMetric('optimized_image_load', optimizedSource.loadTime, 'ms');
      }
      
      return optimizedSource;
    } catch (error) {
      const imageError = error as Error;
      callbacks.onError?.(imageError);
      callbacks.onLoadError?.(imageError);
      
      // Try fallback
      if (props.enableFallback && props.fallbackSource !== sourceUri) {
        const fallbackResult = await loadFallback();
        if (fallbackResult) return fallbackResult;
      }
      
      throw imageError;
    }
  }, [sourceUri, optimizationOptions, onLoadStart, onLoadComplete, callbacks, logger, assetOptimizer, mounted, loadFallback, props.enableFallback, props.fallbackSource]);

  return { loadImage, mounted };
};

export const useOptimizedImageCore = (props: OptimizedImageCoreProps) => {
  const {
    sourceUri,
    optimizationOptions,
    enableProgressiveLoading,
    blurRadius,
    enableFallback,
    fallbackSource,
    onLoadStart,
    onLoadProgress,
    onLoadComplete,
    onLoadError,
    onError
  } = props;

  // Animation controls
  const { fadeAnim, blurAnim, startFadeInAnimation, retryLoad } = useImageAnimation(
    enableProgressiveLoading, 
    blurRadius
  );
  
  // Image loading logic
  const { loadImage, mounted } = useImageLoading({
    sourceUri,
    optimizationOptions,
    enableFallback,
    fallbackSource,
    callbacks: {
      onLoadStart,
      onLoadProgress,
      onLoadComplete,
      onLoadError,
      onError,
    },
  });

  // Create retry function with loadImage
  const finalRetryLoad = useCallback(() => retryLoad(loadImage), [retryLoad, loadImage]);

  return {
    fadeAnim,
    blurAnim,
    mounted,
    startFadeInAnimation,
    loadImage,
    retryLoad: finalRetryLoad,
  };
};
