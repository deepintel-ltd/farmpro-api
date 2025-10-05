import { TestContext } from '../src/test-utils/test-context';
import { SubscriptionPlan, SubscriptionTier } from '@prisma/client';
import { PlanFeatureMapperService } from '../src/billing/services/plan-feature-mapper.service';

describe('Plan Feature Mapping E2E Tests', () => {
  let testContext: TestContext;
  let planFeatureMapper: PlanFeatureMapperService;
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
    ]);

    // Create test subscription plans
    testPlans = await createTestSubscriptionPlans();
  });

  describe('Module Access Mapping', () => {
    it('should return correct modules for FREE plan', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      expect(freePlan).toBeDefined();

      const modules = planFeatureMapper.getModuleAccess(freePlan!);

      // FREE plan should have basic modules including marketplace access
      expect(modules).toContain('farm_management');
      expect(modules).toContain('activities');
      expect(modules).toContain('marketplace');
      expect(modules).toContain('orders');
      expect(modules).toContain('inventory');
      expect(modules).toContain('media');

      // FREE plan should not have premium modules
      expect(modules).not.toContain('analytics');
      expect(modules).not.toContain('intelligence');
      expect(modules).not.toContain('trading');
      expect(modules).not.toContain('sensors');
      expect(modules).not.toContain('areas');
      expect(modules).not.toContain('seasons');
      expect(modules).not.toContain('drivers');
      expect(modules).not.toContain('tracking');
    });

    it('should return correct modules for BASIC plan', async () => {
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      expect(basicPlan).toBeDefined();

      const modules = planFeatureMapper.getModuleAccess(basicPlan!);

      // BASIC plan should have all FREE modules plus deliveries
      expect(modules).toContain('farm_management');
      expect(modules).toContain('activities');
      expect(modules).toContain('marketplace');
      expect(modules).toContain('orders');
      expect(modules).toContain('inventory');
      expect(modules).toContain('deliveries');
      expect(modules).toContain('media');

      // BASIC plan should not have premium modules
      expect(modules).not.toContain('analytics');
      expect(modules).not.toContain('intelligence');
      expect(modules).not.toContain('trading');
    });

    it('should return correct modules for PRO plan', async () => {
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      expect(proPlan).toBeDefined();

      const modules = planFeatureMapper.getModuleAccess(proPlan!);

      // PRO plan should have all BASIC modules plus premium modules
      expect(modules).toContain('farm_management');
      expect(modules).toContain('activities');
      expect(modules).toContain('marketplace');
      expect(modules).toContain('orders');
      expect(modules).toContain('inventory');
      expect(modules).toContain('deliveries');
      expect(modules).toContain('analytics');
      expect(modules).toContain('trading');
      expect(modules).toContain('observations');
      expect(modules).toContain('crop_cycles');
      expect(modules).toContain('intelligence');
      expect(modules).toContain('media');

      // PRO plan should not have ENTERPRISE-only modules
      expect(modules).not.toContain('sensors');
      expect(modules).not.toContain('areas');
      expect(modules).not.toContain('seasons');
      expect(modules).not.toContain('drivers');
      expect(modules).not.toContain('tracking');
    });

    it('should return correct modules for ENTERPRISE plan', async () => {
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      expect(enterprisePlan).toBeDefined();

      const modules = planFeatureMapper.getModuleAccess(enterprisePlan!);

      // ENTERPRISE plan should have all modules
      expect(modules).toContain('farm_management');
      expect(modules).toContain('activities');
      expect(modules).toContain('marketplace');
      expect(modules).toContain('orders');
      expect(modules).toContain('inventory');
      expect(modules).toContain('deliveries');
      expect(modules).toContain('analytics');
      expect(modules).toContain('trading');
      expect(modules).toContain('observations');
      expect(modules).toContain('crop_cycles');
      expect(modules).toContain('intelligence');
      expect(modules).toContain('sensors');
      expect(modules).toContain('areas');
      expect(modules).toContain('seasons');
      expect(modules).toContain('drivers');
      expect(modules).toContain('tracking');
      expect(modules).toContain('media');
    });
  });

  describe('Feature Access Mapping', () => {
    it('should return correct features for FREE plan', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      expect(freePlan).toBeDefined();

      const features = planFeatureMapper.getPlanFeatures(freePlan!);

      // FREE plan should have basic features including marketplace access
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');

      // FREE plan should not have premium features
      expect(features).not.toContain('advanced_analytics');
      expect(features).not.toContain('ai_insights');
      expect(features).not.toContain('api_access');
      expect(features).not.toContain('custom_roles');
      expect(features).not.toContain('white_label');
      expect(features).not.toContain('priority_support');
      expect(features).not.toContain('unlimited_usage');
    });

    it('should return correct features for BASIC plan', async () => {
      const basicPlan = testPlans.find(p => p.tier === SubscriptionTier.BASIC);
      expect(basicPlan).toBeDefined();

      const features = planFeatureMapper.getPlanFeatures(basicPlan!);

      // BASIC plan should have same features as FREE
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');

      // BASIC plan should not have premium features
      expect(features).not.toContain('advanced_analytics');
      expect(features).not.toContain('ai_insights');
      expect(features).not.toContain('api_access');
      expect(features).not.toContain('custom_roles');
    });

    it('should return correct features for PRO plan', async () => {
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      expect(proPlan).toBeDefined();

      const features = planFeatureMapper.getPlanFeatures(proPlan!);

      // PRO plan should have all basic features plus premium features
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
      expect(features).toContain('advanced_analytics');
      expect(features).toContain('ai_insights');
      expect(features).toContain('api_access');
      expect(features).toContain('custom_roles');

      // PRO plan should not have ENTERPRISE-only features
      expect(features).not.toContain('white_label');
      expect(features).not.toContain('priority_support');
      expect(features).not.toContain('unlimited_usage');
    });

    it('should return correct features for ENTERPRISE plan', async () => {
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      expect(enterprisePlan).toBeDefined();

      const features = planFeatureMapper.getPlanFeatures(enterprisePlan!);

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

  describe('Organization Feature Mapping', () => {
    it('should return correct organization features for FARM_OPERATION with FREE plan', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      expect(freePlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        freePlan!.tier
      );

      // Should have basic modules
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('media');

      // Should have basic features
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
    });

    it('should return correct organization features for COMMODITY_TRADER with PRO plan', async () => {
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      expect(proPlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'COMMODITY_TRADER',
        proPlan!.tier
      );

      // Should have all PRO modules
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('analytics');
      expect(allowedModules).toContain('trading');
      expect(allowedModules).toContain('intelligence');

      // Should have all PRO features
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
      expect(features).toContain('advanced_analytics');
      expect(features).toContain('ai_insights');
      expect(features).toContain('api_access');
      expect(features).toContain('custom_roles');
    });

    it('should return correct organization features for INTEGRATED_FARM with ENTERPRISE plan', async () => {
      const enterprisePlan = testPlans.find(p => p.tier === SubscriptionTier.ENTERPRISE);
      expect(enterprisePlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'INTEGRATED_FARM',
        enterprisePlan!.tier
      );

      // Should have all modules
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

      // Should have all features
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

  describe('Feature and Module Checking', () => {
    it('should correctly check if plan has specific features', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      
      expect(freePlan).toBeDefined();
      expect(proPlan).toBeDefined();

      // FREE plan should have basic features
      expect(planFeatureMapper.hasFeature(freePlan!, 'basic_farm_management')).toBe(true);
      expect(planFeatureMapper.hasFeature(freePlan!, 'marketplace_access')).toBe(true);
      expect(planFeatureMapper.hasFeature(freePlan!, 'order_management')).toBe(true);
      expect(planFeatureMapper.hasFeature(freePlan!, 'inventory_management')).toBe(true);

      // FREE plan should not have premium features
      expect(planFeatureMapper.hasFeature(freePlan!, 'advanced_analytics')).toBe(false);
      expect(planFeatureMapper.hasFeature(freePlan!, 'ai_insights')).toBe(false);
      expect(planFeatureMapper.hasFeature(freePlan!, 'api_access')).toBe(false);

      // PRO plan should have premium features
      expect(planFeatureMapper.hasFeature(proPlan!, 'advanced_analytics')).toBe(true);
      expect(planFeatureMapper.hasFeature(proPlan!, 'ai_insights')).toBe(true);
      expect(planFeatureMapper.hasFeature(proPlan!, 'api_access')).toBe(true);
      expect(planFeatureMapper.hasFeature(proPlan!, 'custom_roles')).toBe(true);
    });

    it('should correctly check if plan has specific modules', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      const proPlan = testPlans.find(p => p.tier === SubscriptionTier.PRO);
      
      expect(freePlan).toBeDefined();
      expect(proPlan).toBeDefined();

      // FREE plan should have basic modules
      expect(planFeatureMapper.hasModule(freePlan!, 'farm_management')).toBe(true);
      expect(planFeatureMapper.hasModule(freePlan!, 'activities')).toBe(true);
      expect(planFeatureMapper.hasModule(freePlan!, 'marketplace')).toBe(true);
      expect(planFeatureMapper.hasModule(freePlan!, 'orders')).toBe(true);
      expect(planFeatureMapper.hasModule(freePlan!, 'inventory')).toBe(true);
      expect(planFeatureMapper.hasModule(freePlan!, 'media')).toBe(true);

      // FREE plan should not have premium modules
      expect(planFeatureMapper.hasModule(freePlan!, 'analytics')).toBe(false);
      expect(planFeatureMapper.hasModule(freePlan!, 'intelligence')).toBe(false);
      expect(planFeatureMapper.hasModule(freePlan!, 'trading')).toBe(false);

      // PRO plan should have premium modules
      expect(planFeatureMapper.hasModule(proPlan!, 'analytics')).toBe(true);
      expect(planFeatureMapper.hasModule(proPlan!, 'intelligence')).toBe(true);
      expect(planFeatureMapper.hasModule(proPlan!, 'trading')).toBe(true);
    });
  });

  describe('Plan Tier Validation', () => {
    it('should handle invalid plan tiers gracefully', async () => {
      const invalidTier = 'INVALID_TIER' as any;
      
      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'FARM_OPERATION',
        invalidTier
      );

      // Should fall back to FREE plan features
      expect(allowedModules).toContain('farm_management');
      expect(allowedModules).toContain('activities');
      expect(allowedModules).toContain('marketplace');
      expect(allowedModules).toContain('orders');
      expect(allowedModules).toContain('inventory');
      expect(allowedModules).toContain('media');

      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
    });

    it('should handle invalid organization types gracefully', async () => {
      const freePlan = testPlans.find(p => p.tier === SubscriptionTier.FREE);
      expect(freePlan).toBeDefined();

      const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(
        'INVALID_TYPE' as any,
        freePlan!.tier
      );

      // Should still return valid features
      expect(allowedModules).toBeDefined();
      expect(Array.isArray(allowedModules)).toBe(true);
      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
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
});
