#!/usr/bin/env ts-node

/**
 * Performance Benchmark Runner
 * 
 * Orchestrates the complete performance analysis of the refactored Metro Build Pipeline
 * to ensure no regressions were introduced during the refactoring process.
 */

import { runPipelineBenchmarks } from '../src/core/automation/__benchmarks__/pipeline.benchmark';
import { runBuildTimeComparison } from '../src/core/automation/__benchmarks__/build-time-comparison';
import { Logger } from '../src/core/utils/Logger';

/**
 * Main benchmark orchestrator
 */
async function runAllBenchmarks(): Promise<void> {
  const startTime = Date.now();
  
  Logger.info('🚀 Starting Comprehensive Performance Analysis');
  Logger.info('==============================================');
  Logger.info('');
  
  try {
    // 1. Run pipeline internal benchmarks
    Logger.info('📊 Phase 1: Pipeline Internal Benchmarks');
    Logger.info('----------------------------------------');
    await runPipelineBenchmarks();
    Logger.info('');
    
    // 2. Run real-world build time analysis
    Logger.info('🔨 Phase 2: Real-World Build Time Analysis'); 
    Logger.info('-------------------------------------------');
    await runBuildTimeComparison();
    Logger.info('');
    
    // 3. Generate combined analysis report
    Logger.info('📈 Phase 3: Combined Analysis Report');
    Logger.info('------------------------------------');
    await generateCombinedReport();
    
    const totalTime = (Date.now() - startTime) / 1000;
    Logger.info('');
    Logger.info('✅ Performance Analysis Completed Successfully!');
    Logger.info(`⏱️  Total analysis time: ${totalTime.toFixed(1)}s`);
    Logger.info('');
    Logger.info('📋 Next Steps:');
    Logger.info('  1. Review benchmark reports in ./benchmarks/ directory');
    Logger.info('  2. Check for any performance regressions');
    Logger.info('  3. If no regressions: proceed with deployment');
    Logger.info('  4. If regressions found: investigate and optimize');
    
  } catch (error) {
    Logger.error('❌ Performance analysis failed:', error);
    process.exit(1);
  }
}

/**
 * Generate a combined analysis report
 */
async function generateCombinedReport(): Promise<void> {
  const report = {
    timestamp: Date.now(),
    analysis_phases: [
      {
        name: 'Pipeline Internal Benchmarks',
        description: 'Measures internal pipeline operations like initialization, build execution, and regression analysis',
        status: 'completed',
        location: './benchmarks/pipeline-benchmark-*.json'
      },
      {
        name: 'Real-World Build Time Analysis',
        description: 'Tests actual build performance across different project sizes and configurations',
        status: 'completed', 
        location: './benchmarks/build-time-report-*.json'
      }
    ],
    summary: {
      message: 'Performance analysis completed. Review individual reports for detailed metrics and regression analysis.',
      recommendation: 'Check baseline comparisons in benchmark reports to identify any performance regressions.'
    },
    quality_gates: {
      performance_regression_threshold: '5% slower execution time',
      memory_regression_threshold: '10% increased memory usage',
      build_time_regression_threshold: '15% increased build times',
      failure_rate_threshold: 'Max 5% build failures'
    }
  };
  
  const fs = await import('fs/promises');
  await fs.mkdir('./benchmarks', { recursive: true });
  await fs.writeFile(
    `./benchmarks/combined-analysis-report-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  );
  
  Logger.info('📄 Combined analysis report generated');
}

/**
 * Validate environment before running benchmarks
 */
async function validateEnvironment(): Promise<void> {
  Logger.info('🔍 Validating environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
  }
  
  // Check for TypeScript
  try {
    const { execSync } = await import('child_process');
    execSync('npx tsc --version', { stdio: 'ignore' });
  } catch {
    throw new Error('TypeScript not available. Please install TypeScript.');
  }
  
  // Check available memory
  const memoryUsage = process.memoryUsage();
  const availableMemory = memoryUsage.heapTotal;
  
  if (availableMemory < 100 * 1024 * 1024) { // Less than 100MB
    Logger.warn('⚠️  Low available memory detected. Benchmarks may be affected.');
  }
  
  Logger.info('✅ Environment validation passed');
}

// Run benchmarks if called directly
if (require.main === module) {
  validateEnvironment()
    .then(() => runAllBenchmarks())
    .catch(error => {
      Logger.error('❌ Benchmark execution failed:', error);
      process.exit(1);
    });
}

export { runAllBenchmarks, validateEnvironment };