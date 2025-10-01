-- Add currency field to organizations table
ALTER TABLE "organizations" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'NGN';

-- Update existing organizations to have NGN as default
UPDATE "organizations" SET "currency" = 'NGN' WHERE "currency" IS NULL;

-- Make currency field non-nullable
ALTER TABLE "organizations" ALTER COLUMN "currency" SET NOT NULL;

-- Add index for currency-based queries
CREATE INDEX "organizations_currency_idx" ON "organizations"("currency");

-- Update orders table to use proper Currency enum instead of string
ALTER TABLE "orders" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";

-- Update transactions table to use proper Currency enum instead of string  
ALTER TABLE "transactions" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";

-- Add currency field to inventory table
ALTER TABLE "inventory" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'NGN';

-- Update existing inventory records to use organization currency
UPDATE "inventory" 
SET "currency" = (
  SELECT "currency" FROM "organizations" 
  WHERE "organizations"."id" = "inventory"."organizationId"
)
WHERE "inventory"."currency" IS NULL;

-- Add index for inventory currency queries
CREATE INDEX "inventory_currency_idx" ON "inventory"("currency");

-- Add currency field to marketplace_listings table
ALTER TABLE "marketplace_listings" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'NGN';

-- Update existing marketplace listings to use organization currency
UPDATE "marketplace_listings" 
SET "currency" = (
  SELECT "currency" FROM "organizations" 
  WHERE "organizations"."id" = "marketplace_listings"."organizationId"
)
WHERE "marketplace_listings"."currency" IS NULL;

-- Add index for marketplace listings currency queries
CREATE INDEX "marketplace_listings_currency_idx" ON "marketplace_listings"("currency");
