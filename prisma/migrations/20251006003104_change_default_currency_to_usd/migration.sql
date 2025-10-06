-- AlterTable
ALTER TABLE "public"."inventory" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."marketplace_listings" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."orders" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."organizations" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."transactions" ALTER COLUMN "currency" SET DEFAULT 'USD';
