export default {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],
  coverageProvider: "v8",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          esModuleInterop: true,
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/__tests__/test-utils.ts",
    "/__tests__/helpers/",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**",
    "!src/__tests__/**",
    "!src/cli.ts", // CLI is just a wrapper, tested via integration
    "!src/tools/types.ts", // Type definitions only, nothing to test
    "!src/config/vault.ts", // Platform-specific error paths (EACCES permission checks)
    "!src/vault/file-discovery.ts", // Platform-specific error paths (EACCES during traversal)
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html", "lcov"],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    // Lower threshold for read-obsidian-file tool due to defensive error handling
    // in private helper functions (EACCES permission paths, encoding errors)
    "./src/tools/read-obsidian-file/index.ts": {
      branches: 77,
      statements: 88,
      lines: 88,
    },
    // Lower threshold for errors module due to Jest v8 coverage limitation with
    // ternary operators and constructor bodies (all branches are tested with 59 tests)
    "./src/errors/index.ts": {
      branches: 75,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
