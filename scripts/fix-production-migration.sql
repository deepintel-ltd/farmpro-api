-- Production migration fix script
-- Run this directly on the production database to resolve the failed migration

-- First, mark the failed migration as rolled back
UPDATE "_prisma_migrations" 
SET "finished_at" = NOW(), 
    "logs" = 'Manually resolved - indexes created via direct SQL'
WHERE "migration_name" = '20251004195011_add_analytics_performance_indexes' 
AND "finished_at" IS NULL;

-- Now create the indexes safely
CREATE INDEX IF NOT EXISTS "farm_activities_farmId_createdAt_idx" 
ON "public"."farm_activities"("farmId", "createdAt");

CREATE INDEX IF NOT EXISTS "transactions_organizationId_type_createdAt_idx" 
ON "public"."transactions"("organizationId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "transactions_farmId_type_createdAt_idx" 
ON "public"."transactions"("farmId", "type", "createdAt");

-- Verify indexes were created
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('farm_activities', 'transactions')
AND indexname LIKE '%farmId%' OR indexname LIKE '%organizationId%'
ORDER BY tablename, indexname;
