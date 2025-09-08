import { DatabaseTestManager } from './database-test-manager';

describe('DatabaseTestManager', () => {
  let dbManager: DatabaseTestManager;

  beforeAll(async () => {
    // Increase timeout for container operations
    jest.setTimeout(60000);
    dbManager = DatabaseTestManager.getInstance();
  }, 60000);

  afterAll(async () => {
    if (dbManager && dbManager.isRunning()) {
      await dbManager.stopContainer();
    }
  }, 30000);

  describe('Container Lifecycle', () => {
    it('should start PostgreSQL container successfully', async () => {
      await dbManager.startContainer();
      
      expect(dbManager.isRunning()).toBe(true);
      expect(dbManager.getConnectionUrl()).toMatch(/postgresql:\/\/test_user:test_password@.+:\d+\/test_db/);
    });

    it('should provide healthy database connection', async () => {
      const healthStatus = await dbManager.getHealthStatus();
      
      expect(healthStatus.healthy).toBe(true);
      expect(healthStatus.error).toBeUndefined();
    });

    it('should provide working Prisma client', async () => {
      const prisma = dbManager.getPrismaClient();
      
      expect(prisma).toBeDefined();
      expect(typeof prisma.$queryRaw).toBe('function');
      
      // Test basic query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toEqual([{ test: 1 }]);
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      // Ensure clean state for each test
      await dbManager.resetDatabase();
    });

    it('should reset database successfully', async () => {
      const prisma = dbManager.getPrismaClient();
      
      // Create test data
      await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'FARM_OPERATION',
        },
      });

      // Verify data exists
      const orgsBefore = await prisma.organization.count();
      expect(orgsBefore).toBe(1);

      // Reset database
      await dbManager.resetDatabase();

      // Verify data is gone
      const orgsAfter = await prisma.organization.count();
      expect(orgsAfter).toBe(0);
    });

    it('should cleanup specific tables', async () => {
      const prisma = dbManager.getPrismaClient();
      
      // Create test data in multiple tables
      const org = await prisma.organization.create({
        data: {
          name: 'Test Organization',
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

      // Verify only users table was cleaned
      expect(await prisma.organization.count()).toBe(1);
      expect(await prisma.user.count()).toBe(0);
    });

    it('should execute raw queries', async () => {
      const result = await dbManager.executeRawQuery(
        'SELECT $1::text as message',
        ['Hello, World!']
      );
      
      expect(result).toEqual([{ message: 'Hello, World!' }]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when accessing Prisma client before container start', () => {
      const freshManager = new (DatabaseTestManager as any)();
      
      expect(() => freshManager.getPrismaClient()).toThrow(
        'Prisma client not initialized. Call startContainer() first.'
      );
    });

    it('should throw error when getting connection URL before container start', () => {
      const freshManager = new (DatabaseTestManager as any)();
      
      expect(() => freshManager.getConnectionUrl()).toThrow(
        'Container not started. Call startContainer() first.'
      );
    });

    it('should handle database connection issues gracefully', async () => {
      // Stop the container to simulate connection issues
      await dbManager.stopContainer();
      
      const healthStatus = await dbManager.getHealthStatus();
      expect(healthStatus.healthy).toBe(false);
      expect(healthStatus.error).toBe('Container not running');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DatabaseTestManager.getInstance();
      const instance2 = DatabaseTestManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
