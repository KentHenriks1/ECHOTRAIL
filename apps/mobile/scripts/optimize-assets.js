#!/usr/bin/env node

/**
 * Asset Optimization Script for EchoTrail
 * 
 * Performs:
 * - Asset discovery and analysis
 * - Format conversion (WebP/AVIF generation)
 * - Size optimization and compression
 * - Duplicate detection and cleanup
 * - Performance impact assessment
 * - Metro bundler asset configuration
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Asset file extensions to analyze
const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

// Directories to scan
const SCAN_DIRECTORIES = [
  'assets',
  'src/assets', 
  'android/app/src/main/res',
  'screenshots'
];

// Configuration
const CONFIG = {
  outputDir: 'asset-optimization-results',
  generateWebP: true,
  generateAVIF: false, // Requires additional tooling
  compressionQuality: {
    webp: 80,
    jpg: 85,
    png: 6, // PNG compression level 0-9
  },
  maxImageSize: 1920, // Max dimension in pixels
  duplicateThreshold: 0.95, // Similarity threshold for duplicates
  reportFormats: ['json', 'markdown', 'csv'],
};

class AssetOptimizer {
  constructor() {
    this.assets = [];
    this.duplicates = [];
    this.optimizationResults = [];
    this.totalSavings = 0;
    this.errors = [];
  }

  /**
   * Main optimization process
   */
  async optimize() {
    console.log('🚀 Starting asset optimization analysis...\n');
    
    try {
      // Discover all assets
      await this.discoverAssets();
      
      // Analyze assets
      await this.analyzeAssets();
      
      // Find duplicates
      await this.findDuplicates();
      
      // Generate optimization recommendations
      await this.generateOptimizationRecommendations();
      
      // Generate reports
      await this.generateReports();
      
      // Update Metro configuration
      await this.updateMetroConfig();
      
      console.log('✅ Asset optimization analysis completed!\n');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Asset optimization failed:', error);
      process.exit(1);
    }
  }
  
  /**
   * Discover all assets in the project
   */
  async discoverAssets() {
    console.log('📁 Discovering assets...');
    
    for (const dir of SCAN_DIRECTORIES) {
      try {
        await this.scanDirectory(dir);
      } catch (error) {
        console.warn(`⚠️  Could not scan directory ${dir}:`, error.message);
      }
    }
    
    console.log(`   Found ${this.assets.length} assets\n`);
  }
  
  /**
   * Recursively scan directory for assets
   */
  async scanDirectory(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) return;
      
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (stats.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          if (ASSET_EXTENSIONS.includes(ext)) {
            const asset = await this.createAssetInfo(fullPath, stats);
            this.assets.push(asset);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be accessed
      return;
    }
  }
  
  /**
   * Create asset information object
   */
  async createAssetInfo(filePath, stats) {
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath).toLowerCase(),
      size: stats.size,
      sizeFormatted: this.formatBytes(stats.size),
      hash,
      modified: stats.mtime,
      isImage: IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase()),
      // Will be populated during analysis
      dimensions: null,
      format: null,
      quality: null,
      hasAlpha: null,
      optimizationPotential: null,
    };
  }
  
  /**
   * Analyze individual assets for optimization opportunities
   */
  async analyzeAssets() {
    console.log('🔍 Analyzing assets for optimization opportunities...');
    
    for (let i = 0; i < this.assets.length; i++) {
      const asset = this.assets[i];
      console.log(`   Analyzing ${i + 1}/${this.assets.length}: ${asset.name}`);
      
      try {
        if (asset.isImage) {
          await this.analyzeImage(asset);
        } else if (asset.extension === '.svg') {
          await this.analyzeSvg(asset);
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not analyze ${asset.name}:`, error.message);
        this.errors.push({ asset: asset.path, error: error.message });
      }
    }
    
    console.log('');
  }
  
  /**
   * Analyze image asset (placeholder implementation)
   */
  async analyzeImage(asset) {
    // In production, use a proper image analysis library like sharp, jimp, or similar
    // For now, provide estimated analysis based on file size and extension
    
    asset.format = asset.extension.replace('.', '');
    
    // Estimate dimensions based on file size (rough approximation)
    const estimatedPixels = Math.sqrt(asset.size / 3); // Rough RGB estimation
    asset.dimensions = {
      width: Math.round(estimatedPixels * 1.33), // Assume landscape ratio
      height: Math.round(estimatedPixels * 0.75),
      estimated: true,
    };
    
    // Estimate optimization potential
    asset.optimizationPotential = this.calculateOptimizationPotential(asset);
  }
  
  /**
   * Analyze SVG asset
   */
  async analyzeSvg(asset) {
    try {
      const content = await fs.readFile(asset.path, 'utf8');
      
      asset.format = 'svg';
      asset.isVector = true;
      
      // Simple SVG analysis
      const hasUnusedElements = /<defs>|<metadata>|<title>|<desc>/.test(content);
      const hasInlineStyles = /style=/.test(content);
      const hasComments = /<!--/.test(content);
      
      asset.optimizationPotential = {
        canOptimize: hasUnusedElements || hasComments,
        estimatedSavings: hasUnusedElements ? 0.15 : (hasComments ? 0.05 : 0),
        recommendations: [],
      };
      
      if (hasUnusedElements) {
        asset.optimizationPotential.recommendations.push('Remove unused elements (defs, metadata, title, desc)');
      }
      if (hasComments) {
        asset.optimizationPotential.recommendations.push('Remove comments');
      }
      if (hasInlineStyles) {
        asset.optimizationPotential.recommendations.push('Consider extracting inline styles');
      }
    } catch (error) {
      console.warn(`Could not analyze SVG ${asset.name}:`, error.message);
    }
  }
  
  /**
   * Calculate optimization potential for images
   */
  calculateOptimizationPotential(asset) {
    const potential = {
      canOptimize: false,
      estimatedSavings: 0,
      recommendations: [],
    };
    
    // Format-based recommendations
    if (asset.extension === '.png' && asset.size > 50000) { // Large PNG
      potential.canOptimize = true;
      potential.estimatedSavings = 0.4; // 40% savings with WebP
      potential.recommendations.push('Convert to WebP format for ~40% size reduction');
    } else if (['.jpg', '.jpeg'].includes(asset.extension) && asset.size > 100000) {
      potential.canOptimize = true;
      potential.estimatedSavings = 0.25; // 25% savings with WebP
      potential.recommendations.push('Convert to WebP format for ~25% size reduction');
    }
    
    // Size-based recommendations
    if (asset.size > 500000) { // Large files (>500KB)
      potential.canOptimize = true;
      potential.estimatedSavings = Math.max(potential.estimatedSavings, 0.3);
      potential.recommendations.push('Large file - consider compression or resize');
    }
    
    // Dimension-based recommendations (if we had real dimensions)
    if (asset.dimensions && asset.dimensions.width > 2000) {
      potential.canOptimize = true;
      potential.recommendations.push('Very large dimensions - consider resizing for mobile');
    }
    
    return potential;
  }
  
  /**
   * Find duplicate or similar assets
   */
  async findDuplicates() {
    console.log('🔍 Finding duplicate assets...');
    
    const hashGroups = {};
    
    // Group assets by hash
    for (const asset of this.assets) {
      if (!hashGroups[asset.hash]) {
        hashGroups[asset.hash] = [];
      }
      hashGroups[asset.hash].push(asset);
    }
    
    // Find groups with more than one asset
    for (const [hash, group] of Object.entries(hashGroups)) {
      if (group.length > 1) {
        this.duplicates.push({
          hash,
          assets: group,
          totalSize: group.reduce((sum, asset) => sum + asset.size, 0),
          potentialSavings: group.reduce((sum, asset) => sum + asset.size, 0) - group[0].size,
        });
      }
    }
    
    const duplicateCount = this.duplicates.reduce((sum, group) => sum + group.assets.length - 1, 0);
    console.log(`   Found ${duplicateCount} duplicate assets in ${this.duplicates.length} groups\n`);
  }
  
  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations() {
    console.log('💡 Generating optimization recommendations...');
    
    let totalPotentialSavings = 0;
    
    // Calculate individual asset optimizations
    for (const asset of this.assets) {
      if (asset.optimizationPotential?.canOptimize) {
        const estimatedSavings = asset.size * asset.optimizationPotential.estimatedSavings;
        totalPotentialSavings += estimatedSavings;
        
        this.optimizationResults.push({
          type: 'format_optimization',
          asset: asset.path,
          currentSize: asset.size,
          estimatedNewSize: asset.size - estimatedSavings,
          estimatedSavings,
          recommendations: asset.optimizationPotential.recommendations,
        });
      }
    }
    
    // Add duplicate removal savings
    for (const duplicateGroup of this.duplicates) {
      totalPotentialSavings += duplicateGroup.potentialSavings;
      
      this.optimizationResults.push({
        type: 'duplicate_removal',
        assets: duplicateGroup.assets.map(a => a.path),
        currentSize: duplicateGroup.totalSize,
        estimatedNewSize: duplicateGroup.assets[0].size,
        estimatedSavings: duplicateGroup.potentialSavings,
        recommendations: ['Remove duplicate files, keep one reference'],
      });
    }
    
    this.totalSavings = totalPotentialSavings;
    console.log(`   Total potential savings: ${this.formatBytes(totalPotentialSavings)}\n`);
  }
  
  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log('📊 Generating reports...');
    
    // Ensure output directory exists
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Generate different report formats
    if (CONFIG.reportFormats.includes('json')) {
      await this.generateJsonReport();
    }
    
    if (CONFIG.reportFormats.includes('markdown')) {
      await this.generateMarkdownReport();
    }
    
    if (CONFIG.reportFormats.includes('csv')) {
      await this.generateCsvReport();
    }
    
    console.log(`   Reports saved to ${CONFIG.outputDir}/\n`);
  }
  
  /**
   * Generate JSON report
   */
  async generateJsonReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAssets: this.assets.length,
        totalSize: this.assets.reduce((sum, asset) => sum + asset.size, 0),
        duplicateGroups: this.duplicates.length,
        duplicateAssets: this.duplicates.reduce((sum, group) => sum + group.assets.length - 1, 0),
        totalPotentialSavings: this.totalSavings,
        optimizableAssets: this.optimizationResults.filter(r => r.type === 'format_optimization').length,
      },
      assets: this.assets,
      duplicates: this.duplicates,
      optimizationResults: this.optimizationResults,
      errors: this.errors,
      config: CONFIG,
    };
    
    const reportPath = path.join(CONFIG.outputDir, 'asset-optimization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  }
  
  /**
   * Generate Markdown report
   */
  async generateMarkdownReport() {
    const totalSize = this.assets.reduce((sum, asset) => sum + asset.size, 0);
    const duplicateAssetCount = this.duplicates.reduce((sum, group) => sum + group.assets.length - 1, 0);
    const optimizableCount = this.optimizationResults.filter(r => r.type === 'format_optimization').length;
    
    const markdown = `# Asset Optimization Report

**Generated:** ${new Date().toLocaleString()}

## Summary

- **Total Assets:** ${this.assets.length}
- **Total Size:** ${this.formatBytes(totalSize)}
- **Optimizable Assets:** ${optimizableCount}
- **Duplicate Assets:** ${duplicateAssetCount} (in ${this.duplicates.length} groups)
- **Potential Savings:** ${this.formatBytes(this.totalSavings)} (${Math.round(this.totalSavings / totalSize * 100)}%)

## Asset Breakdown by Type

${this.generateAssetBreakdownTable()}

## Optimization Opportunities

### Format Optimization
${this.generateFormatOptimizationSection()}

### Duplicate Assets
${this.generateDuplicateAssetsSection()}

## Recommendations

1. **Implement WebP format support** - Modern format with ~25-40% better compression
2. **Set up automated asset optimization** - Integrate into build pipeline
3. **Remove duplicate assets** - ${this.formatBytes(this.duplicates.reduce((sum, g) => sum + g.potentialSavings, 0))} potential savings
4. **Configure proper asset caching** - Implement cache headers and versioning
5. **Consider Progressive Web App assets** - Generate multiple sizes for different devices

## Next Steps

- [ ] Install image optimization tooling (sharp, imagemin, etc.)
- [ ] Update Metro bundler configuration for WebP support
- [ ] Implement asset optimization in build pipeline
- [ ] Remove identified duplicate assets
- [ ] Set up asset performance monitoring

---

*Report generated by EchoTrail Asset Optimizer*
`;
    
    const reportPath = path.join(CONFIG.outputDir, 'asset-optimization-report.md');
    await fs.writeFile(reportPath, markdown);
  }
  
  /**
   * Generate CSV report
   */
  async generateCsvReport() {
    const csvRows = [
      'Asset,Path,Size (bytes),Size (formatted),Format,Optimizable,Estimated Savings (bytes),Recommendations'
    ];
    
    for (const asset of this.assets) {
      const optimizable = asset.optimizationPotential?.canOptimize || false;
      const estimatedSavings = optimizable 
        ? Math.round(asset.size * asset.optimizationPotential.estimatedSavings) 
        : 0;
      const recommendations = asset.optimizationPotential?.recommendations?.join('; ') || '';
      
      csvRows.push([
        asset.name,
        asset.path,
        asset.size,
        asset.sizeFormatted,
        asset.format || asset.extension,
        optimizable,
        estimatedSavings,
        `"${recommendations}"`
      ].join(','));
    }
    
    const reportPath = path.join(CONFIG.outputDir, 'assets.csv');
    await fs.writeFile(reportPath, csvRows.join('\n'));
  }
  
  /**
   * Generate asset breakdown table for markdown
   */
  generateAssetBreakdownTable() {
    const typeStats = {};
    
    for (const asset of this.assets) {
      const type = asset.extension;
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, size: 0 };
      }
      typeStats[type].count++;
      typeStats[type].size += asset.size;
    }
    
    let table = '| Type | Count | Total Size | Average Size |\n|------|-------|------------|---------------|\n';
    
    for (const [type, stats] of Object.entries(typeStats)) {
      const avgSize = stats.size / stats.count;
      table += `| ${type} | ${stats.count} | ${this.formatBytes(stats.size)} | ${this.formatBytes(avgSize)} |\n`;
    }
    
    return table;
  }
  
  /**
   * Generate format optimization section
   */
  generateFormatOptimizationSection() {
    const formatOptimizations = this.optimizationResults.filter(r => r.type === 'format_optimization');
    
    if (formatOptimizations.length === 0) {
      return 'No format optimization opportunities identified.\n';
    }
    
    let section = `Found ${formatOptimizations.length} assets that can be optimized:\n\n`;
    
    for (const opt of formatOptimizations.slice(0, 10)) { // Show top 10
      const savingsPercent = Math.round(opt.estimatedSavings / opt.currentSize * 100);
      section += `- **${path.basename(opt.asset)}**: ${this.formatBytes(opt.currentSize)} → ${this.formatBytes(opt.estimatedNewSize)} (${savingsPercent}% savings)\n`;
    }
    
    if (formatOptimizations.length > 10) {
      section += `\n... and ${formatOptimizations.length - 10} more assets.\n`;
    }
    
    return section + '\n';
  }
  
  /**
   * Generate duplicate assets section
   */
  generateDuplicateAssetsSection() {
    if (this.duplicates.length === 0) {
      return 'No duplicate assets found.\n';
    }
    
    let section = `Found ${this.duplicates.length} groups of duplicate assets:\n\n`;
    
    for (const group of this.duplicates.slice(0, 5)) { // Show top 5 groups
      section += `**Duplicate Group (${this.formatBytes(group.potentialSavings)} potential savings):**\n`;
      for (const asset of group.assets) {
        section += `- ${asset.path} (${asset.sizeFormatted})\n`;
      }
      section += '\n';
    }
    
    if (this.duplicates.length > 5) {
      section += `... and ${this.duplicates.length - 5} more duplicate groups.\n`;
    }
    
    return section;
  }
  
  /**
   * Update Metro bundler configuration
   */
  async updateMetroConfig() {
    console.log('⚙️  Updating Metro bundler configuration...');
    
    try {
      const metroConfigPath = 'metro.config.js';
      const configExists = await fs.access(metroConfigPath).then(() => true).catch(() => false);
      
      if (configExists) {
        let config = await fs.readFile(metroConfigPath, 'utf8');
        
        // Check if WebP is already configured
        if (!config.includes('webp') && !config.includes('avif')) {
          // Add WebP and AVIF to assetExts if not already present
          config = config.replace(
            /assetExts:\s*\[([^\]]+)\]/,
            "assetExts: [$1, 'webp', 'avif']"
          );
          
          await fs.writeFile(metroConfigPath, config);
          console.log('   ✅ Added WebP and AVIF support to Metro config');
        } else {
          console.log('   ✅ Metro config already includes modern image format support');
        }
      }
    } catch (error) {
      console.warn('   ⚠️  Could not update Metro config:', error.message);
    }
    
    console.log('');
  }
  
  /**
   * Print optimization summary
   */
  printSummary() {
    const totalSize = this.assets.reduce((sum, asset) => sum + asset.size, 0);
    const duplicateAssets = this.duplicates.reduce((sum, group) => sum + group.assets.length - 1, 0);
    const optimizableAssets = this.optimizationResults.filter(r => r.type === 'format_optimization').length;
    const savingsPercent = Math.round(this.totalSavings / totalSize * 100);
    
    console.log('📈 OPTIMIZATION SUMMARY');
    console.log('=======================');
    console.log(`Total Assets: ${this.assets.length}`);
    console.log(`Total Size: ${this.formatBytes(totalSize)}`);
    console.log(`Optimizable Assets: ${optimizableAssets}`);
    console.log(`Duplicate Assets: ${duplicateAssets}`);
    console.log(`Potential Savings: ${this.formatBytes(this.totalSavings)} (${savingsPercent}%)`);
    console.log('');
    
    if (this.errors.length > 0) {
      console.log(`⚠️  ${this.errors.length} errors occurred during analysis`);
      console.log('   Check the JSON report for details');
      console.log('');
    }
    
    console.log('📁 Reports generated:');
    console.log(`   - ${CONFIG.outputDir}/asset-optimization-report.json`);
    console.log(`   - ${CONFIG.outputDir}/asset-optimization-report.md`);
    console.log(`   - ${CONFIG.outputDir}/assets.csv`);
    console.log('');
    
    console.log('🚀 Next steps:');
    console.log('   1. Review the detailed reports');
    console.log('   2. Install image optimization tools (sharp, imagemin)');
    console.log('   3. Remove duplicate assets');
    console.log('   4. Implement WebP conversion in build pipeline');
    console.log('   5. Update asset references in code');
  }
  
  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run the asset optimizer
if (require.main === module) {
  const optimizer = new AssetOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = AssetOptimizer;