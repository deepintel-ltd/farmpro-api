export default {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  testMatch: ['**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@contracts/(.*)$': '<rootDir>/../contracts/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest-e2e.setup.ts'],
  testTimeout: 60000, // 60 seconds for container startup
  maxWorkers: 1, // Run tests sequentially to avoid container conflicts
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.spec.ts',
    '!../src/**/*.interface.ts',
    '!../src/**/*.dto.ts',
    '!../src/**/*.module.ts',
    '!../src/main.ts',
  ],
  coverageDirectory: '../coverage-e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  forceExit: true, // Force Jest to exit after all tests complete
};
