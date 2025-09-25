# Unused Exports Cleanup Plan

## 📊 **TS-Prune Analysis: 75+ Unused Exports**

### 🎯 **Safe to Remove (High Confidence)**

#### **Theme and Utility Functions**
- `src/core/theme/utils.ts:33` - `getSpacing` 
- `src/core/theme/utils.ts:40` - `getFontSize`
- `src/core/theme/utils.ts:49` - `getColor` 
- `src/core/theme/utils.ts:73` - `getShadowStyle`

#### **Lazy Loading Components (Unused Variants)**
- `src/components/common/LazyComponent.tsx:163` - `createFeatureFlagLazyComponent`
- `src/components/common/LazyComponent.tsx:185` - `createViewportLazyComponent`
- `src/components/common/LazyScreen.tsx:106` - `createLazyScreen`
- `src/components/common/OptimizedImageUI.tsx:163` - `optimizedImageUIStyles`

#### **Maps Components (If Not Using Maps)**
- `src/components/maps/LazyMapComponents.tsx:81` - `MapControls`
- `src/components/maps/LazyMapComponents.tsx:93` - `TrailOverlay`
- `src/components/lazy/index.tsx:12` - `LazyMapComponent`

#### **Asset Processing (Unused Types)**
- `src/core/assets/index.ts:10` - `AssetOptimizationConfig`
- `src/core/assets/index.ts:15` - `LoadingStrategy`
- `src/core/assets/index.ts:20` - `ImageProcessingOptions`
- `src/core/assets/index.ts:21` - `ImageProcessingResult`
- `src/core/assets/index.ts:31` - `FastImage`
- `src/core/assets/index.ts:32` - `ProgressiveImage`
- `src/core/assets/index.ts:33` - `LazyImage`
- `src/core/assets/index.ts:38` - `AssetUtils`

#### **Configuration Types (Unused)**
- `src/core/config/index.ts:42` - `RemoteDatabaseConfig`
- `src/core/config/index.ts:105` - `VoiceSettings`
- `src/core/config/index.ts:136` - `SpacingConfig`
- `src/core/config/index.ts:145` - `TypographyConfig`
- `src/core/config/index.ts:168` - `AnimationConfig`
- `src/core/config/index.ts:176` - `ErrorConfig`
- `src/core/config/index.ts:185` - `PerformanceConfig`

### ⚠️ **Review Before Removal (Medium Confidence)**

#### **Default Exports (May be Entry Points)**
- `\\App.tsx:6` - `default` (duplicate App export)
- `\\src\\App.tsx:154` - `default` (main App export - KEEP)
- `src/core/analysis/MetroBundleAnalyzer.ts:1137` - `default`
- `src/core/benchmarking/MetroPerformanceBenchmark.ts:870` - `default`
- `src/core/testing/MetroOptimizationTestSuite.ts:983` - `default`
- `src/core/transformers/AdvancedMetroTransformers.ts:741` - `default`

#### **Auth Hooks (May be Future Features)**
- `src/screens/LoginScreen/useAuthActions.ts:22` - `useAuthActions`
- `src/screens/LoginScreen/useAuthForm.ts:33` - `useAuthForm`

### 🔒 **DO NOT REMOVE (Critical)**

#### **Core System Exports (Used by Build System)**
- All `MetroCacheManager`, `MetroBundleAnalyzer`, `MetroBuildPipeline` exports
- All transformer exports from refactored modules
- All service exports (`apiClient`, `authService`, `trailService`)

#### **Type Definitions (Used by TypeScript)**
- Component prop types (keep all)
- API response types (keep all) 
- Config types that are actively used

## 🚀 **Cleanup Strategy**

### **Phase 1: Safe Utility Cleanup**
1. Remove unused theme utility functions
2. Remove unused asset processing types
3. Remove unused lazy loading component variants

### **Phase 2: Configuration Cleanup** 
1. Remove unused configuration types
2. Remove unused performance monitoring types
3. Verify no build-time usage

### **Phase 3: Component Cleanup**
1. Remove unused map components (if maps not implemented)
2. Remove duplicate screen exports
3. Clean up lazy loading exports

## 📋 **Verification Steps**

For each export before removal:
1. ✅ **Grep for usage** across entire codebase
2. ✅ **Check build scripts** and configurations  
3. ✅ **Verify not used in tests** or type definitions
4. ✅ **Confirm not dynamic imports** or string references
5. ✅ **Test TypeScript compilation** after removal

## 🎯 **Expected Impact**

- **Reduced bundle size**: Remove ~15-20 unused functions/types
- **Cleaner API surface**: Remove confusing unused exports
- **Better tree-shaking**: Smaller import graphs
- **Improved maintainability**: Less code to maintain

**Estimated savings**: 5-10% reduction in export surface area