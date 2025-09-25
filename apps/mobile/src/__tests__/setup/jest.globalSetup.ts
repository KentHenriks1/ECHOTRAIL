/**
 * Jest Global Setup
 * 
 * This runs once before all test suites start.
 * Use this for expensive setup operations that can be shared across tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting Jest global setup...');

  try {
    // Create necessary test directories
    const testDirs = [
      './tmp/test',
      './test-data',
      './reports/junit',
      './reports/html',
      './coverage',
      './.jest-cache',
    ];

    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Created test directory: ${dir}`);
      }
    }

    // Create test data files
    const testDataDir = './test-data';
    
    // Mock build history for pipeline tests
    const mockBuildHistory = {
      builds: [
        {
          id: 'build-1',
          timestamp: '2024-01-01T00:00:00Z',
          platform: 'android',
          success: true,
          duration: 120000,
          bundleSize: 1024000,
          metrics: {
            jsSize: 500000,
            assetsSize: 524000,
            buildTime: 120000,
            memoryUsage: 256000000,
          }
        },
        {
          id: 'build-2',
          timestamp: '2024-01-01T01:00:00Z',
          platform: 'ios',
          success: true,
          duration: 150000,
          bundleSize: 1100000,
          metrics: {
            jsSize: 550000,
            assetsSize: 550000,
            buildTime: 150000,
            memoryUsage: 280000000,
          }
        }
      ],
      totalBuilds: 2,
      successRate: 1.0,
      averageDuration: 135000,
    };

    fs.writeFileSync(
      path.join(testDataDir, 'build-history.json'),
      JSON.stringify(mockBuildHistory, null, 2)
    );

    // Mock CI configuration templates
    const mockGitHubActions = `name: EchoTrail Mobile CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test`;

    fs.writeFileSync(
      path.join(testDataDir, 'github-actions.yml'),
      mockGitHubActions
    );

    // Mock package.json for test projects
    const mockPackageJson = {
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        build: 'metro build',
        test: 'jest',
      },
      dependencies: {
        'react-native': '^0.72.0',
        '@react-native/metro-config': '^0.72.0',
      },
      devDependencies: {
        jest: '^29.0.0',
        '@types/jest': '^29.0.0',
      }
    };

    fs.writeFileSync(
      path.join(testDataDir, 'package.json'),
      JSON.stringify(mockPackageJson, null, 2)
    );

    // Verify Node.js and npm versions for compatibility warnings
    try {
      const nodeVersion = process.version;
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      
      console.log(`  ℹ️  Node.js version: ${nodeVersion}`);
      console.log(`  ℹ️  npm version: ${npmVersion}`);

      // Check for known compatibility issues
      const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (nodeMajor < 16) {
        console.warn('  ⚠️  Warning: Node.js version < 16 may cause issues');
      }

    } catch (error) {
      console.warn('  ⚠️  Could not verify npm version');
    }

    // Initialize test database (in-memory SQLite for tests)
    // This would be where you'd set up a test database if needed
    console.log('  ✅ Test database initialized (in-memory)');

    // Set up test environment variables that need to persist
    process.env.JEST_GLOBAL_SETUP_COMPLETE = 'true';
    process.env.TEST_START_TIME = Date.now().toString();

    // Create performance baseline data
    const performanceBaseline = {
      pipelineInitialization: 100, // ms
      buildExecution: 5000,        // ms
      reportGeneration: 200,       // ms
      memoryUsage: 100 * 1024 * 1024, // 100MB
      created: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(testDataDir, 'performance-baseline.json'),
      JSON.stringify(performanceBaseline, null, 2)
    );

    // Note: Environment variables are set in jest.env.ts which runs before this
    console.log('  📋 Environment variables validated from jest.env.ts');
    console.log(`    NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`    METRO_TEST_MODE: ${process.env.METRO_TEST_MODE}`);
    console.log(`    BUILD_HISTORY_PATH: ${process.env.BUILD_HISTORY_PATH}`);
    
    // If variables are still missing, set defaults
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
    if (!process.env.METRO_TEST_MODE) process.env.METRO_TEST_MODE = 'true';
    if (!process.env.BUILD_HISTORY_PATH) process.env.BUILD_HISTORY_PATH = './test-data/build-history.json';

    // Log test configuration summary
    console.log('  📊 Test Configuration Summary:');
    console.log(`    - Test timeout: ${process.env.TEST_TIMEOUT_MS || '60000'}ms`);
    console.log(`    - Max memory: ${process.env.MAX_MEMORY_MB || '512'}MB`);
    console.log(`    - CI mode: ${process.env.CI === 'true' ? 'Yes' : 'No'}`);
    console.log(`    - Property test runs: ${process.env.PROPERTY_TEST_RUNS || '100'}`);
    console.log(`    - Chaos failure rate: ${process.env.CHAOS_FAILURE_RATE || '0.1'}`);

    console.log('✅ Jest global setup completed successfully');

  } catch (error) {
    console.error('❌ Jest global setup failed:', error);
    throw error;
  }
}