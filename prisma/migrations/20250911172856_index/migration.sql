-- AlterEnum
ALTER TYPE "public"."ActivityStatus" ADD VALUE 'PAUSED';

-- DropIndex
DROP INDEX "public"."idx_activity_assignments_analytics_activity_role";

-- DropIndex
DROP INDEX "public"."idx_activity_assignments_analytics_user_active";

-- DropIndex
DROP INDEX "public"."idx_activity_costs_analytics_activity_amount";

-- DropIndex
DROP INDEX "public"."idx_activity_costs_analytics_type_amount";

-- DropIndex
DROP INDEX "public"."idx_areas_analytics_farm_active";

-- DropIndex
DROP INDEX "public"."idx_crop_cycles_analytics_area_commodity";

-- DropIndex
DROP INDEX "public"."idx_crop_cycles_analytics_farm_status_dates";

-- DropIndex
DROP INDEX "public"."idx_farm_activities_analytics_org_farm_date";

-- DropIndex
DROP INDEX "public"."idx_farm_activities_analytics_org_type_status";

-- DropIndex
DROP INDEX "public"."idx_farms_analytics_org_active";

-- DropIndex
DROP INDEX "public"."idx_harvests_analytics_crop_cycle_date";

-- DropIndex
DROP INDEX "public"."idx_inventory_analytics_org_commodity_status";

-- DropIndex
DROP INDEX "public"."idx_order_items_analytics_commodity_quantity";

-- DropIndex
DROP INDEX "public"."idx_orders_analytics_buyer_status_date";

-- DropIndex
DROP INDEX "public"."idx_transactions_analytics_amount";

-- DropIndex
DROP INDEX "public"."idx_transactions_analytics_complex";

-- DropIndex
DROP INDEX "public"."idx_transactions_analytics_org_type_date";

-- DropIndex
DROP INDEX "public"."idx_users_analytics_org_active";
