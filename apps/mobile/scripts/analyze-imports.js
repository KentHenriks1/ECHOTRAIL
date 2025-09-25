#!/usr/bin/env node
/**
 * Import Analysis Tool
 * Identifies inefficient import patterns that prevent tree shaking
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ImportAnalyzer {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.srcDir = path.join(this.rootDir, 'src');
    this.results = {
      timestamp: new Date().toISOString(),
      inefficientImports: [],
      fullLibraryImports: [],
      defaultImports: [],
      optimizationOpportunities: [],
      recommendations: []
    };
  }

  async run() {
    console.log('🔍 Analyzing import patterns for tree shaking optimization...\n');

    try {
      // Analyze all TypeScript/JavaScript files
      const files = this.findAllSourceFiles();
      
      for (const file of files) {
        await this.analyzeFile(file);
      }

      // Generate recommendations
      this.generateRecommendations();
      
      // Generate report
      this.generateReport();

      console.log('✅ Import analysis complete!');
      console.log(`📊 Found ${this.results.inefficientImports.length} inefficient imports`);
      console.log(`💡 Generated ${this.results.recommendations.length} optimization recommendations`);

    } catch (error) {
      console.error('❌ Import analysis failed:', error.message);
      process.exit(1);
    }
  }

  findAllSourceFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules and other non-source directories
          if (!['node_modules', '.git', 'dist', 'build', '__tests__'].includes(item)) {
            scanDirectory(itemPath);
          }
        } else if (stats.isFile()) {
          // Only analyze TypeScript and JavaScript files
          if (/\.(ts|tsx|js|jsx)$/.test(item) && !item.endsWith('.d.ts')) {
            files.push(itemPath);
          }
        }
      }
    };

    scanDirectory(this.srcDir);
    return files;
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);
      
      // Find all import statements
      const imports = this.extractImports(content, relativePath);
      
      for (const importInfo of imports) {
        this.analyzeImport(importInfo, relativePath);
      }

    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}:`, error.message);
    }
  }

  extractImports(content, filePath) {
    const imports = [];
    
    // Match various import patterns
    const importPatterns = [
      // import defaultExport from 'module'
      /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"]([^'"]+)['"];?/g,
      // import { named } from 'module'
      /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"];?/g,
      // import * as namespace from 'module'
      /import\s+\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"]([^'"]+)['"];?/g,
      // import 'module' (side effect import)
      /import\s+['"]([^'"]+)['"];?/g,
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const fullMatch = match[0];
        let importType, importedItems, moduleName;
        
        if (fullMatch.includes('* as')) {
          importType = 'namespace';
          importedItems = [match[1]];
          moduleName = match[2];
        } else if (fullMatch.includes('{')) {
          importType = 'named';
          importedItems = match[1].split(',').map(item => item.trim().split(' as ')[0]);
          moduleName = match[2];
        } else if (match[2]) {
          importType = 'default';
          importedItems = [match[1]];
          moduleName = match[2];
        } else {
          importType = 'side-effect';
          importedItems = [];
          moduleName = match[1];
        }

        imports.push({
          type: importType,
          items: importedItems,
          module: moduleName,
          line: fullMatch,
          file: filePath
        });
      }
    }

    return imports;
  }

  analyzeImport(importInfo, filePath) {
    const { type, items, module, line } = importInfo;

    // Check for inefficient patterns
    if (this.isInefficient(importInfo)) {
      this.results.inefficientImports.push({
        file: filePath,
        line: line,
        type: type,
        module: module,
        items: items,
        issue: this.getIssueDescription(importInfo)
      });
    }

    // Categorize imports
    if (type === 'namespace') {
      this.results.fullLibraryImports.push({
        file: filePath,
        module: module,
        line: line
      });
    } else if (type === 'default') {
      this.results.defaultImports.push({
        file: filePath,
        module: module,
        imported: items[0],
        line: line
      });
    }
  }

  isInefficient(importInfo) {
    const { type, module, items } = importInfo;

    // Large libraries that should use selective imports
    const heavyLibraries = [
      'lodash',
      'moment',
      'date-fns',
      'antd',
      'material-ui',
      '@material-ui/core',
      '@mui/material',
      'react-bootstrap',
      'semantic-ui-react',
      'chart.js',
      'three',
      'gsap',
      'rxjs'
    ];

    // Check for full library imports of heavy libraries
    if (type === 'namespace' && heavyLibraries.some(lib => module.startsWith(lib))) {
      return true;
    }

    // Check for default imports that should be named imports
    if (type === 'default' && heavyLibraries.some(lib => module.startsWith(lib))) {
      return true;
    }

    // Check for importing entire React Native components
    if (type === 'named' && module === 'react-native' && items.length > 10) {
      return true;
    }

    // Check for importing large sets from utility libraries
    if (type === 'named' && module === 'lodash' && items.length > 5) {
      return true;
    }

    return false;
  }

  getIssueDescription(importInfo) {
    const { type, module, items } = importInfo;

    if (type === 'namespace') {
      return `Importing entire ${module} library prevents tree shaking. Consider using selective imports.`;
    }

    if (type === 'default' && ['lodash', 'moment'].includes(module)) {
      return `Default import of ${module} includes entire library. Use selective imports instead.`;
    }

    if (type === 'named' && module === 'react-native' && items.length > 10) {
      return `Importing ${items.length} React Native components in one statement. Consider splitting imports.`;
    }

    if (type === 'named' && module === 'lodash' && items.length > 5) {
      return `Importing ${items.length} lodash functions. Consider using individual lodash modules.`;
    }

    return 'Inefficient import pattern detected.';
  }

  generateRecommendations() {
    const recommendations = [];

    // Group inefficient imports by module
    const moduleGroups = {};
    this.results.inefficientImports.forEach(imp => {
      if (!moduleGroups[imp.module]) {
        moduleGroups[imp.module] = [];
      }
      moduleGroups[imp.module].push(imp);
    });

    Object.entries(moduleGroups).forEach(([module, imports]) => {
      recommendations.push({
        type: 'import-optimization',
        priority: this.getPriorityForModule(module),
        title: `Optimize ${module} imports`,
        description: `Found ${imports.length} inefficient import(s) of ${module}`,
        impact: this.getImpactForModule(module),
        files: [...new Set(imports.map(imp => imp.file))],
        suggestions: this.getSuggestionsForModule(module)
      });
    });

    // General tree shaking recommendations
    if (this.results.fullLibraryImports.length > 0) {
      recommendations.push({
        type: 'tree-shaking',
        priority: 'high',
        title: 'Enable aggressive tree shaking',
        description: `Found ${this.results.fullLibraryImports.length} full library imports that prevent tree shaking`,
        impact: 'High - significantly reduces bundle size',
        suggestions: [
          'Use selective imports instead of namespace imports',
          'Enable sideEffects: false in package.json for libraries that support it',
          'Configure webpack/metro for better dead code elimination'
        ]
      });
    }

    this.results.recommendations = recommendations;
  }

  getPriorityForModule(module) {
    const highPriorityModules = ['lodash', 'moment', 'react-bootstrap', 'antd'];
    const mediumPriorityModules = ['date-fns', 'rxjs', 'three'];
    
    if (highPriorityModules.includes(module)) return 'high';
    if (mediumPriorityModules.includes(module)) return 'medium';
    return 'low';
  }

  getImpactForModule(module) {
    const impacts = {
      'lodash': 'High - lodash is 70KB, selective imports can reduce by 80%',
      'moment': 'High - moment.js is 160KB, consider date-fns alternative',
      'react-native': 'Medium - reduces React Native bundle size',
      'antd': 'High - Ant Design is very large, selective imports essential',
      'three': 'High - Three.js is massive, only import needed components'
    };
    
    return impacts[module] || 'Medium - improves bundle size and tree shaking';
  }

  getSuggestionsForModule(module) {
    const suggestions = {
      'lodash': [
        'Replace: import _ from "lodash" with import map from "lodash/map"',
        'Or use: import { map } from "lodash"',
        'Consider: lodash-es for better tree shaking'
      ],
      'moment': [
        'Consider switching to date-fns for better tree shaking',
        'Use: import moment from "moment/min/moment.min.js" for smaller bundle',
        'Or: import only needed locales'
      ],
      'react-native': [
        'Split large imports into smaller groups',
        'Import components closer to where they are used',
        'Use React.lazy for heavy components'
      ],
      'antd': [
        'Use: import { Button } from "antd" instead of import * as antd',
        'Configure babel-plugin-import for automatic optimization',
        'Import CSS selectively'
      ]
    };

    return suggestions[module] || [
      'Use selective imports instead of namespace imports',
      'Import only what you need',
      'Consider lighter alternatives'
    ];
  }

  generateReport() {
    const outputDir = path.join(this.rootDir, 'bundle-analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate JSON report
    const jsonPath = path.join(outputDir, 'import-analysis-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const mdPath = path.join(outputDir, 'import-analysis-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport());

    console.log(`📊 Reports saved to:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${mdPath}`);
  }

  generateMarkdownReport() {
    const report = [];
    
    report.push('# Import Analysis Report');
    report.push(`Generated: ${this.results.timestamp}\n`);
    
    // Summary
    report.push('## Summary\n');
    report.push(`- **Inefficient imports found**: ${this.results.inefficientImports.length}`);
    report.push(`- **Full library imports**: ${this.results.fullLibraryImports.length}`);
    report.push(`- **Default imports**: ${this.results.defaultImports.length}`);
    report.push(`- **Optimization opportunities**: ${this.results.recommendations.length}\n`);

    // Top inefficient imports
    if (this.results.inefficientImports.length > 0) {
      report.push('## Inefficient Imports\n');
      this.results.inefficientImports.slice(0, 20).forEach(imp => {
        report.push(`### ${imp.file}\n`);
        report.push(`- **Module**: ${imp.module}`);
        report.push(`- **Type**: ${imp.type}`);
        report.push(`- **Issue**: ${imp.issue}`);
        report.push(`- **Code**: \`${imp.line}\`\n`);
      });
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

        if (rec.files) {
          report.push('**Affected files**:\n');
          rec.files.slice(0, 5).forEach(file => {
            report.push(`- ${file}`);
          });
          if (rec.files.length > 5) {
            report.push(`- ... and ${rec.files.length - 5} more`);
          }
          report.push('');
        }
      });
    }

    return report.join('\n');
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new ImportAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = ImportAnalyzer;