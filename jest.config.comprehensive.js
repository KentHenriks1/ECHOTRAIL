const { defaults } = require('jest-config');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/testSetup.config.ts',
    '@testing-library/jest-native/extend-expect'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/react-native)'
  ],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/**/index.ts',
    '!src/types/**',
    '!src/constants/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  testEnvironment: 'node',
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest'
  },
  testTimeout: 30000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  bail: false,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  roots: ['<rootDir>/src'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFiles: [
    '<rootDir>/src/__tests__/setup/mockSetup.ts'
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-reports',
      outputName: 'junit.xml',
      suiteName: 'EchoTrail Test Suite'
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-reports',
      filename: 'test-report.html',
      pageTitle: 'EchoTrail Test Results',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  testResultsProcessor: '<rootDir>/src/__tests__/utils/testResultsProcessor.js'
};