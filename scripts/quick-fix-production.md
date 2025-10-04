# Quick Fix for DigitalOcean Production Migration Failure

## Option 1: Direct Database Fix (Recommended)

Connect to your production database and run this single command:

```sql
-- Fix the failed migration and create indexes
UPDATE "_prisma_migrations" SET "finished_at" = NOW(), "logs" = 'Manually resolved' WHERE "migration_name" = '20251004195011_add_analytics_performance_indexes' AND "finished_at" IS NULL;
CREATE INDEX IF NOT EXISTS "farm_activities_farmId_createdAt_idx" ON "public"."farm_activities"("farmId", "createdAt");
CREATE INDEX IF NOT EXISTS "transactions_organizationId_type_createdAt_idx" ON "public"."transactions"("organizationId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "transactions_farmId_type_createdAt_idx" ON "public"."transactions"("farmId", "type", "createdAt");
```

## Option 2: Using the Fix Script

1. Upload the `scripts/fix-production-migration.sql` file to your DigitalOcean droplet
2. Run: `psql $DATABASE_URL -f scripts/fix-production-migration.sql`

## Option 3: Reset and Redeploy

If the above doesn't work, you can reset the migration state:

```sql
-- Remove the failed migration record
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20251004195011_add_analytics_performance_indexes';
```

Then redeploy the application.

## Verification

After applying the fix, verify the indexes exist:

```sql
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('farm_activities', 'transactions') 
AND (indexname LIKE '%farmId%' OR indexname LIKE '%organizationId%');
```

You should see:
- `farm_activities_farmId_createdAt_idx`
- `transactions_organizationId_type_createdAt_idx` 
- `transactions_farmId_type_createdAt_idx`
