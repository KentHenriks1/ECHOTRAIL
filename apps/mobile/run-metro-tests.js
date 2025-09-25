#!/usr/bin/env node

/**
 * Metro Optimization Test Runner for EchoTrail
 * 
 * Simple Node.js script to run the comprehensive Metro optimization test suite.
 * This script will validate all Metro optimization components in your environment.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 EchoTrail Metro Optimization Test Runner');
console.log('==========================================\n');

// Check if we're in a React Native project
function checkProjectEnvironment() {
  console.log('🔍 Checking project environment...');
  
  const requiredFiles = [
    'package.json',
    'metro.config.js',
    'android',
    'ios',
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.log(`⚠️  Missing files/directories: ${missingFiles.join(', ')}`);
    console.log('   This might not be a React Native project root.');
    console.log('   Tests may still run but some functionality might be limited.\n');
  } else {
    console.log('✅ React Native project environment detected\n');
  }
  
  // Check for Node.js and npm
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`📦 Node.js: ${nodeVersion}`);
    console.log(`📦 npm: ${npmVersion}\n`);
  } catch (error) {
    console.log('❌ Node.js or npm not found in PATH');
    process.exit(1);
  }
}

// Install dependencies if needed
function checkDependencies() {
  console.log('📋 Checking dependencies...');
  
  try {
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
    } else {
      console.log('✅ Dependencies already installed');
    }
  } catch (error) {
    console.log('❌ Failed to install dependencies:', error.message);
    console.log('   Please run "npm install" manually and try again.');
    process.exit(1);
  }
  
  console.log('');
}

// Compile TypeScript if needed
function compileTypeScript() {
  console.log('🔨 Checking TypeScript compilation...');
  
  try {
    // Check if TypeScript is available
    const hasTypeScript = fs.existsSync('tsconfig.json');
    
    if (hasTypeScript) {
      console.log('📝 TypeScript project detected');
      
      // Try to compile (if tsc is available)
      try {
        execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
        console.log('✅ TypeScript compilation check passed');
      } catch (tscError) {
        console.log('⚠️  TypeScript compilation warnings (continuing with tests)');
        // Don't exit - tests might still work
      }
    } else {
      console.log('📝 JavaScript project (no TypeScript config found)');
    }
  } catch (error) {
    console.log('⚠️  TypeScript check failed (continuing with tests)');
  }
  
  console.log('');
}

// Run the actual test suite
async function runTestSuite() {
  console.log('🧪 Starting Metro Optimization Test Suite...');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    // Import and run the test suite
    const testSuitePath = path.resolve('src/core/testing/MetroOptimizationTestSuite.ts');
    
    if (!fs.existsSync(testSuitePath)) {
      console.log('❌ Test suite file not found at:', testSuitePath);
      console.log('   Expected location: src/core/testing/MetroOptimizationTestSuite.ts');
      process.exit(1);
    }
    
    // Use ts-node to run TypeScript directly, or compile first
    let command;
    let args;
    
    try {
      // Try ts-node first
      execSync('npx ts-node --version', { stdio: 'pipe' });
      command = 'npx';
      args = ['ts-node', '--transpile-only', testSuitePath];
      console.log('🔧 Using ts-node for TypeScript execution\n');
    } catch (tsNodeError) {
      // Fall back to tsc compilation
      console.log('📝 ts-node not available, compiling TypeScript first...');
      
      try {
        execSync('npx tsc', { stdio: 'inherit' });
        const compiledPath = testSuitePath.replace('.ts', '.js').replace('/src/', '/dist/');
        
        if (fs.existsSync(compiledPath)) {
          command = 'node';
          args = [compiledPath];
        } else {
          throw new Error('Compiled JavaScript file not found');
        }
      } catch (compileError) {
        console.log('❌ Failed to compile TypeScript:', compileError.message);
        console.log('   Please ensure TypeScript is properly configured.');
        process.exit(1);
      }
    }
    
    // Execute the test suite
    const testProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });
    
    testProcess.on('close', (code) => {
      console.log(`\n🏁 Test suite completed with exit code: ${code}`);
      
      if (code === 0) {
        console.log('🎉 All tests completed successfully!');
        console.log('\n📊 Check the test-reports/ directory for detailed results.');
      } else {
        console.log('⚠️  Some tests failed or encountered errors.');
        console.log('   Review the output above for details.');
      }
      
      process.exit(code);
    });
    
    testProcess.on('error', (error) => {
      console.log('❌ Failed to run test suite:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.log('❌ Error setting up test execution:', error.message);
    process.exit(1);
  }
}

// Create test reports directory
function ensureReportsDirectory() {
  const reportsDir = 'test-reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    console.log(`📁 Created ${reportsDir}/ directory for test reports\n`);
  }
}

// Main execution flow
async function main() {
  try {
    checkProjectEnvironment();
    checkDependencies();
    compileTypeScript();
    ensureReportsDirectory();
    await runTestSuite();
  } catch (error) {
    console.log('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node run-metro-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --version, -v  Show version information');
  console.log('');
  console.log('This script runs the comprehensive Metro optimization test suite.');
  console.log('It will validate all Metro optimization components and generate detailed reports.');
  console.log('');
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('EchoTrail Metro Optimization Test Runner v1.0.0');
  process.exit(0);
}

// Run the main function
main().catch(console.error);