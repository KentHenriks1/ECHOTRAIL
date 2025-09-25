/**
 * Jest Configuration - Enterprise Edition
 * Comprehensive testing pipeline with performance and quality gates
 */

module.exports = {
  // Extend base configuration
  ...require('./jest.config.js'),

  // Enterprise test collection patterns
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**',
    '!**/*.stories.{ts,tsx}',
  ],

  // Coverage thresholds for quality gates
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Service-specific thresholds
    'src/services/**/*.{ts,tsx}': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // Core utilities threshold
    'src/core/**/*.{ts,tsx}': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Test categorization
  projects: [
    // Unit Tests
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/src/**/*.test.{ts,tsx}',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/**/__tests__/integration/',
        '<rootDir>/src/**/__tests__/e2e/',
        '<rootDir>/src/**/__tests__/performance/',
      ],
      coverageReporters: ['text', 'lcov', 'html'],
      coverageDirectory: '<rootDir>/coverage/unit',
    },

    // Integration Tests
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/**/__tests__/integration/**/*.test.{ts,tsx}',
        '<rootDir>/src/**/*.integration.test.{ts,tsx}',
      ],
      coverageDirectory: '<rootDir>/coverage/integration',
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.ts',
        '<rootDir>/src/__tests__/setup/integration.setup.ts',
      ],
      testTimeout: 30000, // Longer timeout for integration tests
    },

    // Performance Tests
    {
      displayName: 'performance',
      testMatch: [
        '<rootDir>/src/**/__tests__/performance/**/*.test.{ts,tsx}',
        '<rootDir>/src/**/*.performance.test.{ts,tsx}',
      ],
      coverageDirectory: '<rootDir>/coverage/performance',
      testTimeout: 60000, // Extended timeout for performance tests
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.ts',
        '<rootDir>/src/__tests__/setup/performance.setup.ts',
      ],
    },
  ],

  // Quality gates and reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/reports',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'EchoTrail Mobile - Test Report',
        logoImgPath: undefined,
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        theme: 'darkTheme',
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage/reports',
        outputName: 'junit-report.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        addFileAttribute: 'true',
        includeConsoleOutput: 'true',
      },
    ],
    [
      '@jest/reporters',
      {
        // Custom performance reporter
        customReporter: './src/__tests__/setup/performance-reporter.js',
      },
    ],
  ],

  // Test environment configuration
  globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',

  // Extended timeout for CI environments
  testTimeout: process.env.CI ? 30000 : 10000,

  // Fail fast configuration for CI
  bail: process.env.CI ? 1 : 0,

  // Verbose output in CI
  verbose: !!process.env.CI,

  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    [
      'jest-watch-select-projects',
      {
        key: 'P',
        description: 'select test projects to run',
        prompt: 'Please select the projects to run',
      },
    ],
  ],

  // Advanced configuration for CI/CD
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  resetModules: true,

  // Memory management for large test suites
  maxWorkers: process.env.CI ? 2 : '50%',
  workerIdleMemoryLimit: '512MB',

  // Error handling
  errorOnDeprecated: true,
  
  // Test result processing
  testResultsProcessor: '<rootDir>/src/__tests__/setup/results-processor.js',

  // Enterprise test setup (combined from duplicate keys)
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/enterprise.setup.ts',
    '<rootDir>/src/__tests__/setup/custom-matchers.ts',
  ],
}