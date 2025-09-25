/**
 * Platform-Specific Transformer
 * Optimizes code for specific platforms (iOS/Android/Web)
 * 
 * This module was extracted from AdvancedMetroTransformers.ts to reduce complexity
 */

import * as babel from '@babel/core';
import * as t from '@babel/types';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { TransformOptions, OptimizationResult } from './types';

export class PlatformSpecificTransformer {
  transform(code: string, options: TransformOptions): OptimizationResult {
    if (!options.platform || !options.enablePlatformSpecificOptimizations) {
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
        plugins: ['typescript', 'jsx'],
      },
    });

    if (!ast) {
      throw new Error('Failed to parse code for platform optimization');
    }

    const optimizations: string[] = [];

    const self = this;
    traverse(ast, {
      // Replace platform-specific imports
      ImportDeclaration(path) {
        const source = path.node.source.value;
        
        // Handle .ios.js / .android.js file selection
        if (source.includes('.ios.') && options.platform !== 'ios') {
          const androidSource = source.replace('.ios.', '.android.');
          path.node.source.value = androidSource;
          optimizations.push(`Replaced iOS import with Android: ${source}`);
        } else if (source.includes('.android.') && options.platform !== 'android') {
          const iosSource = source.replace('.android.', '.ios.');
          path.node.source.value = iosSource;
          optimizations.push(`Replaced Android import with iOS: ${source}`);
        }
      },

      // Handle Platform.select() expressions
      CallExpression(path) {
        if (
          t.isMemberExpression(path.node.callee) &&
          t.isIdentifier(path.node.callee.object, { name: 'Platform' }) &&
          t.isIdentifier(path.node.callee.property, { name: 'select' })
        ) {
          const arg = path.node.arguments[0];
          if (t.isObjectExpression(arg)) {
            // Find the platform-specific value
            for (const prop of arg.properties) {
              if (
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === options.platform
              ) {
                path.replaceWith(prop.value as t.Expression);
                optimizations.push(`Resolved Platform.select for ${options.platform}`);
                break;
              }
            }
          }
        }
      },

      // Remove platform-specific conditional code
      IfStatement(path) {
        if (self.isPlatformCondition(path.node.test, options.platform!)) {
          const shouldKeepConsequent = self.evaluatePlatformCondition(path.node.test, options.platform!);
          
          if (shouldKeepConsequent === true) {
            path.replaceWith(path.node.consequent);
            optimizations.push(`Removed platform condition, kept ${options.platform} branch`);
          } else if (shouldKeepConsequent === false) {
            if (path.node.alternate) {
              path.replaceWith(path.node.alternate);
              optimizations.push(`Removed platform condition, kept alternate branch`);
            } else {
              path.remove();
              optimizations.push(`Removed entire platform-specific if statement`);
            }
          }
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

  private isPlatformCondition(test: t.Expression, _platform: string): boolean {
    // Check for Platform.OS === 'platform' - platform parameter reserved for advanced conditions
    if (
      t.isBinaryExpression(test) &&
      test.operator === '===' &&
      t.isMemberExpression(test.left) &&
      t.isIdentifier(test.left.object, { name: 'Platform' }) &&
      t.isIdentifier(test.left.property, { name: 'OS' }) &&
      t.isStringLiteral(test.right)
    ) {
      return true;
    }
    return false;
  }

  private evaluatePlatformCondition(test: t.Expression, platform: string): boolean | null {
    if (
      t.isBinaryExpression(test) &&
      test.operator === '===' &&
      t.isMemberExpression(test.left) &&
      t.isIdentifier(test.left.object, { name: 'Platform' }) &&
      t.isIdentifier(test.left.property, { name: 'OS' }) &&
      t.isStringLiteral(test.right)
    ) {
      return test.right.value === platform;
    }
    return null;
  }

  private calculateSizeReduction(original: string, transformed: string): number {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const transformedSize = Buffer.byteLength(transformed, 'utf8');
    return Math.max(0, originalSize - transformedSize);
  }
}