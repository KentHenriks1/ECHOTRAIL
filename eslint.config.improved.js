const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const reactNative = require("eslint-plugin-react-native");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        // Node.js globals
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        NodeJS: "readonly",
        // Browser/React Native globals
        fetch: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        // Web APIs
        window: "readonly",
        navigator: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        btoa: "readonly",
        atob: "readonly",
        performance: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: react,
      "react-hooks": reactHooks,
      "react-native": reactNative,
    },
    rules: {
      // TypeScript rules - more lenient for development
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Disabled for development speed
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-function": "off",

      // React rules
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
      "react/prop-types": "off", // Using TypeScript for prop validation
      "react/display-name": "warn",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",

      // React Hooks rules - more lenient
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn", // Still warn but don't break build

      // React Native specific rules - more lenient for development
      "react-native/no-unused-styles": "off", // Too many false positives with dynamic styles
      "react-native/split-platform-components": "off",
      "react-native/no-inline-styles": "warn", // Warn but allow for quick development
      "react-native/no-color-literals": "off",
      "react-native/no-raw-text": "off",

      // General rules - development friendly
      "no-console": "off", // Allow console in development, handled by build process
      "no-debugger": "warn", // Warn but don't error
      "no-alert": "warn",
      "no-unused-vars": "off", // Handled by TypeScript
      "prefer-const": "warn",
      "no-var": "error",
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-case-declarations": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }], // Allow empty catch blocks
      "no-constant-condition": "warn",
      "no-unreachable": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    // Special rules for test files
    files: [
      "**/*.test.{js,jsx,ts,tsx}",
      "**/__tests__/**",
      "**/*.spec.{js,jsx,ts,tsx}",
    ],
    languageOptions: {
      globals: {
        // Jest globals
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
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Tests often need this
      "@typescript-eslint/no-unused-vars": "off", // Test helpers might be unused
    },
  },
  {
    // Special rules for configuration and build files
    files: [
      "*.config.{js,ts}",
      "**/*.config.{js,ts}",
      "**/configure-*.js",
      "**/fix-*.js",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  {
    // Service files - allow more flexibility for complex operations
    files: ["**/services/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Warn but allow for complex APIs
      "no-console": "warn", // Should be replaced with logger but warn for now
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "build/",
      "coverage/",
      "*.config.js",
      "babel.config.js",
      "metro.config.js",
      // Add patterns for generated files
      "**/*.generated.*",
      "**/android/**",
      "**/ios/**",
    ],
  },
];
