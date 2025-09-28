/*
  Warnings:

  - The values [FOOD_PROCESSOR,COOPERATIVE,OTHER] on the enum `OrganizationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."OrganizationType_new" AS ENUM ('FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM');
ALTER TABLE "public"."organizations" ALTER COLUMN "type" TYPE "public"."OrganizationType_new" USING ("type"::text::"public"."OrganizationType_new");
ALTER TYPE "public"."OrganizationType" RENAME TO "OrganizationType_old";
ALTER TYPE "public"."OrganizationType_new" RENAME TO "OrganizationType";
DROP TYPE "public"."OrganizationType_old";
COMMIT;
