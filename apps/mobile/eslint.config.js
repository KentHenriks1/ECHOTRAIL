const js = require("@eslint/js");
const tsparser = require("@typescript-eslint/parser");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const unusedImportsPlugin = require("eslint-plugin-unused-imports");

module.exports = [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Main application files with comprehensive enterprise rules
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // React Native globals
        __DEV__: "readonly",
        console: "readonly",
        global: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        btoa: "readonly",
        atob: "readonly",
        performance: "readonly",
        // React Native specific
        navigator: "readonly",
        window: "readonly",
        document: "readonly",
        // Node.js types
        Buffer: "readonly",
        NodeJS: "readonly",
        module: "readonly",
        require: "readonly",
        BufferEncoding: "readonly",
        // Web API types
        RequestInit: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooksPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      // === SECURITY & SAFETY RULES ===
      "no-console": ["error", { "allow": ["warn", "error", "info"] }],
      "no-debugger": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-proto": "error",
      "no-iterator": "error",
      "no-with": "error",
      "no-caller": "error",
      "no-extend-native": "error",
      
      // === VARIABLE & IMPORT MANAGEMENT ===
      "no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["error", {
        "vars": "all",
        "varsIgnorePattern": "^_",
        "args": "after-used",
        "argsIgnorePattern": "^_",
      }],
      
      // === CODE QUALITY & STYLE ===
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-nested-ternary": "error",
      
      // === COMPLEXITY & MAINTAINABILITY ===
      "complexity": ["error", 15],
      "max-depth": ["error", 4], 
      "max-lines": ["error", 500],
      "max-lines-per-function": ["error", 100],
      "max-params": ["error", 5],
      "no-magic-numbers": ["warn", {
        "ignore": [-1, 0, 1, 2, 100, 1000],
        "ignoreArrayIndexes": true,
        "enforceConst": true,
        "ignoreDefaultValues": true
      }],
      
      // === REACT HOOKS (CRITICAL) ===
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      
      // === PERFORMANCE RULES ===
      "no-await-in-loop": "error",
      "require-atomic-updates": "error",
      
      // === ASYNC/PROMISE HANDLING ===
      "no-async-promise-executor": "error",
      "no-promise-executor-return": "error",
      "prefer-promise-reject-errors": "error",
    },
  },
  
  // Test files configuration
  {
    files: ["src/**/__tests__/**/*.{js,jsx,ts,tsx}", "src/**/*.test.{js,jsx,ts,tsx}", "src/**/*.spec.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly", 
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "no-magic-numbers": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "no-console": "off",
      "complexity": "off",
    },
  },
  
  // Expo/React Native entry point
  {
    files: ["index.js", "App.js", "App.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module", // ES modules for React Native entry points
      globals: {
        // React Native entry point globals
        global: "readonly",
        process: "readonly",
        console: "readonly",
        __DEV__: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
    },
  },

  // Node.js JavaScript Configuration files
  {
    files: [
      "*.config.js", 
      "*.setup.js", 
      "babel.config.js", 
      "jest.config.js",
      "jest.config.*.js",
      ".dependency-cruiser.js", 
      "advanced-cleanup.js",
      "scripts/**/*.js",
      "dashboard/**/*.js",
      "metro-analysis-results/**/*.js",
      // Analysis and utility scripts
      "analyze-*.js",
      "comprehensive-fix-script.js",
      "configure-openai.js",
      "convert-inline-styles.js",
      "create-stubs.js",
      "find-*.js",
      "fix-*.js",
      "mass-eslint-disable.js",
      "memory-leak-scanner.js",
      "remove-eslint-comments.js",
      "run-metro-tests.js",
      "simple-metro-test.js",
      "test-openai-tts.js"
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs", // JavaScript Node.js files use CommonJS
      globals: {
        // Node.js globals
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        // Modern Node.js globals
        fetch: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-magic-numbers": "off",
      "no-console": "off",
      "prefer-const": "off",
      "complexity": "off",
      "no-undef": "off", // Node.js files often have dynamic requires
    },
  },
  
  // Node.js TypeScript Configuration files
  {
    files: [
      "*.config.ts", 
      "*.setup.ts", 
      "jest.setup.ts",
      "knip.config.ts",
      "playwright.config.ts"
    ],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: "module", // TypeScript config files use ES modules
      globals: {
        // Node.js globals
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-magic-numbers": "off",
      "no-console": "off",
      "prefer-const": "off",
      "complexity": "off",
      "no-undef": "off",
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "build/",
      "coverage/",
      "android/",
      "ios/",
      "e2e/",
      "**/*.generated.*",
      // Generated bundle files
      "benchmark-bundle-*.js",
      "**/*-bundle-*.js",
      "**/bundle/**/*.js",
      "**/*.bundle.js",
      "bundle.js",
      // Metro cache and generated files
      ".metro/",
      "metro-cache/",
      "**/*.hbc.map",
      // Backup and temporary config files
      "eslint.config.backup*.js",
      "eslint.config.final.js",
      "eslint.config.improved.js",
      "eslint.config.proper.js",
    ],
  },
];