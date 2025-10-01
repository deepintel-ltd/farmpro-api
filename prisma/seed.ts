import { PrismaClient, SubscriptionTier, BillingInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding subscription plans...');

  // Create FREE plan
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Free' },
    update: {},
    create: {
      name: 'Free',
      tier: SubscriptionTier.FREE,
      description: 'Perfect for individual farmers getting started',
      priceUSD: 0,
      priceNGN: 0,
      billingInterval: BillingInterval.MONTHLY,
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
  });
  console.log('✅ Created FREE plan:', freePlan.name);

  // Create BASIC plan - Monthly
  const basicMonthly = await prisma.subscriptionPlan.upsert({
    where: { name: 'Basic (Monthly)' },
    update: {},
    create: {
      name: 'Basic (Monthly)',
      tier: SubscriptionTier.BASIC,
      description: 'Great for small farms and cooperatives',
      priceUSD: 10,
      priceNGN: 10000,
      billingInterval: BillingInterval.MONTHLY,
      maxUsers: 3,
      maxFarms: 2,
      maxActivitiesPerMonth: -1, // Unlimited
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
  });
  console.log('✅ Created BASIC (Monthly) plan:', basicMonthly.name);

  // Create BASIC plan - Yearly
  const basicYearly = await prisma.subscriptionPlan.upsert({
    where: { name: 'Basic (Yearly)' },
    update: {},
    create: {
      name: 'Basic (Yearly)',
      tier: SubscriptionTier.BASIC,
      description: 'Great for small farms and cooperatives - Save 2 months!',
      priceUSD: 100,
      priceNGN: 100000,
      billingInterval: BillingInterval.YEARLY,
      maxUsers: 3,
      maxFarms: 2,
      maxActivitiesPerMonth: -1,
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
  });
  console.log('✅ Created BASIC (Yearly) plan:', basicYearly.name);

  // Create PRO plan - Monthly
  const proMonthly = await prisma.subscriptionPlan.upsert({
    where: { name: 'Pro (Monthly)' },
    update: {},
    create: {
      name: 'Pro (Monthly)',
      tier: SubscriptionTier.PRO,
      description: 'Advanced features for commercial farms',
      priceUSD: 50,
      priceNGN: 50000,
      billingInterval: BillingInterval.MONTHLY,
      maxUsers: 10,
      maxFarms: 5,
      maxActivitiesPerMonth: -1,
      maxActiveListings: -1, // Unlimited
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
  });
  console.log('✅ Created PRO (Monthly) plan:', proMonthly.name);

  // Create PRO plan - Yearly
  const proYearly = await prisma.subscriptionPlan.upsert({
    where: { name: 'Pro (Yearly)' },
    update: {},
    create: {
      name: 'Pro (Yearly)',
      tier: SubscriptionTier.PRO,
      description: 'Advanced features for commercial farms - Save 2 months!',
      priceUSD: 500,
      priceNGN: 500000,
      billingInterval: BillingInterval.YEARLY,
      maxUsers: 10,
      maxFarms: 5,
      maxActivitiesPerMonth: -1,
      maxActiveListings: -1,
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
  });
  console.log('✅ Created PRO (Yearly) plan:', proYearly.name);

  // Create ENTERPRISE plan
  const enterprise = await prisma.subscriptionPlan.upsert({
    where: { name: 'Enterprise' },
    update: {},
    create: {
      name: 'Enterprise',
      tier: SubscriptionTier.ENTERPRISE,
      description: 'Custom solutions for large agribusiness operations',
      priceUSD: 200,
      priceNGN: 200000,
      billingInterval: BillingInterval.MONTHLY,
      maxUsers: -1, // Unlimited
      maxFarms: -1, // Unlimited
      maxActivitiesPerMonth: -1,
      maxActiveListings: -1,
      storageGB: -1, // Unlimited
      apiCallsPerDay: -1, // Unlimited
      hasAdvancedAnalytics: true,
      hasAIInsights: true,
      hasAPIAccess: true,
      hasCustomRoles: true,
      hasPrioritySupport: true,
      hasWhiteLabel: true,
      isActive: true,
      isPublic: true,
      features: {
        dedicatedAccountManager: true,
        customIntegrations: true,
        slaGuarantees: true,
        advancedSecurity: true,
        multiOrganizationManagement: true,
      },
    },
  });
  console.log('✅ Created ENTERPRISE plan:', enterprise.name);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
