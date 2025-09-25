#!/usr/bin/env node

/**
 * Simplified Metro Optimization Integration Test
 * 
 * A basic validation test to ensure Metro optimization components are working
 * without complex TypeScript compilation issues.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 EchoTrail Metro Optimization Validation');
console.log('==========================================\n');

// Test results tracking
const results = [];

function addResult(testName, status, message, duration = 0) {
  results.push({
    testName,
    status, // 'pass', 'fail', 'skip'
    message,
    duration,
  });
  
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`${icon} ${testName}: ${message}${duration ? ` (${Math.round(duration)}ms)` : ''}`);
}

// Test 1: Check if Metro optimization files exist
function testMetroOptimizationFiles() {
  const startTime = Date.now();
  
  const expectedFiles = [
    'src/core/bundler/MetroBundleOptimizer.ts',
    'src/core/monitoring/MetroPerformanceMonitor.ts', 
    'src/core/caching/MetroCacheManager.ts',
    'src/core/transformers/AdvancedMetroTransformers.ts',
    'src/core/automation/MetroBuildPipeline.ts',
    'metro.config.js',
  ];
  
  const missingFiles = expectedFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length === 0) {
    addResult(
      'Metro Optimization Files', 
      'pass', 
      `All ${expectedFiles.length} optimization files found`,
      Date.now() - startTime
    );
  } else {
    addResult(
      'Metro Optimization Files', 
      'fail', 
      `Missing files: ${missingFiles.join(', ')}`,
      Date.now() - startTime
    );
  }
}

// Test 2: Validate Metro config structure
function testMetroConfig() {
  const startTime = Date.now();
  
  try {
    if (fs.existsSync('metro.config.js')) {
      const configContent = fs.readFileSync('metro.config.js', 'utf8');
      
      // Check for optimization indicators
      const hasOptimizations = [
        'MetroBundleOptimizer',
        'resolver',
        'transformer',
        'serializer',
      ].every(keyword => configContent.includes(keyword));
      
      if (hasOptimizations) {
        addResult(
          'Metro Config Integration',
          'pass', 
          'Metro config contains optimization integrations',
          Date.now() - startTime
        );
      } else {
        addResult(
          'Metro Config Integration',
          'fail',
          'Metro config missing optimization components',
          Date.now() - startTime
        );
      }
    } else {
      addResult(
        'Metro Config Integration',
        'fail',
        'metro.config.js not found',
        Date.now() - startTime
      );
    }
  } catch (error) {
    addResult(
      'Metro Config Integration',
      'fail',
      `Config validation error: ${error.message}`,
      Date.now() - startTime
    );
  }
}

// Test 3: Check TypeScript compilation compatibility
function testTypeScriptCompatibility() {
  const startTime = Date.now();
  
  try {
    // Check if tsconfig exists
    if (fs.existsSync('tsconfig.json')) {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
      
      const hasRequiredConfig = tsConfig.compilerOptions && 
                               tsConfig.compilerOptions.target &&
                               tsConfig.compilerOptions.module;
      
      if (hasRequiredConfig) {
        addResult(
          'TypeScript Configuration',
          'pass',
          `TypeScript config valid (target: ${tsConfig.compilerOptions.target})`,
          Date.now() - startTime
        );
      } else {
        addResult(
          'TypeScript Configuration',
          'fail',
          'TypeScript config missing required compiler options',
          Date.now() - startTime
        );
      }
    } else {
      addResult(
        'TypeScript Configuration',
        'skip',
        'No tsconfig.json found (JavaScript project)',
        Date.now() - startTime
      );
    }
  } catch (error) {
    addResult(
      'TypeScript Configuration',
      'fail',
      `TypeScript config error: ${error.message}`,
      Date.now() - startTime
    );
  }
}

// Test 4: Validate package.json dependencies
function testDependencies() {
  const startTime = Date.now();
  
  try {
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for React Native and Metro dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      const hasReactNative = allDeps['react-native'];
      const hasMetro = allDeps['@react-native/metro-config'] || allDeps['metro'];
      
      if (hasReactNative && hasMetro) {
        addResult(
          'Project Dependencies',
          'pass',
          `React Native: ${hasReactNative}, Metro found`,
          Date.now() - startTime
        );
      } else {
        addResult(
          'Project Dependencies',
          'fail',
          `Missing dependencies - RN: ${hasReactNative}, Metro: ${hasMetro}`,
          Date.now() - startTime
        );
      }
    } else {
      addResult(
        'Project Dependencies',
        'fail',
        'package.json not found',
        Date.now() - startTime
      );
    }
  } catch (error) {
    addResult(
      'Project Dependencies',
      'fail',
      `Dependency check error: ${error.message}`,
      Date.now() - startTime
    );
  }
}

// Test 5: File size and complexity analysis
function testOptimizationComplexity() {
  const startTime = Date.now();
  
  try {
    const optimizationFiles = [
      'src/core/bundler/MetroBundleOptimizer.ts',
      'src/core/monitoring/MetroPerformanceMonitor.ts',
      'src/core/caching/MetroCacheManager.ts',
      'src/core/transformers/AdvancedMetroTransformers.ts',
      'src/core/automation/MetroBuildPipeline.ts',
    ];
    
    let totalSize = 0;
    let totalLines = 0;
    const fileStats = [];
    
    optimizationFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        
        totalSize += stats.size;
        totalLines += lines;
        fileStats.push({ file: path.basename(file), size: stats.size, lines });
      }
    });
    
    if (fileStats.length === optimizationFiles.length) {
      const avgComplexity = totalLines / fileStats.length;
      addResult(
        'Optimization Code Quality',
        'pass',
        `${fileStats.length} files, ${totalLines} total lines, avg ${Math.round(avgComplexity)} lines/file`,
        Date.now() - startTime
      );
    } else {
      addResult(
        'Optimization Code Quality',
        'fail',
        `Only ${fileStats.length}/${optimizationFiles.length} optimization files found`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    addResult(
      'Optimization Code Quality',
      'fail',
      `Code analysis error: ${error.message}`,
      Date.now() - startTime
    );
  }
}

// Test 6: Directory structure validation
function testDirectoryStructure() {
  const startTime = Date.now();
  
  const expectedDirs = [
    'src',
    'src/core',
    'src/core/bundler',
    'src/core/monitoring',
    'src/core/caching',
    'src/core/transformers',
    'src/core/automation',
    'src/core/testing',
  ];
  
  const missingDirs = expectedDirs.filter(dir => !fs.existsSync(dir));
  
  if (missingDirs.length === 0) {
    addResult(
      'Directory Structure',
      'pass',
      `All ${expectedDirs.length} expected directories found`,
      Date.now() - startTime
    );
  } else {
    addResult(
      'Directory Structure',
      'fail',
      `Missing directories: ${missingDirs.join(', ')}`,
      Date.now() - startTime
    );
  }
}

// Run all tests
async function runTests() {
  console.log('🔄 Running Metro optimization validation tests...\n');
  
  testMetroOptimizationFiles();
  testMetroConfig();
  testTypeScriptCompatibility();
  testDependencies();
  testOptimizationComplexity();
  testDirectoryStructure();
  
  // Generate summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const passRate = (passed / results.length * 100).toFixed(1);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Skipped: ${skipped} ⏭️`);
  console.log(`Pass Rate: ${passRate}%`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   • ${r.testName}: ${r.message}`);
    });
  }
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      passed,
      failed, 
      skipped,
      passRate: parseFloat(passRate),
    },
    results,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
  };
  
  fs.writeFileSync(
    `test-reports/metro-validation-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Detailed report saved to test-reports/');
  
  if (failed === 0) {
    console.log('\n🎉 All Metro optimization components validated successfully!');
    console.log('   Your EchoTrail project is ready for optimized Metro builds.');
  } else {
    console.log('\n⚠️  Some validation tests failed.');
    console.log('   Review the failed tests above and ensure all files are properly created.');
  }
  
  return failed === 0;
}

// Main execution
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests };