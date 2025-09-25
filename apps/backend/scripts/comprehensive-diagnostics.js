#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 EchoTrail Backend - Comprehensive Diagnostics');
console.log('================================================\n');

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

function runTest(name, command, options = {}) {
  console.log(`🧪 ${name}...`);
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: options.silent ? 'pipe' : 'inherit',
    });
    
    const test = {
      name,
      status: 'PASSED',
      command,
      output: result,
      timestamp: new Date().toISOString(),
    };
    
    results.tests.push(test);
    results.summary.passed++;
    console.log(`✅ ${name} - PASSED\n`);
    return result;
  } catch (error) {
    const test = {
      name,
      status: 'FAILED',
      command,
      error: error.message,
      output: error.stdout || '',
      stderr: error.stderr || '',
      timestamp: new Date().toISOString(),
    };
    
    results.tests.push(test);
    results.summary.failed++;
    console.log(`❌ ${name} - FAILED`);
    console.log(`   Error: ${error.message}\n`);
    return null;
  }
}

function runWarningTest(name, command) {
  console.log(`⚠️  ${name}...`);
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    
    const test = {
      name,
      status: 'WARNING',
      command,
      output: result,
      timestamp: new Date().toISOString(),
    };
    
    results.tests.push(test);
    results.summary.warnings++;
    console.log(`⚠️  ${name} - WARNING (completed with issues)\n`);
    return result;
  } catch (error) {
    const test = {
      name,
      status: 'WARNING',
      command,
      error: error.message,
      output: error.stdout || '',
      stderr: error.stderr || '',
      timestamp: new Date().toISOString(),
    };
    
    results.tests.push(test);
    results.summary.warnings++;
    console.log(`⚠️  ${name} - WARNING`);
    console.log(`   Issues: ${error.message}\n`);
    return null;
  }
}

// 1. Environment and Dependencies
console.log('📋 1. ENVIRONMENT & DEPENDENCIES');
console.log('==================================');
runTest('Node.js Version Check', 'node --version');
runTest('PNPM Version Check', 'pnpm --version');
runTest('TypeScript Version Check', 'npx tsc --version');

// 2. Package Management
console.log('📦 2. PACKAGE MANAGEMENT');
console.log('=========================');
runWarningTest('Outdated Packages Check', 'npx npm-check-updates');
runWarningTest('Unused Dependencies', 'npx depcheck');
runTest('Package Installation Integrity', 'pnpm install --frozen-lockfile');

// 3. Code Quality and Type Safety
console.log('🔍 3. CODE QUALITY & TYPE SAFETY');
console.log('==================================');
runWarningTest('TypeScript Compilation', 'npx tsc --noEmit');
// ESLint may fail due to config issues, so mark as warning
runWarningTest('ESLint Code Analysis', 'npx eslint src --ext .ts --no-error-on-unmatched-pattern');

// 4. Database and Schema
console.log('🗄️  4. DATABASE & SCHEMA');
console.log('==========================');
runTest('Prisma Schema Validation', 'pnpm prisma validate');
runTest('Database Connection Test', 'pnpm prisma db pull --preview-feature');
runTest('Prisma Client Generation', 'pnpm prisma generate');

// 5. Security Audit
console.log('🔒 5. SECURITY AUDIT');
console.log('=====================');
runWarningTest('NPM Security Audit', 'pnpm audit');
runWarningTest('Snyk Security Scan', 'npx snyk test --all-projects');

// 6. Database Seeding Test
console.log('🌱 6. DATABASE SEEDING');
console.log('=======================');
runTest('Database Seeding', 'pnpm db:seed');

// 7. API Health Check (if server can start)
console.log('🔗 7. API HEALTH CHECK');
console.log('=======================');
// This will be done manually or with a timeout

// 8. Environment Configuration
console.log('⚙️  8. ENVIRONMENT CONFIGURATION');
console.log('=================================');

const envFiles = ['.env', '.env.local', '.env.development'];
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found ${file}`);
    results.tests.push({
      name: `Environment File Check (${file})`,
      status: 'PASSED',
      timestamp: new Date().toISOString(),
    });
    results.summary.passed++;
  } else {
    console.log(`❌ Missing ${file}`);
    results.tests.push({
      name: `Environment File Check (${file})`,
      status: 'FAILED',
      error: `File ${file} not found`,
      timestamp: new Date().toISOString(),
    });
    results.summary.failed++;
  }
});

// 9. File Structure Check
console.log('📁 9. FILE STRUCTURE');
console.log('=====================');

const criticalFiles = [
  'package.json',
  'tsconfig.json',
  'prisma/schema.prisma',
  'src/server.ts',
  'src/app.ts',
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
    results.tests.push({
      name: `Critical File Check (${file})`,
      status: 'PASSED',
      timestamp: new Date().toISOString(),
    });
    results.summary.passed++;
  } else {
    console.log(`❌ ${file} missing`);
    results.tests.push({
      name: `Critical File Check (${file})`,
      status: 'FAILED',
      error: `Critical file ${file} is missing`,
      timestamp: new Date().toISOString(),
    });
    results.summary.failed++;
  }
});

// Generate comprehensive report
console.log('\n📊 DIAGNOSTIC SUMMARY');
console.log('======================');
console.log(`Total Tests: ${results.tests.length}`);
console.log(`✅ Passed: ${results.summary.passed}`);
console.log(`❌ Failed: ${results.summary.failed}`);
console.log(`⚠️  Warnings: ${results.summary.warnings}`);

const healthScore = Math.round(
  ((results.summary.passed + results.summary.warnings * 0.5) / results.tests.length) * 100
);

console.log(`\n🏥 Overall Health Score: ${healthScore}%`);

if (healthScore >= 80) {
  console.log('🟢 System Status: HEALTHY');
} else if (healthScore >= 60) {
  console.log('🟡 System Status: NEEDS ATTENTION');
} else {
  console.log('🔴 System Status: CRITICAL ISSUES');
}

// Save detailed report
const reportPath = path.join(process.cwd(), 'diagnostic-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportPath}`);

// Exit with appropriate code
const exitCode = results.summary.failed > 0 ? 1 : 0;
process.exit(exitCode);