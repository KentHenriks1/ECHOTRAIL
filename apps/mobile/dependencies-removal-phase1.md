# Phase 1: Safe Dependencies to Remove

## 🔍 **Analysis Results**

### **Babel Configuration Analysis**
- **babel.config.js** only uses: `babel-preset-expo`
- **All individual Babel plugins are NOT directly referenced**
- `babel-preset-expo` includes the transformations needed

### **ESLint Configuration Analysis**
- **eslint.config.js** only uses:
  - `@typescript-eslint/parser` ✅ KEEP
  - `eslint-plugin-react-hooks` ✅ KEEP  
  - `eslint-plugin-unused-imports` ✅ KEEP
- **These ESLint packages are NOT used**:
  - `@react-native/eslint-config`
  - `eslint-config-expo`
  - `eslint-config-prettier`
  - `eslint-plugin-import`

### **Metro Configuration Analysis**
- **metro.config.js** uses: `expo/metro-config` and our custom optimizer
- **Individual Metro packages are NOT directly imported**
- Metro packages might be dependencies of `expo/metro-config`

## ✅ **SAFE TO REMOVE - Phase 1**

### **Unused Babel Plugins (14 packages)**
Since babel.config.js uses only `babel-preset-expo`:

```bash
npm uninstall @babel/plugin-proposal-class-properties
npm uninstall @babel/plugin-proposal-decorators
npm uninstall @babel/plugin-syntax-flow
npm uninstall @babel/plugin-syntax-typescript
npm uninstall @babel/plugin-transform-logical-assignment-operators
npm uninstall @babel/plugin-transform-modules-commonjs
npm uninstall @babel/plugin-transform-nullish-coalescing-operator
npm uninstall @babel/plugin-transform-object-rest-spread
npm uninstall @babel/plugin-transform-optional-chaining
npm uninstall @babel/plugin-transform-react-display-name
npm uninstall @babel/plugin-transform-react-jsx
npm uninstall @babel/plugin-transform-react-jsx-source
npm uninstall @babel/plugin-transform-runtime
npm uninstall @babel/plugin-transform-typescript
```

### **Unused ESLint Configs (4 packages)**
Since eslint.config.js uses custom configuration:

```bash
npm uninstall @react-native/eslint-config
npm uninstall eslint-config-expo  
npm uninstall eslint-config-prettier
npm uninstall eslint-plugin-import
```

### **Unused TypeScript Node Executor (1 package)**
`tsx` is redundant since we have `ts-node`:

```bash
npm uninstall tsx
```

## 📊 **Expected Impact**

- **Total packages to remove**: 19 packages
- **Node_modules size reduction**: ~50-100MB
- **Install time improvement**: ~15-30 seconds
- **Security surface reduction**: 19 fewer dependencies to monitor
- **Build performance**: No impact (packages not used in build)

## 🧪 **Testing Plan**

After each removal group:
1. ✅ Test TypeScript compilation: `npx tsc --noEmit --skipLibCheck`
2. ✅ Test ESLint: `npm run lint`  
3. ✅ Test build: `npm run build`
4. ✅ Test Metro bundling: `npm run metro:validate`

## ⚠️ **Safeguards**

- Remove packages in small batches
- Test after each batch
- Keep commits granular for easy rollback
- Verify no runtime errors after removal