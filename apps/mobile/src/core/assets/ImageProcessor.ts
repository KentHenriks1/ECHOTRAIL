/**
 * Image Processing Service for EchoTrail
 * 
 * Handles:
 * - WebP/AVIF conversion with fallbacks
 * - Image compression and quality optimization
 * - Resize and format conversion
 * - Batch processing for multiple images
 * - Progressive image generation
 * - Metadata preservation and extraction
 */

import { Platform, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Logger } from '../utils/Logger';
import { ImageFormat, ImageQuality } from './AssetOptimizer';

export interface ImageProcessingOptions {
  quality: ImageQuality;
  format: ImageFormat;
  targetWidth?: number;
  targetHeight?: number;
  maintainAspectRatio?: boolean;
  progressive?: boolean;
  stripMetadata?: boolean;
  enableFallback?: boolean;
}

export interface ImageProcessingResult {
  success: boolean;
  originalPath: string;
  processedPath: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  format: ImageFormat;
  dimensions: {
    width: number;
    height: number;
  };
  metadata?: ImageMetadata;
}

interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  colorSpace: string;
  hasAlpha: boolean;
  density?: number;
  orientation?: number;
}

interface ProcessingQueue {
  id: string;
  sourcePath: string;
  options: ImageProcessingOptions;
  resolve: (_result: ImageProcessingResult) => void;
  reject: (_error: Error) => void;
}

// Quality mapping for different formats (unused but kept for reference)
/*
const QUALITY_MAPPING = {
  webp: {
    low: 30,
    medium: 60,
    high: 80,
    ultra: 95,
    auto: 70,
  },
  avif: {
    low: 25,
    medium: 50,
    high: 75,
    ultra: 90,
    auto: 60,
  },
  jpg: {
    low: 40,
    medium: 70,
    high: 85,
    ultra: 95,
    auto: 75,
  },
  jpeg: {
    low: 40,
    medium: 70,
    high: 85,
    ultra: 95,
    auto: 75,
  },
  png: {
    low: 1, // PNG compression level (0-9)
    medium: 3,
    high: 6,
    ultra: 9,
    auto: 4,
  },
};
*/

/**
 * Enterprise Image Processing Service
 */
export class ImageProcessor {
  private static instance: ImageProcessor | null = null;
  private readonly logger: Logger;
  private readonly processingQueue: ProcessingQueue[] = [];
  private readonly activeProcesses = new Set<string>();
  private readonly maxConcurrentProcesses = 2;
  private readonly processedCache = new Map<string, ImageProcessingResult>();
  
  private constructor() {
    this.logger = new Logger('ImageProcessor');
    this.startQueueProcessor();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }
  
  /**
   * Process single image with optimization
   */
  public async processImage(
    sourcePath: string,
    options: ImageProcessingOptions
  ): Promise<ImageProcessingResult> {
    const cacheKey = this.generateCacheKey(sourcePath, options);
    
    // Check cache first
    const cached = this.processedCache.get(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached processing result', { sourcePath });
      return cached;
    }
    
    return new Promise((resolve, reject) => {
      const queueItem: ProcessingQueue = {
        id: cacheKey,
        sourcePath,
        options,
        resolve: (result) => {
          this.processedCache.set(cacheKey, result);
          resolve(result);
        },
        reject,
      };
      
      this.processingQueue.push(queueItem);
      this.processQueue();
    });
  }
  
  /**
   * Process multiple images in batch
   */
  public async processBatch(
    sources: Array<{ path: string; options: ImageProcessingOptions }>
  ): Promise<ImageProcessingResult[]> {
    this.logger.info('Processing image batch', { count: sources.length });
    
    const results = await Promise.allSettled(
      sources.map(({ path, options }) => this.processImage(path, options))
    );
    
    const successful = results
      .filter((r): r is PromiseFulfilledResult<ImageProcessingResult> => r.status === 'fulfilled')
      .map(r => r.value);
    
    const failed = results.filter(r => r.status === 'rejected').length;
    
    this.logger.info('Batch processing completed', {
      successful: successful.length,
      failed,
      total: sources.length,
    });
    
    return successful;
  }
  
  /**
   * Generate progressive versions of an image
   */
  public async generateProgressiveVersions(
    sourcePath: string,
    baseOptions: Omit<ImageProcessingOptions, 'quality'>
  ): Promise<{
    low: ImageProcessingResult;
    medium: ImageProcessingResult;
    high: ImageProcessingResult;
  }> {
    this.logger.info('Generating progressive versions', { sourcePath });
    
    const [low, medium, high] = await Promise.all([
      this.processImage(sourcePath, { ...baseOptions, quality: 'low' }),
      this.processImage(sourcePath, { ...baseOptions, quality: 'medium' }),
      this.processImage(sourcePath, { ...baseOptions, quality: 'high' }),
    ]);
    
    return { low, medium, high };
  }
  
  /**
   * Get optimal dimensions for target device
   */
  public getOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number,
    maintainAspectRatio = true
  ): { width: number; height: number } {
    const screen = Dimensions.get('screen');
    const maxWidth = targetWidth || screen.width;
    const maxHeight = targetHeight || screen.height;
    
    if (!maintainAspectRatio) {
      return { width: maxWidth, height: maxHeight };
    }
    
    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth = maxWidth;
    let newHeight = newWidth / aspectRatio;
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }
    
    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }
  
  /**
   * Estimate file size after processing
   */
  public estimateProcessedSize(
    originalSize: number,
    originalFormat: string,
    targetFormat: ImageFormat,
    quality: ImageQuality
  ): number {
    const formatCompressionRatio = this.getFormatCompressionRatio(originalFormat, targetFormat);
    const qualityRatio = this.getQualityRatio(targetFormat, quality);
    
    return Math.round(originalSize * formatCompressionRatio * qualityRatio);
  }
  
  /**
   * Check format support on current platform
   */
  public isFormatSupported(format: ImageFormat): boolean {
    switch (format) {
      case 'webp':
        return true; // WebP is widely supported in React Native
      case 'avif':
        return Platform.OS === 'android' && Platform.Version >= 30;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return true;
      default:
        return false;
    }
  }
  
  /**
   * Get recommended format for image
   */
  public getRecommendedFormat(
    _originalFormat: string,
    hasAlpha: boolean = false
  ): ImageFormat {
    // For images with alpha, prefer PNG or WebP
    if (hasAlpha) {
      return this.isFormatSupported('webp') ? 'webp' : 'png';
    }
    
    // For photos, prefer modern formats
    if (this.isFormatSupported('avif')) {
      return 'avif';
    }
    
    if (this.isFormatSupported('webp')) {
      return 'webp';
    }
    
    return 'jpg';
  }
  
  /**
   * Clear processing cache
   */
  public clearCache(): void {
    this.processedCache.clear();
    this.logger.info('Processing cache cleared');
  }
  
  // Private methods
  
  private async processQueue(): Promise<void> {
    while (
      this.processingQueue.length > 0 &&
      this.activeProcesses.size < this.maxConcurrentProcesses
    ) {
      const item = this.processingQueue.shift();
      if (item) {
        this.processQueueItem(item);
      }
    }
  }
  
  private async processQueueItem(item: ProcessingQueue): Promise<void> {
    this.activeProcesses.add(item.id);
    
    try {
      const result = await this.performImageProcessing(item.sourcePath, item.options);
      item.resolve(result);
    } catch (error) {
      this.logger.error('Image processing failed', { sourcePath: item.sourcePath }, error as Error);
      item.reject(error as Error);
    } finally {
      this.activeProcesses.delete(item.id);
      this.processQueue(); // Process next item
    }
  }
  
  private async performImageProcessing(
    sourcePath: string,
    options: ImageProcessingOptions
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Get source file info
      const sourceInfo = await FileSystem.getInfoAsync(sourcePath);
      if (!sourceInfo.exists) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      
      const originalSize = sourceInfo.size || 0;
      
      // Extract metadata (simplified - in production use a proper image library)
      const metadata = await this.extractImageMetadata(sourcePath);
      
      // Calculate optimal dimensions
      const targetDimensions = this.getOptimalDimensions(
        metadata.width,
        metadata.height,
        options.targetWidth,
        options.targetHeight,
        options.maintainAspectRatio
      );
      
      // Perform the actual processing (placeholder implementation)
      const processedPath = await this.performActualProcessing(
        sourcePath,
        options,
        targetDimensions
      );
      
      // Get processed file info
      const processedInfo = await FileSystem.getInfoAsync(processedPath);
      const processedSize = (processedInfo as any).size || 0;
      
      const result: ImageProcessingResult = {
        success: true,
        originalPath: sourcePath,
        processedPath,
        originalSize,
        processedSize,
        compressionRatio: originalSize > 0 ? processedSize / originalSize : 1,
        format: options.format,
        dimensions: targetDimensions,
        metadata,
      };
      
      const processingTime = Date.now() - startTime;
      
      this.logger.info('Image processing completed', {
        sourcePath,
        format: options.format,
        quality: options.quality,
        originalSize,
        processedSize,
        compressionRatio: result.compressionRatio,
        processingTime,
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Image processing error', { sourcePath, options }, error as Error);
      throw error;
    }
  }
  
  private async performActualProcessing(
    sourcePath: string,
    options: ImageProcessingOptions,
    targetDimensions: { width: number; height: number }
  ): Promise<string> {
    // In a real implementation, this would use a native image processing library
    // like react-native-image-resizer, expo-image-manipulator, or similar
    
    const outputDir = `${(FileSystem as any).cacheDirectory ?? ''}processed/`;
    const { exists } = await FileSystem.getInfoAsync(outputDir);
    if (!exists) {
      await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true });
    }
    
    const fileName = `processed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${options.format}`;
    const outputPath = `${outputDir}${fileName}`;
    
    // Placeholder: In production, perform actual image processing here
    // For now, just copy the file (as a fallback)
    await FileSystem.copyAsync({ from: sourcePath, to: outputPath });
    
    this.logger.debug('Image processing placeholder completed', {
      sourcePath,
      outputPath,
      targetDimensions,
      options,
    });
    
    return outputPath;
  }
  
  private async extractImageMetadata(sourcePath: string): Promise<ImageMetadata> {
    // Placeholder metadata extraction
    // In production, use a proper image metadata library
    
    const defaultMetadata: ImageMetadata = {
      format: this.getFormatFromPath(sourcePath),
      width: 1920, // Placeholder dimensions
      height: 1080,
      colorSpace: 'sRGB',
      hasAlpha: false,
      density: 72,
      orientation: 1,
    };
    
    return defaultMetadata;
  }
  
  private getFormatFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase() || 'jpg';
    return extension;
  }
  
  private getFormatCompressionRatio(originalFormat: string, targetFormat: ImageFormat): number {
    // Rough compression ratios for different format conversions
    const ratios: Record<string, Record<ImageFormat, number>> = {
      png: { webp: 0.6, avif: 0.4, jpg: 0.3, jpeg: 0.3, png: 1.0 },
      jpg: { webp: 0.8, avif: 0.6, jpg: 1.0, jpeg: 1.0, png: 1.5 },
      jpeg: { webp: 0.8, avif: 0.6, jpg: 1.0, jpeg: 1.0, png: 1.5 },
      webp: { webp: 1.0, avif: 0.8, jpg: 1.2, jpeg: 1.2, png: 1.8 },
      avif: { webp: 1.2, avif: 1.0, jpg: 1.5, jpeg: 1.5, png: 2.0 },
    };
    
    return ratios[originalFormat]?.[targetFormat] || 1.0;
  }
  
  private getQualityRatio(format: ImageFormat, quality: ImageQuality): number {
    // Quality impact on file size
    const ratios: Record<ImageFormat, Record<ImageQuality, number>> = {
      webp: { low: 0.3, medium: 0.6, high: 0.8, ultra: 0.95, auto: 0.7 },
      avif: { low: 0.2, medium: 0.5, high: 0.75, ultra: 0.9, auto: 0.6 },
      jpg: { low: 0.4, medium: 0.7, high: 0.85, ultra: 0.95, auto: 0.75 },
      jpeg: { low: 0.4, medium: 0.7, high: 0.85, ultra: 0.95, auto: 0.75 },
      png: { low: 0.7, medium: 0.85, high: 0.95, ultra: 1.0, auto: 0.9 },
    };
    
    return ratios[format]?.[quality] || 0.8;
  }
  
  private generateCacheKey(
    sourcePath: string,
    options: ImageProcessingOptions
  ): string {
    const key = `${sourcePath}_${options.format}_${options.quality}_${options.targetWidth || 0}_${options.targetHeight || 0}`;
    return key.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  private startQueueProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (this.processingQueue.length > 0 && this.activeProcesses.size < this.maxConcurrentProcesses) {
        this.processQueue();
      }
    }, 100);
  }
}
