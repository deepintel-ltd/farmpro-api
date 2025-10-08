-- CreateSubscriptionPlans
-- This migration creates the subscription plans that were previously in the seed file

-- Insert FREE plan
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB",
  "apiCallsPerDay", "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess",
  "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", "isActive", "isPublic",
  "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0001n8h8t6p5f7ja', -- FREE plan ID
  'Free',
  'FREE',
  'Perfect for individual farmers getting started',
  0,
  0,
  'MONTHLY',
  1,
  1,
  50,
  0,
  1,
  100,
  false,
  false,
  false,
  false,
  false,
  false,
  true,
  true,
  NOW(),
  NOW()
);

-- Insert BASIC (Monthly) plan
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB",
  "apiCallsPerDay", "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess",
  "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", "isActive", "isPublic",
  "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0002n8h8t6p5f7jb', -- BASIC Monthly plan ID
  'Basic (Monthly)',
  'BASIC',
  'Great for small farms and cooperatives',
  10,
  10000,
  'MONTHLY',
  3,
  2,
  -1, -- Unlimited
  5,
  5,
  500,
  false,
  false,
  false,
  false,
  false,
  false,
  true,
  true,
  NOW(),
  NOW()
);

-- Insert BASIC (Yearly) plan
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB",
  "apiCallsPerDay", "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess",
  "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", "isActive", "isPublic",
  "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0003n8h8t6p5f7jc', -- BASIC Yearly plan ID
  'Basic (Yearly)',
  'BASIC',
  'Great for small farms and cooperatives - Save 2 months!',
  100,
  100000,
  'YEARLY',
  3,
  2,
  -1, -- Unlimited
  5,
  5,
  500,
  false,
  false,
  false,
  false,
  false,
  false,
  true,
  true,
  NOW(),
  NOW()
);

-- Insert PRO (Monthly) plan
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB",
  "apiCallsPerDay", "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess",
  "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", "isActive", "isPublic",
  "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0004n8h8t6p5f7jd', -- PRO Monthly plan ID
  'Pro (Monthly)',
  'PRO',
  'Advanced features for commercial farms',
  50,
  50000,
  'MONTHLY',
  10,
  5,
  -1, -- Unlimited
  -1, -- Unlimited
  50,
  5000,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  NOW(),
  NOW()
);

-- Insert PRO (Yearly) plan
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB",
  "apiCallsPerDay", "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess",
  "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", "isActive", "isPublic",
  "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0005n8h8t6p5f7je', -- PRO Yearly plan ID
  'Pro (Yearly)',
  'PRO',
  'Advanced features for commercial farms - Save 2 months!',
  500,
  500000,
  'YEARLY',
  10,
  5,
  -1, -- Unlimited
  -1, -- Unlimited
  50,
  5000,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  NOW(),
  NOW()
);

-- Insert ENTERPRISE plan
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB",
  "apiCallsPerDay", "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess",
  "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", "isActive", "isPublic",
  "features", "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0006n8h8t6p5f7jf', -- ENTERPRISE plan ID
  'Enterprise',
  'ENTERPRISE',
  'Custom solutions for large agribusiness operations',
  200,
  200000,
  'MONTHLY',
  -1, -- Unlimited
  -1, -- Unlimited
  -1, -- Unlimited
  -1, -- Unlimited
  -1, -- Unlimited
  -1, -- Unlimited
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  '{"dedicatedAccountManager": true, "customIntegrations": true, "slaGuarantees": true, "advancedSecurity": true, "multiOrganizationManagement": true}',
  NOW(),
  NOW()
);
