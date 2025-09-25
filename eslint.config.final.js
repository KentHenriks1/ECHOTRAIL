const js = require("@eslint/js");

module.exports = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
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
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        NodeJS: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        window: "readonly",
        navigator: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        btoa: "readonly",
        atob: "readonly",
        performance: "readonly",
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
      // Turn off ALL rules
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
      "**/*.generated.*",
      "**/android/**",
      "**/ios/**",
    ],
  },
];