import {
  TestContext,
  TestScenario,
  BasicFarmScenarioResult,
} from './test-context';
import { HttpStatus } from '@nestjs/common';

/**
 * Example integration test demonstrating TestContext usage
 * This shows how to use TestContext for API endpoint testing
 */
describe('TestContext Integration Example', () => {
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

  describe('API Testing with TestContext', () => {
    it('should test health endpoint', async () => {
      const response = await testContext
        .request()
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        status: 'ok',
        info: expect.any(Object),
        error: expect.any(Object),
        details: expect.any(Object),
      });
    });

    it('should test API with seeded data', async () => {
      // Seed test data using TestContext
      const { organization, user, farm } = (await testContext.seedTestData(
        TestScenario.BASIC_FARM,
      )) as BasicFarmScenarioResult;

      // Test API endpoints with the seeded data
      // Note: These endpoints would need to be implemented in your actual API

      // Example: Test getting farms for an organization
      // const response = await testContext
      //   .request()
      //   .get(`/api/organizations/${organization.id}/farms`)
      //   .expect(HttpStatus.OK);

      // testContext.assertJsonApiResponse(response, 'farms');
      // expect(response.body.data).toHaveLength(1);
      // expect(response.body.data[0].attributes.name).toBe('Sunny Acres Farm');

      // For now, just verify the data was created correctly
      expect(organization.id).toBeDefined();
      expect(user.organizationId).toBe(organization.id);
      expect(farm.organizationId).toBe(organization.id);
    });

    it('should test API with custom test data', async () => {
      // Create custom test data using factory methods
      const buyerOrg = await testContext.createOrganization({
        name: 'Test Buyer',
        type: 'COMMODITY_TRADER',
      });

      const supplierOrg = await testContext.createOrganization({
        name: 'Test Supplier',
        type: 'FARM_OPERATION',
      });

      const buyer = await testContext.createUser({
        organizationId: buyerOrg.id,
        name: 'Test Buyer User',
      });

      const commodity = await testContext.createCommodity({
        name: 'Test Corn',
        category: 'grain',
        quantity: 1000,
      });

      const order = await testContext.createOrder({
        buyerOrg: { connect: { id: buyerOrg.id } },
        supplierOrg: { connect: { id: supplierOrg.id } },
        createdBy: { connect: { id: buyer.id } },
        commodityId: commodity.id,
        type: 'BUY',
        quantity: 500,
        pricePerUnit: 6.0,
      });

      // Test API endpoints with the custom data
      // Example: Test getting orders for a buyer
      // const response = await testContext
      //   .request()
      //   .get(`/api/organizations/${buyerOrg.id}/orders`)
      //   .expect(HttpStatus.OK);

      // testContext.assertJsonApiResponse(response, 'orders');
      // expect(response.body.data).toHaveLength(1);
      // expect(response.body.data[0].attributes.type).toBe('BUY');

      // Verify the test data relationships
      expect(order.buyerOrg.id).toBe(buyerOrg.id);
      expect(order.supplierOrg.id).toBe(supplierOrg.id);
      expect(order.createdBy.id).toBe(buyer.id);
      expect(order.commodityId).toBe(commodity.id);
      expect(order.totalPrice).toBe(3000); // 500 * 6.00
    });

    it('should test error scenarios', async () => {
      // Test API error handling
      // Example: Test getting non-existent resource
      // const response = await testContext
      //   .request()
      //   .get('/api/farms/non-existent-id')
      //   .expect(HttpStatus.NOT_FOUND);

      // expect(response.body).toMatchObject({
      //   errors: [
      //     {
      //       status: '404',
      //       title: 'Resource not found',
      //       detail: expect.any(String),
      //     },
      //   ],
      // });

      // For now, just demonstrate error testing setup
      const nonExistentId = 'non-existent-id';
      const farm = await testContext.prisma.farm.findUnique({
        where: { id: nonExistentId },
      });
      expect(farm).toBeNull();
    });

    it('should test authenticated endpoints', async () => {
      // Create user for authentication
      const user = await testContext.createUser({
        name: 'Authenticated User',
        email: 'auth-user@example.com',
      });

      // Create authenticated request
      await testContext.createAuthenticatedRequest(user);

      // Test authenticated endpoint
      // Example: Test creating a farm as authenticated user
      // const farmData = {
      //   data: {
      //     type: 'farms',
      //     attributes: {
      //       name: 'New Test Farm',
      //       totalArea: 150.0,
      //       cropTypes: ['wheat'],
      //     },
      //   },
      // };

      // const response = await authenticatedRequest
      //   .post('/api/farms')
      //   .send(farmData)
      //   .expect(HttpStatus.CREATED);

      // testContext.assertJsonApiResponse(response, 'farms');
      // expect(response.body.data.attributes.name).toBe('New Test Farm');

      // For now, just verify the user was created for auth
      expect(user.id).toBeDefined();
      expect(user.email).toBe('auth-user@example.com');
    });

    it('should test database transactions in API calls', async () => {
      // Seed initial data
      const { organization, user } = (await testContext.seedTestData(
        TestScenario.BASIC_FARM,
      )) as BasicFarmScenarioResult;

      // Test API call that should create multiple related records
      // Example: Test creating an order with order items
      // const orderData = {
      //   data: {
      //     type: 'orders',
      //     attributes: {
      //       title: 'Bulk Purchase Order',
      //       type: 'BUY',
      //       deliveryDate: '2024-12-31T00:00:00Z',
      //       deliveryLocation: 'Test Location',
      //     },
      //     relationships: {
      //       items: {
      //         data: [
      //           {
      //             type: 'order-items',
      //             attributes: {
      //               commodityId: 'commodity-id',
      //               quantity: 100,
      //               unitPrice: 5.50,
      //             },
      //           },
      //         ],
      //       },
      //     },
      //   },
      // };

      // const response = await testContext
      //   .request()
      //   .post('/api/orders')
      //   .send(orderData)
      //   .expect(HttpStatus.CREATED);

      // Verify both order and order items were created
      // const orderCount = await testContext.prisma.order.count();
      // const orderItemCount = await testContext.prisma.orderItem.count();
      // expect(orderCount).toBe(1);
      // expect(orderItemCount).toBe(1);

      // For now, just verify the seeded data
      expect(organization.id).toBeDefined();
      expect(user.organizationId).toBe(organization.id);
    });

    it('should test pagination and filtering', async () => {
      // Create multiple test records
      const org = await testContext.createOrganization();

      const farms = await Promise.all([
        testContext.createFarm({
          organization: { connect: { id: org.id } },
          name: 'Farm A',
          totalArea: 100,
        }),
        testContext.createFarm({
          organization: { connect: { id: org.id } },
          name: 'Farm B',
          totalArea: 200,
        }),
        testContext.createFarm({
          organization: { connect: { id: org.id } },
          name: 'Farm C',
          totalArea: 300,
        }),
      ]);

      // Test pagination
      // Example: Test getting paginated farms
      // const page1Response = await testContext
      //   .request()
      //   .get('/api/farms?page[size]=2&page[number]=1')
      //   .expect(HttpStatus.OK);

      // expect(page1Response.body.data).toHaveLength(2);
      // expect(page1Response.body.meta.pagination).toMatchObject({
      //   page: 1,
      //   size: 2,
      //   total: 3,
      //   pages: 2,
      // });

      // Test filtering
      // Example: Test filtering farms by area
      // const filteredResponse = await testContext
      //   .request()
      //   .get('/api/farms?filter[totalArea][gte]=200')
      //   .expect(HttpStatus.OK);

      // expect(filteredResponse.body.data).toHaveLength(2);

      // For now, just verify the test data was created
      expect(farms).toHaveLength(3);
      expect(farms[0].totalArea).toBe(100);
      expect(farms[1].totalArea).toBe(200);
      expect(farms[2].totalArea).toBe(300);
    });
  });

  describe('Performance Testing with TestContext', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      // Create a larger dataset for performance testing
      const org = await testContext.createOrganization();

      // Create multiple farms in parallel
      const farmPromises = Array.from({ length: 10 }, (_, i) =>
        testContext.createFarm({
          organization: { connect: { id: org.id } },
          name: `Performance Farm ${i + 1}`,
          totalArea: (i + 1) * 50,
        }),
      );

      const farms = await Promise.all(farmPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all farms were created
      expect(farms).toHaveLength(10);

      // Performance assertion (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify database state
      const farmCount = await testContext.prisma.farm.count();
      expect(farmCount).toBe(10);
    });

    it('should efficiently clean up large datasets', async () => {
      // Create a large dataset
      const org = await testContext.createOrganization();

      await Promise.all([
        ...Array.from({ length: 20 }, () =>
          testContext.createFarm({ organization: { connect: { id: org.id } } }),
        ),
        ...Array.from({ length: 50 }, () => testContext.createCommodity()),
        ...Array.from({ length: 30 }, () =>
          testContext.createUser({ organizationId: org.id }),
        ),
      ]);

      // Verify data was created
      let farmCount = await testContext.prisma.farm.count();
      let commodityCount = await testContext.prisma.commodity.count();
      let userCount = await testContext.prisma.user.count();

      expect(farmCount).toBe(20);
      expect(commodityCount).toBe(50);
      expect(userCount).toBe(30);

      // Measure cleanup performance
      const startTime = Date.now();
      await testContext.resetDatabase();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify cleanup was successful
      farmCount = await testContext.prisma.farm.count();
      commodityCount = await testContext.prisma.commodity.count();
      userCount = await testContext.prisma.user.count();

      expect(farmCount).toBe(0);
      expect(commodityCount).toBe(0);
      expect(userCount).toBe(0);

      // Performance assertion for cleanup
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
