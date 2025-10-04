-- Safe migration to add analytics performance indexes
-- Uses IF NOT EXISTS to avoid conflicts if indexes already exist

-- Add index for farm activities if it doesn't exist
CREATE INDEX IF NOT EXISTS "farm_activities_farmId_createdAt_idx" 
ON "public"."farm_activities"("farmId", "createdAt");

-- Add index for transactions by organization, type, and date if it doesn't exist
CREATE INDEX IF NOT EXISTS "transactions_organizationId_type_createdAt_idx" 
ON "public"."transactions"("organizationId", "type", "createdAt");

-- Add index for transactions by farm, type, and date if it doesn't exist
CREATE INDEX IF NOT EXISTS "transactions_farmId_type_createdAt_idx" 
ON "public"."transactions"("farmId", "type", "createdAt");

-- Note: These indexes will significantly improve analytics dashboard performance
-- by optimizing the WHERE clauses used in revenue, expense, and activity queries
