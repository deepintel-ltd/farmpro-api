-- Add performance indexes for analytics queries
-- These indexes support the real data analytics implementation

-- Transaction analytics indexes
CREATE INDEX IF NOT EXISTS "idx_transactions_analytics_org_type_date" 
ON "transactions" ("organizationId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_transactions_analytics_org_farm_type" 
ON "transactions" ("organizationId", "farmId", "type") 
WHERE "farmId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_transactions_analytics_amount" 
ON "transactions" ("organizationId", "type", "amount", "createdAt");

-- Farm Activity analytics indexes
CREATE INDEX IF NOT EXISTS "idx_farm_activities_analytics_org_farm_date" 
ON "farm_activities" ("farmId", "createdAt", "status");

CREATE INDEX IF NOT EXISTS "idx_farm_activities_analytics_org_type_status" 
ON "farm_activities" ("farmId", "type", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_farm_activities_analytics_duration_cost" 
ON "farm_activities" ("farmId", "status", "actualDuration", "cost") 
WHERE "actualDuration" IS NOT NULL;

-- Activity costs analytics indexes
CREATE INDEX IF NOT EXISTS "idx_activity_costs_analytics_activity_amount" 
ON "activity_costs" ("activityId", "amount", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_activity_costs_analytics_type_amount" 
ON "activity_costs" ("type", "amount", "createdAt");

-- Crop cycle analytics indexes
CREATE INDEX IF NOT EXISTS "idx_crop_cycles_analytics_farm_status_dates" 
ON "crop_cycles" ("farmId", "status", "createdAt", "harvestDate");

CREATE INDEX IF NOT EXISTS "idx_crop_cycles_analytics_yield_production" 
ON "crop_cycles" ("farmId", "status", "actualYield", "expectedYield") 
WHERE "actualYield" IS NOT NULL;

-- Orders analytics indexes
CREATE INDEX IF NOT EXISTS "idx_orders_analytics_buyer_status_date" 
ON "orders" ("buyerOrgId", "status", "createdAt", "totalPrice");

CREATE INDEX IF NOT EXISTS "idx_orders_analytics_supplier_status_date" 
ON "orders" ("supplierOrgId", "status", "createdAt", "totalPrice") 
WHERE "supplierOrgId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_orders_analytics_farm_commodity" 
ON "orders" ("farmId", "commodityId", "status", "createdAt") 
WHERE "farmId" IS NOT NULL;

-- Order items analytics indexes
CREATE INDEX IF NOT EXISTS "idx_order_items_analytics_commodity_quantity" 
ON "order_items" ("commodityId", "quantity", "unitPrice", "createdAt");

-- Inventory analytics indexes
CREATE INDEX IF NOT EXISTS "idx_inventory_analytics_org_commodity_status" 
ON "inventory" ("organizationId", "commodityId", "status", "quantity");

CREATE INDEX IF NOT EXISTS "idx_inventory_analytics_farm_harvest" 
ON "inventory" ("farmId", "harvestId", "status", "quantity") 
WHERE "farmId" IS NOT NULL AND "harvestId" IS NOT NULL;

-- Harvest analytics indexes
CREATE INDEX IF NOT EXISTS "idx_harvests_analytics_crop_cycle_date" 
ON "harvests" ("cropCycleId", "harvestDate", "quantity", "quality");

-- Farm analytics indexes for organization-level queries
CREATE INDEX IF NOT EXISTS "idx_farms_analytics_org_active" 
ON "farms" ("organizationId", "isActive", "createdAt");

-- Commodity analytics indexes
CREATE INDEX IF NOT EXISTS "idx_commodities_analytics_farm_category" 
ON "commodities" ("farmId", "category", "isActive") 
WHERE "farmId" IS NOT NULL;

-- Area analytics indexes for farm-specific queries
CREATE INDEX IF NOT EXISTS "idx_areas_analytics_farm_active" 
ON "areas" ("farmId", "isActive", "size");

-- User activity analytics indexes
CREATE INDEX IF NOT EXISTS "idx_users_analytics_org_active" 
ON "users" ("organizationId", "isActive", "createdAt");

-- Activity assignments analytics indexes
CREATE INDEX IF NOT EXISTS "idx_activity_assignments_analytics_user_active" 
ON "activity_assignments" ("userId", "isActive", "assignedAt");

CREATE INDEX IF NOT EXISTS "idx_activity_assignments_analytics_activity_role" 
ON "activity_assignments" ("activityId", "role", "isActive");

-- Performance monitoring: Add indexes for common JOIN patterns
CREATE INDEX IF NOT EXISTS "idx_crop_cycles_analytics_area_commodity" 
ON "crop_cycles" ("areaId", "commodityId", "status");

-- Composite index for complex analytics queries
CREATE INDEX IF NOT EXISTS "idx_transactions_analytics_complex" 
ON "transactions" ("organizationId", "type", "status", "createdAt", "amount");
