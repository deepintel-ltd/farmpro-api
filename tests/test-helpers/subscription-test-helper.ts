import { PrismaService } from '../../src/prisma/prisma.service';
import { hash } from '@node-rs/argon2';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { PlanFeatureMapperService } from '../../src/billing/services/plan-feature-mapper.service';

export interface TestSubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description: string;
  priceUSD: number;
  priceNGN: number;
  billingInterval: string;
  maxUsers: number;
  maxFarms: number;
  maxActivitiesPerMonth: number;
  maxActiveListings: number;
  storageGB: number;
  apiCallsPerDay: number;
  hasAdvancedAnalytics: boolean;
  hasAIInsights: boolean;
  hasAPIAccess: boolean;
  hasCustomRoles: boolean;
  hasPrioritySupport: boolean;
  hasWhiteLabel: boolean;
  isActive: boolean;
  isPublic: boolean;
}

export interface TestSubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingInterval: string;
  isTrialing: boolean;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

export class SubscriptionTestHelper {
  private planFeatureMapper: PlanFeatureMapperService;

  constructor(private prisma: PrismaService) {
    this.planFeatureMapper = new PlanFeatureMapperService();
  }

  /**
   * Create test subscription plans for all tiers
   */
  async createTestSubscriptionPlans(): Promise<TestSubscriptionPlan[]> {
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
      const plan = await this.prisma.subscriptionPlan.create({
        data: planData,
      });
      createdPlans.push(plan);
    }

    return createdPlans;
  }

  /**
   * Create test organization with proper plan features
   */
  async createTestOrganizationWithPlan(
    planTier: SubscriptionTier,
    overrides: any = {}
  ): Promise<any> {
    const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
      'FARM_OPERATION',
      planTier
    );

    const organization = await this.prisma.organization.create({
      data: {
        name: `Test ${planTier} Organization`,
        type: 'FARM_OPERATION',
        email: `test-${planTier.toLowerCase()}@example.com`,
        phone: '+1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA',
        },
        plan: planTier,
        maxUsers: 10,
        maxFarms: 5,
        features: features,
        allowedModules: allowedModules,
        isActive: true,
        isVerified: true,
        ...overrides,
      },
    });

    return organization;
  }

  /**
   * Create test user for organization
   */
  async createTestUserForOrganization(
    organizationId: string,
    overrides: any = {}
  ): Promise<any> {
    const hashedPassword = await hash('TestPassword123!');
    
    const user = await this.prisma.user.create({
      data: {
        email: `user@example.com`,
        name: 'Test User',
        phone: '+1234567890',
        hashedPassword,
        organizationId,
        emailVerified: true,
        isActive: true,
        ...overrides,
      },
    });

    return user;
  }

  /**
   * Create test subscription for organization
   */
  async createTestSubscription(
    organizationId: string,
    planId: string,
    overrides: any = {}
  ): Promise<TestSubscription> {
    const subscription = await this.prisma.subscription.create({
      data: {
        organizationId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        currency: 'USD',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        billingInterval: 'MONTHLY',
        isTrialing: false,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        ...overrides,
      },
    });

    return subscription;
  }

  /**
   * Create complete test setup with organization, user, and subscription
   */
  async createCompleteTestSetup(planTier: SubscriptionTier): Promise<{
    organization: any;
    user: any;
    subscription: TestSubscription;
    plan: TestSubscriptionPlan;
  }> {
    // Create plan
    const plans = await this.createTestSubscriptionPlans();
    const plan = plans.find(p => p.tier === planTier);
    
    if (!plan) {
      throw new Error(`Plan with tier ${planTier} not found`);
    }

    // Create organization with proper features
    const organization = await this.createTestOrganizationWithPlan(planTier);

    // Create user
    const user = await this.createTestUserForOrganization(organization.id);

    // Create subscription
    const subscription = await this.createTestSubscription(organization.id, plan.id);

    return {
      organization,
      user,
      subscription,
      plan,
    };
  }

  /**
   * Verify organization has correct features for plan
   */
  async verifyOrganizationFeatures(
    organizationId: string,
    expectedPlanTier: SubscriptionTier
  ): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    expect(organization).toBeDefined();
    expect(organization!.plan).toBe(expectedPlanTier);

    const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
      'FARM_OPERATION',
      expectedPlanTier
    );

    // Verify features match expected plan
    expect(organization!.features).toEqual(expect.arrayContaining(features));
    expect(organization!.allowedModules).toEqual(expect.arrayContaining(allowedModules));
  }

  /**
   * Create platform admin user
   */
  async createPlatformAdminUser(organizationId: string): Promise<any> {
    const hashedPassword = await hash('TestPassword123!');
    
    const user = await this.prisma.user.create({
      data: {
        email: 'platformadmin@test.com',
        name: 'Platform Admin',
        phone: '+1234567890',
        hashedPassword,
        organizationId,
        emailVerified: true,
        isActive: true,
      },
    });

    // Create platform admin role
    const role = await this.prisma.role.create({
      data: {
        name: 'Platform Admin',
        description: 'Platform administrator with full access',
        organizationId,
        isPlatformAdmin: true,
        isActive: true,
      },
    });

    // Assign role to user
    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        isActive: true,
      },
    });

    return user;
  }

  /**
   * Generate test access token (simplified for testing)
   */
  generateTestAccessToken(userId: string, organizationId: string): string {
    // In a real implementation, you'd generate a proper JWT token
    // For testing purposes, we'll use a simple string that the test context can validate
    return `test-token-${userId}-${organizationId}`;
  }

  /**
   * Clean up subscription-related test data
   */
  async cleanupSubscriptionData(): Promise<void> {
    await this.prisma.subscription.deleteMany();
    await this.prisma.subscriptionPlan.deleteMany();
    await this.prisma.userRole.deleteMany();
    await this.prisma.role.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.organization.deleteMany();
  }

  /**
   * Get plan by tier
   */
  async getPlanByTier(plans: TestSubscriptionPlan[], tier: SubscriptionTier): Promise<TestSubscriptionPlan> {
    const plan = plans.find(p => p.tier === tier);
    if (!plan) {
      throw new Error(`Plan with tier ${tier} not found`);
    }
    return plan;
  }

  /**
   * Verify plan limits
   */
  verifyPlanLimits(plan: TestSubscriptionPlan, expectedLimits: {
    maxUsers: number;
    maxFarms: number;
    maxActivitiesPerMonth: number;
    maxActiveListings: number;
  }): void {
    expect(plan.maxUsers).toBe(expectedLimits.maxUsers);
    expect(plan.maxFarms).toBe(expectedLimits.maxFarms);
    expect(plan.maxActivitiesPerMonth).toBe(expectedLimits.maxActivitiesPerMonth);
    expect(plan.maxActiveListings).toBe(expectedLimits.maxActiveListings);
  }

  /**
   * Verify plan features
   */
  verifyPlanFeatures(plan: TestSubscriptionPlan, expectedFeatures: {
    hasAdvancedAnalytics: boolean;
    hasAIInsights: boolean;
    hasAPIAccess: boolean;
    hasCustomRoles: boolean;
    hasPrioritySupport: boolean;
    hasWhiteLabel: boolean;
  }): void {
    expect(plan.hasAdvancedAnalytics).toBe(expectedFeatures.hasAdvancedAnalytics);
    expect(plan.hasAIInsights).toBe(expectedFeatures.hasAIInsights);
    expect(plan.hasAPIAccess).toBe(expectedFeatures.hasAPIAccess);
    expect(plan.hasCustomRoles).toBe(expectedFeatures.hasCustomRoles);
    expect(plan.hasPrioritySupport).toBe(expectedFeatures.hasPrioritySupport);
    expect(plan.hasWhiteLabel).toBe(expectedFeatures.hasWhiteLabel);
  }
}
