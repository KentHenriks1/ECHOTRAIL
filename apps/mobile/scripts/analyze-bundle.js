#!/usr/bin/env node
/**
 * Comprehensive Bundle Analysis Tool
 * Analyzes React Native bundle size, dependencies, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor() {
    this.outputDir = path.join(__dirname, '../bundle-analysis');
    this.distDir = path.join(__dirname, '../dist');
    this.results = {
      timestamp: new Date().toISOString(),
      bundleSizes: {},
      dependencies: {},
      duplicates: [],
      unusedDependencies: [],
      largestFiles: [],
      recommendations: []
    };
  }

  async run() {
    console.log('🔍 Starting comprehensive bundle analysis...\n');
    
    try {
      // Create output directory
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // Step 1: Generate bundle
      await this.generateBundle();
      
      // Step 2: Analyze bundle sizes
      await this.analyzeBundleSizes();
      
      // Step 3: Analyze dependencies
      await this.analyzeDependencies();
      
      // Step 4: Find duplicate dependencies
      await this.findDuplicates();
      
      // Step 5: Analyze source maps
      await this.analyzeSourceMaps();
      
      // Step 6: Generate recommendations
      await this.generateRecommendations();
      
      // Step 7: Generate final report
      await this.generateReport();
      
      console.log('\n✅ Bundle analysis complete!');
      console.log(`📊 Report saved to: ${path.join(this.outputDir, 'bundle-analysis-report.json')}`);
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  async generateBundle() {
    console.log('📦 Generating production bundle...');
    
    try {
      execSync('npx expo export --platform all --source-maps --clear', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ Bundle generated successfully\n');
    } catch (error) {
      throw new Error(`Failed to generate bundle: ${error.message}`);
    }
  }

  async analyzeBundleSizes() {
    console.log('📊 Analyzing bundle sizes...');
    
    const platforms = ['android', 'ios'];
    
    for (const platform of platforms) {
      const bundleDir = path.join(this.distDir, '_expo/static/js', platform);
      
      if (fs.existsSync(bundleDir)) {
        const files = fs.readdirSync(bundleDir);
        const bundleFiles = files.filter(f => f.endsWith('.hbc') && !f.endsWith('.map'));
        
        for (const file of bundleFiles) {
          const filePath = path.join(bundleDir, file);
          const stats = fs.statSync(filePath);
          
          this.results.bundleSizes[`${platform}_${file}`] = {
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            path: filePath
          };
        }
      }
    }
    
    console.log('✅ Bundle size analysis complete\n');
  }

  async analyzeDependencies() {
    console.log('📋 Analyzing dependencies...');
    
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Analyze each dependency
    for (const [name, version] of Object.entries(dependencies)) {
      try {
        const depPath = path.join(__dirname, '../node_modules', name, 'package.json');
        if (fs.existsSync(depPath)) {
          const depPackage = JSON.parse(fs.readFileSync(depPath, 'utf8'));
          
          this.results.dependencies[name] = {
            version,
            description: depPackage.description,
            dependencies: Object.keys(depPackage.dependencies || {}),
            size: await this.estimatePackageSize(name)
          };
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze dependency ${name}:`, error.message);
      }
    }
    
    console.log('✅ Dependency analysis complete\n');
  }

  async estimatePackageSize(packageName) {
    try {
      const packagePath = path.join(__dirname, '../node_modules', packageName);
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
          size += this.getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return size;
  }

  async findDuplicates() {
    console.log('🔍 Looking for duplicate dependencies...');
    
    try {
      // Use dependency-cruiser to find duplicates
      const cruiserOutput = execSync('npx depcruise --output-type json src', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      const cruiserData = JSON.parse(cruiserOutput);
      
      // Analyze for potential duplicates
      const moduleOccurrences = {};
      
      if (cruiserData.modules) {
        cruiserData.modules.forEach(module => {
          const moduleName = module.source;
          const baseName = moduleName.split('/')[0].replace('node_modules/', '');
          
          if (!moduleOccurrences[baseName]) {
            moduleOccurrences[baseName] = [];
          }
          moduleOccurrences[baseName].push(moduleName);
        });
      }
      
      // Find actual duplicates
      this.results.duplicates = Object.entries(moduleOccurrences)
        .filter(([name, occurrences]) => occurrences.length > 1)
        .map(([name, occurrences]) => ({
          package: name,
          occurrences: occurrences.length,
          paths: occurrences
        }));
      
    } catch (error) {
      console.warn('Warning: Could not analyze duplicates:', error.message);
    }
    
    console.log('✅ Duplicate analysis complete\n');
  }

  async analyzeSourceMaps() {
    console.log('🗺️ Analyzing source maps...');
    
    // Find source map files
    const platforms = ['android', 'ios'];
    
    for (const platform of platforms) {
      const bundleDir = path.join(this.distDir, '_expo/static/js', platform);
      
      if (fs.existsSync(bundleDir)) {
        const files = fs.readdirSync(bundleDir);
        const mapFiles = files.filter(f => f.endsWith('.hbc.map'));
        
        for (const mapFile of mapFiles) {
          try {
            console.log(`Analyzing ${platform} source map: ${mapFile}`);
            
            // Use source-map-explorer to analyze
            const outputFile = path.join(this.outputDir, `${platform}-source-map-analysis.html`);
            const mapPath = path.join(bundleDir, mapFile);
            
            execSync(`npx source-map-explorer "${mapPath}" --html "${outputFile}"`, {
              stdio: 'pipe',
              cwd: path.join(__dirname, '..')
            });
            
            console.log(`✅ ${platform} source map analysis saved to ${outputFile}`);
            
          } catch (error) {
            console.warn(`Warning: Could not analyze ${platform} source map:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Source map analysis complete\n');
  }

  async generateRecommendations() {
    console.log('💡 Generating optimization recommendations...');
    
    const recommendations = [];
    
    // Analyze bundle sizes
    const bundleSizes = Object.values(this.results.bundleSizes);
    if (bundleSizes.some(b => b.size > 2 * 1024 * 1024)) {
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        title: 'Bundle size optimization needed',
        description: 'Bundle size exceeds 2MB. Consider implementing more aggressive code splitting.',
        impact: 'High - affects app startup time'
      });
    }

    // Analyze large dependencies
    const largeDeps = Object.entries(this.results.dependencies)
      .filter(([name, info]) => info.size > 500 * 1024)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10);

    if (largeDeps.length > 0) {
      recommendations.push({
        type: 'large-dependencies',
        priority: 'medium',
        title: 'Large dependencies detected',
        description: `Found ${largeDeps.length} dependencies over 500KB: ${largeDeps.map(d => d[0]).join(', ')}`,
        impact: 'Medium - consider lighter alternatives or selective imports',
        details: largeDeps.map(([name, info]) => ({
          package: name,
          size: this.formatBytes(info.size),
          description: info.description
        }))
      });
    }

    // Analyze duplicates
    if (this.results.duplicates.length > 0) {
      recommendations.push({
        type: 'duplicates',
        priority: 'high',
        title: 'Duplicate dependencies found',
        description: `Found ${this.results.duplicates.length} potential duplicate dependencies`,
        impact: 'High - unnecessary bundle size increase',
        details: this.results.duplicates
      });
    }

    // Metro bundler optimizations
    recommendations.push({
      type: 'metro-optimization',
      priority: 'medium',
      title: 'Metro bundler optimization opportunities',
      description: 'Consider implementing advanced Metro configurations for better tree shaking',
      impact: 'Medium - improved dead code elimination'
    });

    this.results.recommendations = recommendations;
    
    console.log(`✅ Generated ${recommendations.length} recommendations\n`);
  }

  async generateReport() {
    console.log('📄 Generating comprehensive report...');
    
    // Generate JSON report
    const reportPath = path.join(this.outputDir, 'bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable report
    const readableReport = this.generateReadableReport();
    const readableReportPath = path.join(this.outputDir, 'bundle-analysis-report.md');
    fs.writeFileSync(readableReportPath, readableReport);
    
    console.log('✅ Reports generated successfully');
  }

  generateReadableReport() {
    const report = [];
    
    report.push('# Bundle Analysis Report');
    report.push(`Generated: ${this.results.timestamp}\n`);
    
    // Bundle sizes
    report.push('## Bundle Sizes\n');
    Object.entries(this.results.bundleSizes).forEach(([name, info]) => {
      report.push(`- **${name}**: ${info.sizeFormatted}`);
    });
    report.push('');
    
    // Top dependencies by size
    const sortedDeps = Object.entries(this.results.dependencies)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 20);
    
    report.push('## Top 20 Dependencies by Size\n');
    sortedDeps.forEach(([name, info]) => {
      report.push(`- **${name}**: ${this.formatBytes(info.size)} - ${info.description || 'No description'}`);
    });
    report.push('');
    
    // Duplicates
    if (this.results.duplicates.length > 0) {
      report.push('## Duplicate Dependencies\n');
      this.results.duplicates.forEach(dup => {
        report.push(`- **${dup.package}**: ${dup.occurrences} occurrences`);
      });
      report.push('');
    }
    
    // Recommendations
    report.push('## Optimization Recommendations\n');
    this.results.recommendations.forEach((rec, index) => {
      report.push(`### ${index + 1}. ${rec.title} (${rec.priority} priority)\n`);
      report.push(rec.description);
      report.push(`\n**Impact**: ${rec.impact}\n`);
      
      if (rec.details && Array.isArray(rec.details)) {
        rec.details.slice(0, 5).forEach(detail => {
          if (typeof detail === 'object') {
            report.push(`- ${detail.package || detail.name}: ${detail.size || detail.occurrences}`);
          }
        });
        report.push('');
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

// Run the analyzer
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = BundleAnalyzer;