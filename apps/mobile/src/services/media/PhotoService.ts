/**
 * Photo Service for EchoTrail
 * 
 * Comprehensive service for handling camera and photo gallery operations
 * with proper permissions, error handling, and optimization.
 * 
 * Features:
 * - Camera capture with quality options
 * - Photo gallery selection
 * - Permission management
 * - Image optimization and processing
 * - Metadata extraction
 * - Error handling with user-friendly messages
 * 
 * @author Kent Rune Henriksen <Kent@zentric.no>
 */

import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import { Logger } from '../../core/utils/Logger';
import { ImageProcessor } from '../../core/assets/ImageProcessor';

export interface PhotoOptions {
  quality?: number; // 0-1
  allowsEditing?: boolean;
  aspect?: [number, number];
  allowsMultipleSelection?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
  exif?: boolean;
  base64?: boolean;
  compressed?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export interface PhotoResult {
  success: boolean;
  assets: PhotoAsset[];
  error?: string;
}

export interface PhotoAsset {
  uri: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  fileSize?: number;
  exif?: any;
  base64?: string;
  fileName?: string;
  mimeType?: string;
  duration?: number;
}

export interface PhotoPermissions {
  camera: boolean;
  mediaLibrary: boolean;
  mediaLibraryWrite: boolean;
}

/**
 * Photo Service Class
 * Singleton service for managing all photo-related operations
 */
export class PhotoService {
  private static instance: PhotoService | null = null;
  private readonly logger: Logger;
  private readonly imageProcessor: ImageProcessor;
  private permissions: PhotoPermissions | null = null;

  private constructor() {
    this.logger = new Logger('PhotoService');
    this.imageProcessor = ImageProcessor.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PhotoService {
    if (!PhotoService.instance) {
      PhotoService.instance = new PhotoService();
    }
    return PhotoService.instance;
  }

  /**
   * Check and request all necessary permissions
   */
  public async checkPermissions(): Promise<PhotoPermissions> {
    try {
      this.logger.info('Checking photo permissions');

      // Check camera permissions
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      const cameraGranted = cameraResult.status === 'granted';

      // Check media library permissions
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const mediaGranted = mediaResult.status === 'granted';

      // Check media library write permissions (for saving photos)
      const mediaWriteResult = await MediaLibrary.requestPermissionsAsync();
      const mediaWriteGranted = mediaWriteResult.status === 'granted';

      this.permissions = {
        camera: cameraGranted,
        mediaLibrary: mediaGranted,
        mediaLibraryWrite: mediaWriteGranted,
      };

      this.logger.info('Photo permissions checked', {
        camera: cameraGranted,
        mediaLibrary: mediaGranted,
        mediaLibraryWrite: mediaWriteGranted,
      });

      return this.permissions;
    } catch (error) {
      this.logger.error('Failed to check permissions', undefined, error as Error);
      throw new Error('Failed to check photo permissions');
    }
  }

  /**
   * Take photo using device camera
   */
  public async takePhoto(options: PhotoOptions = {}): Promise<PhotoResult> {
    try {
      // Check permissions first
      const permissions = await this.checkPermissions();
      if (!permissions.camera) {
        return {
          success: false,
          assets: [],
          error: 'Camera permission is required to take photos',
        };
      }

      this.logger.info('Taking photo with camera', options);

      const DEFAULT_QUALITY = 0.8;
      const defaultOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        quality: options.quality ?? DEFAULT_QUALITY,
        aspect: options.aspect,
        exif: options.exif ?? true,
        base64: options.base64 ?? false,
      };

      const result = await ImagePicker.launchCameraAsync(defaultOptions);

      if (result.canceled) {
        this.logger.info('Photo capture cancelled by user');
        return {
          success: false,
          assets: [],
          error: 'Photo capture was cancelled',
        };
      }

      const processedAssets = await this.processImagePickerAssets(result.assets);
      
      this.logger.info('Photo captured successfully', {
        assetsCount: processedAssets.length,
      });

      return {
        success: true,
        assets: processedAssets,
      };
    } catch (error) {
      this.logger.error('Failed to take photo', undefined, error as Error);
      return {
        success: false,
        assets: [],
        error: `Failed to take photo: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Select photo(s) from gallery
   */
  public async selectFromGallery(options: PhotoOptions = {}): Promise<PhotoResult> {
    try {
      // Check permissions first
      const permissions = await this.checkPermissions();
      if (!permissions.mediaLibrary) {
        return {
          success: false,
          assets: [],
          error: 'Photo gallery permission is required to select photos',
        };
      }

      this.logger.info('Selecting photo from gallery', options);

      const DEFAULT_QUALITY = 0.8;
      const defaultOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        quality: options.quality ?? DEFAULT_QUALITY,
        aspect: options.aspect,
        allowsMultipleSelection: options.allowsMultipleSelection ?? false,
        exif: options.exif ?? true,
        base64: options.base64 ?? false,
      };

      const result = await ImagePicker.launchImageLibraryAsync(defaultOptions);

      if (result.canceled) {
        this.logger.info('Photo selection cancelled by user');
        return {
          success: false,
          assets: [],
          error: 'Photo selection was cancelled',
        };
      }

      const processedAssets = await this.processImagePickerAssets(result.assets);
      
      this.logger.info('Photo selected successfully', {
        assetsCount: processedAssets.length,
      });

      return {
        success: true,
        assets: processedAssets,
      };
    } catch (error) {
      this.logger.error('Failed to select photo', undefined, error as Error);
      return {
        success: false,
        assets: [],
        error: `Failed to select photo: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Show photo selection options (camera or gallery)
   */
  public async showPhotoOptions(options: PhotoOptions = {}): Promise<PhotoResult> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose how you would like to add a photo',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await this.takePhoto(options);
              resolve(result);
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const result = await this.selectFromGallery(options);
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              resolve({
                success: false,
                assets: [],
                error: 'Photo selection cancelled',
              });
            },
          },
        ],
        { cancelable: true }
      );
    });
  }

  /**
   * Save photo to device gallery
   */
  public async saveToGallery(uri: string, albumName?: string): Promise<boolean> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.mediaLibraryWrite) {
        throw new Error('Media library write permission is required');
      }

      this.logger.info('Saving photo to gallery', { uri, albumName });

      if (Platform.OS === 'ios') {
        // On iOS, save to specific album if provided
        if (albumName) {
          let album = await MediaLibrary.getAlbumAsync(albumName);
          if (!album) {
            album = await MediaLibrary.createAlbumAsync(albumName, undefined, false);
          }
          await MediaLibrary.createAssetAsync(uri);
          // Note: Adding to custom album on iOS requires additional steps
        } else {
          await MediaLibrary.createAssetAsync(uri);
        }
      } else {
        // On Android
        const asset = await MediaLibrary.createAssetAsync(uri);
        if (albumName) {
          let album = await MediaLibrary.getAlbumAsync(albumName);
          if (!album) {
            album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        }
      }

      this.logger.info('Photo saved to gallery successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to save photo to gallery', undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get photo metadata
   */
  public async getPhotoInfo(uri: string): Promise<any> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return {
        exists: fileInfo.exists,
        size: (fileInfo as any).size,
        uri: fileInfo.uri,
        modificationTime: (fileInfo as any).modificationTime,
      };
    } catch (error) {
      this.logger.error('Failed to get photo info', undefined, error as Error);
      throw error;
    }
  }

  /**
   * Optimize photo for app usage
   */
  public async optimizePhoto(
    uri: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      format?: 'jpg' | 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<string> {
    try {
      this.logger.info('Optimizing photo', { uri, options });

      const result = await this.imageProcessor.processImage(uri, {
        quality: options.quality || 'medium',
        format: options.format || 'jpg',
        targetWidth: options.maxWidth,
        targetHeight: options.maxHeight,
        maintainAspectRatio: true,
        progressive: false,
        stripMetadata: true,
        enableFallback: true,
      });

      this.logger.info('Photo optimized successfully', {
        originalSize: result.originalSize,
        processedSize: result.processedSize,
        compressionRatio: result.compressionRatio,
      });

      return result.processedPath;
    } catch (error) {
      this.logger.error('Failed to optimize photo', undefined, error as Error);
      throw error;
    }
  }

  /**
   * Delete photo from file system
   */
  public async deletePhoto(uri: string): Promise<boolean> {
    try {
      this.logger.info('Deleting photo', { uri });
      await FileSystem.deleteAsync(uri);
      this.logger.info('Photo deleted successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to delete photo', undefined, error as Error);
      return false;
    }
  }

  /**
   * Process ImagePicker assets into our PhotoAsset format
   */
  private async processImagePickerAssets(
    assets: ImagePicker.ImagePickerAsset[]
  ): Promise<PhotoAsset[]> {
    const processedAssets: PhotoAsset[] = [];

    for (const asset of assets) {
      try {
        const photoAsset: PhotoAsset = {
          uri: asset.uri,
          type: asset.type || 'image',
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          exif: asset.exif,
          base64: asset.base64,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          duration: asset.duration,
        };

        processedAssets.push(photoAsset);
      } catch (error) {
        this.logger.error('Failed to process asset', { asset }, error as Error);
        // Continue processing other assets
      }
    }

    return processedAssets;
  }

  /**
   * Get current permissions status
   */
  public getPermissionsStatus(): PhotoPermissions | null {
    return this.permissions;
  }

  /**
   * Request specific permission with user-friendly message
   */
  public async requestPermissionWithAlert(
    type: 'camera' | 'gallery'
  ): Promise<boolean> {
    const messages = {
      camera: {
        title: 'Camera Permission Required',
        message: 'EchoTrail needs access to your camera to take photos for your trail memories.',
      },
      gallery: {
        title: 'Photo Gallery Permission Required',
        message: 'EchoTrail needs access to your photo gallery to select photos for your trails.',
      },
    };

    const message = messages[type];

    return new Promise((resolve) => {
      Alert.alert(
        message.title,
        message.message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const permissions = await this.checkPermissions();
              resolve(type === 'camera' ? permissions.camera : permissions.mediaLibrary);
            },
          },
        ]
      );
    });
  }
}