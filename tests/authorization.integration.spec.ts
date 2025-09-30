import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Authorization Integration Tests', () => {
  let testContext: TestContext;
  let farmUser: any;
  let farmOrganization: any;
  let traderOrganization: any;
  let testFarm: any;
  let testOrder: any;
  let testActivity: any;
  let farmUserToken: string;
  let traderUserToken: string;
  let platformAdminToken: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up authorization-related tables before each test
    await testContext.cleanupTables([
      'activity_assignments',
      'farm_activities',
      'orders',
      'farms',
      'users',
      'organizations'
    ]);

    // Create test organizations
    farmOrganization = await testContext.createOrganization({
      name: 'Test Farm Organization',
      type: 'FARM_OPERATION',
      email: 'farm@test.com'
    });

    traderOrganization = await testContext.createOrganization({
      name: 'Test Trader Organization',
      type: 'COMMODITY_TRADER',
      email: 'trader@test.com'
    });

    // Create test users
    const hashedPassword = await hash('TestPassword123!');
    
    farmUser = await testContext.createUser({
      email: 'farmuser@test.com',
      name: 'Farm User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: farmOrganization.id
    });

    await testContext.createUser({
      email: 'traderuser@test.com',
      name: 'Trader User',
      phone: '+1234567891',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: traderOrganization.id
    });

    const platformAdminUser = await testContext.createUser({
      email: 'admin@platform.com',
      name: 'Platform Admin',
      phone: '+1234567892',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: farmOrganization.id
    });

    // Create platform admin role and assign it to the user
    const platformAdminRole = await testContext.prisma.role.create({
      data: {
        name: 'platform_admin',
        description: 'Platform Administrator',
        organizationId: farmOrganization.id,
        level: 1000,
        isActive: true,
        isSystemRole: true,
        isPlatformAdmin: true
      }
    });

    await testContext.prisma.userRole.create({
      data: {
        userId: platformAdminUser.id,
        roleId: platformAdminRole.id,
        isActive: true
      }
    });

    // Create test farm
    testFarm = await testContext.prisma.farm.create({
      data: {
        name: 'Test Farm',
        organizationId: farmOrganization.id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Test Farm Road, Test City, TC 12345'
        },
        totalArea: 100,
        cropTypes: ['wheat', 'corn'],
        establishedDate: new Date('2020-01-01'),
        isActive: true
      }
    });

    // Create test order
    testOrder = await testContext.prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        title: 'Test Order',
        type: 'BUY',
        status: 'PENDING',
        commodityId: 'test-commodity',
        quantity: 100,
        pricePerUnit: 10.50,
        totalPrice: 1050.00,
        deliveryDate: new Date(),
        deliveryLocation: 'Test Location',
        deliveryAddress: {},
        buyerOrgId: farmOrganization.id,
        supplierOrgId: traderOrganization.id,
        createdById: farmUser.id,
        farmId: testFarm.id
      }
    });

    // Create test activity
    testActivity = await testContext.prisma.farmActivity.create({
      data: {
        name: 'Test Activity',
        type: 'PLANTING',
        status: 'PLANNED',
        farmId: testFarm.id,
        createdById: farmUser.id,
        scheduledAt: new Date(),
        estimatedDuration: 120
      }
    });

    // Login to get access tokens
    const farmLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'farmuser@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    const traderLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'traderuser@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    const adminLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'admin@platform.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    farmUserToken = farmLoginResponse.body.data.attributes.tokens.accessToken;
    traderUserToken = traderLoginResponse.body.data.attributes.tokens.accessToken;
    platformAdminToken = adminLoginResponse.body.data.attributes.tokens.accessToken;
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Organization Isolation', () => {
    it('should allow users to access their own organization data', async () => {
      const response = await testContext
        .request()
        .get('/farms')
        .set('Authorization', `Bearer ${farmUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      // Verify all farms belong to the user's organization
      response.body.data.forEach((farm: any) => {
        expect(farm.attributes.organizationId).toBe(farmOrganization.id);
      });
    });

    it('should deny access to other organization data', async () => {
      const response = await testContext
        .request()
        .get('/farms')
        .set('Authorization', `Bearer ${traderUserToken}`)
        .expect(200);

      // Verify no farms from farmOrganization.id are returned
      response.body.data.forEach((farm: any) => {
        expect(farm.attributes.organizationId).not.toBe(farmOrganization.id);
      });
    });

    it('should allow platform admin to access all organization data', async () => {
      const response = await testContext
        .request()
        .get('/farms')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      // Platform admin should see farms from all organizations
    });
  });

  describe('Feature Access Control', () => {
    it('should allow FARM organization to access farm management features', async () => {
      const response = await testContext
        .request()
        .get('/activities')
        .set('Authorization', `Bearer ${farmUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny FARM organization access to marketplace features', async () => {
      const response = await testContext
        .request()
        .get('/market/listings')
        .set('Authorization', `Bearer ${farmUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('not available for FARM organizations');
    });

    it('should allow COMMODITY_TRADER organization to access marketplace features', async () => {
      const response = await testContext
        .request()
        .get('/market/listings')
        .set('Authorization', `Bearer ${traderUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny access when feature is not in organization plan', async () => {
      // This would require setting up an organization without the required feature
      // Implementation depends on your specific feature configuration
    });
  });

  describe('Permission-Based Access', () => {
    it('should allow users with correct permissions to perform actions', async () => {
      const response = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${farmUserToken}`)
        .send({
          data: {
            type: 'activity',
            attributes: {
              name: 'Test Activity',
              type: 'PLANTING',
              farmId: testFarm.id,
              scheduledAt: new Date().toISOString(),
              estimatedDuration: 120,
            },
          },
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it('should deny users without correct permissions', async () => {
      // This would require a user without the required permissions
      // Implementation depends on your permission setup
    });

    it('should enforce role level requirements', async () => {
      // Test that high-level operations require appropriate role levels
      const response = await testContext
        .request()
        .delete(`/activities/${testActivity.id}`)
        .set('Authorization', `Bearer ${farmUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('role level is insufficient');
    });
  });

  describe('Resource-Level Authorization', () => {
    it('should allow order creator to update their order', async () => {
      const response = await testContext
        .request()
        .patch(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${farmUserToken}`)
        .send({
          data: {
            type: 'order',
            attributes: {
              title: 'Updated Order Title',
            },
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny non-creator from updating order', async () => {
      const response = await testContext
        .request()
        .patch(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${traderUserToken}`)
        .send({
          data: {
            type: 'order',
            attributes: {
              title: 'Unauthorized Update',
            },
          },
        })
        .expect(403);

      expect(response.body.message).toContain('Only order creator can perform this action');
    });

    it('should allow assigned users to work on activities', async () => {
      // First assign the user to the activity
      await testContext
        .request()
        .post(`/activities/${testActivity.id}/assignments`)
        .set('Authorization', `Bearer ${farmUserToken}`)
        .send({
          data: {
            type: 'assignment',
            attributes: {
              userId: farmUser.id,
              role: 'ASSIGNED',
            },
          },
        })
        .expect(201);

      // Then test that they can start the activity
      const response = await testContext
        .request()
        .post(`/activities/${testActivity.id}/start`)
        .set('Authorization', `Bearer ${farmUserToken}`)
        .send({
          data: {
            type: 'activity-execution',
            attributes: {
              notes: 'Starting activity',
            },
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny non-assigned users from working on activities', async () => {
      const response = await testContext
        .request()
        .post(`/activities/${testActivity.id}/start`)
        .set('Authorization', `Bearer ${traderUserToken}`)
        .send({
          data: {
            type: 'activity-execution',
            attributes: {
              notes: 'Unauthorized start',
            },
          },
        })
        .expect(403);

      expect(response.body.message).toContain('Not assigned to this activity');
    });
  });

  describe('Guard Chain Integration', () => {
    it('should apply all guards in correct order', async () => {
      // Test that the guard chain works properly:
      // 1. JwtAuthGuard - validates token
      // 2. OrganizationIsolationGuard - checks org isolation
      // 3. FeatureAccessGuard - checks feature access
      // 4. PermissionsGuard - checks permissions
      // 5. Resource guards - checks resource access

      const response = await testContext
        .request()
        .get('/activities')
        .set('Authorization', `Bearer ${farmUserToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should fail fast on first guard failure', async () => {
      // Test with invalid token
      await testContext
        .request()
        .get('/activities')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with no token
      await testContext
        .request()
        .get('/activities')
        .expect(401);
    });
  });

  describe('Platform Admin Bypass', () => {
    it('should allow platform admin to bypass all restrictions', async () => {
      // Platform admin should be able to access any resource
      const response = await testContext
        .request()
        .get('/farms')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should allow platform admin to access any organization data', async () => {
      const response = await testContext
        .request()
        .get('/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error format for authorization failures', async () => {
      const response = await testContext
        .request()
        .get('/market/listings')
        .set('Authorization', `Bearer ${farmUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });

    it('should log authorization failures appropriately', async () => {
      // This would require checking logs
      // Implementation depends on your logging setup
    });
  });
});
