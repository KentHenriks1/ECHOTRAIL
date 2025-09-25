/**
 * PhotoCapture Helper Functions
 * Extracted to reduce component complexity
 * 
 * @author Kent Rune Henriksen <Kent@zentric.no>
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { OptimizedImage } from './OptimizedImage';
import { ThemeConfig } from '../../core/config';
import { getFontWeight } from '../../core/theme/utils';

export const getSizeDimensions = (size: 'small' | 'medium' | 'large') => {
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

export const getContainerStyle = (
  size: 'small' | 'medium' | 'large',
  shape: 'circle' | 'square' | 'rounded'
): ViewStyle => {
  const dimensions = getSizeDimensions(size);
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

interface PhotoPreviewProps {
  currentImage: string | null;
  containerStyle: ViewStyle;
  showPreview: boolean;
  isLoading: boolean;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  currentImage,
  containerStyle,
  showPreview,
  isLoading,
}) => {
  if (!showPreview || !currentImage || isLoading) {
    return null;
  }

  return (
    <OptimizedImage
      source={{ uri: currentImage }}
      style={[styles.photoPreview, containerStyle]}
      quality="high"
      priority="high"
      enableProgressiveLoading={true}
    />
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  containerStyle: ViewStyle;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  containerStyle,
}) => {
  if (!isLoading) {
    return null;
  }

  return (
    <View style={[styles.loadingOverlay, containerStyle]}>
      <ActivityIndicator size="small" color={ThemeConfig.primaryColor} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

interface AddPhotoButtonProps {
  currentImage: string | null;
  isLoading: boolean;
  containerStyle: ViewStyle;
  addPhotoText: string;
  onPress: () => void;
}

export const AddPhotoButton: React.FC<AddPhotoButtonProps> = ({
  currentImage,
  isLoading,
  containerStyle,
  addPhotoText,
  onPress,
}) => {
  if (currentImage || isLoading) {
    return null;
  }

  return (
    <Pressable
      style={[styles.addButton, containerStyle]}
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.addIconContainer}>
        <Text style={styles.addIcon}>📷</Text>
      </View>
      <Text style={styles.addText} numberOfLines={1}>
        {addPhotoText}
      </Text>
    </Pressable>
  );
};

interface ChangePhotoOverlayProps {
  currentImage: string | null;
  isLoading: boolean;
  containerStyle: ViewStyle;
  changePhotoText: string;
  onPress: () => void;
}

export const ChangePhotoOverlay: React.FC<ChangePhotoOverlayProps> = ({
  currentImage,
  isLoading,
  containerStyle,
  changePhotoText,
  onPress,
}) => {
  if (!currentImage || isLoading) {
    return null;
  }

  return (
    <Pressable
      style={[styles.changeOverlay, containerStyle]}
      onPress={onPress}
    >
      <View style={styles.changeOverlayContent}>
        <Text style={styles.changeIcon}>📷</Text>
        <Text style={styles.changeText} numberOfLines={1}>
          {changePhotoText}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
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
});