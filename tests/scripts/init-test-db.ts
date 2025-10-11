import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

// Test organizations with different plan tiers for comprehensive testing
const TEST_ORGANIZATIONS = [
  {
    id: 'test-org-free',
    name: 'Test Farm (FREE)',
    type: 'FARM_OPERATION' as const,
    email: 'test-free@example.com',
    plan: 'FREE' as const,
    maxUsers: 1,
    maxFarms: 1,
    features: ['basic_farm_management'],
    allowedModules: ['farm_management', 'activities'],
    allowCustomRoles: false,
    currency: 'USD' as const,
  },
  {
    id: 'test-org-basic',
    name: 'Test Farm (BASIC)',
    type: 'FARM_OPERATION' as const,
    email: 'test-basic@example.com',
    plan: 'BASIC' as const,
    maxUsers: 5,
    maxFarms: 2,
    features: ['basic_farm_management', 'analytics', 'inventory'],
    allowedModules: ['farm_management', 'activities', 'inventory', 'analytics'],
    allowCustomRoles: false,
    currency: 'USD' as const,
  },
  {
    id: 'test-org-pro',
    name: 'Test Farm (PRO)',
    type: 'FARM_OPERATION' as const,
    email: 'test-pro@example.com',
    plan: 'PRO' as const,
    maxUsers: 25,
    maxFarms: 5,
    features: ['advanced_analytics', 'ai_insights', 'api_access'],
    allowedModules: ['farm_management', 'activities', 'inventory', 'analytics', 'intelligence', 'api'],
    allowCustomRoles: false,
    currency: 'USD' as const,
  },
  {
    id: 'test-org-enterprise',
    name: 'Test Farm (ENTERPRISE)',
    type: 'FARM_OPERATION' as const,
    email: 'test-enterprise@example.com',
    plan: 'ENTERPRISE' as const,
    maxUsers: 999999,
    maxFarms: 999999,
    features: ['all_features', 'custom_roles', 'white_label', 'priority_support'],
    allowedModules: ['farm_management', 'activities', 'inventory', 'analytics', 'intelligence', 'api', 'rbac'],
    allowCustomRoles: true,
    currency: 'USD' as const,
  },
];

// Test users for different plan tiers
const TEST_USERS = [
  {
    id: 'test-user-free',
    email: 'user-free@example.com',
    name: 'Free User',
    organizationId: 'test-org-free',
    isPlatformAdmin: false,
  },
  {
    id: 'test-user-basic',
    email: 'user-basic@example.com',
    name: 'Basic User',
    organizationId: 'test-org-basic',
    isPlatformAdmin: false,
  },
  {
    id: 'test-user-pro',
    email: 'user-pro@example.com',
    name: 'Pro User',
    organizationId: 'test-org-pro',
    isPlatformAdmin: false,
  },
  {
    id: 'test-user-enterprise',
    email: 'user-enterprise@example.com',
    name: 'Enterprise User',
    organizationId: 'test-org-enterprise',
    isPlatformAdmin: false,
  },
  {
    id: 'test-platform-admin',
    email: 'admin@test.com',
    name: 'Platform Admin',
    organizationId: 'test-org-enterprise',
    isPlatformAdmin: true,
  },
];

async function initializeMinimalTestDatabase(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient();
  try {
    console.log('🔧 Initializing test database with simplified RBAC system...');

    // Initialize test organizations
    console.log('🏢 Initializing test organizations...');
    for (const org of TEST_ORGANIZATIONS) {
      await prisma.organization.upsert({
        where: { id: org.id },
        update: org,
        create: {
          ...org,
          isVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    console.log(`✅ Created ${TEST_ORGANIZATIONS.length} test organizations`);

    // Initialize test users
    console.log('👤 Initializing test users...');
    const hashedPassword = await hash('TestPassword123!');
    for (const user of TEST_USERS) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: {
          ...user,
          hashedPassword,
          isActive: true,
          emailVerified: true,
          profileComplete: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    console.log(`✅ Created ${TEST_USERS.length} test users`);

    // Create subscription plans if they don't exist
    console.log('📋 Initializing subscription plans...');
    const subscriptionPlans = [
      {
        id: 'test-plan-free',
        name: 'Test Free Plan',
        tier: 'FREE' as const,
        description: 'Basic farm management features for testing',
        priceUSD: 0,
        priceNGN: 0,
        billingInterval: 'MONTHLY' as const,
        maxUsers: 1,
        maxFarms: 1,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
        features: {},
        isActive: true,
        isPublic: true,
      },
      {
        id: 'test-plan-basic',
        name: 'Test Basic Plan',
        tier: 'BASIC' as const,
        description: 'Enhanced farm management with analytics for testing',
        priceUSD: 29.99,
        priceNGN: 45000,
        billingInterval: 'MONTHLY' as const,
        maxUsers: 5,
        maxFarms: 2,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
        features: {},
        isActive: true,
        isPublic: true,
      },
      {
        id: 'test-plan-pro',
        name: 'Test Pro Plan',
        tier: 'PRO' as const,
        description: 'Advanced features with AI insights and API access for testing',
        priceUSD: 99.99,
        priceNGN: 150000,
        billingInterval: 'MONTHLY' as const,
        maxUsers: 25,
        maxFarms: 5,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: false,
        hasPrioritySupport: true,
        hasWhiteLabel: false,
        features: {},
        isActive: true,
        isPublic: true,
      },
      {
        id: 'test-plan-enterprise',
        name: 'Test Enterprise Plan',
        tier: 'ENTERPRISE' as const,
        description: 'Full platform access with custom roles and white-labeling for testing',
        priceUSD: 299.99,
        priceNGN: 450000,
        billingInterval: 'MONTHLY' as const,
        maxUsers: 999999,
        maxFarms: 999999,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: true,
        hasPrioritySupport: true,
        hasWhiteLabel: true,
        features: {},
        isActive: true,
        isPublic: true,
      },
    ];

    for (const plan of subscriptionPlans) {
      await prisma.subscriptionPlan.upsert({
        where: { id: plan.id },
        update: plan,
        create: {
          ...plan,
          createdAt: new Date(),
          updatedAt: new Date(),
            },
          });
        }
    console.log(`✅ Created ${subscriptionPlans.length} test subscription plans`);

    // Create subscriptions for test organizations
    console.log('💳 Creating test subscriptions...');
    for (const org of TEST_ORGANIZATIONS) {
      const planId = `test-plan-${org.plan.toLowerCase()}`;
      await prisma.subscription.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
          id: `sub-${org.id}`,
          organizationId: org.id,
          planId: planId,
          status: 'ACTIVE' as const,
          currency: org.currency,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          billingInterval: 'MONTHLY' as const,
          autoRenew: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    console.log(`✅ Created ${TEST_ORGANIZATIONS.length} test subscriptions`);

    console.log('✅ Test database initialized successfully with simplified RBAC system!');
    console.log('📝 Test data includes:');
    console.log('   - Organizations with different plan tiers (FREE, BASIC, PRO, ENTERPRISE)');
    console.log('   - Users for each plan tier');
    console.log('   - Platform admin user');
    console.log('   - Subscription plans and active subscriptions');
    console.log('   - No complex role/permission tables (using plan-based permissions)');
  } catch (error) {
    console.error('❌ Error initializing test database:', error);
    throw error;
  } finally {
    // Only disconnect if this script is run directly, not when imported
    if (require.main === module) {
      await prisma.$disconnect();
    }
  }
}

// Only run if this script is executed directly, not when imported
if (require.main === module) {
  initializeMinimalTestDatabase();
}

export { initializeMinimalTestDatabase };
