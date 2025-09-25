/**
 * Jest Test Setup - Enterprise Edition
 * Global test configuration and mocks
 */

import "react-native-gesture-handler/jestSetup";
import React from "react";
// Note: @testing-library/jest-native is deprecated
// Using built-in Jest matchers from @testing-library/react-native v12.4+

// Mock react-native modules
// Note: NativeAnimatedHelper mock removed as it's not needed with modern RN

// Mock react-navigation
jest.mock("@react-navigation/native", () => {
  return {
    ...jest.requireActual("@react-navigation/native"),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

// Mock expo modules
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  requestBackgroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 59.9139,
        longitude: 10.7522,
        accuracy: 10,
        altitude: 100,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    })
  ),
  watchPositionAsync: jest.fn(() =>
    Promise.resolve({
      remove: jest.fn(),
    })
  ),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

jest.mock("expo-av", () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(),
            pauseAsync: jest.fn(),
            stopAsync: jest.fn(),
            unloadAsync: jest.fn(),
            setOnPlaybackStatusUpdate: jest.fn(),
          },
        })
      ),
    },
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    INTERRUPTION_MODE_IOS_DO_NOT_MIX: 1,
    INTERRUPTION_MODE_ANDROID_DO_NOT_MIX: 1,
  },
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///test/",
  getInfoAsync: jest.fn(() =>
    Promise.resolve({ exists: false, isDirectory: false })
  ),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve("")),
  deleteAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  EncodingType: {
    UTF8: "utf8",
    Base64: "base64",
  },
}));

jest.mock("react-native-maps", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Polyline: View,
    PROVIDER_GOOGLE: "google",
  };
});

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      type: "wifi",
      details: {
        isConnectionExpensive: false,
        cellularGeneration: null,
      },
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock performance.now for React Native
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
  } as any;
}

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: {} }),
    text: () => Promise.resolve(""),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })
) as jest.Mock;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock alert
global.alert = jest.fn();

// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.EXPO_PUBLIC_API_URL = "https://test-api.example.com";
process.env.EXPO_PUBLIC_OPENAI_API_KEY = "test-openai-key";
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = "test-maps-key";

// Mock timers for tests
jest.useFakeTimers({
  legacyFakeTimers: true,
});
