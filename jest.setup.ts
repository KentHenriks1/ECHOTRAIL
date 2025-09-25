import "@testing-library/jest-dom";
import "./src/__tests__/setup/testSetup.config";

// ========================================
// PRODUCTION-READY JEST SETUP
// Only mock React Native/Expo platform APIs
// DO NOT mock our business logic (database, API, faker)
// ========================================

// Mock React Native platform modules only
jest.mock("react-native-gesture-handler", () => ({}));

// Mock React Native core components and APIs
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Share: {
    share: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: "ios",
    Version: "15.0",
    select: jest.fn((obj) => obj.ios),
  },
  PermissionsAndroid: {
    request: jest.fn(() => Promise.resolve("granted")),
    check: jest.fn(() => Promise.resolve(true)),
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
      ACCESS_COARSE_LOCATION: "android.permission.ACCESS_COARSE_LOCATION",
    },
    RESULTS: {
      GRANTED: "granted",
      DENIED: "denied",
      NEVER_ASK_AGAIN: "never_ask_again",
    },
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((styles) => styles),
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      interpolate: jest.fn(() => ({ interpolate: jest.fn() })),
    })),
    View: "AnimatedView",
    Text: "AnimatedText",
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
  },
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  FlatList: "FlatList",
  Image: "Image",
}));

// Mock React Navigation (platform dependency)
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock Expo platform modules only
jest.mock("expo-device", () => ({
  isDevice: true,
  deviceType: 1,
  deviceName: "Test Device",
}));

jest.mock("expo-constants", () => ({
  default: {
    appOwnership: "standalone",
    deviceId: "test-device-id",
    installationId: "test-installation-id",
    sessionId: "test-session-id",
    expoVersion: "48.0.0",
    expoConfig: {
      extra: {
        echotrail: {
          googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "test-api-key",
        },
      },
    },
  },
}));

// Mock expo-crypto to avoid ES module import errors
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  CryptoDigestAlgorithm: {
    SHA256: "SHA256",
    SHA1: "SHA1",
    MD5: "MD5",
  },
  digestStringAsync: jest.fn(async () => "mocked-hash"),
}));

// Mock expo-secure-store to avoid ES module import errors
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async () => Promise.resolve()),
  getItemAsync: jest.fn(async () => Promise.resolve(null)),
  deleteItemAsync: jest.fn(async () => Promise.resolve()),
  isAvailableAsync: jest.fn(async () => Promise.resolve(true)),
}));

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: jest.fn(async () => Promise.resolve()),
    getItem: jest.fn(async () => Promise.resolve(null)),
    removeItem: jest.fn(async () => Promise.resolve()),
    clear: jest.fn(async () => Promise.resolve()),
    getAllKeys: jest.fn(async () => Promise.resolve([])),
    multiGet: jest.fn(async () => Promise.resolve([])),
    multiSet: jest.fn(async () => Promise.resolve()),
    multiRemove: jest.fn(async () => Promise.resolve()),
  },
}));

// Mock expo-location to avoid ES module import errors
jest.mock("expo-location", () => ({
  LocationAccuracy: {
    Highest: 1,
    High: 2,
    Balanced: 3,
    Low: 4,
    Lowest: 5,
  },
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: "granted",
    granted: true,
    canAskAgain: true,
  })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({
    status: "granted",
    granted: true,
    canAskAgain: true,
  })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: {
      latitude: 59.9139,
      longitude: 10.7522,
      altitude: 100,
      accuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  })),
  watchPositionAsync: jest.fn(() => ({
    remove: jest.fn(),
  })),
  hasServicesEnabledAsync: jest.fn(async () => true),
}));

// Mock @faker-js/faker to avoid ES module import errors but keep it functional for tests that need it
jest.mock("@faker-js/faker", () => ({
  faker: {
    string: {
      uuid: jest.fn(
        () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`
      ),
      alphanumeric: jest.fn((length: number) =>
        Math.random()
          .toString(36)
          .substr(2, length || 8)
      ),
    },
    internet: {
      email: jest.fn(
        () => `test${Math.floor(Math.random() * 1000)}@example.com`
      ),
    },
    person: {
      fullName: jest.fn(() => `Test User ${Math.floor(Math.random() * 1000)}`),
    },
    image: {
      avatar: jest.fn(() => "https://example.com/avatar.jpg"),
    },
    helpers: {
      arrayElement: jest.fn(
        (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
      ),
    },
    date: {
      past: jest.fn(() => new Date(Date.now() - Math.random() * 86400000 * 30)),
      recent: jest.fn(() => new Date(Date.now() - Math.random() * 86400000)),
      future: jest.fn(
        () => new Date(Date.now() + Math.random() * 86400000 * 30)
      ),
    },
    location: {
      city: jest.fn(() => `Test City ${Math.floor(Math.random() * 100)}`),
      latitude: jest.fn(() => 59.9139 + (Math.random() - 0.5) * 0.1),
      longitude: jest.fn(() => 10.7522 + (Math.random() - 0.5) * 0.1),
    },
    lorem: {
      sentences: jest.fn(
        () => "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
      ),
    },
    datatype: {
      boolean: jest.fn(() => Math.random() > 0.5),
    },
    number: {
      float: jest.fn((options: any) => {
        const min = options?.min || 0;
        const max = options?.max || 100;
        const decimals = options?.fractionDigits || 2;
        return parseFloat(
          (Math.random() * (max - min) + min).toFixed(decimals)
        );
      }),
      int: jest.fn((options: any) => {
        const min = options?.min || 0;
        const max = options?.max || 1000;
        return Math.floor(Math.random() * (max - min) + min);
      }),
    },
  },
}));

// ========================================
// NODE.js ENVIRONMENT POLYFILLS
// ========================================

// Add Node.js fetch polyfill if not available
if (typeof global.fetch === "undefined") {
  // Import node-fetch dynamically for Node.js environment
  const fetch = require("node-fetch");
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

// Add localStorage polyfill for Node.js environment
if (typeof global.localStorage === "undefined") {
  const { LocalStorage } = require("node-localstorage");
  // Create localStorage in temp directory for tests
  const tmpDir = require("os").tmpdir();
  const testStoragePath = require("path").join(
    tmpDir,
    "echotrail-test-storage"
  );
  global.localStorage = new LocalStorage(testStoragePath);
}

// Add performance API for Node.js environment
if (typeof global.performance === "undefined") {
  const { performance } = require("perf_hooks");
  global.performance = performance;
}

// ========================================
// TEST ENVIRONMENT CONFIGURATION
// ========================================

// Set up environment variables for testing
process.env.NODE_ENV = "test";
process.env.API_URL =
  process.env.API_URL || "https://test-api-url.example.com";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || "test-google-maps-api-key";
process.env.OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "test-openai-api-key";
process.env.MAPBOX_ACCESS_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN || "test-mapbox-token";
process.env.STACK_AUTH_JWKS_URL =
  process.env.STACK_AUTH_JWKS_URL ||
  "https://api.stack-auth.com/api/v1/projects/test/.well-known/jwks.json";

// Set global flags
(global as any).__DEV__ = false; // Test in production mode
(global as any).btoa = (str: string) =>
  Buffer.from(str, "binary").toString("base64");
(global as any).atob = (str: string) =>
  Buffer.from(str, "base64").toString("binary");

// ========================================
// TEST LIFECYCLE HOOKS
// ========================================

// Set up test timeout
jest.setTimeout(30000); // 30 seconds for integration tests

// Clean up between tests
afterEach(() => {
  // Clear any timers
  jest.clearAllTimers();
  // Clean up localStorage between tests
  if (global.localStorage) {
    global.localStorage.clear();
  }
});

// Final cleanup
afterAll(() => {
  // Clean up any remaining resources
  jest.restoreAllMocks();
});
