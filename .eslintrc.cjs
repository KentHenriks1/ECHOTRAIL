module.exports = {
  extends: [
    "expo",
    "@react-native",
    "@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "import", "unused-imports"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // Security rules
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-eval": "error",
    "no-implied-eval": "error",

    // TypeScript rules
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",

    // Import rules
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
      },
    ],
    "import/no-unused-modules": "error",

    // Unused imports
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],

    // React Native specific
    "react-native/no-unused-styles": "error",
    "react-native/no-inline-styles": "warn",
    "react-hooks/exhaustive-deps": "warn",
  },
  env: {
    "react-native/react-native": true,
  },
  ignorePatterns: [
    "node_modules/",
    "android/",
    "ios/",
    ".expo/",
    "dist/",
    "build/",
    "*.config.js",
    "*.config.ts",
  ],
};
