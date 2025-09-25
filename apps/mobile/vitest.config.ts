/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // Fix ESM issues
    deps: {
      inline: [
        /react-native/,
        /@react-native/,
        /@react-native-community/,
        /@testing-library\/react-native/,
        /react-native-.*/,
        /@react-navigation/,
        /expo/,
        /@expo/,
        /^react$/,
        /^react-dom$/,
      ],
      external: ['react-native'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '*.config.*',
        'android/',
        'ios/',
        '.expo/',
        'dist/',
        'build/',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    testTimeout: 60000, // 60 seconds for database/container tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    pool: 'forks',
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'android/',
      'ios/',
      '.expo/',
      'dist/',
      'build/',
    ]
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});