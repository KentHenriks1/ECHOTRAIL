/**
 * Performance Test Setup
 * 
 * This setup file is specifically for performance regression tests.
 * It ensures consistent timing conditions and baseline measurements.
 */

import * as fs from 'fs';
import * as path from 'path';

// Performance monitoring globals
declare global {
  var __PERFORMANCE_BASELINE__: any;
  var __PERFORMANCE_RESULTS__: any[];
}

// Initialize performance tracking
global.__PERFORMANCE_RESULTS__ = [];

// Load performance baseline from file
const baselinePath = './test-data/performance-baseline.json';
if (fs.existsSync(baselinePath)) {
  try {
    global.__PERFORMANCE_BASELINE__ = JSON.parse(
      fs.readFileSync(baselinePath, 'utf8')
    );
    console.log('📊 Performance baseline loaded');
  } catch (error) {
    console.warn('⚠️  Could not load performance baseline:', error);
    // Set default baseline
    global.__PERFORMANCE_BASELINE__ = {
      pipelineInitialization: 100,
      buildExecution: 5000,
      reportGeneration: 200,
      memoryUsage: 100 * 1024 * 1024,
    };
  }
} else {
  console.warn('⚠️  Performance baseline file not found, using defaults');
  global.__PERFORMANCE_BASELINE__ = {
    pipelineInitialization: 100,
    buildExecution: 5000,
    reportGeneration: 200,
    memoryUsage: 100 * 1024 * 1024,
  };
}

// Performance test utilities
export const performanceUtils = {
  /**
   * Start a performance measurement
   */
  startMeasurement: (name: string) => {
    const start = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    return {
      name,
      start,
      startMemory,
      end: () => {
        const end = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
        
        const result = {
          name,
          duration,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          timestamp: new Date().toISOString(),
        };
        
        global.__PERFORMANCE_RESULTS__.push(result);
        return result;
      }
    };
  },

  /**
   * Check if performance is within acceptable bounds
   */
  checkPerformance: (name: string, actualDuration: number, threshold = 1.5) => {
    const baseline = global.__PERFORMANCE_BASELINE__[name];
    if (!baseline) {
      console.warn(`⚠️  No baseline found for ${name}`);
      return { passed: true, ratio: 1 };
    }
    
    const ratio = actualDuration / baseline;
    const passed = ratio <= threshold;
    
    if (!passed) {
      console.warn(
        `⚠️  Performance regression detected for ${name}: ` +
        `${actualDuration}ms vs baseline ${baseline}ms (${Math.round(ratio * 100)}%)`
      );
    }
    
    return { passed, ratio, baseline, actual: actualDuration };
  },

  /**
   * Get performance statistics
   */
  getStats: () => {
    const results = global.__PERFORMANCE_RESULTS__;
    if (results.length === 0) return null;
    
    const stats = results.reduce((acc, result) => {
      if (!acc[result.name]) {
        acc[result.name] = [];
      }
      acc[result.name].push(result.duration);
      return acc;
    }, {} as Record<string, number[]>);
    
    const summary = Object.entries(stats).map(([name, durations]) => {
      const typedDurations = durations as number[];
      const sorted = [...typedDurations].sort((a: number, b: number) => a - b);
      return {
        name,
        count: typedDurations.length,
        min: Math.min(...typedDurations),
        max: Math.max(...typedDurations),
        avg: typedDurations.reduce((a: number, b: number) => a + b, 0) / typedDurations.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      };
    });
    
    return summary;
  }
};

// Setup performance monitoring hooks
beforeEach(() => {
  // Force garbage collection if available (helps with consistent memory measurements)
  if (global.gc) {
    global.gc();
  }
  
  // Set CPU priority for consistent timing (if on Linux/Mac)
  if (process.platform !== 'win32') {
    try {
      process.setpriority?.(0, -10); // Higher priority for more consistent timing
    } catch (error) {
      // Ignore if we can't set priority
    }
  }
});

afterEach(() => {
  // Reset CPU priority
  if (process.platform !== 'win32') {
    try {
      process.setpriority?.(0, 0);
    } catch (error) {
      // Ignore if we can't set priority
    }
  }
});

// Global teardown for performance tests
afterAll(() => {
  const stats = performanceUtils.getStats();
  if (stats && stats.length > 0) {
    console.log('📊 Performance Test Summary:');
    stats.forEach(stat => {
      console.log(`  ${stat.name}:`);
      console.log(`    Runs: ${stat.count}`);
      console.log(`    Avg: ${Math.round(stat.avg)}ms`);
      console.log(`    Min: ${Math.round(stat.min)}ms`);
      console.log(`    Max: ${Math.round(stat.max)}ms`);
      console.log(`    P95: ${Math.round(stat.p95)}ms`);
      
      // Check against baseline
      const baseline = global.__PERFORMANCE_BASELINE__[stat.name];
      if (baseline) {
        const ratio = stat.avg / baseline;
        const status = ratio <= 1.5 ? '✅' : '❌';
        console.log(`    vs Baseline: ${Math.round(ratio * 100)}% ${status}`);
      }
    });
    
    // Save results for future comparison
    const resultsPath = './reports/performance-results.json';
    const reportsDir = path.dirname(resultsPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      resultsPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        baseline: global.__PERFORMANCE_BASELINE__,
        results: stats,
        rawData: global.__PERFORMANCE_RESULTS__,
      }, null, 2)
    );
    
    console.log(`📁 Performance results saved to ${resultsPath}`);
  }
});

// Export for use in performance tests
export default performanceUtils;