#!/usr/bin/env node
/**
 * Dependency Optimization Tool
 * Analyzes dependencies for size optimization opportunities and suggests alternatives
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DependencyOptimizer {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.results = {
      timestamp: new Date().toISOString(),
      currentDependencies: {},
      sizingAnalysis: {},
      optimizationOpportunities: [],
      alternativeRecommendations: [],
      duplicatePackages: [],
      recommendations: []
    };
    
    // Known lightweight alternatives
    this.alternatives = {
      'lodash': {
        alternatives: ['lodash-es', 'rambda', 'individual lodash modules'],
        savings: '80-90%',
        description: 'Use selective imports or lighter alternatives',
        migration: 'Replace import _ from "lodash" with import map from "lodash/map"'
      },
      'moment': {
        alternatives: ['date-fns', 'dayjs', 'luxon'],
        savings: '85%',
        description: 'Modern date libraries with better tree shaking',
        migration: 'Replace moment with date-fns for better performance'
      },
      'react-bootstrap': {
        alternatives: ['react-native-elements', 'native-base', 'tamagui'],
        savings: '60-70%',
        description: 'React Native specific UI libraries',
        migration: 'Use React Native specific alternatives'
      },
      '@material-ui/core': {
        alternatives: ['@mui/material', 'react-native-paper'],
        savings: '40-60%',
        description: 'Newer versions or React Native alternatives',
        migration: 'Upgrade to @mui/material or use React Native Paper'
      },
      'axios': {
        alternatives: ['fetch API', 'ky-universal', 'redaxios'],
        savings: '70-90%',
        description: 'Native fetch or lighter HTTP clients',
        migration: 'Use native fetch API or lighter alternatives'
      },
      'uuid': {
        alternatives: ['crypto.randomUUID()', 'nanoid'],
        savings: '80%',
        description: 'Native API or smaller alternatives',
        migration: 'Use crypto.randomUUID() for modern browsers'
      },
      'classnames': {
        alternatives: ['clsx'],
        savings: '50%',
        description: 'Smaller and faster alternative',
        migration: 'Drop-in replacement with clsx'
      },
      'prop-types': {
        alternatives: ['TypeScript'],
        savings: '100%',
        description: 'Use TypeScript for type checking',
        migration: 'Remove prop-types and use TypeScript interfaces'
      }
    };
    
    // Bundle size impact categories
    this.impactCategories = {
      critical: { min: 1024 * 1024, description: 'Over 1MB' },        // 1MB+
      high: { min: 500 * 1024, description: '500KB - 1MB' },          // 500KB+
      medium: { min: 100 * 1024, description: '100KB - 500KB' },      // 100KB+
      low: { min: 50 * 1024, description: '50KB - 100KB' },           // 50KB+
      minimal: { min: 0, description: 'Under 50KB' }                  // <50KB
    };
  }

  async run() {
    console.log('🔍 Starting comprehensive dependency optimization analysis...\n');

    try {
      // Load package.json
      await this.loadDependencies();
      
      // Analyze dependency sizes
      await this.analyzeDependencySizes();
      
      // Find optimization opportunities
      await this.findOptimizationOpportunities();
      
      // Detect duplicate packages
      await this.findDuplicatePackages();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Generate report
      this.generateReport();

      console.log('✅ Dependency optimization analysis complete!');
      console.log(`📊 Analyzed ${Object.keys(this.results.currentDependencies).length} dependencies`);
      console.log(`💡 Found ${this.results.optimizationOpportunities.length} optimization opportunities`);
      console.log(`🔄 Found ${this.results.alternativeRecommendations.length} alternative recommendations`);

    } catch (error) {
      console.error('❌ Dependency optimization analysis failed:', error.message);
      process.exit(1);
    }
  }

  async loadDependencies() {
    console.log('📋 Loading dependencies from package.json...');
    
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    this.results.currentDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    console.log(`✅ Loaded ${Object.keys(this.results.currentDependencies).length} dependencies`);
  }

  async analyzeDependencySizes() {
    console.log('📊 Analyzing dependency sizes...');
    
    for (const [name, version] of Object.entries(this.results.currentDependencies)) {
      try {
        const size = await this.getDependencySize(name);
        const impact = this.categorizeImpact(size);
        
        this.results.sizingAnalysis[name] = {
          version,
          size,
          sizeFormatted: this.formatBytes(size),
          impact,
          hasAlternative: name in this.alternatives
        };
        
      } catch (error) {
        console.warn(`Warning: Could not analyze ${name}:`, error.message);
      }
    }
    
    console.log(`✅ Analyzed sizes for ${Object.keys(this.results.sizingAnalysis).length} dependencies`);
  }

  async getDependencySize(packageName) {
    try {
      const packagePath = path.join(this.rootDir, 'node_modules', packageName);
      if (fs.existsSync(packagePath)) {
        return this.getDirectorySize(packagePath);
      }
    } catch (error) {
      return 0;
    }
    return 0;
  }

  getDirectorySize(dirPath) {
    let size = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          // Skip nested node_modules for main package size
          if (file !== 'node_modules') {
            size += this.getDirectorySize(filePath);
          }
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return size;
  }

  categorizeImpact(size) {
    for (const [category, config] of Object.entries(this.impactCategories)) {
      if (size >= config.min) {
        return {
          category,
          description: config.description,
          priority: this.getPriorityForCategory(category)
        };
      }
    }
    return {
      category: 'minimal',
      description: 'Under 50KB',
      priority: 'low'
    };
  }

  getPriorityForCategory(category) {
    const priorities = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      minimal: 'low'
    };
    return priorities[category] || 'low';
  }

  async findOptimizationOpportunities() {
    console.log('🔍 Finding optimization opportunities...');
    
    Object.entries(this.results.sizingAnalysis).forEach(([name, analysis]) => {
      // Large dependencies that could be optimized
      if (analysis.impact.category === 'critical' || analysis.impact.category === 'high') {
        this.results.optimizationOpportunities.push({
          package: name,
          size: analysis.size,
          sizeFormatted: analysis.sizeFormatted,
          impact: analysis.impact,
          type: 'large-dependency',
          description: `Large dependency: ${analysis.sizeFormatted}`,
          hasAlternative: analysis.hasAlternative
        });
      }
      
      // Dependencies with known better alternatives
      if (analysis.hasAlternative) {
        const alternative = this.alternatives[name];
        this.results.alternativeRecommendations.push({
          package: name,
          currentSize: analysis.size,
          currentSizeFormatted: analysis.sizeFormatted,
          alternatives: alternative.alternatives,
          potentialSavings: alternative.savings,
          description: alternative.description,
          migration: alternative.migration,
          priority: analysis.impact.priority
        });
      }
    });
    
    console.log(`✅ Found ${this.results.optimizationOpportunities.length} optimization opportunities`);
  }

  async findDuplicatePackages() {
    console.log('🔍 Looking for duplicate packages...');
    
    try {
      // Use npm ls to find duplicates
      const output = execSync('npm ls --depth=0 --json', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const lsData = JSON.parse(output);
      
      // Check for version conflicts in dependencies
      const packageVersions = {};
      
      Object.entries(this.results.currentDependencies).forEach(([name, version]) => {
        const cleanName = name.split('/').pop(); // Remove scope if exists
        if (!packageVersions[cleanName]) {
          packageVersions[cleanName] = [];
        }
        packageVersions[cleanName].push({ name, version });
      });
      
      Object.entries(packageVersions).forEach(([cleanName, packages]) => {
        if (packages.length > 1) {
          this.results.duplicatePackages.push({
            packageName: cleanName,
            instances: packages,
            type: 'version-conflict'
          });
        }
      });
      
    } catch (error) {
      console.warn('Warning: Could not analyze for duplicates:', error.message);
    }
    
    console.log(`✅ Found ${this.results.duplicatePackages.length} potential duplicate packages`);
  }

  generateRecommendations() {
    const recommendations = [];

    // Critical size optimization recommendations
    const criticalDeps = this.results.optimizationOpportunities.filter(
      op => op.impact.category === 'critical'
    );
    
    if (criticalDeps.length > 0) {
      recommendations.push({
        type: 'critical-size-optimization',
        priority: 'critical',
        title: 'Critical: Optimize large dependencies',
        description: `Found ${criticalDeps.length} dependencies over 1MB that critically impact bundle size`,
        impact: 'Critical - significantly affects app startup time and download size',
        packages: criticalDeps.map(dep => ({
          name: dep.package,
          size: dep.sizeFormatted,
          hasAlternative: dep.hasAlternative
        })),
        suggestions: [
          'Consider replacing with lighter alternatives',
          'Implement selective imports to reduce bundle size',
          'Evaluate if the dependency is truly necessary',
          'Use dynamic imports for non-critical functionality'
        ]
      });
    }

    // Alternative package recommendations
    const highImpactAlternatives = this.results.alternativeRecommendations.filter(
      alt => alt.priority === 'high' || alt.priority === 'critical'
    );
    
    if (highImpactAlternatives.length > 0) {
      recommendations.push({
        type: 'alternative-packages',
        priority: 'high',
        title: 'Replace with lighter alternatives',
        description: `Found ${highImpactAlternatives.length} packages with proven lighter alternatives`,
        impact: 'High - can reduce bundle size by 40-90%',
        alternatives: highImpactAlternatives.slice(0, 10),
        suggestions: [
          'Evaluate migration effort vs bundle size benefits',
          'Start with dependencies that have drop-in replacements',
          'Test alternatives in development environment first',
          'Consider gradual migration for complex replacements'
        ]
      });
    }

    // Duplicate package recommendations
    if (this.results.duplicatePackages.length > 0) {
      recommendations.push({
        type: 'duplicate-packages',
        priority: 'medium',
        title: 'Resolve duplicate packages',
        description: `Found ${this.results.duplicatePackages.length} potential duplicate packages`,
        impact: 'Medium - eliminates redundant code in bundle',
        duplicates: this.results.duplicatePackages,
        suggestions: [
          'Consolidate package versions where possible',
          'Use pnpm overrides to force specific versions',
          'Remove conflicting dependencies',
          'Update dependencies to compatible versions'
        ]
      });
    }

    // General optimization recommendations
    const mediumImpactDeps = this.results.optimizationOpportunities.filter(
      op => op.impact.category === 'high' || op.impact.category === 'medium'
    );
    
    if (mediumImpactDeps.length > 0) {
      recommendations.push({
        type: 'general-optimization',
        priority: 'medium',
        title: 'General dependency optimization',
        description: `${mediumImpactDeps.length} dependencies can be optimized for better performance`,
        impact: 'Medium - improves overall bundle efficiency',
        packages: mediumImpactDeps.slice(0, 15).map(dep => ({
          name: dep.package,
          size: dep.sizeFormatted,
          impact: dep.impact.category
        })),
        suggestions: [
          'Implement selective imports where possible',
          'Remove unused features and plugins',
          'Consider lazy loading for optional dependencies',
          'Regular audit to prevent dependency bloat'
        ]
      });
    }

    // Development vs Production separation
    const largeDevDeps = Object.entries(this.results.sizingAnalysis)
      .filter(([name, analysis]) => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
        return packageJson.devDependencies && packageJson.devDependencies[name] && 
               analysis.impact.category !== 'minimal' && analysis.impact.category !== 'low';
      });

    if (largeDevDeps.length > 0) {
      recommendations.push({
        type: 'dev-dependency-optimization',
        priority: 'low',
        title: 'Optimize development dependencies',
        description: `${largeDevDeps.length} development dependencies are larger than necessary`,
        impact: 'Low - affects development environment performance',
        packages: largeDevDeps.slice(0, 10).map(([name, analysis]) => ({
          name,
          size: analysis.sizeFormatted,
          impact: analysis.impact.category
        })),
        suggestions: [
          'Consider lighter development alternatives',
          'Remove unused development tools',
          'Use tool-specific configurations to reduce features',
          'Regular cleanup of development dependencies'
        ]
      });
    }

    this.results.recommendations = recommendations;
  }

  generateReport() {
    const outputDir = path.join(this.rootDir, 'bundle-analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate JSON report
    const jsonPath = path.join(outputDir, 'dependency-optimization-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const mdPath = path.join(outputDir, 'dependency-optimization-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport());

    console.log(`📊 Reports saved to:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${mdPath}`);
  }

  generateMarkdownReport() {
    const report = [];
    
    report.push('# Dependency Optimization Report');
    report.push(`Generated: ${this.results.timestamp}\n`);
    
    // Summary
    report.push('## Summary\n');
    report.push(`- **Total dependencies analyzed**: ${Object.keys(this.results.currentDependencies).length}`);
    report.push(`- **Large dependencies (>100KB)**: ${Object.values(this.results.sizingAnalysis).filter(a => a.impact.category !== 'minimal' && a.impact.category !== 'low').length}`);
    report.push(`- **Critical dependencies (>1MB)**: ${Object.values(this.results.sizingAnalysis).filter(a => a.impact.category === 'critical').length}`);
    report.push(`- **Packages with alternatives**: ${this.results.alternativeRecommendations.length}`);
    report.push(`- **Potential duplicates**: ${this.results.duplicatePackages.length}`);
    report.push(`- **Optimization opportunities**: ${this.results.optimizationOpportunities.length}\n`);

    // Top largest dependencies
    const sortedBySize = Object.entries(this.results.sizingAnalysis)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 20);
    
    report.push('## Largest Dependencies\n');
    sortedBySize.forEach(([name, analysis]) => {
      const indicator = analysis.hasAlternative ? ' 🔄' : '';
      const impact = analysis.impact.category === 'critical' ? ' ⚠️' : '';
      report.push(`- **${name}**: ${analysis.sizeFormatted} (${analysis.impact.description})${indicator}${impact}`);
    });
    report.push('');

    // Alternative recommendations
    if (this.results.alternativeRecommendations.length > 0) {
      report.push('## Alternative Package Recommendations\n');
      this.results.alternativeRecommendations.forEach(alt => {
        report.push(`### ${alt.package} → ${alt.alternatives.join(' / ')}\n`);
        report.push(`- **Current size**: ${alt.currentSizeFormatted}`);
        report.push(`- **Potential savings**: ${alt.potentialSavings}`);
        report.push(`- **Description**: ${alt.description}`);
        report.push(`- **Migration**: ${alt.migration}\n`);
      });
    }

    // Optimization recommendations
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

        if (rec.packages) {
          report.push('**Affected packages**:\n');
          rec.packages.slice(0, 10).forEach(pkg => {
            report.push(`- ${pkg.name}: ${pkg.size}`);
          });
          if (rec.packages.length > 10) {
            report.push(`- ... and ${rec.packages.length - 10} more`);
          }
          report.push('');
        }

        if (rec.alternatives) {
          report.push('**Top alternatives**:\n');
          rec.alternatives.slice(0, 5).forEach(alt => {
            report.push(`- ${alt.package} → ${alt.alternatives.join('/')} (save ${alt.potentialSavings})`);
          });
          report.push('');
        }
      });
    }

    // Bundle size impact categories
    report.push('## Bundle Size Impact Analysis\n');
    Object.entries(this.impactCategories).forEach(([category, config]) => {
      const count = Object.values(this.results.sizingAnalysis)
        .filter(a => a.impact.category === category).length;
      if (count > 0) {
        report.push(`- **${category.charAt(0).toUpperCase() + category.slice(1)}** (${config.description}): ${count} packages`);
      }
    });

    return report.join('\n');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run the optimizer
if (require.main === module) {
  const optimizer = new DependencyOptimizer();
  optimizer.run().catch(console.error);
}

module.exports = DependencyOptimizer;