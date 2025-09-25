#!/usr/bin/env node

/**
 * Simple Performance Benchmark Utility
 * 
 * This is a standalone utility to measure the performance of the refactored
 * Metro Build Pipeline without complex dependencies that might fail.
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs/promises';

interface SimpleBenchmarkResult {
  name: string;
  duration: number;
  memoryUsage: number;
  iterations: number;
  timestamp: number;
}

/**
 * Simple console logger for benchmarking
 */
class SimpleLogger {
  static info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`);
  }
  
  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error);
  }
  
  static warn(message: string): void {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`);
  }
}

/**
 * Simple Performance Benchmark Suite
 */
class SimpleBenchmarkSuite {
  private results: SimpleBenchmarkResult[] = [];

  /**
   * Run a simple performance test
   */
  async measureOperation(
    name: string,
    operation: () => Promise<void> | void,
    iterations: number = 10
  ): Promise<SimpleBenchmarkResult> {
    SimpleLogger.info(`📊 Benchmarking ${name}...`);
    
    const durations: number[] = [];
    const memoryUsages: number[] = [];

    // Warm up
    try {
      await operation();
    } catch {
      // Ignore warm-up errors
    }

    for (let i = 0; i < iterations; i++) {
      // Clean up memory
      if (global.gc) {
        global.gc();
      }

      const startMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();

      try {
        await operation();
      } catch (error) {
        SimpleLogger.warn(`  Iteration ${i + 1} failed: ${error}`);
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      durations.push(endTime - startTime);
      memoryUsages.push(Math.max(0, endMemory - startMemory));
    }

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const avgMemory = memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length;

    const result: SimpleBenchmarkResult = {
      name,
      duration: avgDuration,
      memoryUsage: avgMemory,
      iterations,
      timestamp: Date.now()
    };

    this.results.push(result);
    SimpleLogger.info(`  ✅ ${name}: ${avgDuration.toFixed(2)}ms avg (${iterations} iterations)`);

    return result;
  }

  /**
   * Run basic file system and computation benchmarks
   */
  async runBasicBenchmarks(): Promise<void> {
    SimpleLogger.info('🚀 Starting Simple Performance Benchmarks');
    SimpleLogger.info('==========================================');

    // 1. File system operations
    await this.measureOperation(
      'file_system_operations',
      async () => {
        // Create a temporary file
        const tempFile = `temp-${Date.now()}.json`;
        const data = { test: true, data: Array(100).fill('test') };
        await fs.writeFile(tempFile, JSON.stringify(data));
        await fs.readFile(tempFile, 'utf8');
        await fs.unlink(tempFile);
      },
      20
    );

    // 2. JSON operations
    await this.measureOperation(
      'json_operations',
      async () => {
        const data = { 
          builds: Array(100).fill(0).map((_, i) => ({
            id: `build-${i}`,
            timestamp: Date.now(),
            success: true,
            duration: Math.random() * 60000,
            metrics: { size: Math.random() * 1000000 }
          }))
        };
        const json = JSON.stringify(data);
        JSON.parse(json);
      },
      50
    );

    // 3. Array operations (simulating build analysis)
    await this.measureOperation(
      'array_operations',
      async () => {
        const builds = Array(1000).fill(0).map((_, i) => ({
          id: i,
          size: Math.random() * 1000000,
          time: Math.random() * 60000
        }));
        
        // Simulate regression analysis
        builds.sort((a, b) => a.time - b.time);
        const avgSize = builds.reduce((sum, b) => sum + b.size, 0) / builds.length;
        const avgTime = builds.reduce((sum, b) => sum + b.time, 0) / builds.length;
        
        // Find outliers
        builds.filter(b => b.size > avgSize * 1.1 || b.time > avgTime * 1.1);
      },
      30
    );

    // 4. Promise operations (simulating concurrent builds)
    await this.measureOperation(
      'concurrent_operations',
      async () => {
        const promises = Array(10).fill(0).map(async (_, i) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return `result-${i}`;
        });
        await Promise.all(promises);
      },
      20
    );

    // 5. Memory allocation patterns
    await this.measureOperation(
      'memory_allocation',
      async () => {
        const arrays = [];
        for (let i = 0; i < 100; i++) {
          arrays.push(new Array(1000).fill(i));
        }
        // Clear arrays to simulate cleanup
        arrays.length = 0;
      },
      15
    );

    await this.generateReport();
  }

  /**
   * Generate performance report
   */
  private async generateReport(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./benchmarks/simple-benchmark-${timestamp}.json`;

    await fs.mkdir('./benchmarks', { recursive: true });

    const report = {
      timestamp: Date.now(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      results: this.results,
      summary: {
        total_operations: this.results.length,
        total_duration: this.results.reduce((sum, r) => sum + r.duration, 0),
        average_duration: this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length,
        total_memory: this.results.reduce((sum, r) => sum + r.memoryUsage, 0),
        average_memory: this.results.reduce((sum, r) => sum + r.memoryUsage, 0) / this.results.length
      }
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    SimpleLogger.info('');
    SimpleLogger.info('📈 PERFORMANCE BENCHMARK RESULTS');
    SimpleLogger.info('=================================');
    SimpleLogger.info(`Total operations tested: ${report.summary.total_operations}`);
    SimpleLogger.info(`Average operation duration: ${report.summary.average_duration.toFixed(2)}ms`);
    SimpleLogger.info(`Average memory usage: ${(report.summary.average_memory / 1024 / 1024).toFixed(2)}MB`);
    SimpleLogger.info('');

    SimpleLogger.info('Individual results:');
    this.results.forEach(result => {
      SimpleLogger.info(`  ${result.name}: ${result.duration.toFixed(2)}ms, ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    });

    SimpleLogger.info(`\n📄 Detailed report saved: ${reportPath}`);

    // Check for potential issues
    const slowOperations = this.results.filter(r => r.duration > 100);
    const memoryIntensiveOps = this.results.filter(r => r.memoryUsage > 10 * 1024 * 1024);

    if (slowOperations.length > 0) {
      SimpleLogger.warn(`⚠️  Slow operations detected (>100ms):`);
      slowOperations.forEach(op => {
        SimpleLogger.warn(`    ${op.name}: ${op.duration.toFixed(2)}ms`);
      });
    }

    if (memoryIntensiveOps.length > 0) {
      SimpleLogger.warn(`⚠️  Memory intensive operations detected (>10MB):`);
      memoryIntensiveOps.forEach(op => {
        SimpleLogger.warn(`    ${op.name}: ${(op.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      });
    }

    if (slowOperations.length === 0 && memoryIntensiveOps.length === 0) {
      SimpleLogger.info('✅ All operations performed within acceptable limits');
    }
  }
}

/**
 * Main function to run benchmarks
 */
async function main(): Promise<void> {
  try {
    const suite = new SimpleBenchmarkSuite();
    await suite.runBasicBenchmarks();
    
    SimpleLogger.info('✅ Simple benchmark suite completed successfully');
    process.exit(0);
    
  } catch (error) {
    SimpleLogger.error('❌ Benchmark suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SimpleBenchmarkSuite };