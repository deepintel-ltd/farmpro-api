module.exports = {
  displayName: 'Database Tests',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.database\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage/database',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@contracts/(.*)$': '<rootDir>/contracts/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/jest-setup-database.ts'],
  testTimeout: 60000, // Increased timeout for container operations
  maxWorkers: 1, // Run database tests sequentially to avoid conflicts
};
