import {
  TestContext,
  TestScenario,
  BasicFarmScenarioResult,
  MultiFarmScenarioResult,
  OrdersScenarioResult,
} from './test-context';
import { PrismaClient, OrganizationType } from '@prisma/client';

describe('TestContext', () => {
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

  describe('Database Integration', () => {
    it('should provide access to Prisma client', () => {
      const prisma = testContext.prisma;
      expect(prisma).toBeInstanceOf(PrismaClient);
    });

    it('should provide access to NestJS app', () => {
      const app = testContext.app;
      expect(app).toBeDefined();
      expect(app.getHttpServer).toBeDefined();
    });

    it('should provide supertest request instance', () => {
      const request = testContext.request();
      expect(request).toBeDefined();
    });

    it('should check database health', async () => {
      const health = await testContext.getDatabaseHealth();
      expect(health.healthy).toBe(true);
    });
  });

  describe('Factory Methods', () => {
    describe('createOrganization', () => {
      it('should create organization with default values', async () => {
        const org = await testContext.createOrganization();

        expect(org).toMatchObject({
          name: expect.stringContaining('Test Organization'),
          type: 'FARM_OPERATION',
          email: expect.stringContaining('@example.com'),
          isActive: true,
          plan: 'basic',
          maxUsers: 5,
          maxFarms: 1,
        });
        expect(org.id).toBeDefined();
        expect(org.createdAt).toBeDefined();
      });

      it('should create organization with custom values', async () => {
        const customData = {
          name: 'Custom Organization',
          type: OrganizationType.COMMODITY_TRADER,
          email: 'custom@example.com',
          plan: 'premium',
          maxUsers: 50,
        };

        const org = await testContext.createOrganization(customData);

        expect(org).toMatchObject(customData);
      });
    });

    describe('createUser', () => {
      it('should create user with default values', async () => {
        const user = await testContext.createUser();

        expect(user).toMatchObject({
          email: expect.stringContaining('@example.com'),
          name: expect.stringContaining('Test User'),
          isActive: true,
          emailVerified: true,
        });
        expect(user.id).toBeDefined();
        expect(user.organization).toBeDefined();
        expect(user.organization.id).toBeDefined();
      });

      it('should create user with existing organization', async () => {
        const org = await testContext.createOrganization();
        const user = await testContext.createUser({
          organizationId: org.id,
          name: 'Custom User',
        });

        expect(user.name).toBe('Custom User');
        expect(user.organization.id).toBe(org.id);
      });
    });

    describe('createFarm', () => {
      it('should create farm with default values', async () => {
        const farm = await testContext.createFarm();

        expect(farm).toMatchObject({
          name: expect.stringContaining('Test Farm'),
          totalArea: 100.0,
          cropTypes: ['corn', 'soybeans'],
          certifications: ['organic'],
          isActive: true,
          isPublic: false,
        });
        expect(farm.id).toBeDefined();
        expect(farm.organization).toBeDefined();
        expect(farm.location).toMatchObject({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          address: expect.any(String),
        });
      });

      it('should create farm with custom values', async () => {
        const org = await testContext.createOrganization();
        const customData = {
          organization: { connect: { id: org.id } },
          name: 'Custom Farm',
          totalArea: 500.0,
          cropTypes: ['wheat', 'barley'],
          isPublic: true,
        };

        const farm = await testContext.createFarm(customData);

        expect(farm.name).toBe('Custom Farm');
        expect(farm.totalArea).toBe(500.0);
        expect(farm.cropTypes).toEqual(['wheat', 'barley']);
        expect(farm.isPublic).toBe(true);
        expect(farm.organization.id).toBe(org.id);
      });
    });

    describe('createCommodity', () => {
      it('should create commodity with default values', async () => {
        const commodity = await testContext.createCommodity();

        expect(commodity).toMatchObject({
          name: expect.stringContaining('Test Commodity'),
          category: 'grain',
          variety: 'yellow',
          qualityGrade: 'premium',
          quantity: 1000.0,
          unit: 'bushel',
          storageLocation: 'Warehouse A',
          isActive: true,
          isGlobal: true,
        });
        expect(commodity.id).toBeDefined();
        expect(commodity.harvestDate).toBeDefined();
      });

      it('should create commodity linked to farm', async () => {
        const farm = await testContext.createFarm();
        const commodity = await testContext.createCommodity({
          farm: { connect: { id: farm.id } },
          isGlobal: false,
        });

        expect(commodity.isGlobal).toBe(false);
        expect(commodity.farm).toBeDefined();
        expect(commodity.farm.id).toBe(farm.id);
      });
    });

    describe('createOrder', () => {
      it('should create order with default values', async () => {
        const order = await testContext.createOrder();

        expect(order).toMatchObject({
          title: expect.stringContaining('Test Order'),
          type: 'BUY',
          status: 'PENDING',
          quantity: 100.0,
          pricePerUnit: 5.5,
          totalPrice: 550.0,
          currency: 'USD',
        });
        expect(order.id).toBeDefined();
        expect(order.orderNumber).toMatch(/^ORD-\d+$/);
        expect(order.buyerOrg).toBeDefined();
        expect(order.createdBy).toBeDefined();
        expect(order.commodityId).toBeDefined();
        expect(order.deliveryDate).toBeDefined();
        expect(order.terms).toMatchObject({
          paymentMethod: 'credit',
          deliveryTerms: 'FOB destination',
          qualityRequirements: 'Grade A or better',
        });
      });

      it('should create order with existing entities', async () => {
        const buyerOrg = await testContext.createOrganization({
          name: 'Buyer Org',
        });
        const supplierOrg = await testContext.createOrganization({
          name: 'Supplier Org',
        });
        const buyer = await testContext.createUser({
          organizationId: buyerOrg.id,
        });
        const commodity = await testContext.createCommodity({
          name: 'Custom Commodity',
        });

        const order = await testContext.createOrder({
          buyerOrg: { connect: { id: buyerOrg.id } },
          supplierOrg: { connect: { id: supplierOrg.id } },
          createdBy: { connect: { id: buyer.id } },
          commodityId: commodity.id,
          type: 'SELL',
          status: 'CONFIRMED',
        });

        expect(order.buyerOrg.id).toBe(buyerOrg.id);
        expect(order.supplierOrg.id).toBe(supplierOrg.id);
        expect(order.createdBy.id).toBe(buyer.id);
        expect(order.commodityId).toBe(commodity.id);
        expect(order.type).toBe('SELL');
        expect(order.status).toBe('CONFIRMED');
      });
    });

    describe('createInventory', () => {
      it('should create inventory with default values', async () => {
        const inventory = await testContext.createInventory();

        expect(inventory).toMatchObject({
          quantity: 500.0,
          unit: 'bushel',
          quality: 'Grade A',
          location: 'Warehouse B',
          status: 'AVAILABLE',
        });
        expect(inventory.id).toBeDefined();
        expect(inventory.organization).toBeDefined();
        expect(inventory.commodity).toBeDefined();
      });

      it('should create inventory with existing entities', async () => {
        const org = await testContext.createOrganization();
        const farm = await testContext.createFarm({
          organization: { connect: { id: org.id } },
        });
        const commodity = await testContext.createCommodity({
          farm: { connect: { id: farm.id } },
        });

        const inventory = await testContext.createInventory({
          organization: { connect: { id: org.id } },
          farm: { connect: { id: farm.id } },
          commodity: { connect: { id: commodity.id } },
          quantity: 1000.0,
          status: 'RESERVED',
        });

        expect(inventory.organization.id).toBe(org.id);
        expect(inventory.farm.id).toBe(farm.id);
        expect(inventory.commodity.id).toBe(commodity.id);
        expect(inventory.quantity).toBe(1000.0);
        expect(inventory.status).toBe('RESERVED');
      });
    });
  });

  describe('Test Data Seeding', () => {
    describe('EMPTY scenario', () => {
      it('should seed no data', async () => {
        const result = await testContext.seedTestData(TestScenario.EMPTY);
        expect(result).toEqual({});

        // Verify database is empty
        const orgCount = await testContext.prisma.organization.count();
        expect(orgCount).toBe(0);
      });
    });

    describe('BASIC_FARM scenario', () => {
      it('should seed basic farm data', async () => {
        const result = (await testContext.seedTestData(
          TestScenario.BASIC_FARM,
        )) as BasicFarmScenarioResult;

        expect(result).toMatchObject({
          organization: expect.objectContaining({
            name: 'Basic Farm Organization',
            type: 'FARM_OPERATION',
          }),
          user: expect.objectContaining({
            name: 'John Farmer',
            email: 'farmer@example.com',
          }),
          farm: expect.objectContaining({
            name: 'Sunny Acres Farm',
            totalArea: 250.0,
            cropTypes: ['corn', 'soybeans', 'wheat'],
          }),
          commodity: expect.objectContaining({
            name: 'Organic Corn',
            category: 'grain',
            quantity: 2000.0,
          }),
        });

        // Verify data was created
        const orgCount = await testContext.prisma.organization.count();
        const userCount = await testContext.prisma.user.count();
        const farmCount = await testContext.prisma.farm.count();
        const commodityCount = await testContext.prisma.commodity.count();

        expect(orgCount).toBe(1);
        expect(userCount).toBe(1);
        expect(farmCount).toBe(1);
        expect(commodityCount).toBe(1);
      });
    });

    describe('MULTI_FARM scenario', () => {
      it('should seed multiple farms data', async () => {
        const result = (await testContext.seedTestData(
          TestScenario.MULTI_FARM,
        )) as MultiFarmScenarioResult;

        expect(result.organizations).toHaveLength(3);
        expect(result.users).toHaveLength(3);
        expect(result.farms).toHaveLength(3);

        // Verify each farm has different characteristics
        expect(result.farms[0].cropTypes).toEqual(['corn']);
        expect(result.farms[1].cropTypes).toEqual(['soybeans']);
        expect(result.farms[2].cropTypes).toEqual(['wheat']);

        // Verify data was created
        const orgCount = await testContext.prisma.organization.count();
        const userCount = await testContext.prisma.user.count();
        const farmCount = await testContext.prisma.farm.count();

        expect(orgCount).toBe(3);
        expect(userCount).toBe(3);
        expect(farmCount).toBe(3);
      });
    });

    describe('ORDERS_SCENARIO', () => {
      it('should seed orders data', async () => {
        const result = (await testContext.seedTestData(
          TestScenario.ORDERS_SCENARIO,
        )) as OrdersScenarioResult;

        expect(result).toMatchObject({
          buyerOrg: expect.objectContaining({
            name: 'Grain Buyer Corp',
            type: 'COMMODITY_TRADER',
          }),
          supplierOrg: expect.objectContaining({
            name: 'Farm Supplier LLC',
            type: 'FARM_OPERATION',
          }),
          buyer: expect.objectContaining({
            name: 'Buyer User',
          }),
          supplier: expect.objectContaining({
            name: 'Supplier User',
          }),
          farm: expect.objectContaining({
            name: 'Supplier Farm',
          }),
          commodities: expect.arrayContaining([
            expect.objectContaining({ name: 'Premium Corn' }),
            expect.objectContaining({ name: 'Organic Soybeans' }),
          ]),
          orders: expect.arrayContaining([
            expect.objectContaining({
              orderNumber: 'ORD-CORN-001',
              status: 'PENDING',
            }),
            expect.objectContaining({
              orderNumber: 'ORD-SOY-001',
              status: 'CONFIRMED',
            }),
          ]),
        });

        // Verify data was created
        const orderCount = await testContext.prisma.order.count();
        const commodityCount = await testContext.prisma.commodity.count();

        expect(orderCount).toBe(2);
        expect(commodityCount).toBe(2);
      });
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique test IDs', () => {
      const id1 = testContext.generateTestId();
      const id2 = testContext.generateTestId();

      expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should wait for async operations', async () => {
      const slowOperation = new Promise((resolve) =>
        setTimeout(() => resolve('completed'), 100),
      );

      const result = await testContext.waitForAsyncOperation(
        slowOperation,
        1000,
      );
      expect(result).toBe('completed');
    });

    it('should timeout slow operations', async () => {
      const slowOperation = new Promise((resolve) =>
        setTimeout(() => resolve('completed'), 1000),
      );

      await expect(
        testContext.waitForAsyncOperation(slowOperation, 100),
      ).rejects.toThrow('Operation timed out after 100ms');
    });

    it('should create authenticated request', async () => {
      const user = await testContext.createUser();
      const request = await testContext.createAuthenticatedRequest(user);

      expect(request).toBeDefined();
      // In a real implementation, you'd verify the auth headers are set
    });

    it('should assert JSON API response format', () => {
      const validResponse = {
        body: {
          data: {
            type: 'farms',
            id: '123',
            attributes: { name: 'Test Farm' },
          },
        },
      } as any;

      expect(() => {
        testContext.assertJsonApiResponse(validResponse, 'farms');
      }).not.toThrow();

      const invalidResponse = {
        body: { invalid: 'response' },
      } as any;

      expect(() => {
        testContext.assertJsonApiResponse(invalidResponse);
      }).toThrow();
    });
  });

  describe('Database Management', () => {
    it('should reset database between tests', async () => {
      // Create some data
      await testContext.createOrganization();
      let count = await testContext.prisma.organization.count();
      expect(count).toBe(1);

      // Reset database
      await testContext.resetDatabase();
      count = await testContext.prisma.organization.count();
      expect(count).toBe(0);
    });

    it('should cleanup specific tables', async () => {
      // Create data in multiple tables
      const org = await testContext.createOrganization();
      await testContext.createUser({ organizationId: org.id });

      let orgCount = await testContext.prisma.organization.count();
      let userCount = await testContext.prisma.user.count();
      expect(orgCount).toBe(1);
      expect(userCount).toBe(1);

      // Cleanup only users table
      await testContext.cleanupTables(['users']);

      orgCount = await testContext.prisma.organization.count();
      userCount = await testContext.prisma.user.count();
      expect(orgCount).toBe(1); // Organization should still exist
      expect(userCount).toBe(0); // Users should be cleaned up
    });
  });

  describe('Error Handling', () => {
    it('should throw error when accessing prisma before setup', () => {
      const newContext = new TestContext();
      expect(() => newContext.prisma).toThrow('TestContext not initialized');
    });

    it('should throw error when accessing app before setup', () => {
      const newContext = new TestContext();
      expect(() => newContext.app).toThrow('TestContext not initialized');
    });

    it('should throw error for unknown test scenario', async () => {
      await expect(
        testContext.seedTestData('UNKNOWN_SCENARIO' as TestScenario),
      ).rejects.toThrow('Unknown test scenario: UNKNOWN_SCENARIO');
    });
  });
});
