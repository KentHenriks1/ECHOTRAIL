/**
 * PhotoService Tests
 * Comprehensive unit tests for camera and photo gallery functionality
 * 
 * @author Kent Rune Henriksen <Kent@zentric.no>
 */

import { PhotoService, PhotoOptions, PhotoResult } from '../PhotoService';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('expo-image-picker');
jest.mock('expo-media-library');
jest.mock('expo-file-system');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock ImageProcessor
jest.mock('../../core/assets/ImageProcessor', () => ({
  ImageProcessor: {
    getInstance: jest.fn(() => ({
      processImage: jest.fn().mockResolvedValue({
        processedPath: 'processed-image-path',
        originalSize: 1000000,
        processedSize: 500000,
        compressionRatio: 0.5,
      }),
    })),
  },
}));

// Mock Logger
jest.mock('../../core/utils/Logger', () => ({
  Logger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

const MockedImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const MockedMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
const MockedFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const MockedAlert = Alert as jest.Mocked<typeof Alert>;

describe('PhotoService', () => {
  let photoService: PhotoService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (PhotoService as any).instance = null;
    photoService = PhotoService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PhotoService.getInstance();
      const instance2 = PhotoService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkPermissions', () => {
    it('should check and return all permissions', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });

      // Act
      const permissions = await photoService.checkPermissions();

      // Assert
      expect(permissions).toEqual({
        camera: true,
        mediaLibrary: true,
        mediaLibraryWrite: true,
      });
      expect(MockedImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(MockedImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(MockedMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle denied permissions', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        canAskAgain: false,
        granted: false,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });

      // Act
      const permissions = await photoService.checkPermissions();

      // Assert
      expect(permissions).toEqual({
        camera: false,
        mediaLibrary: true,
        mediaLibraryWrite: true,
      });
    });
  });

  describe('takePhoto', () => {
    it('should successfully take a photo', async () => {
      // Arrange
      const mockAsset = {
        uri: 'test-photo-uri',
        type: 'image' as const,
        width: 1920,
        height: 1080,
        fileSize: 500000,
        exif: {},
        base64: undefined,
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        duration: undefined,
      };

      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset as any],
      });

      // Act
      const result = await photoService.takePhoto();

      // Assert
      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0]).toMatchObject({
        uri: 'test-photo-uri',
        type: 'image',
        width: 1920,
        height: 1080,
      });
      expect(MockedImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: undefined,
        exif: true,
        base64: false,
      });
    });

    it('should handle cancelled photo capture', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      // Act
      const result = await photoService.takePhoto();

      // Assert
      expect(result.success).toBe(false);
      expect(result.assets).toHaveLength(0);
      expect(result.error).toBe('Photo capture was cancelled');
    });

    it('should handle camera permission denied', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        canAskAgain: false,
        granted: false,
      });

      // Act
      const result = await photoService.takePhoto();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Camera permission is required to take photos');
    });

    it('should use custom photo options', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const customOptions: PhotoOptions = {
        quality: 0.5,
        allowsEditing: false,
        aspect: [4, 3],
        base64: true,
      };

      // Act
      await photoService.takePhoto(customOptions);

      // Assert
      expect(MockedImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
        aspect: [4, 3],
        exif: true,
        base64: true,
      });
    });
  });

  describe('selectFromGallery', () => {
    it('should successfully select photo from gallery', async () => {
      // Arrange
      const mockAsset = {
        uri: 'gallery-photo-uri',
        type: 'image' as const,
        width: 1080,
        height: 1920,
        fileSize: 750000,
        exif: {},
        base64: undefined,
        fileName: 'gallery.jpg',
        mimeType: 'image/jpeg',
        duration: undefined,
      };

      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset as any],
      });

      // Act
      const result = await photoService.selectFromGallery();

      // Assert
      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0]).toMatchObject({
        uri: 'gallery-photo-uri',
        type: 'image',
        width: 1080,
        height: 1920,
      });
    });

    it('should handle gallery permission denied', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        canAskAgain: false,
        granted: false,
      });

      // Act
      const result = await photoService.selectFromGallery();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Photo gallery permission is required to select photos');
    });
  });

  describe('showPhotoOptions', () => {
    it('should show alert with photo options', async () => {
      // Arrange
      MockedAlert.alert.mockImplementation((_title, _message, buttons) => {
        // Simulate user pressing "Camera" button
        const cameraButton = buttons?.find(b => b.text === 'Camera');
        if (cameraButton && cameraButton.onPress) {
          setTimeout(() => cameraButton.onPress(), 0);
        }
      });

      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      // Act
      const resultPromise = photoService.showPhotoOptions();
      
      // Wait a bit for async operations
      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });
      
      await resultPromise;

      // Assert
      expect(MockedAlert.alert).toHaveBeenCalledWith(
        'Select Photo',
        'Choose how you would like to add a photo',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Camera' }),
          expect.objectContaining({ text: 'Gallery' }),
          expect.objectContaining({ text: 'Cancel' }),
        ]),
        { cancelable: true }
      );
    });
  });

  describe('saveToGallery', () => {
    it('should save photo to gallery on iOS', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.createAssetAsync.mockResolvedValue({} as any);

      // Act
      const result = await photoService.saveToGallery('test-uri');

      // Assert
      expect(result).toBe(true);
      expect(MockedMediaLibrary.createAssetAsync).toHaveBeenCalledWith('test-uri');
    });

    it('should handle save permission denied', async () => {
      // Arrange
      MockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });
      MockedMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        canAskAgain: false,
        granted: false,
      });

      // Act & Assert
      await expect(photoService.saveToGallery('test-uri')).rejects.toThrow(
        'Media library write permission is required'
      );
    });
  });

  describe('optimizePhoto', () => {
    it('should optimize photo successfully', async () => {
      // Act
      const result = await photoService.optimizePhoto('test-uri', {
        maxWidth: 800,
        maxHeight: 600,
        quality: 'medium',
        format: 'jpg',
      });

      // Assert
      expect(result).toBe('processed-image-path');
    });
  });

  describe('getPhotoInfo', () => {
    it('should get photo file info', async () => {
      // Arrange
      MockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: 'test-uri',
        size: 500000,
        isDirectory: false,
        modificationTime: 1634567890,
        md5: undefined,
      });

      // Act
      const info = await photoService.getPhotoInfo('test-uri');

      // Assert
      expect(info).toEqual({
        exists: true,
        size: 500000,
        uri: 'test-uri',
        modificationTime: 1634567890,
      });
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      // Arrange
      MockedFileSystem.deleteAsync.mockResolvedValue();

      // Act
      const result = await photoService.deletePhoto('test-uri');

      // Assert
      expect(result).toBe(true);
      expect(MockedFileSystem.deleteAsync).toHaveBeenCalledWith('test-uri');
    });

    it('should handle delete failure', async () => {
      // Arrange
      MockedFileSystem.deleteAsync.mockRejectedValue(new Error('Delete failed'));

      // Act
      const result = await photoService.deletePhoto('test-uri');

      // Assert
      expect(result).toBe(false);
    });
  });
});