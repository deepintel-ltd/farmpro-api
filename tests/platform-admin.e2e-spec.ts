import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Platform Admin E2E Tests', () => {
  let testContext: TestContext;
  let platformAdminUser: any;
  let regularUser: any;
  let testOrganization: any;
  let testOrganization2: any;
  let platformAdminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up platform admin related tables before each test
    await testContext.cleanupTables([
      'user_roles',
      'roles',
      'users',
      'organizations',
      'farms',
      'orders'
    ]);

    // Create test organizations
    testOrganization = await testContext.createOrganization({
      name: 'Test Farm Organization',
      type: 'FARM_OPERATION',
      email: 'farm@test.com',
      plan: 'basic',
      features: ['farms', 'inventory'],
      allowedModules: ['farms', 'inventory']
    });

    testOrganization2 = await testContext.createOrganization({
      name: 'Test Trader Organization',
      type: 'COMMODITY_TRADER',
      email: 'trader@test.com',
      plan: 'professional',
      features: ['market', 'orders'],
      allowedModules: ['market', 'orders']
    });

    // Create platform admin user
    const hashedPassword = await hash('PlatformAdmin123!');
    platformAdminUser = await testContext.createUser({
      email: 'platform-admin@test.com',
      name: 'Platform Admin User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Create platform admin role
    const platformAdminRole = await testContext.prisma.role.create({
      data: {
        name: 'Platform Administrator',
        description: 'Platform-wide administrator role',
        isPlatformAdmin: true,
        isSystemRole: true,
        scope: 'PLATFORM',
        level: 1000
      }
    });

    // Assign platform admin role to user
    await testContext.prisma.userRole.create({
      data: {
        userId: platformAdminUser.id,
        roleId: platformAdminRole.id,
        isActive: true
      }
    });

    // Create regular user
    const hashedPassword2 = await hash('RegularUser123!');
    regularUser = await testContext.createUser({
      email: 'regular@test.com',
      name: 'Regular User',
      phone: '+1234567891',
      hashedPassword: hashedPassword2,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Login to get access tokens
    const platformAdminLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'platform-admin@test.com',
        password: 'PlatformAdmin123!'
      })
      .expect(200);

    platformAdminToken = platformAdminLoginResponse.body.data.attributes.tokens.accessToken;

    const regularUserLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'regular@test.com',
        password: 'RegularUser123!'
      })
      .expect(200);

    regularUserToken = regularUserLoginResponse.body.data.attributes.tokens.accessToken;

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Authorization Tests', () => {
    it('should allow platform admin to access all endpoints', async () => {
      await testContext
        .request()
        .get('/platform-admin/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);
    });

    it('should deny regular user access to platform admin endpoints', async () => {
      await testContext
        .request()
        .get('/platform-admin/organizations')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should deny access without authentication', async () => {
      await testContext
        .request()
        .get('/platform-admin/organizations')
        .expect(401);
    });
  });

  describe('GET /platform-admin/organizations', () => {
    it('should get all organizations with pagination', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(20);
      expect(response.body.meta.pages).toBe(1);
    });

    it('should filter organizations by type', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations?type=FARM_OPERATION')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('FARM_OPERATION');
    });

    it('should filter organizations by active status', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations?isActive=true')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(org => org.isActive)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations?page=1&limit=1')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(1);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.pages).toBe(2);
    });
  });

  describe('POST /platform-admin/organizations/:id/suspend', () => {
    it('should suspend an organization successfully', async () => {
      const suspendData = {
        reason: 'Violation of terms of service and multiple complaints'
      };

      const response = await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(suspendData)
        .expect(200);

      expect(response.body.suspendedAt).toBeDefined();
      expect(response.body.suspensionReason).toBe(suspendData.reason);
      expect(response.body.isActive).toBe(false);
    });

    it('should fail to suspend non-existent organization', async () => {
      const suspendData = {
        reason: 'Test suspension reason'
      };

      await testContext
        .request()
        .post('/platform-admin/organizations/non-existent-id/suspend')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(suspendData)
        .expect(404);
    });

    it('should fail to suspend already suspended organization', async () => {
      // First suspend
      const suspendData = {
        reason: 'First suspension reason'
      };

      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(suspendData)
        .expect(200);

      // Try to suspend again
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(suspendData)
        .expect(400);
    });

    it('should fail with invalid suspension reason', async () => {
      const invalidData = {
        reason: 'Short'
      };

      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /platform-admin/organizations/:id/reactivate', () => {
    beforeEach(async () => {
      // Suspend organization first
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ reason: 'Test suspension for reactivation' })
        .expect(200);
    });

    it('should reactivate a suspended organization', async () => {
      const response = await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/reactivate`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(200);

      expect(response.body.suspendedAt).toBeNull();
      expect(response.body.suspensionReason).toBeNull();
      expect(response.body.isActive).toBe(true);
    });

    it('should fail to reactivate non-existent organization', async () => {
      await testContext
        .request()
        .post('/platform-admin/organizations/non-existent-id/reactivate')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(404);
    });

    it('should fail to reactivate non-suspended organization', async () => {
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/reactivate`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /platform-admin/organizations/:id/verify', () => {
    it('should verify an organization', async () => {
      const response = await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/verify`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(200);

      expect(response.body.isVerified).toBe(true);
      expect(response.body.verifiedAt).toBeDefined();
      expect(response.body.verifiedBy).toBe(platformAdminUser.id);
    });

    it('should fail to verify non-existent organization', async () => {
      await testContext
        .request()
        .post('/platform-admin/organizations/non-existent-id/verify')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(404);
    });

    it('should fail to verify already verified organization', async () => {
      // First verify
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/verify`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(200);

      // Try to verify again
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization2.id}/verify`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PUT /platform-admin/organizations/:id/type', () => {
    it('should change organization type', async () => {
      const changeTypeData = {
        type: 'INTEGRATED_FARM'
      };

      const response = await testContext
        .request()
        .put(`/platform-admin/organizations/${testOrganization.id}/type`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(changeTypeData)
        .expect(200);

      expect(response.body.type).toBe('INTEGRATED_FARM');
      expect(response.body.allowedModules).toBeDefined();
      expect(response.body.features).toBeDefined();
    });

    it('should fail to change to same type', async () => {
      const changeTypeData = {
        type: 'FARM_OPERATION'
      };

      await testContext
        .request()
        .put(`/platform-admin/organizations/${testOrganization.id}/type`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(changeTypeData)
        .expect(400);
    });

    it('should fail to change type of non-existent organization', async () => {
      const changeTypeData = {
        type: 'INTEGRATED_FARM'
      };

      await testContext
        .request()
        .put('/platform-admin/organizations/non-existent-id/type')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(changeTypeData)
        .expect(404);
    });

    it('should fail with invalid organization type', async () => {
      const invalidData = {
        type: 'INVALID_TYPE'
      };

      await testContext
        .request()
        .put(`/platform-admin/organizations/${testOrganization.id}/type`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /platform-admin/organizations/:id/features/enable', () => {
    it('should enable a feature for organization', async () => {
      const enableFeatureData = {
        feature: 'analytics'
      };

      const response = await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/features/enable`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(enableFeatureData)
        .expect(200);

      expect(response.body.features).toContain('analytics');
    });

    it('should fail to enable already enabled feature', async () => {
      const enableFeatureData = {
        feature: 'farms'
      };

      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/features/enable`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(enableFeatureData)
        .expect(400);
    });

    it('should fail to enable feature not available for organization type', async () => {
      const enableFeatureData = {
        feature: 'market' // Not available for FARM_OPERATION
      };

      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/features/enable`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(enableFeatureData)
        .expect(400);
    });

    it('should fail to enable feature for non-existent organization', async () => {
      const enableFeatureData = {
        feature: 'analytics'
      };

      await testContext
        .request()
        .post('/platform-admin/organizations/non-existent-id/features/enable')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(enableFeatureData)
        .expect(404);
    });
  });

  describe('POST /platform-admin/organizations/:id/features/disable', () => {
    it('should disable a feature for organization', async () => {
      const disableFeatureData = {
        feature: 'farms'
      };

      const response = await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/features/disable`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(disableFeatureData)
        .expect(200);

      expect(response.body.features).not.toContain('farms');
    });

    it('should fail to disable non-enabled feature', async () => {
      const disableFeatureData = {
        feature: 'analytics'
      };

      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/features/disable`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(disableFeatureData)
        .expect(400);
    });

    it('should fail to disable feature for non-existent organization', async () => {
      const disableFeatureData = {
        feature: 'farms'
      };

      await testContext
        .request()
        .post('/platform-admin/organizations/non-existent-id/features/disable')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(disableFeatureData)
        .expect(404);
    });
  });

  describe('PUT /platform-admin/organizations/:id/plan', () => {
    it('should update organization plan', async () => {
      const updatePlanData = {
        plan: 'enterprise'
      };

      const response = await testContext
        .request()
        .put(`/platform-admin/organizations/${testOrganization.id}/plan`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(updatePlanData)
        .expect(200);

      expect(response.body.plan).toBe('enterprise');
      expect(response.body.allowedModules).toBeDefined();
      expect(response.body.features).toBeDefined();
    });

    it('should fail to update plan for non-existent organization', async () => {
      const updatePlanData = {
        plan: 'enterprise'
      };

      await testContext
        .request()
        .put('/platform-admin/organizations/non-existent-id/plan')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(updatePlanData)
        .expect(404);
    });

    it('should fail with invalid plan', async () => {
      const invalidData = {
        plan: 'invalid_plan'
      };

      await testContext
        .request()
        .put(`/platform-admin/organizations/${testOrganization.id}/plan`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /platform-admin/analytics', () => {
    it('should get system analytics', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/analytics')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.organizations).toBeDefined();
      expect(response.body.organizations.total).toBe(2);
      expect(response.body.organizations.active).toBe(2);
      expect(response.body.organizations.suspended).toBe(0);
      expect(response.body.organizations.byType).toBeDefined();
      expect(response.body.users).toBeDefined();
      expect(response.body.users.total).toBe(2);
      expect(response.body.users.active).toBe(2);
      expect(response.body.farms).toBeDefined();
      expect(response.body.orders).toBeDefined();
    });
  });

  describe('GET /platform-admin/users/:id', () => {
    it('should get user details', async () => {
      const response = await testContext
        .request()
        .get(`/platform-admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.id).toBe(regularUser.id);
      expect(response.body.email).toBe(regularUser.email);
      expect(response.body.name).toBe(regularUser.name);
      expect(response.body.organization).toBeDefined();
      expect(response.body.userRoles).toBeDefined();
    });

    it('should fail to get details for non-existent user', async () => {
      await testContext
        .request()
        .get('/platform-admin/users/non-existent-id')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(400);
    });

    it('should handle invalid UUID format', async () => {
      await testContext
        .request()
        .get('/platform-admin/users/invalid-uuid')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404);
    });
  });
});
