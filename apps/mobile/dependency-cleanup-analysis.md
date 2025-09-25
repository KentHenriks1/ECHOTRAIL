# Dependency Cleanup Analysis Plan

## 🎯 **UNUSED DEPENDENCIES (4 total)**

### **Production Dependencies to Verify:**
1. **@react-native-community/netinfo** - Network status detection
2. **expo-av** - Audio/video functionality  
3. **expo-crypto** - Cryptographic functions
4. **expo-device** - Device information

## 🛠️ **UNUSED DEVDEPENDENCIES (38 total)**

### **🔍 HIGH RISK - Must Verify Before Removal**

#### **Babel Plugins (14 items)** - Used by babel.config.js
- `@babel/plugin-proposal-class-properties`
- `@babel/plugin-proposal-decorators` 
- `@babel/plugin-syntax-flow`
- `@babel/plugin-syntax-typescript`
- `@babel/plugin-transform-logical-assignment-operators`
- `@babel/plugin-transform-modules-commonjs`
- `@babel/plugin-transform-nullish-coalescing-operator`
- `@babel/plugin-transform-object-rest-spread`
- `@babel/plugin-transform-optional-chaining`
- `@babel/plugin-transform-react-display-name`
- `@babel/plugin-transform-react-jsx`
- `@babel/plugin-transform-react-jsx-source`
- `@babel/plugin-transform-runtime`
- `@babel/plugin-transform-typescript`

#### **Babel Runtime**
- `@babel/runtime` - Runtime helpers

#### **Metro Build System (8 items)** - Used by Metro bundler
- `metro-cache`
- `metro-core` 
- `metro-file-map`
- `metro-resolver`
- `metro-runtime`
- `metro-source-map`
- `metro-transform-plugins`
- `metro-transform-worker`

#### **ESLint Configuration (4 items)** - Used by .eslintrc
- `@react-native/eslint-config`
- `@typescript-eslint/eslint-plugin`
- `eslint-config-expo`
- `eslint-config-prettier`
- `eslint-plugin-import`

#### **Build and Development Tools (6 items)**
- `@expo/webpack-config` - Expo web bundling
- `@types/metro` - TypeScript definitions
- `react-test-renderer` - React testing
- `ts-node` - TypeScript execution
- `tsx` - TypeScript execution
- `source-map-explorer` - Bundle analysis
- `webpack-bundle-analyzer` - Bundle analysis

### **🟢 LIKELY SAFE TO REMOVE**

#### **Testing/Development Tools**
- `@faker-js/faker` - Mock data generation
- `ts-prune` - Unused export detection (used once for analysis)

## 📋 **VALIDATION STRATEGY**

### **Step 1: Configuration Files Analysis**
1. **babel.config.js** - Check which Babel plugins are actually configured
2. **metro.config.js** - Check which Metro dependencies are required
3. **.eslintrc** - Check which ESLint plugins/configs are used
4. **package.json scripts** - Check which tools are used in build scripts

### **Step 2: Dynamic Usage Detection**
1. **Grep for imports** - Search for direct imports in codebase
2. **Check Expo dependencies** - Verify if app uses AV, crypto, device info
3. **Build process verification** - Test build after each removal

### **Step 3: Safe Removal Order**
1. **Phase 1**: Remove obvious testing/dev tools (`@faker-js/faker`, `ts-prune`)
2. **Phase 2**: Remove unused Expo features after verification
3. **Phase 3**: Remove Babel plugins not in config (if any)
4. **Phase 4**: Review Metro dependencies (likely keep all)
5. **Phase 5**: Review ESLint dependencies (likely keep all)

## ⚠️ **CRITICAL SAFEGUARDS**

1. **Test build after each removal group**
2. **Test all npm scripts after removals**  
3. **Verify Metro bundling still works**
4. **Verify ESLint still works**
5. **Verify TypeScript compilation still works**
6. **Keep full backups before major removals**

## 🎯 **EXPECTED OUTCOME**

**Conservative Estimate**: 5-10 dependencies safely removable
**Benefits**:
- Reduced attack surface
- Faster npm installs  
- Smaller node_modules
- Cleaner dependency graph
- Better security posture