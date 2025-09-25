/**
 * Test Hygiene and Determinism Configuration
 * 
 * This module ensures tests run deterministically and follow best practices
 * for reliability, isolation, and maintainability.
 */

import { performance } from 'perf_hooks';

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Set deterministic random seed for tests
Math.random = (() => {
  let seed = parseInt(process.env.PROPERTY_TEST_SEED || '42', 10);
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
})();

// Mock Date.now() for deterministic timestamps in tests  
let mockTimeOffset = 0;

Date.now = jest.fn(() => {
  const baseTime = 1640995200000; // 2022-01-01T00:00:00Z
  return baseTime + mockTimeOffset;
});

// Utility to advance mock time
export const advanceTime = (ms: number) => {
  mockTimeOffset += ms;
};

export const resetTime = () => {
  mockTimeOffset = 0;
};

// ============================================================================
// TEST ISOLATION HELPERS
// ============================================================================

/**
 * Ensures complete isolation between tests
 */
export const isolateTest = () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    
    // Reset time
    resetTime();
    
    // Clear environment variables that might affect tests
    const testEnvVars = [
      'BUILD_ID',
      'BUILD_NUMBER',
      'TEMP_BUILD_DIR',
      'MOCK_NETWORK_FAILURE',
      'MOCK_FILE_SYSTEM_ERROR',
      'CHAOS_INJECTION_ACTIVE'
    ];
    
    testEnvVars.forEach(envVar => {
      delete process.env[envVar];
    });
    
    // Reset global state
    resetGlobalTestState();
  });

  afterEach(() => {
    // Cleanup any test artifacts
    cleanupTestArtifacts();
    
    // Verify no test pollution
    verifyTestIsolation();
  });
};

/**
 * Reset any global state that might affect tests
 */
const resetGlobalTestState = () => {
  // Clear any cached modules (if needed)
  Object.keys(require.cache).forEach(key => {
    if (key.includes('__tests__') || key.includes('test-data')) {
      delete require.cache[key];
    }
  });
  
  // Reset any global variables used in tests
  if (typeof (global as any).__TEST_STATE__ !== 'undefined') {
    (global as any).__TEST_STATE__ = {};
  }
  
  if (typeof global.__PERFORMANCE_RESULTS__ !== 'undefined') {
    global.__PERFORMANCE_RESULTS__ = [];
  }
};

/**
 * Cleanup test artifacts and temporary data
 */
const cleanupTestArtifacts = () => {
  // This would typically clean up any files, network connections,
  // or other resources created during testing
  
  // Reset any pending timers
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  
  // Force garbage collection if available
  if (typeof global.gc === 'function') {
    global.gc();
  }
};

/**
 * Verify that tests haven't polluted global state
 */
const verifyTestIsolation = () => {
  const warnings: string[] = [];
  
  // Check for unexpected global variables
  const expectedGlobals = new Set([
    'global', 'process', 'Buffer', 'console', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate',
    '__dirname', '__filename', 'module', 'require', 'exports',
    'jest', 'expect', 'describe', 'it', 'test', 'beforeAll', 'afterAll',
    'beforeEach', 'afterEach', 'performance', '__DEV__', '__PLATFORM__',
    '__METRO_GLOBAL_PREFIX__', 'crypto', '__PERFORMANCE_BASELINE__',
    '__PERFORMANCE_RESULTS__', '__TEST_STATE__'
  ]);
  
  Object.keys(global).forEach(key => {
    if (!expectedGlobals.has(key) && !key.startsWith('Symbol(')) {
      warnings.push(`Unexpected global variable: ${key}`);
    }
  });
  
  // Check for memory leaks (basic check)
  const memoryUsage = process.memoryUsage();
  const memoryThreshold = 100 * 1024 * 1024; // 100MB
  
  if (memoryUsage.heapUsed > memoryThreshold) {
    warnings.push(`High memory usage detected: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  }
  
  // Log warnings but don't fail tests (helps with debugging)
  if (warnings.length > 0) {
    console.warn('⚠️ Test hygiene warnings:', warnings);
  }
};

// ============================================================================
// DETERMINISTIC HELPERS
// ============================================================================

/**
 * Create deterministic test data
 */
export const createDeterministicTestData = () => {
  const seed = parseInt(process.env.PROPERTY_TEST_SEED || '42', 10);
  let counter = seed;
  
  return {
    randomInt: (min: number = 0, max: number = 1000) => {
      counter = (counter * 1103515245 + 12345) % (2 ** 31);
      return min + (Math.abs(counter) % (max - min + 1));
    },
    
    randomString: (length: number = 8) => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        counter = (counter * 1103515245 + 12345) % (2 ** 31);
        result += chars[Math.abs(counter) % chars.length];
      }
      return result;
    },
    
    randomBuildId: () => {
      return `build-${counter}-${Date.now()}`;
    },
    
    randomPlatform: () => {
      const platforms = ['android', 'ios'] as const;
      counter = (counter * 1103515245 + 12345) % (2 ** 31);
      return platforms[Math.abs(counter) % platforms.length];
    }
  };
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Monitor test performance and detect regressions
 */
export const monitorTestPerformance = () => {
  const testTimes = new Map<string, number[]>();
  let currentTestStart: number;
  
  beforeEach(() => {
    currentTestStart = performance.now();
  });
  
  afterEach(() => {
    const duration = performance.now() - currentTestStart;
    const testName = expect.getState().currentTestName || 'unknown';
    
    if (!testTimes.has(testName)) {
      testTimes.set(testName, []);
    }
    
    testTimes.get(testName)!.push(duration);
    
    // Detect performance regressions
    const times = testTimes.get(testName)!;
    if (times.length >= 3) {
      const recent = times.slice(-3);
      const average = recent.reduce((a, b) => a + b, 0) / recent.length;
      
      // Warn if test is taking significantly longer
      if (duration > average * 2 && duration > 1000) {
        console.warn(
          `⚠️ Performance regression detected in ${testName}: ` +
          `${Math.round(duration)}ms vs avg ${Math.round(average)}ms`
        );
      }
    }
    
    // Warn about slow tests
    const slowTestThreshold = parseInt(process.env.SLOW_TEST_THRESHOLD || '5000', 10);
    if (duration > slowTestThreshold) {
      console.warn(
        `⚠️ Slow test detected: ${testName} took ${Math.round(duration)}ms`
      );
    }
  });
  
  afterAll(() => {
    // Report performance summary
    if (testTimes.size > 0) {
      console.log('\n📊 Test Performance Summary:');
      Array.from(testTimes.entries())
        .sort(([, a], [, b]) => {
          const avgA = a.reduce((sum, time) => sum + time, 0) / a.length;
          const avgB = b.reduce((sum, time) => sum + time, 0) / b.length;
          return avgB - avgA;
        })
        .slice(0, 5) // Top 5 slowest tests
        .forEach(([name, times]) => {
          const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          const max = Math.round(Math.max(...times));
          console.log(`  ${name}: avg ${avg}ms, max ${max}ms (${times.length} runs)`);
        });
    }
  });
};

// ============================================================================
// FLAKY TEST DETECTION
// ============================================================================

/**
 * Detect potentially flaky tests based on inconsistent behavior
 */
export const detectFlakyTests = () => {
  const testResults = new Map<string, Array<{ success: boolean, duration: number }>>();
  
  afterEach(() => {
    const testName = expect.getState().currentTestName || 'unknown';
    const testState = expect.getState();
    const success = !testState.suppressedErrors?.length;
    const duration = performance.now();
    
    if (!testResults.has(testName)) {
      testResults.set(testName, []);
    }
    
    testResults.get(testName)!.push({ success, duration });
    
    // Analyze flakiness after multiple runs
    const results = testResults.get(testName)!;
    if (results.length >= 10) {
      const successRate = results.filter(r => r.success).length / results.length;
      const durations = results.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((acc, d) => acc + Math.pow(d - avgDuration, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgDuration;
      
      // Flag potentially flaky tests
      if (successRate < 0.95 || successRate > 0.05) {
        console.warn(
          `⚠️ Potentially flaky test detected: ${testName} ` +
          `(success rate: ${Math.round(successRate * 100)}%)`
        );
      }
      
      if (coefficientOfVariation > 0.5) {
        console.warn(
          `⚠️ Inconsistent test timing: ${testName} ` +
          `(CV: ${Math.round(coefficientOfVariation * 100)}%)`
        );
      }
    }
  });
};

// ============================================================================
// RESOURCE LEAK DETECTION
// ============================================================================

/**
 * Monitor for resource leaks during testing
 */
export const detectResourceLeaks = () => {
  let initialHandles: number;
  let initialMemory: NodeJS.MemoryUsage;
  
  beforeEach(() => {
    if (process.getActiveResourcesInfo) {
      initialHandles = process.getActiveResourcesInfo().length;
    }
    initialMemory = process.memoryUsage();
  });
  
  afterEach(() => {
    const testName = expect.getState().currentTestName || 'unknown';
    
    // Check for handle leaks
    if (process.getActiveResourcesInfo) {
      const finalHandles = process.getActiveResourcesInfo().length;
      const handleLeak = finalHandles - initialHandles;
      
      if (handleLeak > 0) {
        console.warn(
          `⚠️ Potential handle leak in ${testName}: +${handleLeak} handles`
        );
      }
    }
    
    // Check for memory leaks
    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryLeakThreshold = 10 * 1024 * 1024; // 10MB
    
    if (memoryGrowth > memoryLeakThreshold) {
      console.warn(
        `⚠️ Potential memory leak in ${testName}: ` +
        `+${Math.round(memoryGrowth / 1024 / 1024)}MB`
      );
    }
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export const testHygiene = {
  isolateTest,
  createDeterministicTestData,
  monitorTestPerformance,
  detectFlakyTests,
  detectResourceLeaks,
  advanceTime,
  resetTime
};