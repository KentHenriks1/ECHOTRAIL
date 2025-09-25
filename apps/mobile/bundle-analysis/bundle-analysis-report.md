# Bundle Analysis Report
Generated: 2025-09-19T03:38:31.740Z

## Bundle Sizes

- **android_index-dabce24d81ac6cd79b74fb8cb3c788df.hbc**: 1.61 MB
- **ios_index-f8920f767454aec86fee80774f1d3440.hbc**: 1.6 MB

## Top 20 Dependencies by Size

- **eslint**: 2.86 MB - An AST-based pattern checker for JavaScript.
- **@types/node**: 2.41 MB - TypeScript definitions for node
- **jest**: 2.32 MB - Delightful JavaScript Testing.
- **vitest**: 1.36 MB - Next generation testing framework powered by Vite
- **ts-jest**: 295.9 KB - A Jest transformer with source map support that lets you use Jest to test projects written in TypeScript
- **@react-navigation/bottom-tabs**: 189.15 KB - Bottom tab navigator following iOS design guidelines
- **node-fetch**: 104.8 KB - A light-weight module that brings Fetch API to node.js
- **eslint-config-prettier**: 57.64 KB - Turns off all rules that are unnecessary or might conflict with Prettier.

## Duplicate Dependencies

- **src**: 42 occurrences
- **..**: 15 occurrences

## Optimization Recommendations

### 1. Large dependencies detected (medium priority)

Found 4 dependencies over 500KB: eslint, @types/node, jest, vitest

**Impact**: Medium - consider lighter alternatives or selective imports

- eslint: 2.86 MB
- @types/node: 2.41 MB
- jest: 2.32 MB
- vitest: 1.36 MB

### 2. Duplicate dependencies found (high priority)

Found 2 potential duplicate dependencies

**Impact**: High - unnecessary bundle size increase

- src: 42
- ..: 15

### 3. Metro bundler optimization opportunities (medium priority)

Consider implementing advanced Metro configurations for better tree shaking

**Impact**: Medium - improved dead code elimination
