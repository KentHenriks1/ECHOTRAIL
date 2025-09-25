#!/usr/bin/env node
/**
 * Dead Code Elimination Tool
 * Identifies and reports unused code that can be safely removed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeadCodeEliminator {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.srcDir = path.join(this.rootDir, 'src');
    this.results = {
      timestamp: new Date().toISOString(),
      unusedExports: [],
      unusedImports: [],
      unreachableCode: [],
      duplicateCode: [],
      recommendations: []
    };
  }

  async run() {
    console.log('🔍 Analyzing code for dead code elimination opportunities...\n');

    try {
      // Use ts-prune to find unused exports
      await this.findUnusedExports();
      
      // Use knip to find unused dependencies and files
      await this.findUnusedDependencies();
      
      // Analyze for unreachable code patterns
      await this.findUnreachableCode();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Generate report
      this.generateReport();

      console.log('✅ Dead code analysis complete!');
      console.log(`📊 Found ${this.results.unusedExports.length} unused exports`);
      console.log(`📊 Found ${this.results.unusedImports.length} unused imports`);
      console.log(`💡 Generated ${this.results.recommendations.length} optimization recommendations`);

    } catch (error) {
      console.error('❌ Dead code analysis failed:', error.message);
      process.exit(1);
    }
  }

  async findUnusedExports() {
    console.log('🔍 Finding unused exports with ts-prune...');
    
    try {
      const output = execSync('pnpm run ts:prune', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse ts-prune output
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const match = line.match(/^(.+?):(\\d+):(\\d+) - (.+) is declared but its value is never read/);
        if (match) {
          const [, file, lineNum, colNum, exportName] = match;
          this.results.unusedExports.push({
            file: file.replace(this.rootDir, '').replace(/^[/\\\\]/, ''),
            line: parseInt(lineNum),
            column: parseInt(colNum),
            name: exportName,
            type: 'unused-export'
          });
        }
      }

      console.log(`✅ Found ${this.results.unusedExports.length} unused exports`);

    } catch (error) {
      console.warn('Warning: Could not run ts-prune:', error.message);
    }
  }

  async findUnusedDependencies() {
    console.log('🔍 Finding unused dependencies and files with knip...');
    
    try {
      const output = execSync('pnpm run deadcode', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse knip output
      const lines = output.split('\n').filter(line => line.trim());
      let currentSection = null;

      for (const line of lines) {
        if (line.includes('Unused dependencies')) {
          currentSection = 'dependencies';
          continue;
        } else if (line.includes('Unused files')) {
          currentSection = 'files';
          continue;
        } else if (line.includes('Unused exports')) {
          currentSection = 'exports';
          continue;
        }

        if (line.trim() && !line.includes('✓') && !line.includes('Issues')) {
          const cleanLine = line.trim();
          
          if (currentSection === 'dependencies') {
            this.results.unusedImports.push({
              name: cleanLine,
              type: 'unused-dependency'
            });
          } else if (currentSection === 'files') {
            this.results.unreachableCode.push({
              file: cleanLine,
              type: 'unused-file'
            });
          }
        }
      }

      console.log(`✅ Found ${this.results.unusedImports.length} unused dependencies`);
      console.log(`✅ Found ${this.results.unreachableCode.length} unused files`);

    } catch (error) {
      console.warn('Warning: Could not run knip:', error.message);
    }
  }

  async findUnreachableCode() {
    console.log('🔍 Analyzing for unreachable code patterns...');
    
    const files = this.findAllSourceFiles();
    
    for (const file of files) {
      await this.analyzeFileForDeadCode(file);
    }

    console.log(`✅ Analyzed ${files.length} files for unreachable code`);
  }

  findAllSourceFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
            scanDirectory(itemPath);
          }
        } else if (stats.isFile()) {
          if (/\\.(ts|tsx|js|jsx)$/.test(item) && !item.endsWith('.d.ts')) {
            files.push(itemPath);
          }
        }
      }
    };

    scanDirectory(this.srcDir);
    return files;
  }

  async analyzeFileForDeadCode(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);
      
      // Find unreachable code patterns
      this.findUnreachableCodePatterns(content, relativePath);
      
    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}:`, error.message);
    }
  }

  findUnreachableCodePatterns(content, filePath) {
    const lines = content.split('\n');
    let inUnreachableBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;
      
      // Check for return statements that make subsequent code unreachable
      if (line.startsWith('return ') && i < lines.length - 1) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith('//')) {
          // Check if there's code after return in the same block
          let braceCount = 0;
          for (let j = i + 1; j < lines.length; j++) {
            const checkLine = lines[j].trim();
            if (checkLine.includes('{')) braceCount++;
            if (checkLine.includes('}')) {
              braceCount--;
              if (braceCount < 0) break; // End of current block
            }
            if (braceCount === 0 && checkLine && !checkLine.startsWith('//')) {
              this.results.unreachableCode.push({
                file: filePath,
                line: j + 1,
                type: 'unreachable-after-return',
                description: 'Code after return statement'
              });
              break;
            }
          }
        }
      }
      
      // Check for if (false) blocks
      if (line.includes('if (false)') || line.includes('if(false)')) {
        this.results.unreachableCode.push({
          file: filePath,
          line: lineNum,
          type: 'if-false-block',
          description: 'Unreachable if(false) block'
        });
      }
      
      // Check for console.log in production-like patterns
      if (process.env.NODE_ENV === 'production' && line.includes('console.log')) {
        this.results.unreachableCode.push({
          file: filePath,
          line: lineNum,
          type: 'debug-code',
          description: 'Debug console.log statement'
        });
      }
      
      // Check for TODO/FIXME comments that might indicate incomplete code
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        this.results.unreachableCode.push({
          file: filePath,
          line: lineNum,
          type: 'incomplete-code',
          description: 'Code marked as incomplete or temporary'
        });
      }
    }
  }

  generateRecommendations() {
    const recommendations = [];

    // Unused exports recommendations
    if (this.results.unusedExports.length > 0) {
      const fileGroups = {};
      this.results.unusedExports.forEach(exp => {
        if (!fileGroups[exp.file]) {
          fileGroups[exp.file] = [];
        }
        fileGroups[exp.file].push(exp);
      });

      recommendations.push({
        type: 'unused-exports',
        priority: 'high',
        title: 'Remove unused exports',
        description: `Found ${this.results.unusedExports.length} unused exports in ${Object.keys(fileGroups).length} files`,
        impact: 'High - reduces bundle size and improves tree shaking',
        details: Object.entries(fileGroups).slice(0, 10).map(([file, exports]) => ({
          file,
          count: exports.length,
          exports: exports.map(e => e.name)
        })),
        suggestions: [
          'Remove unused export statements',
          'Convert to local functions if only used internally',
          'Check if exports are actually needed for future features'
        ]
      });
    }

    // Unused dependencies recommendations
    if (this.results.unusedImports.length > 0) {
      recommendations.push({
        type: 'unused-dependencies',
        priority: 'medium',
        title: 'Remove unused dependencies',
        description: `Found ${this.results.unusedImports.length} unused dependencies`,
        impact: 'Medium - reduces node_modules size and installation time',
        details: this.results.unusedImports.slice(0, 10),
        suggestions: [
          'Remove unused dependencies from package.json',
          'Move dev-only dependencies to devDependencies',
          'Consider alternatives for rarely used dependencies'
        ]
      });
    }

    // Unreachable code recommendations
    const unreachableFiles = this.results.unreachableCode.filter(item => item.type === 'unused-file');
    const unreachableCode = this.results.unreachableCode.filter(item => item.type !== 'unused-file');
    
    if (unreachableFiles.length > 0) {
      recommendations.push({
        type: 'unused-files',
        priority: 'medium',
        title: 'Remove unused files',
        description: `Found ${unreachableFiles.length} unused files`,
        impact: 'Medium - reduces bundle size and maintenance overhead',
        details: unreachableFiles.slice(0, 10),
        suggestions: [
          'Delete unused files',
          'Move test-only files to appropriate test directories',
          'Archive old files if they might be needed later'
        ]
      });
    }

    if (unreachableCode.length > 0) {
      const codeGroups = {};
      unreachableCode.forEach(item => {
        if (!codeGroups[item.type]) {
          codeGroups[item.type] = [];
        }
        codeGroups[item.type].push(item);
      });

      Object.entries(codeGroups).forEach(([type, items]) => {
        recommendations.push({
          type: `unreachable-${type}`,
          priority: type === 'debug-code' ? 'high' : 'medium',
          title: `Remove ${type.replace('-', ' ')}`,
          description: `Found ${items.length} instances of ${type}`,
          impact: type === 'debug-code' ? 'High - improves production performance' : 'Medium - code cleanup',
          details: items.slice(0, 10),
          suggestions: this.getSuggestionsForType(type)
        });
      });
    }

    this.results.recommendations = recommendations;
  }

  getSuggestionsForType(type) {
    const suggestions = {
      'debug-code': [
        'Remove console.log statements in production builds',
        'Use conditional debugging based on environment',
        'Replace with proper logging framework'
      ],
      'unreachable-after-return': [
        'Remove code after return statements',
        'Restructure logic to avoid unreachable code',
        'Move unreachable code before return if needed'
      ],
      'if-false-block': [
        'Remove if(false) blocks',
        'Use feature flags for conditional code',
        'Remove commented-out code blocks'
      ],
      'incomplete-code': [
        'Complete TODO items or remove them',
        'Fix FIXME comments or document why they exist',
        'Remove HACK comments and implement proper solutions'
      ]
    };

    return suggestions[type] || [
      'Review and clean up unreachable code',
      'Remove or refactor problematic patterns',
      'Ensure code paths are reachable and testable'
    ];
  }

  generateReport() {
    const outputDir = path.join(this.rootDir, 'bundle-analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate JSON report
    const jsonPath = path.join(outputDir, 'dead-code-analysis-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const mdPath = path.join(outputDir, 'dead-code-analysis-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport());

    console.log(`📊 Reports saved to:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${mdPath}`);
  }

  generateMarkdownReport() {
    const report = [];
    
    report.push('# Dead Code Analysis Report');
    report.push(`Generated: ${this.results.timestamp}\n`);
    
    // Summary
    report.push('## Summary\n');
    report.push(`- **Unused exports**: ${this.results.unusedExports.length}`);
    report.push(`- **Unused dependencies**: ${this.results.unusedImports.length}`);
    report.push(`- **Unreachable code instances**: ${this.results.unreachableCode.length}`);
    report.push(`- **Optimization opportunities**: ${this.results.recommendations.length}\n`);

    // Detailed findings
    if (this.results.unusedExports.length > 0) {
      report.push('## Unused Exports\n');
      this.results.unusedExports.slice(0, 20).forEach(exp => {
        report.push(`- **${exp.file}:${exp.line}** - \`${exp.name}\``);
      });
      if (this.results.unusedExports.length > 20) {
        report.push(`- ... and ${this.results.unusedExports.length - 20} more`);
      }
      report.push('');
    }

    if (this.results.unusedImports.length > 0) {
      report.push('## Unused Dependencies\n');
      this.results.unusedImports.forEach(imp => {
        report.push(`- \`${imp.name}\` (${imp.type})`);
      });
      report.push('');
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      report.push('## Optimization Recommendations\n');
      this.results.recommendations.forEach((rec, index) => {
        report.push(`### ${index + 1}. ${rec.title} (${rec.priority} priority)\n`);
        report.push(`${rec.description}\n`);
        report.push(`**Impact**: ${rec.impact}\n`);
        
        if (rec.suggestions) {
          report.push('**Suggestions**:\n');
          rec.suggestions.forEach(suggestion => {
            report.push(`- ${suggestion}`);
          });
          report.push('');
        }

        if (rec.details && Array.isArray(rec.details)) {
          report.push('**Examples**:\n');
          rec.details.slice(0, 5).forEach(detail => {
            if (typeof detail === 'object') {
              if (detail.file && detail.line) {
                report.push(`- ${detail.file}:${detail.line} - ${detail.description || detail.name}`);
              } else if (detail.file) {
                report.push(`- ${detail.file} (${detail.count} exports)`);
              } else {
                report.push(`- ${detail.name || detail.file}`);
              }
            } else {
              report.push(`- ${detail}`);
            }
          });
          if (rec.details.length > 5) {
            report.push(`- ... and ${rec.details.length - 5} more`);
          }
          report.push('');
        }
      });
    }

    return report.join('\n');
  }
}

// Run the eliminator
if (require.main === module) {
  const eliminator = new DeadCodeEliminator();
  eliminator.run().catch(console.error);
}

module.exports = DeadCodeEliminator;