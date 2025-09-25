const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));

// Calculate summary statistics
let totalErrors = 0;
let totalWarnings = 0;
let totalFiles = 0;
let filesWithIssues = 0;
const errorsByRule = {};
const filesByErrorCount = {};

data.forEach(file => {
    totalFiles++;
    const fileErrors = file.errorCount + file.warningCount;
    
    if (fileErrors > 0) {
        filesWithIssues++;
        filesByErrorCount[file.filePath] = fileErrors;
    }
    
    totalErrors += file.errorCount;
    totalWarnings += file.warningCount;
    
    file.messages.forEach(msg => {
        if (msg.ruleId) {
            errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
        }
    });
});

// Generate comprehensive report
console.log('='.repeat(80));
console.log('ESLint COMPREHENSIVE ANALYSIS REPORT');
console.log('='.repeat(80));
console.log();

console.log('📊 OVERVIEW STATISTICS');
console.log('-'.repeat(30));
console.log(`Total files analyzed: ${totalFiles}`);
console.log(`Files with issues: ${filesWithIssues}`);
console.log(`Total errors: ${totalErrors}`);
console.log(`Total warnings: ${totalWarnings}`);
console.log(`Clean files: ${totalFiles - filesWithIssues}`);
console.log(`Overall quality score: ${((totalFiles - filesWithIssues) / totalFiles * 100).toFixed(1)}%`);
console.log();

console.log('🔥 TOP 10 MOST PROBLEMATIC RULES');
console.log('-'.repeat(30));
Object.entries(errorsByRule)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([rule, count], index) => {
        console.log(`${index + 1}. ${rule}: ${count} issues`);
    });
console.log();

console.log('📁 TOP 10 FILES WITH MOST ISSUES');
console.log('-'.repeat(30));
Object.entries(filesByErrorCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count], index) => {
        const shortPath = file.replace(/.*[/\\]apps[/\\]mobile[/\\]/, '');
        console.log(`${index + 1}. ${shortPath}: ${count} issues`);
    });
console.log();

console.log('🎯 CATEGORY BREAKDOWN');
console.log('-'.repeat(30));
const categories = {
    'Code Quality': ['complexity', 'max-lines', 'max-lines-per-function', 'max-depth', 'cyclomatic-complexity'],
    'Type Safety': ['no-undef', 'no-unused-vars', 'unused-imports/no-unused-vars'],
    'Code Style': ['no-useless-escape', 'prefer-template', 'object-shorthand', 'no-dupe-keys'],
    'Performance': ['no-await-in-loop', 'no-promise-executor-return'],
    'Best Practices': ['no-console', 'no-magic-numbers', 'no-nested-ternary'],
    'Error Prevention': ['no-case-declarations', 'no-empty-pattern']
};

Object.entries(categories).forEach(([category, rules]) => {
    const count = rules.reduce((sum, rule) => sum + (errorsByRule[rule] || 0), 0);
    if (count > 0) {
        console.log(`${category}: ${count} issues`);
    }
});

console.log();
console.log('💡 QUICK WIN OPPORTUNITIES');
console.log('-'.repeat(30));
console.log('- Fix no-useless-escape issues (regex patterns)');
console.log('- Address unused variables/imports');
console.log('- Resolve duplicate keys and object shorthand');
console.log('- Handle promise executor return values');
console.log('- Add braces to case statements');