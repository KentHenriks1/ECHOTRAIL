const fs = require('fs');
const path = require('path');

console.log('🔍 MEMORY LEAK DETECTION - FOCUSED SCAN');
console.log('=====================================\n');

const patterns = [
  // useEffect without cleanup
  { pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*(?:setInterval|setTimeout|addEventListener)[^}]*\}\s*,\s*\[\s*\]\s*\)/, type: 'useEffect without cleanup', priority: 'HIGH' },
  // Event listeners without cleanup
  { pattern: /addEventListener\s*\([^)]*\)[^{]*\{(?![^}]*removeEventListener)/, type: 'Event listener without cleanup', priority: 'HIGH' },
  // Timers without cleanup
  { pattern: /(setInterval|setTimeout)\s*\([^)]*\)(?![^;]*clear(Interval|Timeout))/, type: 'Timer without cleanup', priority: 'MEDIUM' },
  // Subscription patterns
  { pattern: /\.(subscribe|on)\s*\([^)]*\)(?![^}]*\.(unsubscribe|off))/, type: 'Subscription without cleanup', priority: 'HIGH' },
  // Promise patterns that may leak
  { pattern: /new Promise\s*\([^)]*\)(?![^}]*\.(finally|catch))/, type: 'Promise without proper cleanup', priority: 'MEDIUM' },
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    patterns.forEach(({ pattern, type, priority }) => {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            type,
            priority,
            code: line.trim()
          });
        }
      });
    });
    
    return issues;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dir, extensions = ['.tsx', '.ts', '.js', '.jsx']) {
  const allIssues = [];
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && !['node_modules', 'dist', 'build'].includes(item)) {
          scan(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          const issues = scanFile(fullPath);
          allIssues.push(...issues);
        }
      });
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  scan(dir);
  return allIssues;
}

const issues = scanDirectory('./src');

// Group by priority
const highPriority = issues.filter(i => i.priority === 'HIGH');
const mediumPriority = issues.filter(i => i.priority === 'MEDIUM');

console.log(`🚨 HIGH PRIORITY MEMORY LEAKS: ${highPriority.length}`);
highPriority.slice(0, 8).forEach(issue => {
  const relativePath = issue.file.replace(process.cwd(), '').replace(/\\/g, '/');
  console.log(`\n📍 ${relativePath}:${issue.line}`);
  console.log(`   Type: ${issue.type}`);
  console.log(`   Code: ${issue.code.substring(0, 100)}...`);
});

console.log(`\n⚠️  MEDIUM PRIORITY ISSUES: ${mediumPriority.length}`);
mediumPriority.slice(0, 5).forEach(issue => {
  const relativePath = issue.file.replace(process.cwd(), '').replace(/\\/g, '/');
  console.log(`\n📍 ${relativePath}:${issue.line}`);
  console.log(`   Type: ${issue.type}`);
  console.log(`   Code: ${issue.code.substring(0, 100)}...`);
});

console.log(`\n📊 SUMMARY:`);
console.log(`   • High Priority: ${highPriority.length}`);
console.log(`   • Medium Priority: ${mediumPriority.length}`);
console.log(`   • Total Issues: ${issues.length}`);