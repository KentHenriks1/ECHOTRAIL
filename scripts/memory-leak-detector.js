#!/usr/bin/env node
/**
 * Memory Leak Detector for React Native EchoTrail App
 * 
 * This script analyzes potential memory leaks by:
 * 1. Analyzing component patterns
 * 2. Checking for proper cleanup in useEffect hooks
 * 3. Looking for event listener management
 * 4. Identifying potential circular references
 */

const fs = require('fs');
const path = require('path');

class MemoryLeakDetector {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.issues = [];
    this.scannedFiles = 0;
  }

  analyze() {
    console.log('🔍 Starting Memory Leak Analysis...\n');
    
    this.scanDirectory(this.rootDir);
    this.generateReport();
  }

  scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!['node_modules', '.git', 'android', 'ios', 'build', 'dist'].includes(item)) {
          this.scanDirectory(fullPath);
        }
      } else if (stat.isFile() && this.isRelevantFile(fullPath)) {
        this.analyzeFile(fullPath);
      }
    }
  }

  isRelevantFile(filePath) {
    const ext = path.extname(filePath);
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    this.scannedFiles++;
    
    // Check for various memory leak patterns
    this.checkUseEffectCleanup(filePath, content);
    this.checkEventListeners(filePath, content);
    this.checkTimers(filePath, content);
    this.checkAsyncOperations(filePath, content);
    this.checkCircularReferences(filePath, content);
    this.checkComponentMounting(filePath, content);
  }

  checkUseEffectCleanup(filePath, content) {
    const useEffectPattern = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g;
    const matches = [...content.matchAll(useEffectPattern)];
    
    for (const match of matches) {
      const effectBody = match[1];
      
      // Check if effect has cleanup but returns something other than cleanup function
      if (effectBody.includes('addEventListener') || 
          effectBody.includes('setInterval') || 
          effectBody.includes('setTimeout')) {
        
        if (!effectBody.includes('return') && !effectBody.includes('cleanup')) {
          this.addIssue(filePath, 'MISSING_CLEANUP', 
            'useEffect with side effects missing cleanup function', match.index);
        }
      }
      
      // Check for async effects without proper cleanup
      if (effectBody.includes('async') || effectBody.includes('await')) {
        if (!effectBody.includes('AbortController') && !effectBody.includes('cancelled')) {
          this.addIssue(filePath, 'ASYNC_EFFECT_LEAK', 
            'Async useEffect without cancellation mechanism', match.index);
        }
      }
    }
  }

  checkEventListeners(filePath, content) {
    // Look for addEventListener without corresponding removeEventListener
    const addListenerPattern = /addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const removeListenerPattern = /removeEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    const addedEvents = [...content.matchAll(addListenerPattern)].map(m => m[1]);
    const removedEvents = [...content.matchAll(removeListenerPattern)].map(m => m[1]);
    
    for (const event of addedEvents) {
      if (!removedEvents.includes(event)) {
        this.addIssue(filePath, 'MISSING_EVENT_CLEANUP', 
          `addEventListener for '${event}' without corresponding removeEventListener`);
      }
    }
  }

  checkTimers(filePath, content) {
    // Check for timers without cleanup
    const setIntervalPattern = /setInterval\s*\(/g;
    const clearIntervalPattern = /clearInterval\s*\(/g;
    const setTimeoutPattern = /setTimeout\s*\(/g;
    const clearTimeoutPattern = /clearTimeout\s*\(/g;
    
    const intervals = (content.match(setIntervalPattern) || []).length;
    const clearedIntervals = (content.match(clearIntervalPattern) || []).length;
    const timeouts = (content.match(setTimeoutPattern) || []).length;
    const clearedTimeouts = (content.match(clearTimeoutPattern) || []).length;
    
    if (intervals > clearedIntervals) {
      this.addIssue(filePath, 'TIMER_LEAK', 
        `${intervals - clearedIntervals} setInterval calls without corresponding clearInterval`);
    }
    
    if (timeouts > clearedTimeouts && timeouts > 2) { // Allow some uncleaned timeouts
      this.addIssue(filePath, 'TIMER_LEAK', 
        `${timeouts - clearedTimeouts} setTimeout calls without corresponding clearTimeout`);
    }
  }

  checkAsyncOperations(filePath, content) {
    // Check for fetch/axios calls without proper cleanup
    const fetchPattern = /(?:fetch|axios\.(?:get|post|put|delete))\s*\(/g;
    const abortPattern = /AbortController|signal:/g;
    
    const asyncCalls = (content.match(fetchPattern) || []).length;
    const abortUsage = (content.match(abortPattern) || []).length;
    
    if (asyncCalls > 0 && abortUsage === 0 && content.includes('useEffect')) {
      this.addIssue(filePath, 'ASYNC_LEAK', 
        'Async operations in components without AbortController for cleanup');
    }
  }

  checkCircularReferences(filePath, content) {
    // Basic check for potential circular references in object creation
    const objectPattern = /const\s+(\w+)\s*=\s*\{[^}]*\1[^}]*\}/g;
    const matches = [...content.matchAll(objectPattern)];
    
    for (const match of matches) {
      this.addIssue(filePath, 'POTENTIAL_CIRCULAR_REF', 
        `Potential circular reference in object '${match[1]}'`, match.index);
    }
  }

  checkComponentMounting(filePath, content) {
    // Check for proper component cleanup patterns
    if (content.includes('class') && content.includes('Component')) {
      if (!content.includes('componentWillUnmount') && 
          (content.includes('addEventListener') || content.includes('setInterval'))) {
        this.addIssue(filePath, 'MISSING_UNMOUNT_CLEANUP', 
          'Class component with side effects missing componentWillUnmount');
      }
    }
    
    // Check for navigation listeners without cleanup
    if (content.includes('navigation.addListener') && !content.includes('unsubscribe')) {
      this.addIssue(filePath, 'NAVIGATION_LISTENER_LEAK', 
        'Navigation listener without unsubscribe in cleanup');
    }
  }

  addIssue(filePath, type, description, position = null) {
    const relativePath = path.relative(this.rootDir, filePath);
    this.issues.push({
      file: relativePath,
      type,
      description,
      position,
      severity: this.getSeverity(type)
    });
  }

  getSeverity(type) {
    const severityMap = {
      'MISSING_CLEANUP': 'HIGH',
      'ASYNC_EFFECT_LEAK': 'HIGH',
      'TIMER_LEAK': 'HIGH',
      'MISSING_EVENT_CLEANUP': 'MEDIUM',
      'ASYNC_LEAK': 'MEDIUM',
      'NAVIGATION_LISTENER_LEAK': 'MEDIUM',
      'MISSING_UNMOUNT_CLEANUP': 'HIGH',
      'POTENTIAL_CIRCULAR_REF': 'LOW'
    };
    return severityMap[type] || 'MEDIUM';
  }

  generateReport() {
    console.log(`📊 Memory Leak Analysis Complete`);
    console.log(`   Scanned ${this.scannedFiles} files`);
    console.log(`   Found ${this.issues.length} potential issues\n`);
    
    if (this.issues.length === 0) {
      console.log('✅ No memory leaks detected! Great job!');
      return;
    }
    
    // Group issues by severity
    const groupedIssues = this.groupBySeverity();
    
    // Report high severity issues
    if (groupedIssues.HIGH.length > 0) {
      console.log('🚨 HIGH SEVERITY ISSUES:');
      groupedIssues.HIGH.forEach(issue => {
        console.log(`   ❌ ${issue.file}:`);
        console.log(`      ${issue.description}`);
        console.log(`      Type: ${issue.type}\n`);
      });
    }
    
    // Report medium severity issues
    if (groupedIssues.MEDIUM.length > 0) {
      console.log('⚠️  MEDIUM SEVERITY ISSUES:');
      groupedIssues.MEDIUM.forEach(issue => {
        console.log(`   ⚠️  ${issue.file}:`);
        console.log(`      ${issue.description}`);
        console.log(`      Type: ${issue.type}\n`);
      });
    }
    
    // Report low severity issues
    if (groupedIssues.LOW.length > 0) {
      console.log('ℹ️  LOW SEVERITY ISSUES:');
      groupedIssues.LOW.forEach(issue => {
        console.log(`   ℹ️  ${issue.file}:`);
        console.log(`      ${issue.description}`);
        console.log(`      Type: ${issue.type}\n`);
      });
    }
    
    // Summary
    console.log('📈 SUMMARY:');
    console.log(`   🚨 High: ${groupedIssues.HIGH.length}`);
    console.log(`   ⚠️  Medium: ${groupedIssues.MEDIUM.length}`);
    console.log(`   ℹ️  Low: ${groupedIssues.LOW.length}`);
    console.log(`   📊 Total: ${this.issues.length}\n`);
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('   • Add cleanup functions to useEffect hooks with side effects');
    console.log('   • Use AbortController for async operations in components');
    console.log('   • Always remove event listeners in cleanup functions');
    console.log('   • Clear timers and intervals when components unmount');
    console.log('   • Unsubscribe from navigation listeners');
    console.log('   • Check for circular references in complex objects\n');
    
    process.exit(this.issues.filter(i => i.severity === 'HIGH').length > 0 ? 1 : 0);
  }

  groupBySeverity() {
    const grouped = { HIGH: [], MEDIUM: [], LOW: [] };
    
    this.issues.forEach(issue => {
      grouped[issue.severity].push(issue);
    });
    
    return grouped;
  }
}

// Run the analyzer
const rootDir = path.join(__dirname, '..');
const detector = new MemoryLeakDetector(rootDir);
detector.analyze();