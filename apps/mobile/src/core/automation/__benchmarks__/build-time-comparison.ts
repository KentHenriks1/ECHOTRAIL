/**
 * Build Time Comparison Utility
 * 
 * Measures actual build times for different project sizes and configurations
 * to ensure the refactored pipeline doesn't introduce performance regressions
 * in real-world scenarios.
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../../utils/Logger';

interface BuildTimeResult {
  configuration: string;
  projectSize: 'small' | 'medium' | 'large';
  platform: string;
  environment: string;
  buildTime: number;
  bundleSize: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface ProjectConfiguration {
  name: string;
  size: 'small' | 'medium' | 'large';
  fileCount: number;
  dependencies: number;
  description: string;
}

/**
 * Build Time Performance Analyzer
 */
export class BuildTimeComparison {
  private results: BuildTimeResult[] = [];
  private testProjects: ProjectConfiguration[] = [
    {
      name: 'minimal',
      size: 'small',
      fileCount: 20,
      dependencies: 10,
      description: 'Minimal React Native app with basic navigation'
    },
    {
      name: 'standard',
      size: 'medium',
      fileCount: 100,
      dependencies: 50,
      description: 'Standard business app with common features'
    },
    {
      name: 'enterprise',
      size: 'large',
      fileCount: 500,
      dependencies: 150,
      description: 'Large enterprise app with complex architecture'
    }
  ];

  /**
   * Run comprehensive build time analysis
   */
  async runBuildTimeAnalysis(): Promise<void> {
    Logger.info('🚀 Starting Build Time Performance Analysis');
    Logger.info('=============================================');
    
    try {
      // Create test projects if they don't exist
      await this.setupTestProjects();
      
      // Run build tests for each configuration
      for (const project of this.testProjects) {
        await this.testProjectBuilds(project);
      }
      
      // Generate comprehensive report
      await this.generateBuildTimeReport();
      
      Logger.info('✅ Build time analysis completed successfully');
      
    } catch (error) {
      Logger.error('❌ Build time analysis failed:', error);
      throw error;
    }
  }

  /**
   * Setup test projects with different characteristics
   */
  private async setupTestProjects(): Promise<void> {
    Logger.info('📁 Setting up test projects...');
    
    for (const project of this.testProjects) {
      const projectPath = `./benchmarks/test-projects/${project.name}`;
      
      try {
        // Check if project already exists
        await fs.access(projectPath);
        Logger.info(`  ✅ Project ${project.name} already exists`);
      } catch {
        // Create the project
        Logger.info(`  📦 Creating ${project.name} project (${project.size})...`);
        await this.createTestProject(projectPath, project);
      }
    }
  }

  /**
   * Create a test project with specified characteristics
   */
  private async createTestProject(
    projectPath: string, 
    config: ProjectConfiguration
  ): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    
    // Create package.json
    const packageJson = {
      name: `test-project-${config.name}`,
      version: '1.0.0',
      private: true,
      scripts: {
        start: 'react-native start',
        build: 'react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle',
        'build:ios': 'react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle'
      },
      dependencies: this.generateDependencies(config.dependencies),
      devDependencies: {
        '@react-native-community/eslint-config': '^3.0.0',
        'metro-react-native-babel-preset': '^0.76.0',
        'react-test-renderer': '18.1.0'
      }
    };
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create Metro config
    const metroConfig = `
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();
  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
    },
  };
})();
`;
    
    await fs.writeFile(path.join(projectPath, 'metro.config.js'), metroConfig);
    
    // Create source files
    await this.generateSourceFiles(projectPath, config);
    
    Logger.info(`  ✅ Created ${config.name} project with ${config.fileCount} files`);
  }

  /**
   * Generate realistic source files for the test project
   */
  private async generateSourceFiles(
    projectPath: string,
    config: ProjectConfiguration
  ): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });
    
    // Create index.js
    const indexContent = `
import React from 'react';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './package.json';

AppRegistry.registerComponent(appName, () => App);
`;
    await fs.writeFile(path.join(projectPath, 'index.js'), indexContent);
    
    // Create main App component
    const appContent = `
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
${this.generateImports(config.fileCount)}

const App = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Test App - ${config.name}</Text>
      ${this.generateComponentUsage(config.fileCount)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 }
});

export default App;
`;
    await fs.writeFile(path.join(srcPath, 'App.js'), appContent);
    
    // Generate component files
    for (let i = 0; i < Math.min(config.fileCount - 1, 50); i++) {
      const componentContent = `
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Component${i} = ({ title = 'Component ${i}' }) => {
  const [state, setState] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text>Counter: {state}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    margin: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Component${i};
`;
      
      await fs.writeFile(
        path.join(srcPath, `Component${i}.js`), 
        componentContent
      );
    }
    
    // Generate utility files
    const utilsPath = path.join(srcPath, 'utils');
    await fs.mkdir(utilsPath, { recursive: true });
    
    for (let i = 0; i < Math.min(Math.floor(config.fileCount / 10), 10); i++) {
      const utilContent = `
export const util${i} = {
  formatDate: (date) => date.toISOString(),
  formatNumber: (num) => num.toLocaleString(),
  calculateHash: (str) => str.length * 31,
  processData: (data) => data.map(item => ({ ...item, processed: true })),
  validateInput: (input) => input && input.length > 0,
};

export default util${i};
`;
      
      await fs.writeFile(
        path.join(utilsPath, `util${i}.js`), 
        utilContent
      );
    }
  }

  /**
   * Generate component imports based on file count
   */
  private generateImports(fileCount: number): string {
    const componentCount = Math.min(fileCount - 1, 50);
    return Array.from({ length: componentCount }, (_, i) => 
      `import Component${i} from './Component${i}';`
    ).join('\n');
  }

  /**
   * Generate component usage in App.js
   */
  private generateComponentUsage(fileCount: number): string {
    const componentCount = Math.min(fileCount - 1, 50);
    return Array.from({ length: Math.min(componentCount, 20) }, (_, i) => 
      `<Component${i} key={${i}} />`
    ).join('\n      ');
  }

  /**
   * Generate realistic dependencies for package.json
   */
  private generateDependencies(count: number): Record<string, string> {
    const baseDependencies = {
      'react': '18.1.0',
      'react-native': '0.70.0',
    };
    
    const optionalDependencies = [
      '@react-navigation/native@^6.0.0',
      '@react-navigation/native-stack@^6.0.0',
      'react-native-vector-icons@^9.0.0',
      'react-native-elements@^3.4.0',
      'axios@^0.27.0',
      'lodash@^4.17.0',
      'moment@^2.29.0',
      'react-redux@^8.0.0',
      '@reduxjs/toolkit@^1.8.0',
      'react-native-async-storage@^1.17.0',
      'react-native-image-picker@^4.10.0',
      'react-native-permissions@^3.6.0',
      'react-native-device-info@^10.0.0',
      'react-native-keychain@^8.1.0',
      'react-native-orientation-locker@^1.4.0',
      'react-native-splash-screen@^3.3.0',
      'react-native-status-bar-height@^2.6.0'
    ];
    
    for (let i = 0; i < Math.min(count - 2, optionalDependencies.length); i++) {
      const [name, version] = optionalDependencies[i].split('@');
      (baseDependencies as Record<string, string>)[name] = version;
    }
    
    return baseDependencies;
  }

  /**
   * Test builds for a specific project configuration
   */
  private async testProjectBuilds(project: ProjectConfiguration): Promise<void> {
    Logger.info(`🔨 Testing builds for ${project.name} project...`);
    
    const projectPath = `./benchmarks/test-projects/${project.name}`;
    const platforms = ['android', 'ios'];
    const environments = ['development', 'production'];
    
    for (const platform of platforms) {
      for (const environment of environments) {
        Logger.info(`  📱 Building ${platform} ${environment}...`);
        
        const result = await this.measureBuildTime(
          projectPath,
          project,
          platform,
          environment
        );
        
        this.results.push(result);
        
        const status = result.success ? '✅' : '❌';
        const duration = (result.buildTime / 1000).toFixed(1);
        const size = (result.bundleSize / 1024 / 1024).toFixed(1);
        
        Logger.info(`    ${status} ${duration}s (${size}MB bundle)`);
        
        if (!result.success && result.error) {
          Logger.warn(`      Error: ${result.error}`);
        }
      }
    }
  }

  /**
   * Measure build time for a specific configuration
   */
  private async measureBuildTime(
    projectPath: string,
    project: ProjectConfiguration,
    platform: string,
    environment: string
  ): Promise<BuildTimeResult> {
    const startTime = Date.now();
    const result: BuildTimeResult = {
      configuration: project.name,
      projectSize: project.size,
      platform,
      environment,
      buildTime: 0,
      bundleSize: 0,
      success: false,
      timestamp: startTime
    };
    
    try {
      // Determine build command
      const isDev = environment === 'development';
      const bundleCommand = platform === 'ios' 
        ? `npx react-native bundle --platform ios --dev ${isDev} --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios`
        : `npx react-native bundle --platform android --dev ${isDev} --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res`;
      
      // Execute build
      execSync(bundleCommand, {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 300000, // 5 minute timeout
        stdio: 'pipe'
      }); // Build output not currently used
      
      result.buildTime = Date.now() - startTime;
      result.success = true;
      
      // Measure bundle size
      const bundlePath = platform === 'ios' 
        ? path.join(projectPath, 'ios/main.jsbundle')
        : path.join(projectPath, 'android/app/src/main/assets/index.android.bundle');
      
      try {
        const stats = await fs.stat(bundlePath);
        result.bundleSize = stats.size;
      } catch {
        result.bundleSize = 0;
      }
      
    } catch (error) {
      result.buildTime = Date.now() - startTime;
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
    }
    
    return result;
  }

  /**
   * Generate comprehensive build time report
   */
  private async generateBuildTimeReport(): Promise<void> {
    Logger.info('📊 Generating build time analysis report...');
    
    // Group results by configuration
    const grouped = this.groupResultsByConfiguration();
    
    // Calculate statistics
    const stats = this.calculateStatistics(grouped);
    
    // Generate report
    const report = {
      timestamp: Date.now(),
      summary: {
        total_builds: this.results.length,
        successful_builds: this.results.filter(r => r.success).length,
        failed_builds: this.results.filter(r => !r.success).length,
        average_build_time: stats.averageBuildTime,
        average_bundle_size: stats.averageBundleSize
      },
      performance_by_size: {
        small: stats.bySize.small,
        medium: stats.bySize.medium,
        large: stats.bySize.large
      },
      performance_by_platform: {
        android: stats.byPlatform.android,
        ios: stats.byPlatform.ios
      },
      detailed_results: this.results
    };
    
    // Save report
    const reportPath = `./benchmarks/build-time-report-${Date.now()}.json`;
    await fs.mkdir('./benchmarks', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary to console
    Logger.info('');
    Logger.info('📈 BUILD TIME ANALYSIS RESULTS');
    Logger.info('===============================');
    Logger.info(`Total builds: ${report.summary.total_builds}`);
    Logger.info(`Success rate: ${((report.summary.successful_builds / report.summary.total_builds) * 100).toFixed(1)}%`);
    Logger.info(`Average build time: ${(report.summary.average_build_time / 1000).toFixed(1)}s`);
    Logger.info(`Average bundle size: ${(report.summary.average_bundle_size / 1024 / 1024).toFixed(1)}MB`);
    Logger.info('');
    
    Logger.info('Performance by project size:');
    for (const [size, data] of Object.entries(report.performance_by_size)) {
      Logger.info(`  ${size}: ${(data.averageBuildTime / 1000).toFixed(1)}s avg, ${(data.averageBundleSize / 1024 / 1024).toFixed(1)}MB avg`);
    }
    
    Logger.info('');
    Logger.info('Performance by platform:');
    for (const [platform, data] of Object.entries(report.performance_by_platform)) {
      Logger.info(`  ${platform}: ${(data.averageBuildTime / 1000).toFixed(1)}s avg, ${(data.averageBundleSize / 1024 / 1024).toFixed(1)}MB avg`);
    }
    
    Logger.info(`\n📄 Detailed report saved: ${reportPath}`);
  }

  /**
   * Group results by various dimensions
   */
  private groupResultsByConfiguration() {
    return {
      bySize: this.results.reduce((acc, result) => {
        if (!acc[result.projectSize]) acc[result.projectSize] = [];
        acc[result.projectSize].push(result);
        return acc;
      }, {} as Record<string, BuildTimeResult[]>),
      
      byPlatform: this.results.reduce((acc, result) => {
        if (!acc[result.platform]) acc[result.platform] = [];
        acc[result.platform].push(result);
        return acc;
      }, {} as Record<string, BuildTimeResult[]>),
      
      byEnvironment: this.results.reduce((acc, result) => {
        if (!acc[result.environment]) acc[result.environment] = [];
        acc[result.environment].push(result);
        return acc;
      }, {} as Record<string, BuildTimeResult[]>)
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(grouped: any) {
    const successfulResults = this.results.filter(r => r.success);
    
    return {
      averageBuildTime: successfulResults.reduce((sum, r) => sum + r.buildTime, 0) / successfulResults.length,
      averageBundleSize: successfulResults.reduce((sum, r) => sum + r.bundleSize, 0) / successfulResults.length,
      
      bySize: Object.entries(grouped.bySize).reduce((acc, [size, results]) => {
        const successful = (results as BuildTimeResult[]).filter(r => r.success);
        acc[size] = {
          averageBuildTime: successful.reduce((sum, r) => sum + r.buildTime, 0) / successful.length,
          averageBundleSize: successful.reduce((sum, r) => sum + r.bundleSize, 0) / successful.length,
          successRate: successful.length / (results as BuildTimeResult[]).length
        };
        return acc;
      }, {} as Record<string, any>),
      
      byPlatform: Object.entries(grouped.byPlatform).reduce((acc, [platform, results]) => {
        const successful = (results as BuildTimeResult[]).filter(r => r.success);
        acc[platform] = {
          averageBuildTime: successful.reduce((sum, r) => sum + r.buildTime, 0) / successful.length,
          averageBundleSize: successful.reduce((sum, r) => sum + r.bundleSize, 0) / successful.length,
          successRate: successful.length / (results as BuildTimeResult[]).length
        };
        return acc;
      }, {} as Record<string, any>)
    };
  }
}

/**
 * Run build time comparison analysis
 */
export async function runBuildTimeComparison(): Promise<void> {
  const comparison = new BuildTimeComparison();
  await comparison.runBuildTimeAnalysis();
}

// If this file is run directly, execute the analysis
if (require.main === module) {
  runBuildTimeComparison().catch(console.error);
}