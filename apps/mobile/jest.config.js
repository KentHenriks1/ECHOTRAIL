module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json-summary", "html"],
  coveragePathIgnorePatterns: [
    "node_modules",
    "<rootDir>/src/__tests__",
    "<rootDir>/src/__mocks__",
    ".config.(ts|tsx)$",
    "/index.(ts|tsx)$",
  ],
  roots: ["<rootDir>/src"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,ts,tsx}",
    "<rootDir>/src/**/*.(test|spec).{js,ts,tsx}",
    "!<rootDir>/src/**/__tests__/setup/**",
    "!<rootDir>/src/**/__tests__/**/*.config.*",
  ],
  transform: {
    "^.+.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js|faker|msw|@mswjs|@bundled-es-modules)/)",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
    "!src/**/*.config.{ts,tsx}",
    "!src/**/index.{ts,tsx}",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@screens/(.*)$": "<rootDir>/src/screens/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  passWithNoTests: true,
  verbose: true,
};
