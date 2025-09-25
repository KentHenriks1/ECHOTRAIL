/**
 * Lazy Component Examples and Exports
 * Demonstrates component-level lazy loading for heavy components
 */

import { 
  createLazyComponent, 
  createPerformanceLazyComponent
} from '../common/LazyComponent';

// Example: Heavy Map Component (lazy loaded)
export const LazyMapComponent = createPerformanceLazyComponent(
  () => Promise.resolve({ 
    default: () => null // Placeholder component to avoid import issues 
  }),
  'MapView',
  { 
    loadingHeight: 200,
    // loadingWidth: '100%' // Width should be number, commenting out
  }
);

// Note: These are example lazy components that demonstrate the patterns
// In a real app, you would replace these imports with actual heavy components

// Example: Heavy Chart Component (lazy loaded with feature flag) 
// Commented out - replace with real chart component when needed
// export const LazyChartComponent = createFeatureFlagLazyComponent(
//   () => import('./HeavyChartComponent').then(module => ({ 
//     default: module.HeavyChartComponent 
//   })),
//   'CHARTS',
//   'Chart Visualization'
// );

// Photo Capture Component (lazy loaded with conditions)
export const LazyPhotoCaptureComponent = createLazyComponent(
  () => import('../common/PhotoCapture').then(module => ({
    default: module.PhotoCapture
  })),
  'Photo Capture',
  {
    loadingHeight: 120
  }
);

// Photo Gallery Component (lazy loaded for performance)
export const LazyPhotoGalleryComponent = createLazyComponent(
  () => import('../common/PhotoGallery').then(module => ({
    default: module.default
  })),
  'Photo Gallery',
  {
    loadingHeight: 300
  }
);

// Photo Service (lazy loaded utility)
export const LazyPhotoService = createLazyComponent(
  () => import('../../services/media/PhotoService').then(module => ({
    default: module.PhotoService
  })),
  'Photo Service'
);

// Example: Analytics Component (viewport-based loading) 
// export const LazyAnalyticsComponent = createViewportLazyComponent(
//   () => import('./AnalyticsComponent').then(module => ({ 
//     default: module.AnalyticsComponent 
//   })),
//   'Analytics Dashboard',
//   150
// );

// Example: Performance Monitor Component (always lazy)
export const LazyPerformanceMonitor = createLazyComponent(
  () => Promise.resolve({
    default: () => null // Placeholder component
  }),
  'Performance Monitor',
  {
    loadingHeight: 50
  }
);

// Re-export all lazy component utilities
export {
  createLazyComponent,
  createPerformanceLazyComponent
} from '../common/LazyComponent';
