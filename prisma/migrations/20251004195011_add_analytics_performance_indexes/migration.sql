-- CreateIndex
CREATE INDEX "farm_activities_farmId_createdAt_idx" ON "public"."farm_activities"("farmId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_organizationId_type_createdAt_idx" ON "public"."transactions"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_farmId_type_createdAt_idx" ON "public"."transactions"("farmId", "type", "createdAt");

-- Note: Removed 4-column index (organizationId, farmId, type, createdAt) as it's redundant
-- PostgreSQL can use the 3-column indexes efficiently for most query patterns
