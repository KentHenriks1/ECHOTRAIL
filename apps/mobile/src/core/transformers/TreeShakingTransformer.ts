/**
 * Tree Shaking Transformer
 * Performs advanced tree shaking by analyzing import/export usage
 * 
 * This module was extracted from AdvancedMetroTransformers.ts to reduce complexity
 */

import * as babel from '@babel/core';
import * as t from '@babel/types';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { TransformOptions, ModuleDependency, OptimizationResult } from './types';

export class TreeShakingTransformer {
  private unusedImports: Set<string> = new Set();
  private dependencies: ModuleDependency[] = [];
  private usedExports: Set<string> = new Set();

  transform(code: string, options: TransformOptions): OptimizationResult {
    const ast = babel.parseSync(code, {
      filename: options.filename,
      parserOpts: {
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'dynamicImport'],
      },
    });

    if (!ast) {
      throw new Error('Failed to parse code for tree shaking');
    }

    // Phase 1: Analyze usage
    this.analyzeUsage(ast);

    // Phase 2: Remove unused code
    const transformedAst = this.removeUnusedCode(ast, options);

    // Phase 3: Generate optimized code
    const result = generate(transformedAst, {
      compact: !options.dev,
      minified: options.minify,
      sourceMaps: options.dev,
    });

    return {
      transformedCode: result.code,
      removedImports: Array.from(this.unusedImports),
      removedExports: [],
      optimizations: this.getOptimizations(),
      bundleSizeReduction: this.calculateSizeReduction(code, result.code),
    };
  }

  private analyzeUsage(ast: t.File): void {
    const usedIdentifiers = new Set<string>();
    const importedIdentifiers = new Map<string, string>();
    const self = this;

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        const specifiers: string[] = [];

        path.node.specifiers.forEach(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            importedIdentifiers.set(spec.local.name, source);
            specifiers.push('default');
          } else if (t.isImportSpecifier(spec)) {
            const importedName = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
            importedIdentifiers.set(spec.local.name, source);
            specifiers.push(importedName);
          } else if (t.isImportNamespaceSpecifier(spec)) {
            importedIdentifiers.set(spec.local.name, source);
            specifiers.push('*');
          }
        });

        self.dependencies.push({
          source,
          specifiers,
          isUsed: false,
        });
      },

      Identifier(path) {
        if (path.isReferencedIdentifier()) {
          usedIdentifiers.add(path.node.name);
          const source = importedIdentifiers.get(path.node.name);
          if (source) {
            const dep = self.dependencies.find((d: any) => d.source === source);
            if (dep) {
              dep.isUsed = true;
            }
          }
        }
      },

      ExportDeclaration(path) {
        if (t.isExportNamedDeclaration(path.node)) {
          path.node.specifiers?.forEach(spec => {
            if (t.isExportSpecifier(spec)) {
              const exportedName = t.isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value;
              self.usedExports.add(exportedName);
            }
          });
        }
      },
    });

    // Mark unused imports
    this.dependencies.forEach(dep => {
      if (!dep.isUsed) {
        this.unusedImports.add(dep.source);
      }
    });
  }

  private removeUnusedCode(ast: t.File, _options: TransformOptions): t.File {
    const self = this;
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (self.unusedImports.has(source)) {
          // Only remove if it's not a side-effect import
          if (path.node.specifiers.length > 0) {
            path.remove();
          }
        }
      },

      // Remove unused variable declarations
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id)) {
          const binding = path.scope.getBinding(path.node.id.name);
          if (binding && !binding.referenced) {
            if (t.isVariableDeclaration(path.parent) && path.parent.declarations.length === 1) {
              path.parentPath.remove();
            } else {
              path.remove();
            }
          }
        }
      },

      // Remove unused function declarations
      FunctionDeclaration(path) {
        if (path.node.id) {
          const binding = path.scope.getBinding(path.node.id.name);
          if (binding && !binding.referenced && !self.usedExports.has(path.node.id.name)) {
            path.remove();
          }
        }
      },
    });

    return ast;
  }

  private getOptimizations(): string[] {
    const optimizations = [];
    
    if (this.unusedImports.size > 0) {
      optimizations.push(`Removed ${this.unusedImports.size} unused imports`);
    }

    return optimizations;
  }

  private calculateSizeReduction(original: string, transformed: string): number {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const transformedSize = Buffer.byteLength(transformed, 'utf8');
    return Math.max(0, originalSize - transformedSize);
  }
}