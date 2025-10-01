-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "authProvider" TEXT DEFAULT 'LOCAL',
ADD COLUMN     "profileComplete" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "organizationId" DROP NOT NULL;
