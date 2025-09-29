-- CreateEnum
CREATE TYPE "public"."RoleScope" AS ENUM ('PLATFORM', 'ORGANIZATION', 'FARM');

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "allowedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "featureFlags" JSONB,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."roles" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scope" "public"."RoleScope" NOT NULL DEFAULT 'ORGANIZATION';

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "public"."organizations"("type");

-- CreateIndex
CREATE INDEX "organizations_isActive_suspendedAt_idx" ON "public"."organizations"("isActive", "suspendedAt");

-- CreateIndex
CREATE INDEX "roles_isPlatformAdmin_idx" ON "public"."roles"("isPlatformAdmin");

-- CreateIndex
CREATE INDEX "roles_scope_idx" ON "public"."roles"("scope");
