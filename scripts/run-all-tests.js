#!/usr/bin/env node

/**
 * EchoTrail Mobile - Comprehensive Test Runner
 * 
 * This script runs all tests in the correct order with proper reporting
 * and handles different test environments and configurations.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class TestRunner {
  constructor() {
    this.results = {
      lint: { passed: false, duration: 0 },
      typecheck: { passed: false, duration: 0 },
      basic: { passed: false, duration: 0, tests: 0 },
      services: { passed: false, duration: 0, tests: 0 },
      database: { passed: false, duration: 0, tests: 0 },
      integration: { passed: false, duration: 0, tests: 0 },
      performance: { passed: false, duration: 0, tests: 0 },
      coverage: { passed: false, duration: 0, coverage: 0 },
    };
    
    this.totalStartTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60));
    this.log(title, 'cyan');
    console.log('='.repeat(60));
  }

  logSubSection(title) {
    this.log(`\n📋 ${title}`, 'blue');
    console.log('-'.repeat(40));
  }

  async runCommand(command, description, resultKey = null) {
    this.log(`🔄 ${description}...`, 'yellow');
    const startTime = Date.now();

    try {
      const output = execSync(command, { 
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      const duration = Date.now() - startTime;
      this.log(`✅ ${description} completed (${duration}ms)`, 'green');

      if (resultKey) {
        this.results[resultKey].passed = true;
        this.results[resultKey].duration = duration;
        
        // Extract test count from output if available
        const testMatch = output.match(/(\d+) passed/);
        if (testMatch) {
          this.results[resultKey].tests = parseInt(testMatch[1]);
        }
      }

      return { success: true, output, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ ${description} failed (${duration}ms)`, 'red');
      
      if (resultKey) {
        this.results[resultKey].passed = false;
        this.results[resultKey].duration = duration;
      }

      console.error(`Error: ${error.message}`);
      if (error.stdout) {
        console.log('STDOUT:', error.stdout.toString());
      }
      if (error.stderr) {
        console.log('STDERR:', error.stderr.toString());
      }

      return { success: false, error, duration };
    }
  }

  async runLintingAndTypeCheck() {
    this.logSection('🔍 Code Quality Checks');

    this.logSubSection('ESLint');
    await this.runCommand('pnpm run lint', 'Running ESLint', 'lint');

    this.logSubSection('TypeScript Check');
    await this.runCommand('pnpm run type-check', 'Running TypeScript check', 'typecheck');
  }

  async runUnitTests() {
    this.logSection('🧪 Unit Tests');

    this.logSubSection('Basic Tests');
    await this.runCommand(
      'pnpm run test src/__tests__/basic.test.ts src/__tests__/maps.test.ts',
      'Running basic unit tests',
      'basic'
    );

    this.logSubSection('Service Tests');
    await this.runCommand(
      'pnpm run test src/services/__tests__/',
      'Running service layer tests',
      'services'
    );
  }

  async runIntegrationTests() {
    this.logSection('🔗 Integration Tests');

    this.logSubSection('Database Integration');
    await this.runCommand(
      'pnpm run test src/__tests__/database/',
      'Running database integration tests',
      'database'
    );

    this.logSubSection('API Integration');
    await this.runCommand(
      'pnpm run test src/__tests__/integration/',
      'Running API integration tests',
      'integration'
    );
  }

  async runPerformanceTests() {
    this.logSection('⚡ Performance Tests');

    await this.runCommand(
      'pnpm run test src/__tests__/performance/',
      'Running performance benchmarks',
      'performance'
    );
  }

  async runCoverageTests() {
    this.logSection('📊 Coverage Analysis');

    const result = await this.runCommand(
      'pnpm run test:coverage',
      'Running tests with coverage analysis',
      'coverage'
    );

    if (result.success) {
      // Extract coverage percentage from output
      const coverageMatch = result.output.match(/All files\s+\|\s+([\d.]+)/);
      if (coverageMatch) {
        this.results.coverage.coverage = parseFloat(coverageMatch[1]);
      }
    }
  }

  generateReport() {
    this.logSection('📋 Test Report Summary');

    const totalDuration = Date.now() - this.totalStartTime;
    const totalTests = Object.values(this.results)
      .reduce((sum, result) => sum + (result.tests || 0), 0);

    // Overall status
    const allPassed = Object.values(this.results).every(result => result.passed);
    const status = allPassed ? '✅ PASSED' : '❌ FAILED';
    const statusColor = allPassed ? 'green' : 'red';

    this.log(`\n🎯 Overall Status: ${status}`, statusColor);
    this.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    this.log(`🧪 Total Tests: ${totalTests}`);

    // Detailed results
    console.log('\n📊 Detailed Results:');
    console.log('┌─────────────────┬─────────┬──────────┬───────────┬─────────────┐');
    console.log('│ Test Suite      │ Status  │ Duration │ Tests     │ Coverage    │');
    console.log('├─────────────────┼─────────┼──────────┼───────────┼─────────────┤');

    const suites = [
      { name: 'Lint', key: 'lint' },
      { name: 'TypeCheck', key: 'typecheck' },
      { name: 'Basic', key: 'basic' },
      { name: 'Services', key: 'services' },
      { name: 'Database', key: 'database' },
      { name: 'Integration', key: 'integration' },
      { name: 'Performance', key: 'performance' },
      { name: 'Coverage', key: 'coverage' },
    ];

    suites.forEach(suite => {
      const result = this.results[suite.key];
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = `${Math.round(result.duration / 1000)}s`;
      const tests = result.tests || '-';
      const coverage = suite.key === 'coverage' ? `${result.coverage || 0}%` : '-';

      console.log(
        `│ ${suite.name.padEnd(15)} │ ${status.padEnd(7)} │ ${duration.padEnd(8)} │ ${tests.toString().padEnd(9)} │ ${coverage.padEnd(11)} │`
      );
    });

    console.log('└─────────────────┴─────────┴──────────┴───────────┴─────────────┘');

    // Recommendations
    if (!allPassed) {
      this.log('\n💡 Recommendations:', 'yellow');
      
      if (!this.results.lint.passed) {
        this.log('  • Fix ESLint errors before proceeding', 'yellow');
      }
      
      if (!this.results.typecheck.passed) {
        this.log('  • Resolve TypeScript compilation errors', 'yellow');
      }
      
      const failedTests = Object.entries(this.results)
        .filter(([_, result]) => !result.passed && result.tests !== undefined)
        .map(([key, _]) => key);
        
      if (failedTests.length > 0) {
        this.log(`  • Review failed tests: ${failedTests.join(', ')}`, 'yellow');
      }
      
      if (this.results.coverage.coverage < 70) {
        this.log('  • Improve test coverage (target: 70%)', 'yellow');
      }
    }

    // Save report to file
    this.saveReportToFile({
      timestamp: new Date().toISOString(),
      status: allPassed ? 'PASSED' : 'FAILED',
      totalDuration,
      totalTests,
      results: this.results
    });

    return allPassed;
  }

  saveReportToFile(report) {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-report-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    this.log(`\n📄 Test report saved to: ${filepath}`, 'blue');

    // Also save as latest
    const latestPath = path.join(reportsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  }

  async run() {
    this.log('🚀 Starting EchoTrail Mobile Test Suite', 'bright');
    this.log(`📍 Working directory: ${process.cwd()}`);
    this.log(`🕒 Start time: ${new Date().toISOString()}`);

    try {
      // Run all test suites
      await this.runLintingAndTypeCheck();
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.runCoverageTests();

      // Generate and display report
      const allPassed = this.generateReport();

      // Exit with appropriate code
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      this.log(`\n💥 Test runner failed: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;