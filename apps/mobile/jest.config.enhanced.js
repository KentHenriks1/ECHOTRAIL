/**
 * Enhanced Jest Configuration with Strict Coverage Gates
 * 
 * This configuration implements:
 * - Strict coverage thresholds that must be met
 * - JUnit XML reporting for CI integration
 * - Cobertura coverage reports
 * - Performance regression detection
 * - Mutation testing preparation
 */

module.exports = {
  // Base configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test discovery
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@echotrail/(.*)$': '<rootDir>/src/$1'
  },
  
  // TypeScript configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  
  // Coverage configuration with STRICT gates
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__benchmarks__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.{ts,tsx}',
    '!src/**/index.{ts,tsx}', // Usually just exports
    '!src/**/*.stories.{ts,tsx}',
    '!src/types/**', // Type definitions
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief console summary
    'html',          // HTML report for browsing
    'lcov',          // For external tools (SonarQube, etc.)
    'cobertura',     // For Azure DevOps, Jenkins
    'json',          // Machine-readable format
    'json-summary'   // Brief machine-readable summary
  ],
  
  // STRICT coverage thresholds - these will FAIL the build if not met
  coverageThreshold: {
    global: {
      branches: 85,      // 85% branch coverage required
      functions: 90,     // 90% function coverage required
      lines: 90,         // 90% line coverage required  
      statements: 90     // 90% statement coverage required
    },
    
    // EXTRA STRICT requirements for critical automation code
    './src/core/automation/errorHandler.ts': {
      lines: 95,
      functions: 95,
      branches: 90,
      statements: 95
    },
    
    './src/core/automation/errors.ts': {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90
    },
    
    './src/core/automation/MetroBuildPipeline.ts': {
      lines: 85,
      functions: 90,
      branches: 80,
      statements: 85
    },
    
    // Performance-critical utilities
    './src/core/automation/pipelineUtils.ts': {
      lines: 95,
      functions: 95,
      branches: 90,
      statements: 95
    }
  },
  
  // Reporters for CI integration
  reporters: [
    'default',
    
    // JUnit XML for CI systems (Jenkins, Azure DevOps, GitHub Actions)
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'junit.xml',
      uniqueOutputName: false,
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
      suiteNameTemplate: '{filepath}',
      addFileAttribute: true
    }],
    
    // HTML report for human-readable results
    ['jest-html-reporters', {
      publicPath: 'reports/html',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'EchoTrail Mobile Test Report',
      logoImgPath: undefined,
      inlineSource: true
    }]
  ],
  
  // Performance and timeout settings
  testTimeout: 60000,           // 60 second timeout for tests
  slowTestThreshold: 5000,      // Mark tests >5s as slow
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.ts'
  ],
  
  // Global test environment setup
  globalSetup: '<rootDir>/src/__tests__/setup/jest.globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/jest.globalTeardown.ts',
  
  // Test result caching (speeds up subsequent runs)
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Snapshot testing
  snapshotSerializers: [
    'jest-snapshot-serializer-raw'
  ],
  
  // Watch mode configuration (for development)
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/reports/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Test execution
  maxWorkers: process.env.CI ? 2 : '50%', // Conservative in CI, aggressive locally
  workerIdleMemoryLimit: '512MB',
  
  // Fail fast in CI but continue locally for better developer experience  
  bail: process.env.CI ? 1 : false,
  
  // Detailed error output
  verbose: true,
  
  // Mock configuration
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  
  // Module mocking
  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],
  
  // Force exit after tests (prevents hanging)
  forceExit: process.env.CI ? true : false,
  
  // Detect open handles (memory leaks)
  detectOpenHandles: true,
  
  // Performance monitoring
  logHeapUsage: process.env.CI ? true : false,
  
  // Test environment variables
  setupFiles: [
    '<rootDir>/src/__tests__/setup/jest.env.ts'
  ],
  
  // Custom test environments for specific tests
  projects: [
    // Default configuration for most tests
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx)'
      ],
      testPathIgnorePatterns: [
        'integration.test',
        'chaos.test', 
        'property.test',
        'performance.test'
      ]
    },
    
    // Property-based tests (fast-check)
    {
      displayName: 'property-based',
      testMatch: [
        '<rootDir>/src/**/*.property.test.(ts|tsx)'
      ],
      testTimeout: 120000, // Property tests can take longer
      slowTestThreshold: 10000
    },
    
    // Chaos engineering tests
    {
      displayName: 'chaos',
      testMatch: [
        '<rootDir>/src/**/*.chaos.test.(ts|tsx)'
      ],
      testTimeout: 180000, // Chaos tests can be very slow
      slowTestThreshold: 30000,
      maxWorkers: 1 // Run chaos tests sequentially
    },
    
    // Integration tests
    {
      displayName: 'integration', 
      testMatch: [
        '<rootDir>/src/**/*.integration.test.(ts|tsx)'
      ],
      testTimeout: 300000, // 5 minutes for integration tests
      slowTestThreshold: 60000,
      maxWorkers: 1 // Sequential execution for integration
    },
    
    // Performance regression tests
    {
      displayName: 'performance',
      testMatch: [
        '<rootDir>/src/**/*.performance.test.(ts|tsx)'
      ],
      testTimeout: 600000, // 10 minutes for performance tests
      slowTestThreshold: 120000,
      maxWorkers: 1, // Must run sequentially for accurate timing
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup/performance.setup.ts'
      ]
    }
  ]
};