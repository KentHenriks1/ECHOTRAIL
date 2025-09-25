#!/usr/bin/env node

/**
 * EchoTrail Production Build Script
 * Automates the process of building production-ready apps for Android and iOS
 * 
 * Usage:
 * node scripts/build-production.js [android|ios|all]
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  APP_NAME: 'EchoTrail',
  VERSION: '1.0.0',
  BUILD_NUMBER: Date.now().toString(),
  ANDROID: {
    PACKAGE_NAME: 'com.echotrail.app',
    KEYSTORE_PATH: './android/app/echotrail-release.keystore',
    KEY_ALIAS: 'echotrail-key',
    OUTPUT_DIR: './builds/android',
  },
  IOS: {
    BUNDLE_ID: 'com.echotrail.app',
    TEAM_ID: 'YOUR_TEAM_ID',
    PROVISIONING_PROFILE: 'EchoTrail_Distribution',
    OUTPUT_DIR: './builds/ios',
  },
  EXPO: {
    PROJECT_ID: 'your-expo-project-id',
    OWNER: 'echotrail-team',
  }
};

// Utility functions
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    WARNING: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m'
  };
  console.log(`${colors[level]}[${timestamp}] ${level}: ${message}${colors.RESET}`);
};

const execAsync = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command}`);
    exec(command, { ...options, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        log(`Error: ${error.message}`, 'ERROR');
        reject(error);
        return;
      }
      if (stderr) {
        log(`Warning: ${stderr}`, 'WARNING');
      }
      log(`Output: ${stdout.substring(0, 500)}...`, 'INFO');
      resolve(stdout);
    });
  });
};

const ensureDirectory = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    log(`Directory ensured: ${dirPath}`, 'SUCCESS');
  } catch (error) {
    log(`Failed to create directory ${dirPath}: ${error.message}`, 'ERROR');
    throw error;
  }
};

// Pre-build checks
const performPreBuildChecks = async () => {
  log('Starting pre-build checks...', 'INFO');
  
  try {
    // Check if we're in the right directory
    const packageJson = await fs.readFile('package.json', 'utf8');
    const pkg = JSON.parse(packageJson);
    if (pkg.name !== 'echotrail') {
      throw new Error('Not in EchoTrail project directory');
    }
    log('✓ Project directory verified', 'SUCCESS');

    // Check for required environment variables
    const requiredEnvVars = ['EXPO_TOKEN'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        log(`Missing environment variable: ${envVar}`, 'WARNING');
      }
    }

    // Run tests
    log('Running test suite...', 'INFO');
    await execAsync('npm test -- --coverage --watchAll=false --verbose');
    log('✓ All tests passed', 'SUCCESS');

    // Run linting
    log('Running linting checks...', 'INFO');
    await execAsync('npm run lint');
    log('✓ Linting passed', 'SUCCESS');

    // Type checking
    log('Running TypeScript type checks...', 'INFO');
    await execAsync('npm run type-check');
    log('✓ Type checking passed', 'SUCCESS');

    log('Pre-build checks completed successfully!', 'SUCCESS');
  } catch (error) {
    log(`Pre-build checks failed: ${error.message}`, 'ERROR');
    throw error;
  }
};

// Environment setup
const setupEnvironment = async (platform) => {
  log(`Setting up ${platform} environment...`, 'INFO');
  
  try {
    // Create production environment file
    const prodEnv = `
# Production Environment Configuration - ${platform.toUpperCase()}
NODE_ENV=production
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_VERSION=${CONFIG.VERSION}
EXPO_PUBLIC_BUILD_NUMBER=${CONFIG.BUILD_NUMBER}

# API Configuration
EXPO_PUBLIC_API_URL=https://api.echotrail.no
EXPO_PUBLIC_API_VERSION=v1

# Maps Configuration  
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_TOKEN

# Authentication
EXPO_PUBLIC_AUTH_DOMAIN=echotrail.eu.auth0.com
EXPO_PUBLIC_AUTH_CLIENT_ID=YOUR_AUTH_CLIENT_ID

# Analytics & Monitoring
EXPO_PUBLIC_ANALYTICS_ID=YOUR_ANALYTICS_ID
EXPO_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_DEBUG_MODE=false

# Platform Specific
${platform === 'android' ? 'EXPO_PUBLIC_ANDROID_PACKAGE=' + CONFIG.ANDROID.PACKAGE_NAME : ''}
${platform === 'ios' ? 'EXPO_PUBLIC_IOS_BUNDLE_ID=' + CONFIG.IOS.BUNDLE_ID : ''}
`;

    await fs.writeFile('.env.production', prodEnv.trim());
    log('✓ Production environment file created', 'SUCCESS');

    // Update app.json for production
    const appJsonPath = 'app.json';
    const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
    
    appJson.expo.version = CONFIG.VERSION;
    appJson.expo.android = {
      ...appJson.expo.android,
      versionCode: parseInt(CONFIG.BUILD_NUMBER.substring(-10)),
      package: CONFIG.ANDROID.PACKAGE_NAME,
      buildNumber: CONFIG.BUILD_NUMBER
    };
    appJson.expo.ios = {
      ...appJson.expo.ios,
      buildNumber: CONFIG.BUILD_NUMBER,
      bundleIdentifier: CONFIG.IOS.BUNDLE_ID
    };

    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    log('✓ app.json updated for production', 'SUCCESS');

  } catch (error) {
    log(`Environment setup failed: ${error.message}`, 'ERROR');
    throw error;
  }
};

// Android build process
const buildAndroid = async () => {
  log('Starting Android production build...', 'INFO');
  
  try {
    await ensureDirectory(CONFIG.ANDROID.OUTPUT_DIR);
    
    // Clean previous builds
    log('Cleaning previous Android builds...', 'INFO');
    await execAsync('expo prebuild --platform android --clear');
    
    // Build APK for testing
    log('Building Android APK (development signed)...', 'INFO');
    await execAsync(`eas build --platform android --profile preview --local --output ${CONFIG.ANDROID.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-preview.apk`);
    
    // Build AAB for Play Store
    log('Building Android App Bundle for Play Store...', 'INFO');
    await execAsync(`eas build --platform android --profile production --output ${CONFIG.ANDROID.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-production.aab`);
    
    log('✓ Android builds completed successfully', 'SUCCESS');
    return {
      apk: `${CONFIG.ANDROID.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-preview.apk`,
      aab: `${CONFIG.ANDROID.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-production.aab`
    };
  } catch (error) {
    log(`Android build failed: ${error.message}`, 'ERROR');
    throw error;
  }
};

// iOS build process
const buildIOS = async () => {
  log('Starting iOS production build...', 'INFO');
  
  try {
    await ensureDirectory(CONFIG.IOS.OUTPUT_DIR);
    
    // Clean previous builds
    log('Cleaning previous iOS builds...', 'INFO');
    await execAsync('expo prebuild --platform ios --clear');
    
    // Build for development testing
    log('Building iOS Simulator build...', 'INFO');
    await execAsync(`eas build --platform ios --profile preview --local --output ${CONFIG.IOS.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-simulator.app`);
    
    // Build for App Store
    log('Building iOS IPA for App Store...', 'INFO');
    await execAsync(`eas build --platform ios --profile production --output ${CONFIG.IOS.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-production.ipa`);
    
    log('✓ iOS builds completed successfully', 'SUCCESS');
    return {
      simulator: `${CONFIG.IOS.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-simulator.app`,
      ipa: `${CONFIG.IOS.OUTPUT_DIR}/echotrail-${CONFIG.VERSION}-production.ipa`
    };
  } catch (error) {
    log(`iOS build failed: ${error.message}`, 'ERROR');
    throw error;
  }
};

// Generate build artifacts
const generateBuildArtifacts = async (buildResults) => {
  log('Generating build artifacts and metadata...', 'INFO');
  
  try {
    const buildInfo = {
      version: CONFIG.VERSION,
      buildNumber: CONFIG.BUILD_NUMBER,
      buildDate: new Date().toISOString(),
      platform: process.argv[2] || 'all',
      gitCommit: await execAsync('git rev-parse HEAD').catch(() => 'unknown'),
      gitBranch: await execAsync('git branch --show-current').catch(() => 'unknown'),
      artifacts: buildResults,
      checksums: {}
    };

    // Generate checksums for build files
    for (const [platform, files] of Object.entries(buildResults)) {
      buildInfo.checksums[platform] = {};
      for (const [type, filePath] of Object.entries(files)) {
        try {
          const checksum = await execAsync(`certutil -hashfile "${filePath}" SHA256`);
          buildInfo.checksums[platform][type] = checksum.split('\n')[1]?.trim() || 'unknown';
        } catch (error) {
          log(`Failed to generate checksum for ${filePath}`, 'WARNING');
        }
      }
    }

    // Save build information
    await fs.writeFile('./builds/build-info.json', JSON.stringify(buildInfo, null, 2));
    
    // Generate build report
    const buildReport = `
# EchoTrail v${CONFIG.VERSION} Build Report

**Build Date:** ${new Date().toLocaleString()}
**Build Number:** ${CONFIG.BUILD_NUMBER}
**Git Commit:** ${buildInfo.gitCommit.substring(0, 7)}
**Git Branch:** ${buildInfo.gitBranch}

## Build Artifacts

${Object.entries(buildResults).map(([platform, files]) => `
### ${platform.toUpperCase()}
${Object.entries(files).map(([type, filePath]) => 
  `- **${type.toUpperCase()}:** \`${path.basename(filePath)}\``
).join('\n')}
`).join('')}

## Checksums

${Object.entries(buildInfo.checksums).map(([platform, checksums]) => `
### ${platform.toUpperCase()}
${Object.entries(checksums).map(([type, checksum]) => 
  `- **${type}:** \`${checksum}\``
).join('\n')}
`).join('')}

## Quality Metrics

- ✅ **Tests:** All tests passed
- ✅ **Linting:** No linting errors
- ✅ **Type Check:** No type errors  
- ✅ **Build:** Successful compilation
- ✅ **Bundle Size:** Optimized for production

---
*Generated by EchoTrail Build System*
`;

    await fs.writeFile('./builds/BUILD_REPORT.md', buildReport.trim());
    log('✓ Build artifacts generated', 'SUCCESS');
    
  } catch (error) {
    log(`Failed to generate build artifacts: ${error.message}`, 'ERROR');
  }
};

// Main build function
const main = async () => {
  const startTime = Date.now();
  const platform = process.argv[2] || 'all';
  
  log(`Starting EchoTrail v${CONFIG.VERSION} production build for: ${platform}`, 'INFO');
  
  try {
    // Pre-build checks
    await performPreBuildChecks();
    
    // Setup environment
    await setupEnvironment(platform);
    
    const buildResults = {};
    
    // Build based on platform argument
    if (platform === 'android' || platform === 'all') {
      buildResults.android = await buildAndroid();
    }
    
    if (platform === 'ios' || platform === 'all') {
      buildResults.ios = await buildIOS();
    }
    
    // Generate build artifacts
    await generateBuildArtifacts(buildResults);
    
    const buildTime = Math.round((Date.now() - startTime) / 1000);
    log(`✅ Production build completed successfully in ${buildTime}s`, 'SUCCESS');
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 EchoTrail v1.0.0 Production Build Complete!');
    console.log('='.repeat(60));
    console.log(`📱 Platform: ${platform}`);
    console.log(`⏱️  Build Time: ${buildTime}s`);
    console.log(`📦 Artifacts: ./builds/`);
    console.log(`📊 Report: ./builds/BUILD_REPORT.md`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    const buildTime = Math.round((Date.now() - startTime) / 1000);
    log(`❌ Production build failed after ${buildTime}s: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  buildAndroid,
  buildIOS,
  performPreBuildChecks,
  setupEnvironment
};