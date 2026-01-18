module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '_templates',  // Cross-platform: matches any path containing _templates
    'integration',  // Integration tests require live DB
    'cloudwatch',  // CloudWatch metrics require AWS
    // Database-dependent tests (require live DB connection)
    'security/security\\.test\\.ts',
    'rowLevelSecurity\\.test\\.ts',
    'appointment-enforcement\\.test\\.ts',
    'appointment-requirement\\.test\\.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
