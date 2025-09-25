/**
 * PhotoCapture Component for EchoTrail
 * 
 * A reusable, modern UI component for capturing photos with camera or selecting from gallery.
 * Features:
 * - Modern, accessible design
 * - Loading states and error handling
 * - Customizable styling and behavior
 * - Multiple capture modes (camera, gallery, both)
 * - Image preview and editing options
 * - Performance optimized with lazy loading
 * 
 * @author Kent Rune Henriksen <Kent@zentric.no>
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  ViewStyle,
} from 'react-native';
import { PhotoService, PhotoResult, PhotoOptions, PhotoAsset } from '../../services/media/PhotoService';
import { OptimizedImage } from './OptimizedImage';
import { ThemeConfig } from '../../core/config';
import { getFontWeight } from '../../core/theme/utils';
import { Logger } from '../../core/utils/Logger';

export interface PhotoCaptureProps {
  // Callback when photo is selected/captured
  onPhotoSelected?: (_asset: PhotoAsset) => void;
  onPhotoRemoved?: () => void;
  onError?: (_error: string) => void;
  
  // Photo options
  photoOptions?: PhotoOptions;
  
  // UI configuration
  mode?: 'camera' | 'gallery' | 'both'; // Default: 'both'
  size?: 'small' | 'medium' | 'large'; // Default: 'medium'
  shape?: 'circle' | 'square' | 'rounded'; // Default: 'rounded'
  
  // Current image
  currentImageUri?: string;
  
  // Styling
  style?: ViewStyle;
  
  // Labels and text
  addPhotoText?: string;
  changePhotoText?: string;
  removePhotoText?: string;
  
  // Behavior
  allowRemove?: boolean; // Default: true
  showPreview?: boolean; // Default: true
  autoOptimize?: boolean; // Default: true
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoSelected,
  onPhotoRemoved,
  onError,
  photoOptions = {},
  mode = 'both',
  size = 'medium',
  shape = 'rounded',
  currentImageUri,
  style,
  addPhotoText = 'Add Photo',
  changePhotoText = 'Change Photo',
  removePhotoText = 'Remove Photo',
  allowRemove = true,
  showPreview = true,
  autoOptimize = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(currentImageUri || null);
  const [error, setError] = useState<string | null>(null);
  
  const photoService = useRef(PhotoService.getInstance()).current;
  const logger = useRef(new Logger('PhotoCapture')).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Update current image when prop changes
  useEffect(() => {
    setCurrentImage(currentImageUri || null);
  }, [currentImageUri]);

  // Handle photo selection
  const handlePhotoCapture = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Animate button press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      let result: PhotoResult;

      // Choose capture method based on mode
      switch (mode) {
        case 'camera':
          result = await photoService.takePhoto(photoOptions);
          break;
        case 'gallery':
          result = await photoService.selectFromGallery(photoOptions);
          break;
        case 'both':
        default:
          result = await photoService.showPhotoOptions(photoOptions);
          break;
      }

      if (!result.success) {
        if (result.error && !result.error.includes('cancelled')) {
          setError(result.error);
          onError?.(result.error);
        }
        return;
      }

      if (result.assets && result.assets.length > 0) {
        let selectedAsset = result.assets[0];

        // Auto-optimize photo if enabled
        if (autoOptimize) {
          try {
            const optimizedUri = await photoService.optimizePhoto(selectedAsset.uri, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 'high',
              format: 'jpg',
            });
            selectedAsset = { ...selectedAsset, uri: optimizedUri };
          } catch (optimizeError) {
            logger.warn('Photo optimization failed, using original', undefined, optimizeError as Error);
          }
        }

        setCurrentImage(selectedAsset.uri);
        onPhotoSelected?.(selectedAsset);
        logger.info('Photo selected successfully');
      }
    } catch (captureError) {
      const errorMessage = `Photo capture failed: ${(captureError as Error).message}`;
      setError(errorMessage);
      onError?.(errorMessage);
      logger.error('Photo capture error', undefined, captureError as Error);
    } finally {
      setIsLoading(false);
    }
  }, [mode, photoOptions, autoOptimize, onPhotoSelected, onError, photoService, logger, scaleAnim]);

  // Handle photo removal
  const handlePhotoRemove = useCallback(() => {
    setCurrentImage(null);
    setError(null);
    onPhotoRemoved?.();
    logger.info('Photo removed');
  }, [onPhotoRemoved, logger]);

  // Get size dimensions
  const getSizeDimensions = () => {
    const SMALL_SIZE = 80;
    const LARGE_SIZE = 150;
    const MEDIUM_SIZE = 120;
    
    switch (size) {
      case 'small':
        return SMALL_SIZE;
      case 'large':
        return LARGE_SIZE;
      case 'medium':
      default:
        return MEDIUM_SIZE;
    }
  };

  // Get container style based on shape
  const getContainerStyle = () => {
    const dimensions = getSizeDimensions();
    const baseStyle: ViewStyle = {
      width: dimensions,
      height: dimensions,
    };

    switch (shape) {
      case 'circle':
        return { ...baseStyle, borderRadius: dimensions / 2 };
      case 'square':
        return { ...baseStyle, borderRadius: 0 };
      case 'rounded':
      default:
        return { ...baseStyle, borderRadius: 12 };
    }
  };

  const containerStyle = getContainerStyle();

  return (
    <View style={[styles.container, style]}>
      <Animated.View 
        style={[
          styles.photoContainer,
          containerStyle,
          { transform: [{ scale: scaleAnim }] },
          currentImage ? styles.hasImage : styles.noImage,
          error ? styles.errorState : null,
        ]}
      >
        {/* Photo Preview */}
        {showPreview && currentImage && !isLoading && (
          <OptimizedImage
            source={{ uri: currentImage }}
            style={[styles.photoPreview, containerStyle]}
            quality="high"
            priority="high"
            enableProgressiveLoading={true}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={[styles.loadingOverlay, containerStyle]}>
            <ActivityIndicator size="small" color={ThemeConfig.primaryColor} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Empty State / Add Photo Button */}
        {!currentImage && !isLoading && (
          <Pressable
            style={[styles.addButton, containerStyle]}
            onPress={handlePhotoCapture}
            disabled={isLoading}
          >
            <View style={styles.addIconContainer}>
              <Text style={styles.addIcon}>📷</Text>
            </View>
            <Text style={styles.addText} numberOfLines={1}>
              {addPhotoText}
            </Text>
          </Pressable>
        )}

        {/* Change Photo Button Overlay */}
        {currentImage && !isLoading && (
          <Pressable
            style={[styles.changeOverlay, containerStyle]}
            onPress={handlePhotoCapture}
          >
            <View style={styles.changeOverlayContent}>
              <Text style={styles.changeIcon}>📷</Text>
              <Text style={styles.changeText} numberOfLines={1}>
                {changePhotoText}
              </Text>
            </View>
          </Pressable>
        )}
      </Animated.View>

      {/* Action Buttons */}
      {currentImage && allowRemove && !isLoading && (
        <Pressable
          style={styles.removeButton}
          onPress={handlePhotoRemove}
        >
          <Text style={styles.removeButtonText}>{removePhotoText}</Text>
        </Pressable>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImage: {
    borderColor: '#cbd5e1',
  },
  hasImage: {
    borderColor: ThemeConfig.primaryColor,
    borderStyle: 'solid',
  },
  errorState: {
    borderColor: ThemeConfig.errorColor,
  },
  photoPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: ThemeConfig.secondaryColor,
    fontWeight: getFontWeight('medium'),
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: ThemeConfig.spacing.md,
  },
  addIconContainer: {
    marginBottom: 8,
  },
  addIcon: {
    fontSize: 32,
  },
  addText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    fontWeight: getFontWeight('medium'),
    textAlign: 'center',
  },
  changeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  changeOverlayContent: {
    alignItems: 'center',
  },
  changeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  changeText: {
    fontSize: ThemeConfig.typography.fontSize.xs,
    color: '#ffffff',
    fontWeight: getFontWeight('medium'),
    textAlign: 'center',
  },
  removeButton: {
    marginTop: ThemeConfig.spacing.sm,
    paddingVertical: ThemeConfig.spacing.xs,
    paddingHorizontal: ThemeConfig.spacing.sm,
    backgroundColor: ThemeConfig.errorColor,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: ThemeConfig.typography.fontSize.xs,
    color: '#ffffff',
    fontWeight: getFontWeight('medium'),
  },
  errorContainer: {
    marginTop: ThemeConfig.spacing.sm,
    paddingHorizontal: ThemeConfig.spacing.sm,
    paddingVertical: ThemeConfig.spacing.xs,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: ThemeConfig.errorColor,
  },
  errorText: {
    fontSize: ThemeConfig.typography.fontSize.xs,
    color: ThemeConfig.errorColor,
    textAlign: 'center',
  },
});

// Add hover effect for web/desktop
const webStyles = {
  changeOverlay: {
    transition: 'opacity 0.2s ease-in-out',
  },
  'changeOverlay:hover': {
    opacity: 1,
  },
};

if (typeof document !== 'undefined') {
  // Apply web-specific styles
  Object.assign(styles.changeOverlay, webStyles.changeOverlay);
}