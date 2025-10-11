-- =====================================================================
--  FARMPRO SYSTEM SIMPLIFIED INITIALIZATION
--  Plan-based RBAC system - No complex roles/permissions tables needed
-- =====================================================================

-- 1️⃣ Create System Organization (for platform administration)
INSERT INTO "organizations" (
  "id", "name", "type", "email", "phone", "address",
  "description", "isVerified", "isActive", "plan",
  "maxUsers", "maxFarms", "features", "allowedModules",
  "allowCustomRoles", "currency", "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0010n8h8t6p5f7jb', -- System org ID
  'FarmPro Platform',
  'FARM_OPERATION',
  'admin@farmpro.app',
  '+1-000-000-0000',
  '{"street":"Platform HQ","city":"System","state":"SY","zipCode":"00000","country":"USA"}',
  'System organization for platform administration and management',
  true, true, 'ENTERPRISE',
  999999, 999999,
  ARRAY['all_features'],
  ARRAY['farm_management','activities','inventory','analytics','marketplace','orders','trading','deliveries','observations','sensors','crop_cycles','areas','seasons','drivers','tracking','intelligence','media','rbac'],
  true,
  'USD',
  NOW(), NOW()
);

-- 2️⃣ Create Platform Admin User
INSERT INTO "users" (
  "id", "email", "name", "phone", "emailVerified",
  "isActive", "organizationId", "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0020n8h8t6p5f7jc', -- Platform admin user ID
  'admin@farmpro.app',
  'FarmPro Administrator',
  '+1-000-000-0000',
  true,
  true,
  'ckx4z2yqr0010n8h8t6p5f7jb', -- System org ID
  NOW(), NOW()
);

-- 3️⃣ Create Subscription Plans (if not already exists)
-- Note: These should be created through the billing system, but we'll add basic ones here
INSERT INTO "subscription_plans" (
  "id", "name", "tier", "description", "priceUSD", "priceNGN", "billingInterval",
  "maxUsers", "maxFarms", "maxActivitiesPerMonth", "maxActiveListings", "storageGB", "apiCallsPerDay",
  "hasAdvancedAnalytics", "hasAIInsights", "hasAPIAccess", "hasCustomRoles", "hasPrioritySupport", "hasWhiteLabel", 
  "features", "isActive", "isPublic", "createdAt", "updatedAt"
) VALUES 
-- FREE Plan
('ckx4z2yqr0030n8h8t6p5f7jd', 'Free Plan', 'FREE', 'Basic farm management with limited features', 0.00, 0.00, 'MONTHLY',
 1, 1, 10, 5, 1, 100,
 false, false, false, false, false, false,
 '{"basic_farm_management":true,"marketplace_access":true,"order_management":true,"inventory_management":true}',
 true, true, NOW(), NOW()),

-- BASIC Plan  
('ckx4z2yqr0040n8h8t6p5f7je', 'Basic Plan', 'BASIC', 'Enhanced farm management with more features', 29.99, 45000.00, 'MONTHLY',
 5, 3, 50, 25, 5, 500,
 false, false, false, false, false, false,
 '{"basic_farm_management":true,"marketplace_access":true,"order_management":true,"inventory_management":true,"deliveries":true,"basic_analytics":true}',
 true, true, NOW(), NOW()),

-- PRO Plan
('ckx4z2yqr0050n8h8t6p5f7jf', 'Pro Plan', 'PRO', 'Advanced farm management with AI and analytics', 99.99, 150000.00, 'MONTHLY',
 25, 10, 200, 100, 20, 2000,
 true, true, true, true, false, false,
 '{"basic_farm_management":true,"marketplace_access":true,"order_management":true,"inventory_management":true,"deliveries":true,"analytics":true,"ai_insights":true,"api_access":true,"custom_roles":true}',
 true, true, NOW(), NOW()),

-- ENTERPRISE Plan
('ckx4z2yqr0060n8h8t6p5f7jg', 'Enterprise Plan', 'ENTERPRISE', 'Full platform access with unlimited features', 299.99, 450000.00, 'MONTHLY',
 999999, 999999, -1, -1, 1000, 10000,
 true, true, true, true, true, true,
 '{"all_features":true,"white_label":true,"priority_support":true,"unlimited_usage":true,"custom_integrations":true}',
 true, true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- 4️⃣ Create System Organization Subscription
INSERT INTO "subscriptions" (
  "id", "organizationId", "planId", "status", "currency", "currentPeriodStart", "currentPeriodEnd",
  "billingInterval", "isTrialing", "autoRenew", "cancelAtPeriodEnd", "createdAt", "updatedAt"
) VALUES (
  'ckx4z2yqr0070n8h8t6p5f7jh', -- Subscription ID
  'ckx4z2yqr0010n8h8t6p5f7jb', -- System org ID
  'ckx4z2yqr0060n8h8t6p5f7jg', -- ENTERPRISE plan ID
  'ACTIVE',
  'USD',
  NOW(),
  NOW() + INTERVAL '1 year', -- 1 year subscription
  'MONTHLY',
  false, -- isTrialing
  true,  -- autoRenew
  false, -- cancelAtPeriodEnd
  NOW(), NOW()
);

-- 5️⃣ Note: Roles and user_roles tables are not used in the simplified plan-based RBAC system
-- The system uses plan-based permissions defined in code constants instead of database tables

-- 6️⃣ Create Sample Commodities (for marketplace)
INSERT INTO "commodities" (
  "id", "name", "category", "description", "unit", "quantity", "isActive", "isGlobal", "createdAt", "updatedAt"
) VALUES 
('ckx4z2yqr00e0n8h8t6p5f7jo', 'Wheat', 'GRAIN', 'Common wheat grain', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00f0n8h8t6p5f7jp', 'Corn', 'GRAIN', 'Maize grain', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00g0n8h8t6p5f7jq', 'Soybeans', 'LEGUME', 'Soybean grain', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00h0n8h8t6p5f7jr', 'Rice', 'GRAIN', 'Rice grain', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00i0n8h8t6p5f7js', 'Potatoes', 'TUBER', 'Potato tubers', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00j0n8h8t6p5f7jt', 'Tomatoes', 'VEGETABLE', 'Fresh tomatoes', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00k0n8h8t6p5f7ju', 'Lettuce', 'VEGETABLE', 'Fresh lettuce', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00l0n8h8t6p5f7jv', 'Apples', 'FRUIT', 'Fresh apples', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00m0n8h8t6p5f7jw', 'Oranges', 'FRUIT', 'Fresh oranges', 'kg', 0.0, true, true, NOW(), NOW()),
('ckx4z2yqr00n0n8h8t6p5f7jx', 'Coffee', 'BEVERAGE', 'Coffee beans', 'kg', 0.0, true, true, NOW(), NOW());

-- 7️⃣ Activity Types are handled as enums in the schema, not as a separate table

-- 8️⃣ Additional sample data tables will be created as needed

-- =====================================================================
--  MIGRATION COMPLETE
--  
--  This simplified migration creates:
--  ✅ System organization for platform administration
--  ✅ Platform admin user
--  ✅ Basic subscription plans (FREE, BASIC, PRO, ENTERPRISE)
--  ✅ System organization subscription
--  ✅ Sample commodities for marketplace
--  
--  ❌ NO roles table (using plan-based permissions instead)
--  ❌ NO user_roles table (using plan-based permissions instead)
--  ❌ NO complex RBAC system (simplified plan-based approach)
--  
--  The new system uses:
--  - Plan-based permissions (defined in code)
--  - Cached user context (UserContextService)
--  - Single authorization guard (AuthorizationGuard)
--  - Simple decorators (@RequirePermission, @RequireFeature, @RequireModule)
-- =====================================================================
