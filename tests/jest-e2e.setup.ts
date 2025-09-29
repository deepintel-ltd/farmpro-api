import { DatabaseTestManager } from '../src/test-utils/database-test-manager';

// Set NODE_ENV to test for rate limiting bypass
process.env.NODE_ENV = 'test';

// Set required environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-development-and-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-development-and-testing-only';
process.env.JWT_EXPIRES_IN_SECONDS = '3600';
process.env.BREVO_API_KEY = 'test-brevo-api-key';
process.env.FROM_EMAIL = 'noreply@farmpro.app';
process.env.FROM_NAME = 'FarmPro';
process.env.REDIS_URL = 'redis://localhost:6379';

// AWS S3 configuration for testing
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'farmpro-media-test';

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
