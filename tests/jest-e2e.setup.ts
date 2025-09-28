import { DatabaseTestManager } from '../src/test-utils/database-test-manager';

// Global test setup
beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment...');
  
  // Start database container
  const databaseManager = DatabaseTestManager.getInstance();
  await databaseManager.startContainer();
  
  console.log('✅ E2E test environment ready');
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Stop database container
  const databaseManager = DatabaseTestManager.getInstance();
  await databaseManager.stopContainer();
  
  console.log('✅ E2E test environment cleaned up');
});

// Increase timeout for container operations
jest.setTimeout(60000);
