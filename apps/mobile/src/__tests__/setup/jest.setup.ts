/**
 * Jest Test Setup Configuration
 * 
 * This setup file runs after the test framework is installed in the environment
 * but before each test file is executed.
 */

// Import only basic Jest extended matchers
// TODO: Re-enable React Native testing library when version mismatch is resolved
// import { configure } from '@testing-library/react-native';
// import 'jest-extended'; // Additional matchers

// Configure testing library for React Native
// configure({
//   // Automatically cleanup after each test
//   asyncUtilTimeout: 10000,
//   // Add custom queries if needed
// });

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test timeout
jest.setTimeout(60000);

// Mock console methods that are noisy during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress specific React Native warnings that are expected during tests
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillMount has been renamed'))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
       args[0].includes('source.uri should not be an empty string'))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test state cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Clear any timers
  jest.clearAllTimers();
  
  // Reset any global state if needed
  process.env.NODE_ENV = 'test';
});

// Performance monitoring for slow tests
const slowTestThreshold = 5000; // 5 seconds
let testStartTime: number;

beforeEach(() => {
  testStartTime = Date.now();
});

afterEach(() => {
  const testDuration = Date.now() - testStartTime;
  if (testDuration > slowTestThreshold) {
    console.warn(
      `⚠️  Slow test detected: ${expect.getState().currentTestName} took ${testDuration}ms`
    );
  }
});

// Memory leak detection
let initialMemoryUsage: NodeJS.MemoryUsage;

beforeEach(() => {
  initialMemoryUsage = process.memoryUsage();
});

afterEach(() => {
  const finalMemoryUsage = process.memoryUsage();
  const memoryGrowth = finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;
  
  // Warn if memory usage grew significantly (>10MB)
  if (memoryGrowth > 10 * 1024 * 1024) {
    console.warn(
      `⚠️  Potential memory leak detected in ${expect.getState().currentTestName}: ` +
      `${Math.round(memoryGrowth / 1024 / 1024)}MB growth`
    );
  }
});

// Test flakiness detection
const testResults = new Map<string, number[]>();

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  const testDuration = Date.now() - testStartTime;
  
  if (!testResults.has(testName)) {
    testResults.set(testName, []);
  }
  
  testResults.get(testName)!.push(testDuration);
  
  // Check for flaky tests (high variance in execution time)
  const times = testResults.get(testName)!;
  if (times.length >= 5) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;
    
    // If coefficient of variation > 50%, test might be flaky
    if (coefficientOfVariation > 0.5) {
      console.warn(
        `⚠️  Potentially flaky test detected: ${testName} ` +
        `(CV: ${Math.round(coefficientOfVariation * 100)}%)`
      );
    }
  }
});