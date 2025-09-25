/**
 * Dead Code Elimination Transformer
 * Removes unreachable code and unused expressions
 * 
 * This module was extracted from AdvancedMetroTransformers.ts to reduce complexity
 */

import * as babel from '@babel/core';
import * as t from '@babel/types';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { TransformOptions, OptimizationResult } from './types';

export class DeadCodeEliminationTransformer {
  private reachableNodes: Set<t.Node> = new Set();
  private conditionallyReachable: Set<t.Node> = new Set();

  transform(code: string, options: TransformOptions): OptimizationResult {
    const ast = babel.parseSync(code, {
      filename: options.filename,
      parserOpts: {
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
      },
    });

    if (!ast) {
      throw new Error('Failed to parse code for dead code elimination');
    }

    // Phase 1: Mark reachable code
    this.markReachableCode(ast);

    // Phase 2: Remove dead code
    const transformedAst = this.removeDeadCode(ast);

    // Phase 3: Generate optimized code
    const result = generate(transformedAst, {
      compact: !options.dev,
      minified: options.minify,
    });

    return {
      transformedCode: result.code,
      removedImports: [],
      removedExports: [],
      optimizations: [`Removed ${this.getDeadCodeCount()} dead code blocks`],
      bundleSizeReduction: this.calculateSizeReduction(code, result.code),
    };
  }

  private markReachableCode(ast: t.File): void {
    // Mark all top-level statements as reachable initially
    const self = this;
    traverse(ast, {
      Program(path) {
        path.node.body.forEach(stmt => {
          self.markAsReachable(stmt);
          self.analyzeControlFlow(stmt);
        });
      },
    });
  }

  private analyzeControlFlow(node: t.Node): void {
    if (t.isIfStatement(node)) {
      // Analyze condition
      if (this.isLiteralCondition(node.test)) {
        const condition = this.evaluateCondition(node.test);
        if (condition === true) {
          this.markAsReachable(node.consequent);
          // Alternate is dead code
        } else if (condition === false) {
          if (node.alternate) {
            this.markAsReachable(node.alternate);
          }
          // Consequent is dead code
        } else {
          // Both branches are conditionally reachable
          this.conditionallyReachable.add(node.consequent);
          if (node.alternate) {
            this.conditionallyReachable.add(node.alternate);
          }
        }
      } else {
        // Unknown condition, both branches are conditionally reachable
        this.conditionallyReachable.add(node.consequent);
        if (node.alternate) {
          this.conditionallyReachable.add(node.alternate);
        }
      }
    }

    if (t.isReturnStatement(node) || t.isThrowStatement(node)) {
      // Code after return/throw is unreachable
      // This would need more sophisticated analysis to implement fully
    }
  }

  private isLiteralCondition(node: t.Expression): boolean {
    return t.isLiteral(node) || 
           (t.isUnaryExpression(node) && node.operator === '!' && t.isLiteral(node.argument));
  }

  private evaluateCondition(node: t.Expression): boolean | null {
    if (t.isBooleanLiteral(node)) {
      return node.value;
    }
    if (t.isNumericLiteral(node)) {
      return node.value !== 0;
    }
    if (t.isStringLiteral(node)) {
      return node.value !== '';
    }
    if (t.isNullLiteral(node)) {
      return false;
    }
    if (t.isUnaryExpression(node) && node.operator === '!') {
      const inner = this.evaluateCondition(node.argument);
      return inner !== null ? !inner : null;
    }
    return null;
  }

  private markAsReachable(node: t.Node): void {
    this.reachableNodes.add(node);
    
    // Recursively mark child nodes - bind context correctly
    const self = this;
    traverse(node as any, {
      enter(path) {
        self.reachableNodes.add(path.node);
      },
    });
  }

  private removeDeadCode(ast: t.File): t.File {
    const self = this;
    traverse(ast, {
      IfStatement(path) {
        if (self.isLiteralCondition(path.node.test)) {
          const condition = self.evaluateCondition(path.node.test);
          if (condition === true) {
            // Replace if statement with consequent
            path.replaceWith(path.node.consequent);
          } else if (condition === false) {
            // Replace if statement with alternate or remove
            if (path.node.alternate) {
              path.replaceWith(path.node.alternate);
            } else {
              path.remove();
            }
          }
        }
      },

      // Remove unreachable statements after return/throw
      Statement(path) {
        if (path.isReturnStatement() || path.isThrowStatement()) {
          let sibling = path.getNextSibling();
          while (sibling.node) {
            if (sibling.isStatement()) {
              const next = sibling.getNextSibling();
              sibling.remove();
              sibling = next;
            } else {
              break;
            }
          }
        }
      },
    });

    return ast;
  }

  private getDeadCodeCount(): number {
    // This is a simplified count - in practice would track removed nodes
    return Math.max(0, this.conditionallyReachable.size);
  }

  private calculateSizeReduction(original: string, transformed: string): number {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const transformedSize = Buffer.byteLength(transformed, 'utf8');
    return Math.max(0, originalSize - transformedSize);
  }
}