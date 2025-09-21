// Mock setup for comprehensive testing
import "react-native-gesture-handler/jestSetup";

// Mock React Native modules
jest.mock("react-native/Libraries/EventEmitter/NativeEventEmitter");

// Mock Expo modules
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  requestBackgroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  getBackgroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 59.9139,
        longitude: 10.7522,
        altitude: 50,
        accuracy: 5,
        speed: 0,
        heading: 0,
      },
      timestamp: Date.now(),
    })
  ),
  watchPositionAsync: jest.fn(() =>
    Promise.resolve({
      remove: jest.fn(),
    })
  ),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  startLocationUpdatesAsync: jest.fn(() => Promise.resolve()),
  stopLocationUpdatesAsync: jest.fn(() => Promise.resolve()),
  startGeofencingAsync: jest.fn(() => Promise.resolve()),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

jest.mock("expo-camera", () => ({
  useCameraPermissions: jest.fn(() => [
    { status: "granted", granted: true, canAskAgain: true },
    jest.fn(() =>
      Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
    ),
  ]),
  useMicrophonePermissions: jest.fn(() => [
    { status: "granted", granted: true, canAskAgain: true },
    jest.fn(() =>
      Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
    ),
  ]),
  CameraView: "CameraView",
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  requestMicrophonePermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  getCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  getMicrophonePermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
}));

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("notification-id")),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file://mock-document-directory/",
  cacheDirectory: "file://mock-cache-directory/",
  getInfoAsync: jest.fn(() =>
    Promise.resolve({ exists: true, isDirectory: false, size: 1024 })
  ),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve("mock file content")),
  deleteAsync: jest.fn(() => Promise.resolve()),
  moveAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  downloadAsync: jest.fn(() =>
    Promise.resolve({ uri: "file://mock-download-path", status: 200 })
  ),
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      cancelled: false,
      uri: "file://mock-image-uri",
      width: 1920,
      height: 1080,
      type: "image",
    })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      cancelled: false,
      uri: "file://mock-image-uri",
      width: 1920,
      height: 1080,
      type: "image",
    })
  ),
  MediaTypeOptions: {
    All: "All",
    Videos: "Videos",
    Images: "Images",
  },
}));

jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isTaskDefinedAsync: jest.fn(() => Promise.resolve(true)),
  getTaskOptionsAsync: jest.fn(() => Promise.resolve({})),
}));

jest.mock("expo-crypto", () => ({
  digestStringAsync: jest.fn((algorithm, data) =>
    Promise.resolve(`mocked-hash-${data}`)
  ),
  getRandomBytesAsync: jest.fn((length) =>
    Promise.resolve(new Uint8Array(length).fill(0))
  ),
  CryptoDigestAlgorithm: {
    SHA256: "SHA256",
    SHA512: "SHA512",
    MD5: "MD5",
  },
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve("mock-secure-value")),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-device", () => ({
  isDevice: true,
  brand: "Mock Brand",
  manufacturer: "Mock Manufacturer",
  modelName: "Mock Model",
  deviceName: "Mock Device",
  osName: "iOS",
  osVersion: "15.0",
  platformApiLevel: null,
}));

jest.mock("expo-constants", () => ({
  default: {
    appOwnership: "standalone",
    executionEnvironment: "standalone",
    experienceUrl: "exp://mock-experience-url",
    installationId: "mock-installation-id",
    isDevice: true,
    platform: {
      ios: {
        platform: "ios",
        model: "iPhone",
        systemVersion: "15.0",
      },
    },
    statusBarHeight: 44,
    systemFonts: [],
  },
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve("mock-storage-value")),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve(["key1", "key2"])),
  multiGet: jest.fn(() =>
    Promise.resolve([
      ["key1", "value1"],
      ["key2", "value2"],
    ])
  ),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      details: {},
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    type: "wifi",
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock React Navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
    key: "mock-route-key",
    name: "MockScreen",
  }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }: any) => children,
  createNavigationContainerRef: jest.fn(),
}));

// Mock Vector Icons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
  Ionicons: "Ionicons",
  FontAwesome: "FontAwesome",
  Entypo: "Entypo",
}));

// Mock LinearGradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock React Native Gesture Handler
jest.mock("react-native-gesture-handler", () => ({
  PanGestureHandler: "PanGestureHandler",
  TapGestureHandler: "TapGestureHandler",
  FlingGestureHandler: "FlingGestureHandler",
  LongPressGestureHandler: "LongPressGestureHandler",
  PinchGestureHandler: "PinchGestureHandler",
  RotationGestureHandler: "RotationGestureHandler",
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
}));

// Mock React Native Reanimated
jest.mock("react-native-reanimated", () => ({
  default: {
    View: "Animated.View",
    Text: "Animated.Text",
    ScrollView: "Animated.ScrollView",
    createAnimatedComponent: jest.fn(),
    Value: jest.fn(),
    event: jest.fn(),
    add: jest.fn(),
    eq: jest.fn(),
    set: jest.fn(),
    cond: jest.fn(),
    interpolate: jest.fn(),
  },
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  runOnJS: jest.fn((fn) => fn),
}));

// Mock React Native Safe Area Context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock React Native Maps
jest.mock("react-native-maps", () => ({
  default: "MapView",
  MapView: "MapView",
  Marker: "Marker",
  Polyline: "Polyline",
  Circle: "Circle",
  Polygon: "Polygon",
  PROVIDER_GOOGLE: "google",
  PROVIDER_DEFAULT: "default",
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve("mock response text"),
  })
) as jest.Mock;

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  readyState: 1,
})) as any;

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") ||
        args[0].includes("componentWillMount") ||
        args[0].includes("componentWillReceiveProps"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") ||
        args[0].includes("componentWillMount") ||
        args[0].includes("componentWillReceiveProps"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

export {};
