/**
 * Jest Environment Setup
 * 
 * This file sets up environment variables and global configurations
 * that need to be available before any tests run.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CI = process.env.CI || 'false';

// Metro build pipeline test environment
process.env.METRO_TEST_MODE = 'true';
process.env.METRO_CACHE_DISABLED = 'true';
process.env.METRO_DISABLE_WATCHER = 'true';

// Mock environment for automation pipeline
process.env.BUILD_HISTORY_PATH = './test-data/build-history.json';
process.env.TEMP_DIR = './tmp/test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Performance testing environment
process.env.PERF_TEST_ITERATIONS = '10';
process.env.PERF_TIMEOUT_MS = '30000';

// CI integration test settings
process.env.GITHUB_ACTIONS = 'false';
process.env.JENKINS_URL = '';
process.env.GITLAB_CI = 'false';

// Mock external service endpoints for tests
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test/mock';
process.env.TEAMS_WEBHOOK_URL = 'https://outlook.office.com/test/mock';

// Database and file system mocking
process.env.USE_MOCK_FS = 'true';
process.env.MOCK_DB_PATH = ':memory:';

// Error handling test configuration
process.env.MAX_RETRY_ATTEMPTS = '3';
process.env.RETRY_DELAY_MS = '100';
process.env.ERROR_RECOVERY_ENABLED = 'true';

// Performance and memory limits for tests
process.env.MAX_MEMORY_MB = '512';
process.env.TEST_TIMEOUT_MS = '60000';

// Chaos testing configuration
process.env.CHAOS_FAILURE_RATE = '0.1';
process.env.CHAOS_NETWORK_DELAY = '100';
process.env.CHAOS_DISK_FAILURE_RATE = '0.05';

// Property-based testing configuration
process.env.PROPERTY_TEST_RUNS = '100';
process.env.PROPERTY_TEST_SEED = '42';

// Mock React Native modules that don't exist in Node.js
(global as any).__DEV__ = false;

// Mock platform detection
(global as any).__PLATFORM__ = 'test';

// Mock Metro bundler globals
(global as any).__METRO_GLOBAL_PREFIX__ = '__metro_test__';

// Setup console formatting for test output
if (process.env.CI === 'true') {
  // In CI, ensure clean output
  process.env.FORCE_COLOR = '0';
} else {
  // Locally, enable colors for better readability
  process.env.FORCE_COLOR = '1';
}

// Mock crypto for deterministic tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-12345',
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock performance APIs
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
  },
});

// Mock timers for deterministic testing
jest.useFakeTimers({
  advanceTimers: true,
  doNotFake: [
    'setTimeout', // Keep real setTimeout for some async operations
    'Date', // Keep real Date for test timing
  ],
});

// Global error handler for uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in test:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in test:', reason);
  process.exit(1);
});