/**
 * Dynamic Import Optimizer
 * Optimizes dynamic imports for better code splitting and performance
 * 
 * This module was extracted from AdvancedMetroTransformers.ts to reduce complexity
 */

import * as babel from '@babel/core';
import * as t from '@babel/types';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { TransformOptions, OptimizationResult } from './types';

export class DynamicImportOptimizer {
  transform(code: string, options: TransformOptions): OptimizationResult {
    if (!options.optimizeDynamicImports) {
      return {
        transformedCode: code,
        removedImports: [],
        removedExports: [],
        optimizations: [],
        bundleSizeReduction: 0,
      };
    }

    const ast = babel.parseSync(code, {
      filename: options.filename,
      parserOpts: {
        plugins: ['typescript', 'jsx', 'dynamicImport'],
      },
    });

    if (!ast) {
      throw new Error('Failed to parse code for dynamic import optimization');
    }

    const optimizations: string[] = [];

    traverse(ast, {
      // Optimize dynamic imports
      CallExpression: (path) => {
        if (this.isDynamicImport(path.node)) {
          this.optimizeDynamicImport(path, options, optimizations);
        }
      },

      // Handle async/await patterns with dynamic imports
      AwaitExpression: (path) => {
        if (
          t.isCallExpression(path.node.argument) &&
          this.isDynamicImport(path.node.argument)
        ) {
          this.optimizeAsyncDynamicImport(path, options, optimizations);
        }
      },
    });

    const result = generate(ast, {
      compact: !options.dev,
      minified: options.minify,
    });

    return {
      transformedCode: result.code,
      removedImports: [],
      removedExports: [],
      optimizations,
      bundleSizeReduction: this.calculateSizeReduction(code, result.code),
    };
  }

  private isDynamicImport(node: t.CallExpression): boolean {
    return (
      t.isImport(node.callee) ||
      (t.isIdentifier(node.callee) && node.callee.name === 'import')
    );
  }

  private optimizeDynamicImport(
    path: babel.NodePath<t.CallExpression>,
    options: TransformOptions,
    optimizations: string[]
  ): void {
    const arg = path.node.arguments[0];
    if (!t.isStringLiteral(arg)) {
      return;
    }

    const importPath = arg.value;

    // Add chunk names for better debugging
    if (!importPath.includes('webpackChunkName')) {
      const chunkName = this.generateChunkName(importPath, options);
      const comment = ` webpackChunkName: "${chunkName}" `;
      
      // Add comment to the import
      path.node.leadingComments = path.node.leadingComments || [];
      path.node.leadingComments.push({
        type: 'CommentBlock',
        value: comment,
      });
      
      optimizations.push(`Added chunk name for dynamic import: ${importPath}`);
    }

    // Preload critical dynamic imports
    if (this.isCriticalImport(importPath)) {
      this.addPreloadHint(path, optimizations);
    }
  }

  private optimizeAsyncDynamicImport(
    path: babel.NodePath<t.AwaitExpression>,
    options: TransformOptions,
    optimizations: string[]
  ): void {
    if (
      !t.isCallExpression(path.node.argument) ||
      !this.isDynamicImport(path.node.argument)
    ) {
      return;
    }

    const callExpr = path.node.argument;
    const arg = callExpr.arguments[0];
    
    if (!t.isStringLiteral(arg)) {
      return;
    }

    // Add error handling for async dynamic imports
    if (!this.hasErrorHandling(path)) {
      this.addErrorHandling(path, options, optimizations);
    }
  }

  private generateChunkName(importPath: string, options: TransformOptions): string {
    const filename = importPath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'chunk';
    const platform = options.platform ? `_${options.platform}` : '';
    return `${filename}${platform}`;
  }

  private isCriticalImport(importPath: string): boolean {
    const criticalPaths = [
      'navigation',
      'auth',
      'core',
      'utils',
      'config',
    ];
    
    return criticalPaths.some(criticalPath => 
      importPath.toLowerCase().includes(criticalPath)
    );
  }

  private addPreloadHint(
    path: babel.NodePath<t.CallExpression>,
    optimizations: string[]
  ): void {
    // Add preload comment hint for bundlers
    const comment = ' webpackPreload: true ';
    
    path.node.leadingComments = path.node.leadingComments || [];
    path.node.leadingComments.push({
      type: 'CommentBlock',
      value: comment,
    });
    
    optimizations.push('Added preload hint for critical dynamic import');
  }

  private hasErrorHandling(path: babel.NodePath<t.AwaitExpression>): boolean {
    let current = path.parent;
    let depth = 0;
    const maxDepth = 5; // Prevent infinite loops
    
    while (current && depth < maxDepth) {
      if (t.isTryStatement(current)) {
        return true;
      }
      
      // Check for .catch() method calls
      if (
        t.isCallExpression(current) &&
        t.isMemberExpression(current.callee) &&
        t.isIdentifier(current.callee.property) &&
        current.callee.property.name === 'catch'
      ) {
        return true;
      }
      
      current = (current as any).parent;
      depth++;
    }
    
    return false;
  }

  private addErrorHandling(
    path: babel.NodePath<t.AwaitExpression>,
    _options: TransformOptions,
    optimizations: string[]
  ): void {
    // Wrap the await expression in a try-catch if not already handled
    const tryStatement = t.tryStatement(
      t.blockStatement([
        t.expressionStatement(path.node),
      ]),
      t.catchClause(
        t.identifier('error'),
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier('console'),
                t.identifier('error')
              ),
              [
                t.stringLiteral('Dynamic import failed:'),
                t.identifier('error'),
              ]
            )
          ),
        ])
      )
    );
    
    // Replace the current statement with try-catch
    const statement = path.getStatementParent();
    if (statement) {
      statement.replaceWith(tryStatement);
      optimizations.push('Added error handling for dynamic import');
    }
  }

  private calculateSizeReduction(original: string, transformed: string): number {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const transformedSize = Buffer.byteLength(transformed, 'utf8');
    return Math.max(0, originalSize - transformedSize);
  }
}