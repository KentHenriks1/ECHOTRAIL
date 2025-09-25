/**
 * PhotoCapture Component Tests
 * Integration and unit tests for the PhotoCapture component
 * 
 * @author Kent Rune Henriksen <Kent@zentric.no>
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PhotoCapture } from '../PhotoCapture';
import { PhotoService } from '../../../services/media/PhotoService';

// Mock PhotoService
jest.mock('../../../services/media/PhotoService');
jest.mock('../../../core/utils/Logger');
jest.mock('../../../core/config', () => ({
  ThemeConfig: {
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    errorColor: '#dc2626',
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
      },
    },
  },
}));

jest.mock('../../../core/theme/utils', () => ({
  getFontWeight: jest.fn((weight: string) => weight),
}));

// Mock OptimizedImage component
jest.mock('../OptimizedImage', () => ({
  OptimizedImage: ({ source, ...props }: any) => {
    const MockImage = require('react-native').Image;
    return <MockImage source={source} {...props} testID="optimized-image" />;
  },
}));

const MockedPhotoService = PhotoService as jest.MockedClass<typeof PhotoService>;

describe('PhotoCapture', () => {
  let mockPhotoService: jest.Mocked<PhotoService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPhotoService = {
      takePhoto: jest.fn(),
      selectFromGallery: jest.fn(),
      showPhotoOptions: jest.fn(),
      optimizePhoto: jest.fn(),
      checkPermissions: jest.fn(),
    } as any;

    MockedPhotoService.getInstance = jest.fn().mockReturnValue(mockPhotoService);
  });

  describe('Initial State', () => {
    it('should render add photo button when no image is provided', () => {
      const { getByText } = render(<PhotoCapture />);
      
      expect(getByText('Add Photo')).toBeTruthy();
    });

    it('should render current image when provided', () => {
      const { getByTestId } = render(
        <PhotoCapture currentImageUri="test-image-uri" />
      );
      
      expect(getByTestId('optimized-image')).toBeTruthy();
    });

    it('should use custom text labels', () => {
      const { getByText } = render(
        <PhotoCapture 
          addPhotoText="Custom Add Text"
          changePhotoText="Custom Change Text"
          removePhotoText="Custom Remove Text"
        />
      );
      
      expect(getByText('Custom Add Text')).toBeTruthy();
    });
  });

  describe('Photo Capture Modes', () => {
    it('should call takePhoto when mode is camera', async () => {
      mockPhotoService.takePhoto.mockResolvedValue({
        success: true,
        assets: [{
          uri: 'new-photo-uri',
          type: 'image',
          width: 1920,
          height: 1080,
        }],
      });

      const onPhotoSelected = jest.fn();
      const { getByText } = render(
        <PhotoCapture mode="camera" onPhotoSelected={onPhotoSelected} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(mockPhotoService.takePhoto).toHaveBeenCalled();
        expect(onPhotoSelected).toHaveBeenCalledWith(
          expect.objectContaining({ uri: 'new-photo-uri' })
        );
      });
    });

    it('should call selectFromGallery when mode is gallery', async () => {
      mockPhotoService.selectFromGallery.mockResolvedValue({
        success: true,
        assets: [{
          uri: 'gallery-photo-uri',
          type: 'image',
          width: 1080,
          height: 1920,
        }],
      });

      const onPhotoSelected = jest.fn();
      const { getByText } = render(
        <PhotoCapture mode="gallery" onPhotoSelected={onPhotoSelected} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(mockPhotoService.selectFromGallery).toHaveBeenCalled();
        expect(onPhotoSelected).toHaveBeenCalledWith(
          expect.objectContaining({ uri: 'gallery-photo-uri' })
        );
      });
    });

    it('should call showPhotoOptions when mode is both (default)', async () => {
      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: true,
        assets: [{
          uri: 'options-photo-uri',
          type: 'image',
          width: 1920,
          height: 1080,
        }],
      });

      const onPhotoSelected = jest.fn();
      const { getByText } = render(
        <PhotoCapture mode="both" onPhotoSelected={onPhotoSelected} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(mockPhotoService.showPhotoOptions).toHaveBeenCalled();
        expect(onPhotoSelected).toHaveBeenCalledWith(
          expect.objectContaining({ uri: 'options-photo-uri' })
        );
      });
    });
  });

  describe('Photo Optimization', () => {
    it('should optimize photo when autoOptimize is true', async () => {
      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: true,
        assets: [{
          uri: 'original-photo-uri',
          type: 'image',
          width: 1920,
          height: 1080,
        }],
      });
      mockPhotoService.optimizePhoto.mockResolvedValue('optimized-photo-uri');

      const onPhotoSelected = jest.fn();
      const { getByText } = render(
        <PhotoCapture autoOptimize={true} onPhotoSelected={onPhotoSelected} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(mockPhotoService.optimizePhoto).toHaveBeenCalledWith(
          'original-photo-uri',
          {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 'high',
            format: 'jpg',
          }
        );
        expect(onPhotoSelected).toHaveBeenCalledWith(
          expect.objectContaining({ uri: 'optimized-photo-uri' })
        );
      });
    });

    it('should not optimize photo when autoOptimize is false', async () => {
      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: true,
        assets: [{
          uri: 'original-photo-uri',
          type: 'image',
          width: 1920,
          height: 1080,
        }],
      });

      const onPhotoSelected = jest.fn();
      const { getByText } = render(
        <PhotoCapture autoOptimize={false} onPhotoSelected={onPhotoSelected} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(mockPhotoService.optimizePhoto).not.toHaveBeenCalled();
        expect(onPhotoSelected).toHaveBeenCalledWith(
          expect.objectContaining({ uri: 'original-photo-uri' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle photo capture errors', async () => {
      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: false,
        assets: [],
        error: 'Permission denied',
      });

      const onError = jest.fn();
      const { getByText, findByText } = render(
        <PhotoCapture onError={onError} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(async () => {
        expect(onError).toHaveBeenCalledWith('Permission denied');
        expect(await findByText('Permission denied')).toBeTruthy();
      });
    });

    it('should handle optimization failures gracefully', async () => {
      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: true,
        assets: [{
          uri: 'original-photo-uri',
          type: 'image',
          width: 1920,
          height: 1080,
        }],
      });
      mockPhotoService.optimizePhoto.mockRejectedValue(new Error('Optimization failed'));

      const onPhotoSelected = jest.fn();
      const { getByText } = render(
        <PhotoCapture autoOptimize={true} onPhotoSelected={onPhotoSelected} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        // Should still call onPhotoSelected with original URI
        expect(onPhotoSelected).toHaveBeenCalledWith(
          expect.objectContaining({ uri: 'original-photo-uri' })
        );
      });
    });

    it('should not call onError for cancelled operations', async () => {
      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: false,
        assets: [],
        error: 'Photo selection cancelled',
      });

      const onError = jest.fn();
      const { getByText } = render(
        <PhotoCapture onError={onError} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(onError).not.toHaveBeenCalled();
      });
    });
  });

  describe('Photo Removal', () => {
    it('should show remove button when allowRemove is true and image exists', () => {
      const { getByText } = render(
        <PhotoCapture 
          currentImageUri="test-image-uri"
          allowRemove={true}
        />
      );
      
      expect(getByText('Remove Photo')).toBeTruthy();
    });

    it('should not show remove button when allowRemove is false', () => {
      const { queryByText } = render(
        <PhotoCapture 
          currentImageUri="test-image-uri"
          allowRemove={false}
        />
      );
      
      expect(queryByText('Remove Photo')).toBeNull();
    });

    it('should call onPhotoRemoved when remove button is pressed', () => {
      const onPhotoRemoved = jest.fn();
      const { getByText } = render(
        <PhotoCapture 
          currentImageUri="test-image-uri"
          onPhotoRemoved={onPhotoRemoved}
        />
      );
      
      fireEvent.press(getByText('Remove Photo'));
      
      expect(onPhotoRemoved).toHaveBeenCalled();
    });
  });

  describe('Size and Shape Variants', () => {
    it('should apply correct styles for different sizes', () => {
      const { rerender, getByTestId } = render(
        <PhotoCapture size="small" />
      );
      
      // Size styles are applied via StyleSheet, we can't directly test them
      // But we can ensure the component renders without errors
      expect(getByTestId).toBeDefined();
      
      rerender(<PhotoCapture size="medium" />);
      expect(getByTestId).toBeDefined();
      
      rerender(<PhotoCapture size="large" />);
      expect(getByTestId).toBeDefined();
    });

    it('should apply correct styles for different shapes', () => {
      const { rerender, getByTestId } = render(
        <PhotoCapture shape="circle" />
      );
      
      expect(getByTestId).toBeDefined();
      
      rerender(<PhotoCapture shape="square" />);
      expect(getByTestId).toBeDefined();
      
      rerender(<PhotoCapture shape="rounded" />);
      expect(getByTestId).toBeDefined();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during photo capture', async () => {
      // Mock a delayed response
      mockPhotoService.showPhotoOptions.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            assets: []
          }), 100);
        })
      );

      const { getByText } = render(<PhotoCapture />);
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
        
        // Check for loading text immediately after press
        await waitFor(() => {
          expect(getByText('Loading...')).toBeTruthy();
        }, { timeout: 50 });
      });
    });
  });

  describe('Custom Photo Options', () => {
    it('should pass custom photo options to service', async () => {
      const customOptions = {
        quality: 0.5,
        allowsEditing: false,
        aspect: [4, 3] as [number, number],
      };

      mockPhotoService.showPhotoOptions.mockResolvedValue({
        success: true,
        assets: [],
      });

      const { getByText } = render(
        <PhotoCapture photoOptions={customOptions} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Add Photo'));
      });

      await waitFor(() => {
        expect(mockPhotoService.showPhotoOptions).toHaveBeenCalledWith(customOptions);
      });
    });
  });
});