/**
 * Utility functions for Metro Build Pipeline
 */

import * as crypto from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';

/**
 * Generate a unique build ID
 * 
 * @returns Unique build identifier with timestamp and random hash
 */
export function generateBuildId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `build-${timestamp}-${random}`;
}

/**
 * Get Git information for the current repository
 * 
 * @param options - Override options for branch and commit
 * @returns Git information object
 */
export async function getGitInfo(options: { branch?: string; commit?: string } = {}) {
  try {
    return {
      branch: options.branch || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
      commit: options.commit || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      author: execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim(),
      message: execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim(),
    };
  } catch {
    return {
      branch: options.branch || 'unknown',
      commit: options.commit || 'unknown',
      author: 'unknown',
      message: 'unknown',
    };
  }
}

/**
 * Get Metro version from package.json
 * 
 * @returns Metro version string or 'unknown' if not found
 */
export async function getMetroVersion(): Promise<string> {
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    return packageJson.dependencies?.['@expo/metro-config'] || 
           packageJson.devDependencies?.['@expo/metro-config'] || 
           'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Calculate severity level based on regression percentage
 * 
 * @param value - Regression percentage value
 * @param criticalThreshold - Threshold for critical severity
 * @param majorThreshold - Threshold for major severity
 * @returns Severity level
 */
export function calculateSeverity(
  value: number, 
  criticalThreshold: number, 
  majorThreshold: number
): 'critical' | 'major' | 'minor' {
  if (value > criticalThreshold) {
    return 'critical';
  }
  if (value > majorThreshold) {
    return 'major';
  }
  return 'minor';
}

/**
 * Load build history from file
 * 
 * @returns Array of build results from history file
 */
export async function loadBuildHistory(): Promise<any[]> {
  try {
    const historyPath = 'build-history.json';
    const content = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Save build history to file
 * 
 * @param buildHistory - Array of build results to save
 */
export async function saveBuildHistory(buildHistory: any[]): Promise<void> {
  try {
    // Keep only last 1000 builds
    const recentHistory = buildHistory.slice(-1000);
    await fs.writeFile('build-history.json', JSON.stringify(recentHistory, null, 2));
  } catch (error) {
    console.error('Failed to save build history:', error);
  }
}

/**
 * Generate build reports
 * 
 * @param results - Build results to generate reports for
 * @param regressions - Performance regressions to include in reports
 * @param reportPath - Path where reports should be saved
 */
export async function generateBuildReports(
  results: any[], 
  regressions: any[], 
  reportPath: string = 'build-reports'
): Promise<void> {
  try {
    const fullPath = `${reportPath}/build-report-${Date.now()}.json`;
    await fs.mkdir(reportPath, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_builds: results.length,
        successful_builds: results.filter(r => r.success).length,
        total_duration: results.reduce((sum, r) => sum + r.duration, 0),
        average_bundle_size: results.reduce((sum, r) => sum + r.bundleSize, 0) / results.length,
      },
      builds: results,
      regressions: regressions.slice(-10), // Last 10 regressions
    };

    await fs.writeFile(fullPath, JSON.stringify(report, null, 2));
    console.info(`📄 Build report generated: ${fullPath}`);
  } catch (error) {
    console.error('Failed to generate build reports:', error);
  }
}
