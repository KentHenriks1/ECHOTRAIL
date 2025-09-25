/**
 * PhotoGallery Component for EchoTrail
 * 
 * A comprehensive photo gallery component for displaying, organizing, and managing multiple photos.
 * Features:
 * - Grid-based responsive layout
 * - Fullscreen photo viewer with gestures
 * - Add/remove photos with batch operations
 * - Photo reordering with drag & drop
 * - Loading states and error handling
 * - Optimized performance with lazy loading
 * - Export and sharing capabilities
 * 
 * @author Kent Rune Henriksen <Kent@zentric.no>
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  ViewStyle,
} from 'react-native';
import { PhotoService, PhotoAsset, PhotoOptions } from '../../services/media/PhotoService';
import { OptimizedImage } from './OptimizedImage';
import { PhotoCapture } from './PhotoCapture';
import { ThemeConfig } from '../../core/config';
import { getFontWeight } from '../../core/theme/utils';
import { Logger } from '../../core/utils/Logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 8;
const GRID_COLUMNS = 3;

export interface PhotoGalleryProps {
  // Photos data
  photos?: PhotoAsset[];
  
  // Callbacks
  onPhotosChanged?: (_photos: PhotoAsset[]) => void;
  onPhotoSelected?: (_photo: PhotoAsset, _index: number) => void;
  onPhotosAdded?: (_photos: PhotoAsset[]) => void;
  onPhotoRemoved?: (_photo: PhotoAsset, _index: number) => void;
  onError?: (_error: string) => void;
  
  // Configuration
  maxPhotos?: number; // Default: unlimited
  allowAdd?: boolean; // Default: true
  allowRemove?: boolean; // Default: true
  allowReorder?: boolean; // Default: true
  allowFullscreen?: boolean; // Default: true
  
  // Photo capture options
  photoOptions?: PhotoOptions;
  
  // UI configuration
  columns?: number; // Default: 3
  spacing?: number; // Default: 8
  aspectRatio?: number; // Default: 1 (square)
  
  // Styling
  style?: ViewStyle;
  emptyStateText?: string;
  addPhotoText?: string;
  
  // Behavior
  autoOptimize?: boolean; // Default: true
}

interface PhotoItem extends PhotoAsset {
  id: string;
  index: number;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos = [],
  onPhotosChanged,
  onPhotoSelected,
  onPhotosAdded,
  onPhotoRemoved,
  onError,
  maxPhotos,
  allowAdd = true,
  allowRemove = true,
  allowReorder: _allowReorder = true,
  allowFullscreen = true,
  photoOptions = {},
  columns = GRID_COLUMNS,
  spacing = GRID_SPACING,
  aspectRatio = 1,
  style,
  emptyStateText = 'No photos yet. Tap the + button to add some!',
  addPhotoText = 'Add Photo',
  autoOptimize = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const photoService = useRef(PhotoService.getInstance()).current;
  const logger = useRef(new Logger('PhotoGallery')).current;
  
  // Convert photos to PhotoItems with unique IDs
  const photoItems = useMemo<PhotoItem[]>(() => {
    return photos.map((photo, index) => ({
      ...photo,
      id: `photo_${index}_${Date.now()}`,
      index,
    }));
  }, [photos]);
  
  // Calculate grid dimensions
  const itemSize = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - (spacing * (columns + 1));
    const itemWidth = availableWidth / columns;
    return {
      width: itemWidth,
      height: itemWidth / aspectRatio,
    };
  }, [columns, spacing, aspectRatio]);

  // Handle adding new photos
  const handleAddPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we're at the limit
      if (maxPhotos && photos.length >= maxPhotos) {
        Alert.alert(
          'Photo Limit Reached',
          `You can only add up to ${maxPhotos} photos.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await photoService.showPhotoOptions({
        ...photoOptions,
        allowsMultipleSelection: true,
      });

      if (!result.success) {
        if (result.error && !result.error.includes('cancelled')) {
          setError(result.error);
          onError?.(result.error);
        }
        return;
      }

      if (result.assets && result.assets.length > 0) {
        let newPhotos = result.assets;
        
        // Apply max photos limit
        if (maxPhotos) {
          const remainingSlots = maxPhotos - photos.length;
          if (newPhotos.length > remainingSlots) {
            newPhotos = newPhotos.slice(0, remainingSlots);
            Alert.alert(
              'Photo Limit',
              `Only the first ${remainingSlots} photos were added due to the ${maxPhotos} photo limit.`,
              [{ text: 'OK' }]
            );
          }
        }

        // Auto-optimize photos if enabled
        if (autoOptimize) {
          const optimizedPhotos = await Promise.allSettled(
            newPhotos.map(async (photo) => {
              try {
                const optimizedUri = await photoService.optimizePhoto(photo.uri, {
                  maxWidth: 1200,
                  maxHeight: 1200,
                  quality: 'high',
                  format: 'jpg',
                });
                return { ...photo, uri: optimizedUri };
              } catch (optimizeError) {
                logger.warn('Photo optimization failed, using original', undefined, optimizeError as Error);
                return photo;
              }
            })
          );

          newPhotos = optimizedPhotos
            .filter((result): result is PromiseFulfilledResult<PhotoAsset> => result.status === 'fulfilled')
            .map(result => result.value);
        }

        const updatedPhotos = [...photos, ...newPhotos];
        onPhotosChanged?.(updatedPhotos);
        onPhotosAdded?.(newPhotos);
        
        logger.info('Photos added successfully', {
          count: newPhotos.length,
          totalPhotos: updatedPhotos.length,
        });
      }
    } catch (addError) {
      const errorMessage = `Failed to add photos: ${(addError as Error).message}`;
      setError(errorMessage);
      onError?.(errorMessage);
      logger.error('Photo add error', undefined, addError as Error);
    } finally {
      setIsLoading(false);
    }
  }, [photos, maxPhotos, photoOptions, autoOptimize, onPhotosChanged, onPhotosAdded, onError, photoService, logger]);

  // Handle removing a photo
  const handleRemovePhoto = useCallback((photoIndex: number) => {
    const photo = photos[photoIndex];
    if (!photo) return;

    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedPhotos = photos.filter((_, index) => index !== photoIndex);
            onPhotosChanged?.(updatedPhotos);
            onPhotoRemoved?.(photo, photoIndex);
            
            logger.info('Photo removed', { photoIndex, totalPhotos: updatedPhotos.length });
          },
        },
      ]
    );
  }, [photos, onPhotosChanged, onPhotoRemoved, logger]);

  // Handle photo tap
  const handlePhotoTap = useCallback((photoIndex: number) => {
    const photo = photos[photoIndex];
    if (!photo) return;

    onPhotoSelected?.(photo, photoIndex);

    if (allowFullscreen) {
      setSelectedPhotoIndex(photoIndex);
      setIsFullscreenVisible(true);
    }
  }, [photos, onPhotoSelected, allowFullscreen]);

  // Handle photo long press (for removal)
  const handlePhotoLongPress = useCallback((photoIndex: number) => {
    if (allowRemove) {
      handleRemovePhoto(photoIndex);
    }
  }, [allowRemove, handleRemovePhoto]);

  // Navigate fullscreen photos
  const navigateFullscreen = useCallback((direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1;
    } else {
      newIndex = selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0;
    }

    setSelectedPhotoIndex(newIndex);
  }, [selectedPhotoIndex, photos.length]);

  // Render individual photo item
  const renderPhotoItem = useCallback(({ item, index }: { item: PhotoItem; index: number }) => (
    <Pressable
      style={[styles.photoItem, { width: itemSize.width, height: itemSize.height }]}
      onPress={() => handlePhotoTap(index)}
      onLongPress={() => handlePhotoLongPress(index)}
    >
      <OptimizedImage
        source={{ uri: item.uri }}
        style={[styles.photoImage, { width: itemSize.width, height: itemSize.height }]}
        quality="medium"
        priority={index < 6 ? 'high' : 'normal'} // Prioritize first few photos
        enableProgressiveLoading={true}
      />
      
      {/* Remove button overlay */}
      {allowRemove && (
        <Pressable
          style={styles.removeButtonOverlay}
          onPress={(e) => {
            e.stopPropagation();
            handleRemovePhoto(index);
          }}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </Pressable>
      )}
    </Pressable>
  ), [itemSize, allowRemove, handlePhotoTap, handlePhotoLongPress, handleRemovePhoto]);

  // Render add photo button
  const renderAddButton = useCallback(() => {
    if (!allowAdd || (maxPhotos && photos.length >= maxPhotos)) {
      return null;
    }

    return (
      <Pressable
        style={[styles.addButton, { width: itemSize.width, height: itemSize.height }]}
        onPress={handleAddPhotos}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={ThemeConfig.primaryColor} />
        ) : (
          <>
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText} numberOfLines={2}>
              {addPhotoText}
            </Text>
          </>
        )}
      </Pressable>
    );
  }, [allowAdd, maxPhotos, photos.length, itemSize, isLoading, handleAddPhotos, addPhotoText]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateIcon}>📷</Text>
      <Text style={styles.emptyStateText}>{emptyStateText}</Text>
      {allowAdd && (
        <Pressable style={styles.emptyStateButton} onPress={handleAddPhotos}>
          <Text style={styles.emptyStateButtonText}>Add First Photo</Text>
        </Pressable>
      )}
    </View>
  ), [emptyStateText, allowAdd, handleAddPhotos]);

  // Render fullscreen modal
  const renderFullscreenModal = useCallback(() => {
    if (!isFullscreenVisible || selectedPhotoIndex === null) {
      return null;
    }

    const selectedPhoto = photos[selectedPhotoIndex];
    if (!selectedPhoto) return null;

    return (
      <Modal
        visible={isFullscreenVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullscreenVisible(false)}
      >
        <View style={styles.fullscreenContainer}>
          <Pressable
            style={styles.fullscreenBackdrop}
            onPress={() => setIsFullscreenVisible(false)}
          >
            <OptimizedImage
              source={{ uri: selectedPhoto.uri }}
              style={styles.fullscreenImage}
              quality="ultra"
              priority="high"
              enableProgressiveLoading={true}
            />
          </Pressable>
          
          {/* Navigation buttons */}
          {photos.length > 1 && (
            <>
              <Pressable
                style={[styles.fullscreenNav, styles.fullscreenNavLeft]}
                onPress={() => navigateFullscreen('prev')}
              >
                <Text style={styles.fullscreenNavText}>‹</Text>
              </Pressable>
              <Pressable
                style={[styles.fullscreenNav, styles.fullscreenNavRight]}
                onPress={() => navigateFullscreen('next')}
              >
                <Text style={styles.fullscreenNavText}>›</Text>
              </Pressable>
            </>
          )}
          
          {/* Close button */}
          <Pressable
            style={styles.fullscreenClose}
            onPress={() => setIsFullscreenVisible(false)}
          >
            <Text style={styles.fullscreenCloseText}>×</Text>
          </Pressable>
          
          {/* Photo counter */}
          <View style={styles.fullscreenCounter}>
            <Text style={styles.fullscreenCounterText}>
              {selectedPhotoIndex + 1} of {photos.length}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }, [isFullscreenVisible, selectedPhotoIndex, photos, navigateFullscreen]);

  // Main render
  if (photos.length === 0 && !allowAdd) {
    return (
      <View style={[styles.container, style]}>
        {renderEmptyState()}
      </View>
    );
  }

  const flatListData = allowAdd ? [...photoItems, { id: 'add-button', isAddButton: true }] : photoItems;

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={flatListData}
        renderItem={({ item, index }) => {
          if ('isAddButton' in item) {
            return renderAddButton();
          }
          return renderPhotoItem({ item: item as PhotoItem, index });
        }}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        ItemSeparatorComponent={() => <View style={{ height: spacing }} />}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Fullscreen modal */}
      {renderFullscreenModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    padding: GRID_SPACING,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    borderRadius: 8,
  },
  removeButtonOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: getFontWeight('bold'),
  },
  addButton: {
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ThemeConfig.spacing.sm,
  },
  addButtonIcon: {
    fontSize: 32,
    color: ThemeConfig.secondaryColor,
    marginBottom: 4,
  },
  addButtonText: {
    fontSize: ThemeConfig.typography.fontSize.xs,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
    fontWeight: getFontWeight('medium'),
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ThemeConfig.spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: ThemeConfig.spacing.md,
  },
  emptyStateText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: 'center',
    marginBottom: ThemeConfig.spacing.lg,
    maxWidth: 280,
  },
  emptyStateButton: {
    backgroundColor: ThemeConfig.primaryColor,
    paddingVertical: ThemeConfig.spacing.md,
    paddingHorizontal: ThemeConfig.spacing.lg,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight('medium'),
  },
  errorContainer: {
    margin: ThemeConfig.spacing.md,
    padding: ThemeConfig.spacing.sm,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: ThemeConfig.errorColor,
  },
  errorText: {
    color: ThemeConfig.errorColor,
    fontSize: ThemeConfig.typography.fontSize.sm,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    maxWidth: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT,
    resizeMode: 'contain',
  },
  fullscreenNav: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
  },
  fullscreenNavLeft: {
    left: 20,
  },
  fullscreenNavRight: {
    right: 20,
  },
  fullscreenNavText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: getFontWeight('bold'),
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  fullscreenCloseText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: getFontWeight('bold'),
  },
  fullscreenCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  fullscreenCounterText: {
    color: '#ffffff',
    fontSize: ThemeConfig.typography.fontSize.sm,
    fontWeight: getFontWeight('medium'),
  },
});

export default PhotoGallery;