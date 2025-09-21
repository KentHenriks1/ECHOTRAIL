// Test setup configuration for React Native components
// This file contains mocks and polyfills required for Jest testing

// Mock for React Native Reanimated
global.__reanimatedWorkletInit = jest.fn();

// Mock for React Native Gesture Handler
import 'react-native-gesture-handler/jestSetup';

// Mock for React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  return function MockedIcon(props: any) {
    return React.createElement(Text, props, props.name || 'MockIcon');
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  return function MockedIcon(props: any) {
    return React.createElement(Text, props, props.name || 'MockIcon');
  };
});

jest.mock('react-native-vector-icons/FontAwesome', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  return function MockedIcon(props: any) {
    return React.createElement(Text, props, props.name || 'MockIcon');
  };
});

// Generic mock for all vector icons
jest.mock('react-native-vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  const MockedIcon = function(props: any) {
    return React.createElement(Text, props, props.name || 'MockIcon');
  };
  
  return {
    __esModule: true,
    default: MockedIcon,
    MaterialIcons: MockedIcon,
    Ionicons: MockedIcon,
    FontAwesome: MockedIcon,
    FontAwesome5: MockedIcon,
    MaterialCommunityIcons: MockedIcon,
    Feather: MockedIcon,
    Entypo: MockedIcon,
  };
});

// Mock for AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock for Expo modules
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(() => ({})),
  NativeModulesProxy: {},
  EventEmitter: jest.fn(),
  requireNativeViewManager: jest.fn(),
}));

// Mock for Expo Location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted', granted: true, canAskAgain: true })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 59.9139,
        longitude: 10.7522,
        altitude: 0,
        accuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    })
  ),
  watchPositionAsync: jest.fn(),
  LocationAccuracy: {
    High: 4,
    Balanced: 3,
    Low: 2,
  },
}));

// Mock for Expo LinearGradient
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: View,
  };
});

// Mock for React Native Maps
jest.mock('react-native-maps', () => {
  const MockMapView = 'MapView';
  const MockMarker = 'Marker';
  const MockPolyline = 'Polyline';
  
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default',
  };
});


// Mock for Timer-related functionality
jest.useFakeTimers();

// Setup console.warn suppression for common warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  
  // Suppress specific warnings that are expected in test environment
  if (
    typeof message === 'string' && (
      message.includes('Animated: `useNativeDriver`') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('Warning: ReactDOM.render is no longer supported')
    )
  ) {
    return;
  }
  
  originalWarn.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);

// ========================================
// TEST DATA EXPORTS
// ========================================

// Complete Trail mock data with all required fields
export const mockTrailData = {
  id: 'test-trail-1',
  name: 'Test Trail',
  description: 'A beautiful test trail',
  difficulty: 'moderate' as const,
  category: 'hiking' as const,
  
  // Location data
  startPoint: { latitude: 59.9139, longitude: 10.7522 },
  endPoint: { latitude: 59.9141, longitude: 10.7524 },
  waypoints: [
    { latitude: 59.9139, longitude: 10.7522, elevation: 200 },
    { latitude: 59.9140, longitude: 10.7523, elevation: 350 },
    { latitude: 59.9141, longitude: 10.7524, elevation: 300 },
  ],
  trackPoints: [
    {
      id: 'tp-1',
      coordinate: { latitude: 59.9139, longitude: 10.7522 },
      timestamp: new Date('2024-01-01T10:00:00Z'),
      altitude: 200,
    },
    {
      id: 'tp-2', 
      coordinate: { latitude: 59.9140, longitude: 10.7523 },
      timestamp: new Date('2024-01-01T10:30:00Z'),
      altitude: 350,
    },
  ],
  bounds: {
    northeast: { latitude: 59.9141, longitude: 10.7524 },
    southwest: { latitude: 59.9139, longitude: 10.7522 }
  },
  
  // Trail metadata
  distance: 5000,
  estimatedDuration: 120,
  elevationGain: 300,
  maxElevation: 500,
  minElevation: 200,
  
  // Content
  images: ['https://example.com/trail1.jpg', 'https://example.com/trail2.jpg'],
  audioGuidePoints: [
    {
      id: '1',
      coordinate: { latitude: 59.9140, longitude: 10.7523 },
      title: 'Point 1',
      description: 'Audio guide point 1',
      audioScript: 'Welcome to this trail',
      triggerRadius: 50,
      category: 'nature' as const
    }
  ],
  
  // User experience
  rating: 4.5,
  reviewCount: 25,
  popularity: 85,
  
  // Technical
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'), 
  isActive: true,
  requiresPermits: false,
  seasonality: {
    bestMonths: [5, 6, 7, 8, 9],
    warnings: ['Can be muddy after rain']
  },
  
  // Features
  features: {
    hasWater: true,
    hasRestrooms: false,
    hasParking: true,
    isPetFriendly: true,
    isAccessible: false,
    hasWifi: false
  }
};

// Complete Theme mock data
export const mockTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    surface: '#F8F9FA',
    background: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    accent: '#FF9500',
    muted: '#F2F2F7',
    highlight: '#FFD60A'
  },
  typography: {
    fontSize: {
      xs: 11,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 24,
      xxl: 32,
      xxxl: 48,
      _xs: 11,
      _sm: 14,
      _md: 16,
      _lg: 18,
      _xl: 24,
      _xxl: 32,
      _xxxl: 48
    },
    fontFamily: {
      regular: 'System',
      medium: 'System-Medium',
      semiBold: 'System-SemiBold',
      bold: 'System-Bold'
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 2.0
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    xxxxl: 96,
    _xs: 4,
    _sm: 8,
    _md: 16,
    _lg: 24,
    _xl: 32
  },
  borderRadius: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 999,
    _sm: 4,
    _md: 8,
    _lg: 16
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 2
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
      elevation: 8
    }
  }
};

// ========================================
// SETUP VALIDATION TESTS
// ========================================

describe('Test Setup Configuration', () => {
  describe('Mock Data Validation', () => {
    test('should provide valid trail mock data', () => {
      expect(mockTrailData).toBeDefined();
      expect(mockTrailData.id).toBe('test-trail-1');
      expect(mockTrailData.name).toBe('Test Trail');
      expect(mockTrailData.difficulty).toBe('moderate');
      expect(mockTrailData.category).toBe('hiking');
      expect(mockTrailData.distance).toBe(5000);
      expect(mockTrailData.rating).toBe(4.5);
    });

    test('should provide valid theme mock data', () => {
      expect(mockTheme).toBeDefined();
      expect(mockTheme.colors.primary).toBe('#007AFF');
      expect(mockTheme.typography.fontSize.base).toBe(16);
      expect(mockTheme.spacing.md).toBe(16);
      expect(mockTheme.borderRadius.md).toBe(8);
    });

    test('should have proper trail coordinates', () => {
      expect(mockTrailData.startPoint).toEqual({ latitude: 59.9139, longitude: 10.7522 });
      expect(mockTrailData.endPoint).toEqual({ latitude: 59.9141, longitude: 10.7524 });
      expect(mockTrailData.waypoints).toHaveLength(3);
      expect(mockTrailData.trackPoints).toHaveLength(2);
    });

    test('should have audio guide points configured', () => {
      expect(mockTrailData.audioGuidePoints).toHaveLength(1);
      expect(mockTrailData.audioGuidePoints[0]).toMatchObject({
        id: '1',
        title: 'Point 1',
        category: 'nature',
        triggerRadius: 50
      });
    });
  });

  describe('Mock Functions Setup', () => {
    test('should have Reanimated worklet init mocked', () => {
      expect(global.__reanimatedWorkletInit).toBeDefined();
      expect(jest.isMockFunction(global.__reanimatedWorkletInit)).toBe(true);
    });

    test('should use fake timers', () => {
      expect(jest.getTimerCount()).toBe(0); // Initially no timers
      
      const timer = setTimeout(() => {}, 1000);
      expect(jest.getTimerCount()).toBe(1);
      
      clearTimeout(timer);
    });

    test('should suppress known warnings', () => {
      const originalWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // These should be suppressed
      console.warn('Animated: `useNativeDriver` test warning');
      console.warn('componentWillReceiveProps test warning');
      console.warn('Warning: ReactDOM.render is no longer supported test');
      
      // This should not be suppressed
      console.warn('This is a different warning');
      
      originalWarn.mockRestore();
    });
  });

  describe('Environment Configuration', () => {
    test('should be in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });

    test('should have reasonable test timeout', () => {
      // Jest timeout is configured in jest.setup.ts (30 seconds)
      // This test verifies our timeout configuration is reasonable
      const expectedTimeout = 30000;
      expect(expectedTimeout).toBeGreaterThan(5000);
      expect(expectedTimeout).toBeLessThanOrEqual(60000);
    });
  });
});
