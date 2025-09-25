import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'App.tsx',
    'index.js',
    'src/app/_layout.tsx',
    'src/app/index.tsx',
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    '**/*.config.{js,ts}',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  ignore: [
    // Build and config files
    'android/**',
    'ios/**', 
    '.expo/**',
    'dist/**',
    'build/**',
    'node_modules/**',
    
    // Legacy files that will be cleaned up
    '**/*.js',
    '!*.config.js',
    '!jest.config.js',
    '!metro.config.js',
    '!babel.config.js',
    
    // Development utility files
    'advanced-cleanup.js',
    'convert-inline-styles.js',
    'create-stubs.js',
    'fix-*.js',
    'mass-*.js',
    'remove-*.js',
    'test-*.js',
    'find-*.js',
    'comprehensive-*.js',
    
    // Documentation
    '**/*.md',
  ],
  ignoreBinaries: [
    'expo',
    'react-native',
    'metro',
    'jest',
  ],
  ignoreDependencies: [
    // React Native and Expo core
    'react-native',
    'expo',
    '@expo/vector-icons',
    'react',
    
    // Dev dependencies that might not be directly imported
    '@babel/core',
    '@babel/preset-env',
    '@babel/preset-react',
    '@babel/preset-typescript',
    'metro',
    'metro-config',
    
    // Testing
    'vitest',
    '@vitest/ui',
    '@testing-library/react-native',
    '@testing-library/jest-dom',
    'happy-dom',
    
    // Type definitions
    '@types/react',
    '@types/react-native',
    '@types/jest',
    
    // Build and development tools
    'prettier',
    'eslint',
    'typescript',
    'husky',
    'lint-staged',
  ],
  workspaces: {
    '.': {
      entry: [
        'App.tsx',
        'index.js',
        'src/app/_layout.tsx',
        'src/**/*.test.{ts,tsx}',
      ]
    }
  }
};

export default config;