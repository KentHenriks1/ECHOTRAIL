/**
 * Shared types and interfaces for Metro transformers
 */

export interface TransformOptions {
  filename: string;
  platform?: string;
  dev: boolean;
  hot: boolean;
  projectRoot: string;
  enableTreeShaking: boolean;
  enableDeadCodeElimination: boolean;
  enablePlatformSpecificOptimizations: boolean;
  optimizeDynamicImports: boolean;
  minify: boolean;
}

export interface ModuleDependency {
  source: string;
  specifiers: string[];
  isUsed: boolean;
  platform?: string;
}

export interface OptimizationResult {
  transformedCode: string;
  removedImports: string[];
  removedExports: string[];
  optimizations: string[];
  bundleSizeReduction: number;
}