# Test Utils - TestContext Documentation

This directory contains comprehensive testing utilities for the FarmPro API, including the `TestContext` class that provides NestJS and Prisma integration for testing.

## Overview

The `TestContext` class is a reusable testing utility that:
- Manages NestJS application lifecycle for testing
- Provides PostgreSQL test containers with automatic setup/teardown
- Offers factory methods for creating test entities
- Includes test data seeding utilities for different scenarios
- Handles database cleanup and reset functionality between tests

## Quick Start

```typescript
import { TestContext, TestScenario } from '@/test-utils';

describe('My API Tests', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    await testContext.resetDatabase();
  });

  it('should test my API endpoint', async () => {
    // Create test data
    const user = await testContext.createUser();
    const farm = await testContext.createFarm();

    // Test API
    const response = await testContext
      .request()
      .get(`/api/farms/${farm.id}`)
      .expect(200);

    // Assert response
    testContext.assertJsonApiResponse(response, 'farms');
  });
});
```

## Core Components

### TestContext Class

The main testing utility class that provides:

#### Setup and Teardown
- `setup()`: Initialize NestJS app and database
- `teardown()`: Clean up resources
- `resetDatabase()`: Reset database to clean state
- `cleanupTables(tableNames)`: Clean up specific tables

#### Access to Services
- `prisma`: Get Prisma client instance
- `app`: Get NestJS application instance
- `request()`: Get supertest request instance for API testing

#### Factory Methods
- `createOrganization(overrides?)`: Create test organization
- `createUser(overrides?)`: Create test user
- `createFarm(overrides?)`: Create test farm
- `createCommodity(overrides?)`: Create test commodity
- `createOrder(overrides?)`: Create test order
- `createInventory(overrides?)`: Create test inventory

#### Test Data Seeding
- `seedTestData(scenario)`: Seed data for predefined scenarios

### Test Scenarios

Predefined data scenarios for common testing needs:

```typescript
enum TestScenario {
  EMPTY = 'empty',                    // No data
  BASIC_FARM = 'basic_farm',          // Single farm setup
  MULTI_FARM = 'multi_farm',          // Multiple farms
  ORDERS_SCENARIO = 'orders_scenario', // Trading scenario
  FULL_ECOSYSTEM = 'full_ecosystem',   // Comprehensive data
}
```

### Helper Utilities

Additional utilities for advanced testing:

- `DatabaseAssertions`: Database-specific assertions
- `ApiAssertions`: JSON API response assertions
- `TestDataBuilder`: Complex test data builders
- `PerformanceHelpers`: Performance testing utilities
- `testUtils`: Common utility functions

## Usage Examples

### Basic Entity Creation

```typescript
// Create organization with defaults
const org = await testContext.createOrganization();

// Create organization with custom data
const customOrg = await testContext.createOrganization({
  name: 'Custom Farm Corp',
  type: 'COMMODITY_TRADER',
  maxUsers: 100,
});

// Create user linked to organization
const user = await testContext.createUser({
  organizationId: org.id,
  name: 'John Farmer',
  email: 'john@farm.com',
});
```

### Test Data Seeding

```typescript
// Seed basic farm scenario
const { organization, user, farm, commodity } = await testContext.seedTestData(
  TestScenario.BASIC_FARM
);

// Seed complex trading scenario
const tradingData = await testContext.seedTestData(
  TestScenario.ORDERS_SCENARIO
);
console.log(tradingData.orders); // Array of created orders
```

### API Testing

```typescript
// Test GET endpoint
const response = await testContext
  .request()
  .get('/api/farms')
  .expect(200);

testContext.assertJsonApiResponse(response, 'farms');

// Test POST endpoint with authentication
const user = await testContext.createUser();
const authRequest = await testContext.createAuthenticatedRequest(user);

const farmData = {
  data: {
    type: 'farms',
    attributes: {
      name: 'New Farm',
      totalArea: 150.0,
    },
  },
};

const createResponse = await authRequest
  .post('/api/farms')
  .send(farmData)
  .expect(201);
```

### Database Assertions

```typescript
import { DatabaseAssertions } from '@/test-utils';

const dbAssertions = new DatabaseAssertions(testContext.prisma);

// Assert record exists
await dbAssertions.assertRecordExists('farm', { name: 'Test Farm' });

// Assert record count
await dbAssertions.assertRecordCount('user', 5);

// Assert relationships
await dbAssertions.assertRelationship('organization', orgId, 'users', 3);
```

### Complex Test Data Building

```typescript
import { TestDataBuilder } from '@/test-utils';

const builder = new TestDataBuilder(testContext);

// Build complete farm ecosystem
const ecosystem = await builder.buildFarmEcosystem({
  farmCount: 3,
  commoditiesPerFarm: 5,
  usersPerOrg: 2,
});

// Build trading scenario
const trading = await builder.buildTradingScenario({
  buyerCount: 2,
  supplierCount: 3,
  ordersPerBuyer: 4,
});
```

### Performance Testing

```typescript
import { PerformanceHelpers } from '@/test-utils';

// Measure operation time
const { result, duration } = await PerformanceHelpers.measureTime(async () => {
  return await testContext.createFarm();
});

// Assert performance requirements
await PerformanceHelpers.assertPerformance(
  async () => await testContext.seedTestData(TestScenario.FULL_ECOSYSTEM),
  5000, // 5 second limit
  'Full ecosystem seeding should complete within 5 seconds'
);
```

## Configuration

### Jest Setup

Add to your Jest configuration:

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/jest-setup-database.ts'],
  testTimeout: 60000, // Increase timeout for container startup
};
```

### Environment Variables

The TestContext uses these environment variables:

- `DATABASE_URL`: Set automatically by the test container
- `NODE_ENV`: Should be 'test' for testing

### Docker Requirements

Ensure Docker is running for PostgreSQL test containers:

```bash
# Check Docker is running
docker --version
docker ps
```

## Best Practices

### Test Isolation

Always reset the database between tests:

```typescript
beforeEach(async () => {
  await testContext.resetDatabase();
});
```

### Resource Cleanup

Always clean up resources:

```typescript
afterAll(async () => {
  await testContext.teardown();
}, 30000);
```

### Factory Method Usage

Use factory methods for consistent test data:

```typescript
// Good: Use factory methods
const user = await testContext.createUser({ name: 'Test User' });

// Avoid: Direct Prisma calls in tests
const user = await testContext.prisma.user.create({
  data: { /* complex data setup */ }
});
```

### Scenario-Based Testing

Use predefined scenarios for complex setups:

```typescript
// Good: Use scenarios for complex data
await testContext.seedTestData(TestScenario.ORDERS_SCENARIO);

// Avoid: Manual complex data setup in each test
```

### Performance Considerations

- Use parallel creation for multiple entities
- Reset only necessary tables when possible
- Use transactions for complex data setup

```typescript
// Parallel creation
const [user1, user2, user3] = await Promise.all([
  testContext.createUser(),
  testContext.createUser(),
  testContext.createUser(),
]);

// Selective cleanup
await testContext.cleanupTables(['users', 'farms']);
```

## Troubleshooting

### Container Startup Issues

If PostgreSQL container fails to start:

1. Check Docker is running
2. Check port 5432 is not in use
3. Increase Jest timeout for container startup

### Memory Issues

For large test suites:

1. Use `cleanupTables()` instead of `resetDatabase()` when possible
2. Limit parallel test execution
3. Increase Node.js memory limit: `--max-old-space-size=4096`

### Performance Issues

If tests are slow:

1. Use test scenarios instead of individual factory calls
2. Create data in parallel when possible
3. Use database transactions for complex setups
4. Consider test data caching for read-only scenarios

## API Reference

### TestContext Methods

#### Setup/Teardown
- `setup(): Promise<void>` - Initialize testing environment
- `teardown(): Promise<void>` - Clean up resources
- `resetDatabase(): Promise<void>` - Reset database to clean state
- `cleanupTables(tableNames: string[]): Promise<void>` - Clean specific tables

#### Access
- `get prisma(): PrismaClient` - Get Prisma client
- `get app(): INestApplication` - Get NestJS app
- `request(): SuperTest<Test>` - Get supertest instance

#### Factory Methods
- `createOrganization(overrides?): Promise<Organization>`
- `createUser(overrides?): Promise<User>`
- `createFarm(overrides?): Promise<Farm>`
- `createCommodity(overrides?): Promise<Commodity>`
- `createOrder(overrides?): Promise<Order>`
- `createInventory(overrides?): Promise<Inventory>`

#### Utilities
- `seedTestData(scenario: TestScenario): Promise<any>`
- `waitForAsyncOperation(operation: Promise<any>, timeout?: number): Promise<any>`
- `generateTestId(): string`
- `createAuthenticatedRequest(user?): Promise<SuperTest<Test>>`
- `assertJsonApiResponse(response, expectedType?, expectedCount?): void`
- `getDatabaseHealth(): Promise<{healthy: boolean, error?: string}>`

This documentation provides comprehensive guidance for using the TestContext class effectively in your API testing workflow.
