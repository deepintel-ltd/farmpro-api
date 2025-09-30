-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SOLD');

-- CreateEnum
CREATE TYPE "public"."ListingPriceType" AS ENUM ('FIXED', 'NEGOTIABLE', 'AUCTION');

-- CreateEnum
CREATE TYPE "public"."PriceAlertCondition" AS ENUM ('ABOVE', 'BELOW', 'EQUAL');

-- CreateTable
CREATE TABLE "public"."marketplace_listings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "priceType" "public"."ListingPriceType" NOT NULL DEFAULT 'FIXED',
    "minQuantity" DOUBLE PRECISION,
    "qualityGrade" TEXT,
    "certifications" TEXT[],
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableUntil" TIMESTAMP(3) NOT NULL,
    "deliveryOptions" TEXT[],
    "deliveryRadius" INTEGER,
    "paymentTerms" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[],
    "status" "public"."ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "views" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commodityId" TEXT,
    "commodityName" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "condition" "public"."PriceAlertCondition" NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_listings_organizationId_idx" ON "public"."marketplace_listings"("organizationId");

-- CreateIndex
CREATE INDEX "marketplace_listings_inventoryId_idx" ON "public"."marketplace_listings"("inventoryId");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_idx" ON "public"."marketplace_listings"("status");

-- CreateIndex
CREATE INDEX "marketplace_listings_availableUntil_idx" ON "public"."marketplace_listings"("availableUntil");

-- CreateIndex
CREATE INDEX "price_alerts_userId_idx" ON "public"."price_alerts"("userId");

-- CreateIndex
CREATE INDEX "price_alerts_commodityId_idx" ON "public"."price_alerts"("commodityId");

-- CreateIndex
CREATE INDEX "price_alerts_isActive_idx" ON "public"."price_alerts"("isActive");

-- AddForeignKey
ALTER TABLE "public"."marketplace_listings" ADD CONSTRAINT "marketplace_listings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketplace_listings" ADD CONSTRAINT "marketplace_listings_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_alerts" ADD CONSTRAINT "price_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_alerts" ADD CONSTRAINT "price_alerts_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "public"."commodities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
