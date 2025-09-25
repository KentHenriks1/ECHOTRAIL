/**
 * Advanced Metro Transformers
 * Modular orchestrator for code transformation and optimization suite
 * 
 * This module was refactored from a monolithic 741-line file to improve maintainability.
 * Individual transformers are now in separate modules for better separation of concerns.
 * 
 * @author EchoTrail Development Team
 * @version 2.1.0
 */

import { Logger } from '../utils/Logger';
import { TransformOptions, OptimizationResult } from './types';
import { TreeShakingTransformer } from './TreeShakingTransformer';
import { DeadCodeEliminationTransformer } from './DeadCodeEliminationTransformer';
import { PlatformSpecificTransformer } from './PlatformSpecificTransformer';
import { DynamicImportOptimizer } from './DynamicImportOptimizer';

/**
 * Combined Advanced Transformer
 * Orchestrates all optimization transformers
 */
export class AdvancedMetroTransformer {
  private treeShaker = new TreeShakingTransformer();
  private deadCodeEliminator = new DeadCodeEliminationTransformer();
  private platformOptimizer = new PlatformSpecificTransformer();
  private dynamicImportOptimizer = new DynamicImportOptimizer();

  transform(code: string, options: TransformOptions): OptimizationResult {
    let currentCode = code;
    const allOptimizations: string[] = [];
    const allRemovedImports: string[] = [];
    const allRemovedExports: string[] = [];
    let totalSizeReduction = 0;

    try {
      // Phase 1: Platform-specific optimizations
      if (options.enablePlatformSpecificOptimizations) {
        const result = this.platformOptimizer.transform(currentCode, options);
        currentCode = result.transformedCode;
        allOptimizations.push(...result.optimizations);
        totalSizeReduction += result.bundleSizeReduction;
      }

      // Phase 2: Tree shaking
      if (options.enableTreeShaking) {
        const result = this.treeShaker.transform(currentCode, options);
        currentCode = result.transformedCode;
        allOptimizations.push(...result.optimizations);
        allRemovedImports.push(...result.removedImports);
        allRemovedExports.push(...result.removedExports);
        totalSizeReduction += result.bundleSizeReduction;
      }

      // Phase 3: Dead code elimination
      if (options.enableDeadCodeElimination) {
        const result = this.deadCodeEliminator.transform(currentCode, options);
        currentCode = result.transformedCode;
        allOptimizations.push(...result.optimizations);
        totalSizeReduction += result.bundleSizeReduction;
      }

      // Phase 4: Dynamic import optimization
      if (options.optimizeDynamicImports) {
        const result = this.dynamicImportOptimizer.transform(currentCode, options);
        currentCode = result.transformedCode;
        allOptimizations.push(...result.optimizations);
        totalSizeReduction += result.bundleSizeReduction;
      }

    } catch (error) {
      Logger.error('Error in advanced transformer:', error);
      // Return original code if transformation fails
      return {
        transformedCode: code,
        removedImports: [],
        removedExports: [],
        optimizations: [`Error: ${error instanceof Error ? error.message : String(error)}`],
        bundleSizeReduction: 0,
      };
    }

    return {
      transformedCode: currentCode,
      removedImports: allRemovedImports,
      removedExports: allRemovedExports,
      optimizations: allOptimizations,
      bundleSizeReduction: totalSizeReduction,
    };
  }

  /**
   * Create Metro transformer function
   */
  createMetroTransformer() {
    return {
      transform: ({ src, filename, options: metroOptions }: any) => {
        const transformOptions: TransformOptions = {
          filename,
          platform: metroOptions.platform,
          dev: metroOptions.dev,
          hot: metroOptions.hot,
          projectRoot: metroOptions.projectRoot || process.cwd(),
          enableTreeShaking: !metroOptions.dev, // Enable in production
          enableDeadCodeElimination: !metroOptions.dev,
          enablePlatformSpecificOptimizations: true,
          optimizeDynamicImports: !metroOptions.dev,
          minify: metroOptions.minify,
        };

        const result = this.transform(src, transformOptions);

        // Log optimizations in development
        if (transformOptions.dev && result.optimizations.length > 0) {
          Logger.info(`🚀 Optimizations for ${filename}:`, result.optimizations);
        }

        return {
          code: result.transformedCode,
          map: null, // Would generate source maps in production
        };
      },
    };
  }
}

// Re-export individual transformers for direct usage if needed
export { TreeShakingTransformer } from './TreeShakingTransformer';
export { DeadCodeEliminationTransformer } from './DeadCodeEliminationTransformer';
export { PlatformSpecificTransformer } from './PlatformSpecificTransformer';
export { DynamicImportOptimizer } from './DynamicImportOptimizer';
export type { TransformOptions, OptimizationResult } from './types';

export default AdvancedMetroTransformer;