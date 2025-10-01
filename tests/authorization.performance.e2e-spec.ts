import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Authorization Performance Tests', () => {
  let testContext: TestContext;
  let testUser: any;
  let testOrganization: any;
  let testToken: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up performance test tables before each test
    await testContext.cleanupTables([
      'activity_assignments',
      'farm_activities',
      'farms',
      'users',
      'organizations'
    ]);

    // Create test organization
    testOrganization = await testContext.createOrganization({
      name: 'Performance Test Organization',
      type: 'FARM_OPERATION',
      email: 'perf@test.com'
    });

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    testUser = await testContext.createUser({
      email: 'perfuser@test.com',
      name: 'Performance Test User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/api/auth/login')
      .send({
        email: 'perfuser@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    testToken = loginResponse.body.data.attributes.tokens.accessToken;
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }, 15000);

  describe('Guard Execution Performance', () => {
    it('should execute OrganizationIsolationGuard within acceptable time', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/api/farms')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`OrganizationIsolationGuard: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(averageTime).toBeLessThan(100); // 100ms per request
    });

    it('should execute FeatureAccessGuard within acceptable time', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/activities')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`FeatureAccessGuard: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      expect(averageTime).toBeLessThan(100);
    });

    it('should execute PermissionsGuard within acceptable time', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/api/farms')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`PermissionsGuard: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      expect(averageTime).toBeLessThan(100);
    });

    it('should execute resource-level guards within acceptable time', async () => {
      // Create test data for resource-level guard testing
      const farm = await testContext.prisma.farm.create({
        data: {
          name: 'Performance Test Farm',
          organizationId: testOrganization.id,
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 Test Farm Road, Test City, TC 12345'
          },
          totalArea: 100,
          cropTypes: ['wheat'],
          establishedDate: new Date('2020-01-01'),
          isActive: true
        },
      });

      const activity = await testContext.prisma.farmActivity.create({
        data: {
          name: 'Performance Test Activity',
          type: 'PLANTING',
          status: 'PLANNED',
          farmId: farm.id,
          createdById: testUser.id,
          scheduledAt: new Date(),
          estimatedDuration: 120,
        },
      });

      const iterations = 50; // Fewer iterations for resource-level tests
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get(`/activities/${activity.id}`)
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`Resource-level guards: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      expect(averageTime).toBeLessThan(200); // Slightly higher threshold for resource-level guards

      // Cleanup
      await testContext.prisma.farmActivity.delete({ where: { id: activity.id } });
      await testContext.prisma.farm.delete({ where: { id: farm.id } });
    });
  });

  describe('Guard Chain Performance', () => {
    it('should execute complete guard chain within acceptable time', async () => {
      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/activities')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`Complete guard chain: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      // Complete guard chain should still be fast
      expect(averageTime).toBeLessThan(150);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        testContext
          .request()
          .get('/api/farms')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      console.log(`Concurrent requests (${concurrentRequests}): ${totalTime}ms total (avg: ${averageTime}ms per request)`);
      
      expect(averageTime).toBeLessThan(200);
    });
  });

  describe('Database Query Performance', () => {
    it('should minimize database queries in guard execution', async () => {
      // This test would require monitoring database queries
      // Implementation depends on your database monitoring setup
      
      const response = await testContext
        .request()
        .get('/api/farms')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      
      // In a real implementation, you would:
      // 1. Enable query logging
      // 2. Count the number of database queries
      // 3. Verify that guards don't make unnecessary queries
      // 4. Check that organization filter is properly applied
    });

    it('should cache organization data effectively', async () => {
      // Test that organization data is cached and not re-fetched
      const iterations = 10;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/api/farms')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`Cached organization data: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      // Cached requests should be faster
      expect(averageTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during guard execution', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/api/farms')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage after ${iterations} requests: ${memoryIncrease} bytes increase`);
      
      // Memory increase should be reasonable (adjust threshold as needed)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle authorization failures efficiently', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/api/market/listings') // This should fail for FARM organization
          .set('Authorization', `Bearer ${testToken}`)
          .expect(403);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`Authorization failures: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      // Error handling should also be fast
      expect(averageTime).toBeLessThan(100);
    });

    it('should handle invalid tokens efficiently', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await testContext
          .request()
          .get('/api/farms')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      console.log(`Invalid tokens: ${iterations} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      expect(averageTime).toBeLessThan(50); // Should fail fast
    });
  });
});
