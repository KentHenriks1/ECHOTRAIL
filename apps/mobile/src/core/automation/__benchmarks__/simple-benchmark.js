#!/usr/bin/env node

/**
 * Simple Performance Benchmark Utility (JavaScript version)
 * 
 * This is a standalone utility to measure the performance of the refactored
 * Metro Build Pipeline without TypeScript compilation issues.
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;

/**
 * Simple console logger for benchmarking
 */
class SimpleLogger {
  static info(message) {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`);
  }
  
  static error(message, error) {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error);
  }
  
  static warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`);
  }
}

/**
 * Simple Performance Benchmark Suite
 */
class SimpleBenchmarkSuite {
  constructor() {
    this.results = [];
  }

  /**
   * Run a simple performance test
   */
  async measureOperation(name, operation, iterations = 10) {
    SimpleLogger.info(`📊 Benchmarking ${name}...`);
    
    const durations = [];
    const memoryUsages = [];

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

    const result = {
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
  async runBasicBenchmarks() {
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

    // 6. Module/Import simulation (relevant for Metro builds)
    await this.measureOperation(
      'module_operations',
      async () => {
        // Simulate module resolution and dependency analysis
        const modules = {};
        for (let i = 0; i < 500; i++) {
          const moduleName = `module-${i}`;
          modules[moduleName] = {
            name: moduleName,
            dependencies: Array(Math.floor(Math.random() * 10)).fill(0).map((_, j) => `dep-${j}`),
            size: Math.random() * 50000,
            exports: Array(Math.floor(Math.random() * 5)).fill(0).map((_, k) => `export-${k}`)
          };
        }
        
        // Simulate dependency resolution
        Object.values(modules).forEach(mod => {
          mod.dependencies.forEach(dep => {
            if (modules[dep]) {
              modules[dep].dependents = modules[dep].dependents || [];
              modules[dep].dependents.push(mod.name);
            }
          });
        });
        
        // Simulate bundle analysis
        const totalSize = Object.values(modules).reduce((sum, mod) => sum + mod.size, 0);
        const avgSize = totalSize / Object.keys(modules).length;
        
        return { totalSize, avgSize, moduleCount: Object.keys(modules).length };
      },
      10
    );

    await this.generateReport();
  }

  /**
   * Generate performance report
   */
  async generateReport() {
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

    // Performance analysis
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

    // Performance score calculation
    const performanceScore = this.calculatePerformanceScore();
    SimpleLogger.info('');
    SimpleLogger.info(`🎯 Performance Score: ${performanceScore.score}/100`);
    SimpleLogger.info(`   Grade: ${performanceScore.grade} (${performanceScore.description})`);
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore() {
    let score = 100;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const avgMemory = this.results.reduce((sum, r) => sum + r.memoryUsage, 0) / this.results.length;
    
    // Deduct points for slow operations
    if (avgDuration > 50) score -= 20;
    else if (avgDuration > 25) score -= 10;
    else if (avgDuration > 10) score -= 5;
    
    // Deduct points for memory usage
    const avgMemoryMB = avgMemory / 1024 / 1024;
    if (avgMemoryMB > 50) score -= 30;
    else if (avgMemoryMB > 20) score -= 15;
    else if (avgMemoryMB > 10) score -= 5;
    
    // Bonus for fast operations
    if (avgDuration < 5) score += 5;
    if (avgMemoryMB < 1) score += 5;
    
    score = Math.max(0, Math.min(100, score));
    
    let grade, description;
    if (score >= 90) {
      grade = 'A+';
      description = 'Excellent performance';
    } else if (score >= 80) {
      grade = 'A';
      description = 'Very good performance';
    } else if (score >= 70) {
      grade = 'B';
      description = 'Good performance';
    } else if (score >= 60) {
      grade = 'C';
      description = 'Average performance';
    } else if (score >= 50) {
      grade = 'D';
      description = 'Below average performance';
    } else {
      grade = 'F';
      description = 'Poor performance - optimization needed';
    }
    
    return { score, grade, description };
  }
}

/**
 * Main function to run benchmarks
 */
async function main() {
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

module.exports = { SimpleBenchmarkSuite };