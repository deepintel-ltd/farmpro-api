import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { SubscriptionPlan, SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { PlanFeatureMapperService } from '../src/billing/services/plan-feature-mapper.service';

describe('Subscription Access Control E2E Tests', () => {
  let testContext: TestContext;
  let planFeatureMapper: PlanFeatureMapperService;
  let testOrganizations: any[] = [];
  let testUsers: any[] = [];
  let testPlans: SubscriptionPlan[] = [];

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
    planFeatureMapper = new PlanFeatureMapperService();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up before each test
    await testContext.cleanupTables([
      'subscriptions',
      'subscription_plans',
      'users',
      'organizations',
      'farms',
      'farm_activities',
      'marketplace_listings',
    ]);

    // Create test subscription plans
    testPlans = await createTestSubscriptionPlans();
    
    // Create test organizations for each plan tier
    testOrganizations = await createTestOrganizations();
    
    // Create test users for each organization
    testUsers = await createTestUsers();
  });

  describe('Plan Feature Mapping', () => {
    it('should correctly map features for FREE plan', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      expect(freePlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        freePlan!.tier
      );

      // FREE plan should have basic modules
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('media');

      // FREE plan should not have premium modules
      expect(allowedModules).not.toContain('analytics');
      expect(allowedModules).not.toContain('intelligence');
      expect(allowedModules).not.toContain('trading');

      // FREE plan should have basic features
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');

      // FREE plan should not have premium features
      expect(features).not.toContain('advanced_analytics');
      expect(features).not.toContain('ai_insights');
      expect(features).not.toContain('api_access');
    });

    it('should correctly map features for BASIC plan', async () => {
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      expect(basicPlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        basicPlan!.tier
      );

      // BASIC plan should have all FREE modules plus deliveries
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('deliveries');
      expect(allowedModules).toContain('media');

      // BASIC plan should not have premium modules
      expect(allowedModules).not.toContain('analytics');
      expect(allowedModules).not.toContain('intelligence');
      expect(allowedModules).not.toContain('trading');

      // BASIC plan should have same features as FREE
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
    });

    it('should correctly map features for PRO plan', async () => {
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      expect(proPlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        proPlan!.tier
      );

      // PRO plan should have all BASIC modules plus premium modules
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('analytics');
      expect(allowedModules).toContain('trading');
      expect(allowedModules).toContain('intelligence');

      // PRO plan should have premium features
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
      expect(features).toContain('advanced_analytics');
      expect(features).toContain('ai_insights');
      expect(features).toContain('api_access');
      expect(features).toContain('custom_roles');
    });

    it('should correctly map features for ENTERPRISE plan', async () => {
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      expect(enterprisePlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        enterprisePlan!.tier
      );

      // ENTERPRISE plan should have all modules
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('analytics');
      expect(allowedModules).toContain('trading');
      expect(allowedModules).toContain('intelligence');
      expect(allowedModules).toContain('sensors');
      expect(allowedModules).toContain('areas');
      expect(allowedModules).toContain('seasons');
      expect(allowedModules).toContain('drivers');
      expect(allowedModules).toContain('tracking');

      // ENTERPRISE plan should have all features
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
      expect(features).toContain('advanced_analytics');
      expect(features).toContain('ai_insights');
      expect(features).toContain('api_access');
      expect(features).toContain('custom_roles');
      expect(features).toContain('white_label');
      expect(features).toContain('priority_support');
      expect(features).toContain('unlimited_usage');
    });
  });

  describe('Organization Creation with Plan Features', () => {
    it('should create organization with correct features for FREE plan', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      expect(freeOrg).toBeDefined();

      // Verify organization has correct plan
      expect(freeOrg.plan).toBe(SubscriptionTier.FREE);

      // Verify organization has correct features
      expect(freeOrg.features).toContain('basic_farm_management');
      expect(freeOrg.features).toContain('marketplace_access');
      expect(freeOrg.features).toContain('order_management');
      expect(freeOrg.features).toContain('inventory_management');

      // Verify organization has correct allowed modules
      expect(freeOrg.allowedModules).toContain('farm_management');
      expect(freeOrg.allowedModules).toContain('activities');
      expect(freeOrg.allowedModules).toContain('marketplace');
      expect(freeOrg.allowedModules).toContain('orders');
      expect(freeOrg.allowedModules).toContain('inventory');
      expect(freeOrg.allowedModules).toContain('media');
    });

    it('should create organization with correct features for PRO plan', async () => {
      const proOrg = testOrganizations.find(o => o.plan === SubscriptionTier.PRO);
      expect(proOrg).toBeDefined();

      // Verify organization has correct plan
      expect(proOrg.plan).toBe(SubscriptionTier.PRO);

      // Verify organization has premium features
      expect(proOrg.features).toContain('advanced_analytics');
      expect(proOrg.features).toContain('ai_insights');
      expect(proOrg.features).toContain('api_access');
      expect(proOrg.features).toContain('custom_roles');

      // Verify organization has premium modules
      expect(proOrg.allowedModules).toContain('analytics');
      expect(proOrg.allowedModules).toContain('intelligence');
      expect(proOrg.allowedModules).toContain('trading');
    });
  });

  describe('Subscription Plan Changes', () => {
    it('should update organization features when plan changes from FREE to PRO', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      
      expect(freeOrg).toBeDefined();
      expect(proPlan).toBeDefined();

      // Create subscription for FREE plan
      const subscription = await testContext.prisma.subscription.create({
        data: {
          organizationId: freeOrg.id,
          planId: testPlans.find(p => p.tier === SubscriptionTier.FREE)!.id,
          status: SubscriptionStatus.ACTIVE,
          currency: 'USD',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          billingInterval: 'MONTHLY',
          isTrialing: false,
          autoRenew: true,
          cancelAtPeriodEnd: false,
        },
      });

      // Change plan to PRO
      const response = await testContext.request
        .patch(`/billing/subscriptions/${subscription.id}/change-plan`)
        .set('Authorization', `Bearer ${await getAccessToken(freeOrg.id)}`)
        .send({
          planId: proPlan!.id,
          billingInterval: 'MONTHLY',
        });

      expect(response.status).toBe(200);

      // Verify organization features were updated
      const updatedOrg = await testContext.prisma.organization.findUnique({
        where: { id: freeOrg.id },
      });

      expect(updatedOrg).toBeDefined();
      expect(updatedOrg!.features).toContain('advanced_analytics');
      expect(updatedOrg!.features).toContain('ai_insights');
      expect(updatedOrg!.features).toContain('api_access');
      expect(updatedOrg!.features).toContain('custom_roles');

      expect(updatedOrg!.allowedModules).toContain('analytics');
      expect(updatedOrg!.allowedModules).toContain('intelligence');
      expect(updatedOrg!.allowedModules).toContain('trading');
    });

    it('should update organization features when plan changes from PRO to BASIC', async () => {
      const proOrg = testOrganizations.find(o => o.plan === SubscriptionTier.PRO);
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      
      expect(proOrg).toBeDefined();
      expect(basicPlan).toBeDefined();

      // Create subscription for PRO plan
      const subscription = await testContext.prisma.subscription.create({
        data: {
          organizationId: proOrg.id,
          planId: testPlans.find(p => p.tier === SubscriptionTier.PRO)!.id,
          status: SubscriptionStatus.ACTIVE,
          currency: 'USD',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          billingInterval: 'MONTHLY',
          isTrialing: false,
          autoRenew: true,
          cancelAtPeriodEnd: false,
        },
      });

      // Change plan to BASIC
      const response = await testContext.request
        .patch(`/billing/subscriptions/${subscription.id}/change-plan`)
        .set('Authorization', `Bearer ${await getAccessToken(proOrg.id)}`)
        .send({
          planId: basicPlan!.id,
          billingInterval: 'MONTHLY',
        });

      expect(response.status).toBe(200);

      // Verify organization features were updated
      const updatedOrg = await testContext.prisma.organization.findUnique({
        where: { id: proOrg.id },
      });

      expect(updatedOrg).toBeDefined();
      
      // Should still have basic features
      expect(updatedOrg!.features).toContain('basic_farm_management');
      expect(updatedOrg!.features).toContain('marketplace_access');
      expect(updatedOrg!.features).toContain('order_management');
      expect(updatedOrg!.features).toContain('inventory_management');

      // Should not have premium features
      expect(updatedOrg!.features).not.toContain('advanced_analytics');
      expect(updatedOrg!.features).not.toContain('ai_insights');
      expect(updatedOrg!.features).not.toContain('api_access');
      expect(updatedOrg!.features).not.toContain('custom_roles');

      // Should not have premium modules
      expect(updatedOrg!.allowedModules).not.toContain('analytics');
      expect(updatedOrg!.allowedModules).not.toContain('intelligence');
      expect(updatedOrg!.allowedModules).not.toContain('trading');
    });
  });

  describe('Feature Access Control', () => {
    it('should allow FREE plan users to access marketplace features', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freeUser = testUsers.find(u => u.organizationId === freeOrg.id);
      
      expect(freeOrg).toBeDefined();
      expect(freeUser).toBeDefined();

      const accessToken = await getAccessToken(freeOrg.id);

      // Should be able to access marketplace
      const marketplaceResponse = await testContext.request
        .get('/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(marketplaceResponse.status).toBe(200);

      // Should be able to access orders
      const ordersResponse = await testContext.request
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(ordersResponse.status).toBe(200);

      // Should be able to access inventory
      const inventoryResponse = await testContext.request
        .get('/inventory')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(inventoryResponse.status).toBe(200);
    });

    it('should deny FREE plan users access to premium features', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();

      const accessToken = await getAccessToken(freeOrg.id);

      // Should not be able to access analytics
      const analyticsResponse = await testContext.request
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(analyticsResponse.status).toBe(403);

      // Should not be able to access intelligence
      const intelligenceResponse = await testContext.request
        .get('/intelligence/insights')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(intelligenceResponse.status).toBe(403);
    });

    it('should allow PRO plan users to access premium features', async () => {
      const proOrg = testOrganizations.find(o => o.plan === SubscriptionTier.PRO);
      
      expect(proOrg).toBeDefined();

      const accessToken = await getAccessToken(proOrg.id);

      // Should be able to access analytics
      const analyticsResponse = await testContext.request
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(analyticsResponse.status).toBe(200);

      // Should be able to access intelligence
      const intelligenceResponse = await testContext.request
        .get('/intelligence/insights')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(intelligenceResponse.status).toBe(200);
    });
  });

  describe('Usage Limit Enforcement', () => {
    it('should enforce user limits for FREE plan', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();
      expect(freePlan).toBeDefined();

      const accessToken = await getAccessToken(freeOrg.id);

      // Create users up to the limit
      for (let i = 0; i < freePlan!.maxUsers; i++) {
        const response = await testContext.request
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: `user${i}@test.com`,
            name: `Test User ${i}`,
            phone: '+1234567890',
          });

        expect(response.status).toBe(201);
      }

      // Try to create one more user (should fail)
      const response = await testContext.request
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'excess@test.com',
          name: 'Excess User',
          phone: '+1234567890',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usage limit exceeded');
    });

    it('should enforce farm limits for BASIC plan', async () => {
      const basicOrg = testOrganizations.find(o => o.plan === SubscriptionTier.BASIC);
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      
      expect(basicOrg).toBeDefined();
      expect(basicPlan).toBeDefined();

      const accessToken = await getAccessToken(basicOrg.id);

      // Create farms up to the limit
      for (let i = 0; i < basicPlan!.maxFarms; i++) {
        const response = await testContext.request
          .post('/farms')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Test Farm ${i}`,
            location: 'Test Location',
            size: 100,
            type: 'CROP',
          });

        expect(response.status).toBe(201);
      }

      // Try to create one more farm (should fail)
      const response = await testContext.request
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Excess Farm',
          location: 'Test Location',
          size: 100,
          type: 'CROP',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usage limit exceeded');
    });
  });

  describe('Platform Admin Bypass', () => {
    it('should allow platform admins to access all features regardless of plan', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();

      // Create platform admin user
      const platformAdmin = await testContext.createUser({
        email: 'platformadmin@test.com',
        name: 'Platform Admin',
        phone: '+1234567890',
        organizationId: freeOrg.id,
        isPlatformAdmin: true,
      });

      const accessToken = await getAccessToken(freeOrg.id, platformAdmin.id);

      // Should be able to access premium features even with FREE plan
      const analyticsResponse = await testContext.request
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(analyticsResponse.status).toBe(200);

      const intelligenceResponse = await testContext.request
        .get('/intelligence/insights')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(intelligenceResponse.status).toBe(200);
    });

    it('should allow platform admins to bypass usage limits', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();
      expect(freePlan).toBeDefined();

      // Create platform admin user
      const platformAdmin = await testContext.createUser({
        email: 'platformadmin@test.com',
        name: 'Platform Admin',
        phone: '+1234567890',
        organizationId: freeOrg.id,
        isPlatformAdmin: true,
      });

      const accessToken = await getAccessToken(freeOrg.id, platformAdmin.id);

      // Create users beyond the limit (should succeed for platform admin)
      for (let i = 0; i < freePlan!.maxUsers + 5; i++) {
        const response = await testContext.request
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: `adminuser${i}@test.com`,
            name: `Admin User ${i}`,
            phone: '+1234567890',
          });

        expect(response.status).toBe(201);
      }
    });
  });

  // Helper functions
  async function createTestSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const plans = [
      {
        name: 'Free Plan',
        tier: SubscriptionTier.FREE,
        description: 'Free plan for basic usage',
        priceUSD: 0,
        priceNGN: 0,
        billingInterval: 'MONTHLY' as any,
        maxUsers: 1,
        maxFarms: 1,
        maxActivitiesPerMonth: 50,
        maxActiveListings: 0,
        storageGB: 1,
        apiCallsPerDay: 100,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
        isActive: true,
        isPublic: true,
      },
      {
        name: 'Basic Plan',
        tier: SubscriptionTier.BASIC,
        description: 'Basic plan for small operations',
        priceUSD: 29,
        priceNGN: 12000,
        billingInterval: 'MONTHLY' as any,
        maxUsers: 3,
        maxFarms: 2,
        maxActivitiesPerMonth: 200,
        maxActiveListings: 5,
        storageGB: 5,
        apiCallsPerDay: 500,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
        isActive: true,
        isPublic: true,
      },
      {
        name: 'Pro Plan',
        tier: SubscriptionTier.PRO,
        description: 'Professional plan for growing operations',
        priceUSD: 99,
        priceNGN: 40000,
        billingInterval: 'MONTHLY' as any,
        maxUsers: 10,
        maxFarms: 5,
        maxActivitiesPerMonth: 1000,
        maxActiveListings: 50,
        storageGB: 50,
        apiCallsPerDay: 5000,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: true,
        hasPrioritySupport: true,
        hasWhiteLabel: false,
        isActive: true,
        isPublic: true,
      },
      {
        name: 'Enterprise Plan',
        tier: SubscriptionTier.ENTERPRISE,
        description: 'Enterprise plan for large operations',
        priceUSD: 299,
        priceNGN: 120000,
        billingInterval: 'MONTHLY' as any,
        maxUsers: -1,
        maxFarms: -1,
        maxActivitiesPerMonth: -1,
        maxActiveListings: -1,
        storageGB: -1,
        apiCallsPerDay: -1,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: true,
        hasPrioritySupport: true,
        hasWhiteLabel: true,
        isActive: true,
        isPublic: true,
      },
    ];

    const createdPlans = [];
    for (const planData of plans) {
      const plan = await testContext.prisma.subscriptionPlan.create({
        data: planData,
      });
      createdPlans.push(plan);
    }

    return createdPlans;
  }

  async function createTestOrganizations(): Promise<any[]> {
    const organizations = [];
    
    for (const plan of testPlans) {
      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        plan.tier
      );

      const org = await testContext.prisma.organization.create({
        data: {
          name: `Test ${plan.tier} Organization`,
          type: 'FARM_OPERATION',
          email: `test-${plan.tier.toLowerCase()}@example.com`,
          phone: '+1234567890',
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'USA',
          },
          plan: plan.tier,
          maxUsers: plan.maxUsers,
          maxFarms: plan.maxFarms,
          features: features,
          allowedModules: allowedModules,
          isActive: true,
          isVerified: true,
        },
      });

      organizations.push(org);
    }

    return organizations;
  }

  async function createTestUsers(): Promise<any[]> {
    const users = [];
    
    for (const org of testOrganizations) {
      const hashedPassword = await hash('TestPassword123!');
      const user = await testContext.prisma.user.create({
        data: {
          email: `user-${org.plan.toLowerCase()}@example.com`,
          name: `Test ${org.plan} User`,
          phone: '+1234567890',
          hashedPassword,
          organizationId: org.id,
          emailVerified: true,
          isActive: true,
        },
      });

      users.push(user);
    }

    return users;
  }

  async function getAccessToken(organizationId: string, userId?: string): Promise<string> {
    // This is a simplified version - in real tests you'd use proper JWT generation
    // For now, we'll create a mock token that the test context can recognize
    const user = userId 
      ? await testContext.prisma.user.findUnique({ where: { id: userId } })
      : await testContext.prisma.user.findFirst({ where: { organizationId } });
    
    if (!user) {
      throw new Error('User not found');
    }

    // In a real implementation, you'd generate a proper JWT token
    // For testing purposes, we'll use a simple string that the test context can validate
    return `test-token-${user.id}-${organizationId}`;
  }
});
