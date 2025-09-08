import { DatabaseTestManager } from './database-test-manager';
import { PrismaClient } from '@prisma/client';

describe('DatabaseTestManager - Available Tables Only', () => {
  let dbManager: DatabaseTestManager;
  let prisma: PrismaClient;

  beforeAll(async () => {
    jest.setTimeout(120000);
    dbManager = DatabaseTestManager.getInstance();
    await dbManager.startContainer();
    prisma = dbManager.getPrismaClient();
  }, 120000);

  afterAll(async () => {
    if (dbManager && dbManager.isRunning()) {
      await dbManager.stopContainer();
    }
  }, 30000);

  beforeEach(async () => {
    await dbManager.resetDatabase();
  });

  describe('Container Management', () => {
    it('should provide valid connection URL', () => {
      const url = dbManager.getConnectionUrl();
      expect(url).toMatch(/postgresql:\/\/test_user:test_password@.+:\d+\/test_db/);
    });

    it('should report healthy status', async () => {
      const health = await dbManager.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.error).toBeUndefined();
    });

    it('should be running', () => {
      expect(dbManager.isRunning()).toBe(true);
    });
  });

  describe('Database Operations', () => {
    it('should execute raw queries', async () => {
      const result = await dbManager.executeRawQuery(
        'SELECT $1::text as message, $2::int as number',
        ['Hello', 42]
      );
      
      expect(result).toEqual([{ message: 'Hello', number: 42 }]);
    });

    it('should cleanup specific tables', async () => {
      // Create test data
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          type: 'FARM_OPERATION',
        },
      });

      await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          organizationId: org.id,
        },
      });

      // Verify data exists
      expect(await prisma.organization.count()).toBe(1);
      expect(await prisma.user.count()).toBe(1);

      // Cleanup only users table
      await dbManager.cleanupTables(['users']);

      // Verify selective cleanup
      expect(await prisma.organization.count()).toBe(1);
      expect(await prisma.user.count()).toBe(0);
    });
  });

  describe('Available Tables Integration', () => {
    it('should handle organization with users and farms', async () => {
      // Create organization
      const org = await prisma.organization.create({
        data: {
          name: 'Complex Farm Co.',
          type: 'FARM_OPERATION',
          email: 'contact@complexfarm.com',
          address: {
            street: '123 Complex Farm Road',
            city: 'Farmville',
            state: 'CA',
            zipCode: '12345',
          },
        },
      });

      // Create user
      const user = await prisma.user.create({
        data: {
          email: 'manager@complexfarm.com',
          name: 'Farm Manager',
          organizationId: org.id,
        },
      });

      // Create farm
      const farm = await prisma.farm.create({
        data: {
          name: 'North Field',
          organizationId: org.id,
          totalArea: 100.0,
          cropTypes: ['corn', 'soybeans'],
          establishedDate: new Date('2020-01-01'),
        },
      });

      // Verify relationships
      const orgWithData = await prisma.organization.findUnique({
        where: { id: org.id },
        include: {
          users: true,
          farms: true,
        },
      });

      expect(orgWithData).toBeDefined();
      expect(orgWithData!.users).toHaveLength(1);
      expect(orgWithData!.farms).toHaveLength(1);
      expect(orgWithData!.users[0].name).toBe('Farm Manager');
      expect(orgWithData!.farms[0].name).toBe('North Field');
    });

    it('should handle commodity operations', async () => {
      // Setup organization and farm
      const org = await prisma.organization.create({
        data: {
          name: 'Commodity Farm',
          type: 'FARM_OPERATION',
        },
      });

      const farm = await prisma.farm.create({
        data: {
          name: 'Commodity Farm',
          organizationId: org.id,
          totalArea: 200.0,
          cropTypes: ['wheat'],
          establishedDate: new Date('2015-01-01'),
        },
      });

      // Create commodity
      const commodity = await prisma.commodity.create({
        data: {
          name: 'Winter Wheat',
          category: 'grain',
          quantity: 500.0,
          unit: 'bushel',
          harvestDate: new Date('2024-09-01'),
          storageLocation: 'Silo A',
          farmId: farm.id,
        },
      });

      // Verify relationships
      const commodityWithFarm = await prisma.commodity.findUnique({
        where: { id: commodity.id },
        include: {
          farm: true,
        },
      });

      expect(commodityWithFarm).toBeDefined();
      expect(commodityWithFarm!.farm!.name).toBe('Commodity Farm');
      expect(commodityWithFarm!.name).toBe('Winter Wheat');
      expect(commodityWithFarm!.quantity).toBe(500.0);
    });

    it('should handle order creation with relationships', async () => {
      // Setup organizations
      const buyerOrg = await prisma.organization.create({
        data: {
          name: 'Buyer Corp',
          type: 'FOOD_PROCESSOR',
        },
      });

      const supplierOrg = await prisma.organization.create({
        data: {
          name: 'Supplier Farm',
          type: 'FARM_OPERATION',
        },
      });

      // Create buyer user
      const buyer = await prisma.user.create({
        data: {
          email: 'buyer@corp.com',
          name: 'Buyer User',
          organizationId: buyerOrg.id,
        },
      });

      // Create farm and commodity
      const farm = await prisma.farm.create({
        data: {
          name: 'Supply Farm',
          organizationId: supplierOrg.id,
          totalArea: 150.0,
          cropTypes: ['corn'],
          establishedDate: new Date('2018-01-01'),
        },
      });

      const commodity = await prisma.commodity.create({
        data: {
          name: 'Sweet Corn',
          category: 'grain',
          quantity: 300.0,
          unit: 'bushel',
          harvestDate: new Date('2024-08-15'),
          storageLocation: 'Silo B',
          farmId: farm.id,
        },
      });

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-001',
          title: 'Sweet Corn Purchase',
          type: 'BUY',
          status: 'PENDING',
          commodityId: commodity.id,
          quantity: 50.0,
          pricePerUnit: 8.00,
          totalPrice: 400.0,
          deliveryDate: new Date('2024-12-15'),
          deliveryLocation: 'Buyer Corp Warehouse',
          buyerOrgId: buyerOrg.id,
          supplierOrgId: supplierOrg.id,
          createdById: buyer.id,
          farmId: farm.id,
        },
      });

      // Verify order with relationships
      const orderWithDetails = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          buyerOrg: true,
          supplierOrg: true,
          createdBy: true,
          farm: true,
        },
      });

      expect(orderWithDetails).toBeDefined();
      expect(orderWithDetails!.buyerOrg.name).toBe('Buyer Corp');
      expect(orderWithDetails!.supplierOrg!.name).toBe('Supplier Farm');
      expect(orderWithDetails!.createdBy.name).toBe('Buyer User');
      expect(orderWithDetails!.farm!.name).toBe('Supply Farm');
      expect(orderWithDetails!.totalPrice).toBe(400.0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unique constraint violations', async () => {
      // Create first organization
      await prisma.organization.create({
        data: {
          name: 'Unique Test Org',
          type: 'FARM_OPERATION',
        },
      });

      // Create first user
      await prisma.user.create({
        data: {
          email: 'unique@test.com',
          name: 'First User',
          organizationId: (await prisma.organization.findFirst())!.id,
        },
      });

      // Attempt to create second user with same email should fail
      await expect(
        prisma.user.create({
          data: {
            email: 'unique@test.com',
            name: 'Second User',
            organizationId: (await prisma.organization.findFirst())!.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should handle foreign key constraints', async () => {
      // Attempt to create user with non-existent organization should fail
      await expect(
        prisma.user.create({
          data: {
            email: 'orphan@test.com',
            name: 'Orphan User',
            organizationId: 'non-existent-id',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle concurrent operations', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Concurrent Test Org',
          type: 'FARM_OPERATION',
        },
      });

      // Create multiple users concurrently
      const userPromises = Array.from({ length: 3 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `concurrent${i}@test.com`,
            name: `Concurrent User ${i}`,
            organizationId: org.id,
          },
        })
      );

      const users = await Promise.all(userPromises);
      expect(users).toHaveLength(3);

      // Verify all users were created
      const userCount = await prisma.user.count({
        where: { organizationId: org.id },
      });
      expect(userCount).toBe(3);
    });

    it('should handle complex queries and aggregations', async () => {
      // Create test data
      const org = await prisma.organization.create({
        data: {
          name: 'Analytics Test Org',
          type: 'FARM_OPERATION',
        },
      });

      const farm = await prisma.farm.create({
        data: {
          name: 'Analytics Farm',
          organizationId: org.id,
          totalArea: 500.0,
          cropTypes: ['corn', 'wheat', 'soybeans'],
          establishedDate: new Date('2010-01-01'),
        },
      });

      // Create multiple commodities
      const commodities = await Promise.all([
        prisma.commodity.create({
          data: {
            name: 'Corn',
            category: 'grain',
            quantity: 1000.0,
            unit: 'bushel',
            harvestDate: new Date('2024-09-01'),
            storageLocation: 'Silo A',
            farmId: farm.id,
          },
        }),
        prisma.commodity.create({
          data: {
            name: 'Wheat',
            category: 'grain',
            quantity: 800.0,
            unit: 'bushel',
            harvestDate: new Date('2024-08-15'),
            storageLocation: 'Silo B',
            farmId: farm.id,
          },
        }),
        prisma.commodity.create({
          data: {
            name: 'Soybeans',
            category: 'grain',
            quantity: 600.0,
            unit: 'bushel',
            harvestDate: new Date('2024-10-01'),
            storageLocation: 'Silo C',
            farmId: farm.id,
          },
        }),
      ]);

      // Test aggregation queries
      const totalQuantity = await prisma.commodity.aggregate({
        where: { farmId: farm.id },
        _sum: { quantity: true },
        _count: { id: true },
        _avg: { quantity: true },
      });

      expect(totalQuantity._sum.quantity).toBe(2400.0);
      expect(totalQuantity._count.id).toBe(3);
      expect(totalQuantity._avg.quantity).toBe(800.0);

      // Test groupBy queries
      const commoditiesByCategory = await prisma.commodity.groupBy({
        by: ['category'],
        where: { farmId: farm.id },
        _sum: { quantity: true },
        _count: { id: true },
      });

      expect(commoditiesByCategory).toHaveLength(1);
      expect(commoditiesByCategory[0].category).toBe('grain');
      expect(commoditiesByCategory[0]._sum.quantity).toBe(2400.0);
      expect(commoditiesByCategory[0]._count.id).toBe(3);
    });
  });
});
