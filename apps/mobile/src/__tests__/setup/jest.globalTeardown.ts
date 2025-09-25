/**
 * Jest Global Teardown
 * 
 * This runs once after all test suites complete.
 * Use this for cleanup operations and final reporting.
 */

import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting Jest global teardown...');

  try {
    // Calculate total test execution time
    const startTime = parseInt(process.env.TEST_START_TIME || '0');
    const totalTestTime = startTime ? Date.now() - startTime : 0;
    
    // Generate test execution summary
    const testSummary = {
      totalExecutionTime: totalTestTime,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      ci: process.env.CI === 'true',
    };

    // Write test execution summary
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportsDir, 'test-execution-summary.json'),
      JSON.stringify(testSummary, null, 2)
    );

    console.log(`  ⏱️  Total test execution time: ${totalTestTime}ms`);
    console.log(`  💾 Memory usage: ${Math.round(testSummary.memoryUsage.heapUsed / 1024 / 1024)}MB`);

    // Clean up temporary test files (optional - keep for debugging)
    const cleanupTempFiles = process.env.JEST_CLEANUP_TEMP === 'true';
    
    if (cleanupTempFiles) {
      const tempDirs = [
        './tmp/test',
        './.jest-cache',
      ];

      for (const dir of tempDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`  🗑️  Cleaned up: ${dir}`);
        }
      }
    } else {
      console.log('  📁 Temporary files preserved for debugging');
    }

    // Performance analysis
    if (fs.existsSync('./reports/junit/junit.xml')) {
      console.log('  📊 JUnit XML report generated');
    }

    if (fs.existsSync('./coverage/lcov.info')) {
      console.log('  📈 Coverage report generated');
    }

    // Check for test artifacts that might indicate issues
    const possibleIssues: string[] = [];

    // Check for slow test warnings
    if (totalTestTime > 300000) { // 5 minutes
      possibleIssues.push(`Long test execution time: ${Math.round(totalTestTime / 1000)}s`);
    }

    // Check memory usage
    const memoryUsageMB = testSummary.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 512) {
      possibleIssues.push(`High memory usage: ${Math.round(memoryUsageMB)}MB`);
    }

    // Report potential issues
    if (possibleIssues.length > 0) {
      console.log('  ⚠️  Potential issues detected:');
      possibleIssues.forEach(issue => console.log(`    - ${issue}`));
    }

    // Final cleanup of global state
    delete process.env.JEST_GLOBAL_SETUP_COMPLETE;
    delete process.env.TEST_START_TIME;

    console.log('✅ Jest global teardown completed successfully');

  } catch (error) {
    console.error('❌ Jest global teardown failed:', error);
    // Don't throw here - we don't want to fail tests due to cleanup issues
  }
}