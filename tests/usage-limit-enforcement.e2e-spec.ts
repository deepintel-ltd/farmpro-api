import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { SubscriptionPlan, SubscriptionTier } from '@prisma/client';

describe('Usage Limit Enforcement E2E Tests', () => {
  let testContext: TestContext;
  let testOrganizations: any[] = [];
  let testPlans: SubscriptionPlan[] = [];

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
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
    await createTestUsers();
  });

  describe('User Limit Enforcement', () => {
    it('should enforce user limits for FREE plan (1 user)', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();
      expect(freePlan).toBeDefined();
      expect(freePlan!.maxUsers).toBe(1);

      const accessToken = await getAccessToken(freeOrg.id);

        const response = await testContext.request()
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
          email: 'seconduser@test.com',
          name: 'Second User',
          phone: '+1234567890',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usage limit exceeded');
      expect(response.body.message).toContain('users');
    });

    it('should enforce user limits for BASIC plan (3 users)', async () => {
      const basicOrg = testOrganizations.find(o => o.plan === SubscriptionTier.BASIC);
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      
      expect(basicOrg).toBeDefined();
      expect(basicPlan).toBeDefined();
      expect(basicPlan!.maxUsers).toBe(3);

      const accessToken = await getAccessToken(basicOrg.id);

      // Create users up to the limit
      for (let i = 1; i < basicPlan!.maxUsers; i++) {
        const response = await testContext.request()
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
      const response = await testContext.request()
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

    it('should allow unlimited users for ENTERPRISE plan', async () => {
      const enterpriseOrg = testOrganizations.find(o => o.plan === SubscriptionTier.ENTERPRISE);
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      
      expect(enterpriseOrg).toBeDefined();
      expect(enterprisePlan).toBeDefined();
      expect(enterprisePlan!.maxUsers).toBe(-1); // Unlimited

      const accessToken = await getAccessToken(enterpriseOrg.id);

      // Create many users (should all succeed)
      for (let i = 1; i <= 10; i++) {
        const response = await testContext.request()
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: `enterpriseuser${i}@test.com`,
            name: `Enterprise User ${i}`,
            phone: '+1234567890',
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Farm Limit Enforcement', () => {
    it('should enforce farm limits for FREE plan (1 farm)', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();
      expect(freePlan).toBeDefined();
      expect(freePlan!.maxFarms).toBe(1);

      const accessToken = await getAccessToken(freeOrg.id);

      // Create first farm (should succeed)
      const firstFarmResponse = await testContext.request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'First Farm',
          location: 'Test Location',
          size: 100,
          type: 'CROP',
        });

      expect(firstFarmResponse.status).toBe(201);

      // Try to create second farm (should fail)
      const secondFarmResponse = await testContext.request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Second Farm',
          location: 'Test Location',
          size: 100,
          type: 'CROP',
        });

      expect(secondFarmResponse.status).toBe(403);
      expect(secondFarmResponse.body.message).toContain('Usage limit exceeded');
      expect(secondFarmResponse.body.message).toContain('farms');
    });

    it('should enforce farm limits for BASIC plan (2 farms)', async () => {
      const basicOrg = testOrganizations.find(o => o.plan === SubscriptionTier.BASIC);
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      
      expect(basicOrg).toBeDefined();
      expect(basicPlan).toBeDefined();
      expect(basicPlan!.maxFarms).toBe(2);

      const accessToken = await getAccessToken(basicOrg.id);

      // Create farms up to the limit
      for (let i = 1; i <= basicPlan!.maxFarms; i++) {
        const response = await testContext.request()
          .post('/farms')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Farm ${i}`,
            location: 'Test Location',
            size: 100,
            type: 'CROP',
          });

        expect(response.status).toBe(201);
      }

      // Try to create one more farm (should fail)
      const response = await testContext.request()
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

  describe('Activity Limit Enforcement', () => {
    it('should enforce activity limits for FREE plan (50 activities/month)', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();
      expect(freePlan).toBeDefined();
      expect(freePlan!.maxActivitiesPerMonth).toBe(50);

      const accessToken = await getAccessToken(freeOrg.id);

      // Create a farm first
      const farmResponse = await testContext.request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Farm',
          location: 'Test Location',
          size: 100,
          type: 'CROP',
        });

      expect(farmResponse.status).toBe(201);
      const farmId = farmResponse.body.data.id;

      // Create activities up to the limit
      for (let i = 1; i <= freePlan!.maxActivitiesPerMonth; i++) {
        const response = await testContext.request()
          .post('/activities')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            farmId: farmId,
            type: 'PLANTING',
            description: `Activity ${i}`,
            date: new Date().toISOString(),
          });

        expect(response.status).toBe(201);
      }

      // Try to create one more activity (should fail)
      const response = await testContext.request()
        .post('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          farmId: farmId,
          type: 'PLANTING',
          description: 'Excess Activity',
          date: new Date().toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usage limit exceeded');
      expect(response.body.message).toContain('activities');
    });

    it('should allow unlimited activities for ENTERPRISE plan', async () => {
      const enterpriseOrg = testOrganizations.find(o => o.plan === SubscriptionTier.ENTERPRISE);
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      
      expect(enterpriseOrg).toBeDefined();
      expect(enterprisePlan).toBeDefined();
      expect(enterprisePlan!.maxActivitiesPerMonth).toBe(-1); // Unlimited

      const accessToken = await getAccessToken(enterpriseOrg.id);

      // Create a farm first
      const farmResponse = await testContext.request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Enterprise Farm',
          location: 'Test Location',
          size: 100,
          type: 'CROP',
        });

      expect(farmResponse.status).toBe(201);
      const farmId = farmResponse.body.data.id;

      // Create many activities (should all succeed)
      for (let i = 1; i <= 100; i++) {
        const response = await testContext.request()
          .post('/activities')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            farmId: farmId,
            type: 'PLANTING',
            description: `Enterprise Activity ${i}`,
            date: new Date().toISOString(),
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Marketplace Listing Limit Enforcement', () => {
    it('should enforce listing limits for FREE plan (0 listings)', async () => {
      const freeOrg = testOrganizations.find(o => o.plan === SubscriptionTier.FREE);
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      
      expect(freeOrg).toBeDefined();
      expect(freePlan).toBeDefined();
      expect(freePlan!.maxActiveListings).toBe(0);

      const accessToken = await getAccessToken(freeOrg.id);

      // Try to create a listing (should fail)
      const response = await testContext.request()
        .post('/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Product',
          description: 'Test Description',
          price: 100,
          category: 'SEEDS',
          quantity: 10,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usage limit exceeded');
      expect(response.body.message).toContain('listings');
    });

    it('should enforce listing limits for BASIC plan (5 listings)', async () => {
      const basicOrg = testOrganizations.find(o => o.plan === SubscriptionTier.BASIC);
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      
      expect(basicOrg).toBeDefined();
      expect(basicPlan).toBeDefined();
      expect(basicPlan!.maxActiveListings).toBe(5);

      const accessToken = await getAccessToken(basicOrg.id);

      // Create listings up to the limit
      for (let i = 1; i <= basicPlan!.maxActiveListings; i++) {
        const response = await testContext.request()
          .post('/marketplace/listings')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `Product ${i}`,
            description: `Description ${i}`,
            price: 100,
            category: 'SEEDS',
            quantity: 10,
          });

        expect(response.status).toBe(201);
      }

      // Try to create one more listing (should fail)
      const response = await testContext.request()
        .post('/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Excess Product',
          description: 'Excess Description',
          price: 100,
          category: 'SEEDS',
          quantity: 10,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Usage limit exceeded');
    });

    it('should allow unlimited listings for ENTERPRISE plan', async () => {
      const enterpriseOrg = testOrganizations.find(o => o.plan === SubscriptionTier.ENTERPRISE);
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      
      expect(enterpriseOrg).toBeDefined();
      expect(enterprisePlan).toBeDefined();
      expect(enterprisePlan!.maxActiveListings).toBe(-1); // Unlimited

      const accessToken = await getAccessToken(enterpriseOrg.id);

      // Create many listings (should all succeed)
      for (let i = 1; i <= 20; i++) {
        const response = await testContext.request()
          .post('/marketplace/listings')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `Enterprise Product ${i}`,
            description: `Enterprise Description ${i}`,
            price: 100,
            category: 'SEEDS',
            quantity: 10,
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Usage Warning Headers', () => {
    it('should include usage warning headers when approaching limits', async () => {
      const basicOrg = testOrganizations.find(o => o.plan === SubscriptionTier.BASIC);
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      
      expect(basicOrg).toBeDefined();
      expect(basicPlan).toBeDefined();

      const accessToken = await getAccessToken(basicOrg.id);

      // Create users up to 80% of limit (2 out of 3)
      for (let i = 1; i < basicPlan!.maxUsers; i++) {
        const response = await testContext.request()
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: `user${i}@test.com`,
            name: `Test User ${i}`,
            phone: '+1234567890',
          });

        expect(response.status).toBe(201);
      }

      // Next request should include warning header
      const response = await testContext.request()
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['x-usage-warning']).toBeDefined();
      expect(response.headers['x-usage-warning']).toContain('users');
      expect(response.headers['x-usage-warning']).toContain('approaching limit');
    });
  });

  describe('Platform Admin Bypass', () => {
    it('should allow platform admins to bypass all usage limits', async () => {
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

      // Should be able to create users beyond FREE plan limit
      for (let i = 1; i <= 10; i++) {
        const response = await testContext.request()
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: `adminuser${i}@test.com`,
            name: `Admin User ${i}`,
            phone: '+1234567890',
          });

        expect(response.status).toBe(201);
      }

      // Should be able to create farms beyond FREE plan limit
      for (let i = 1; i <= 5; i++) {
        const response = await testContext.request()
          .post('/farms')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Admin Farm ${i}`,
            location: 'Test Location',
            size: 100,
            type: 'CROP',
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
          features: ['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management'],
          allowedModules: ['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'media'],
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
    const user = userId 
      ? await testContext.prisma.user.findUnique({ where: { id: userId } })
      : await testContext.prisma.user.findFirst({ where: { organizationId } });
    
    if (!user) {
      throw new Error('User not found');
    }

    // In a real implementation, you'd generate a proper JWT token
    return `test-token-${user.id}-${organizationId}`;
  }
});
