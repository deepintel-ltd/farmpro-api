import { DatabaseTestManager } from './database-test-manager';

/**
 * Jest setup file for tests that require database
 * Add this to your Jest configuration:
 * 
 * setupFilesAfterEnv: ['<rootDir>/src/test-utils/jest-setup-database.ts']
 */

let dbManager: DatabaseTestManager;

beforeAll(async () => {
  // Increase timeout for container startup
  jest.setTimeout(60000);
  
  dbManager = DatabaseTestManager.getInstance();
  await dbManager.startContainer();
}, 60000);

afterAll(async () => {
  if (dbManager) {
    await dbManager.stopContainer();
  }
}, 30000);

beforeEach(async () => {
  // Reset database before each test for isolation
  if (dbManager && dbManager.isRunning()) {
    await dbManager.resetDatabase();
  }
});

// Make dbManager available globally for tests
declare global {
  // eslint-disable-next-line no-var
  var testDbManager: DatabaseTestManager;
}

global.testDbManager = dbManager;
