-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB');

-- CreateEnum
CREATE TYPE "public"."OrganizationType" AS ENUM ('FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM');

-- CreateEnum
CREATE TYPE "public"."CropStatus" AS ENUM ('PLANNED', 'PLANTED', 'GROWING', 'MATURE', 'HARVESTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('LAND_PREP', 'PLANTING', 'FERTILIZING', 'IRRIGATION', 'PEST_CONTROL', 'HARVESTING', 'MAINTENANCE', 'MONITORING', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "public"."InventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('FARM_EXPENSE', 'FARM_REVENUE', 'ORDER_PAYMENT', 'PLATFORM_FEE', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ActivityPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ActivityRole" AS ENUM ('ASSIGNED', 'SUPERVISOR', 'OBSERVER');

-- CreateEnum
CREATE TYPE "public"."ActivityNoteType" AS ENUM ('OBSERVATION', 'ISSUE', 'RECOMMENDATION', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."CostType" AS ENUM ('LABOR', 'EQUIPMENT', 'MATERIAL', 'FUEL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RoleScope" AS ENUM ('PLATFORM', 'ORGANIZATION', 'FARM');

-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SOLD');

-- CreateEnum
CREATE TYPE "public"."ListingPriceType" AS ENUM ('FIXED', 'NEGOTIABLE', 'AUCTION');

-- CreateEnum
CREATE TYPE "public"."PriceAlertCondition" AS ENUM ('ABOVE', 'BELOW', 'EQUAL');

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'PAUSED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "public"."BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'NGN');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "public"."PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('STRIPE', 'PAYSTACK');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "hashedPassword" TEXT,
    "googleId" TEXT,
    "githubId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileComplete" BOOLEAN NOT NULL DEFAULT true,
    "authProvider" "public"."AuthProvider" DEFAULT 'LOCAL',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_verifications" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "scope" "public"."RoleScope" NOT NULL DEFAULT 'ORGANIZATION',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conditions" JSONB,
    "description" TEXT,
    "isSystemPermission" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "farmId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."OrganizationType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "taxId" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxFarms" INTEGER NOT NULL DEFAULT 1,
    "features" TEXT[],
    "allowedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featureFlags" JSONB,
    "allowCustomRoles" BOOLEAN NOT NULL DEFAULT false,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterEmail" TEXT NOT NULL,
    "inviterName" TEXT NOT NULL,
    "roleName" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farms" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalArea" DOUBLE PRECISION NOT NULL,
    "location" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cropTypes" TEXT[],
    "establishedDate" TIMESTAMP(3) NOT NULL,
    "certifications" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."areas" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "boundaries" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seasons" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."commodities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "variety" TEXT,
    "qualityGrade" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3),
    "storageLocation" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "farmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crop_cycles" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "commodityId" TEXT NOT NULL,
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "harvestDate" TIMESTAMP(3),
    "plantedArea" DOUBLE PRECISION NOT NULL,
    "status" "public"."CropStatus" NOT NULL,
    "expectedYield" DOUBLE PRECISION,
    "actualYield" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farm_activities" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "areaId" TEXT,
    "cropCycleId" TEXT,
    "type" "public"."ActivityType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "status" "public"."ActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "public"."ActivityPriority" NOT NULL DEFAULT 'NORMAL',
    "cost" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_assignments" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ActivityRole" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "activity_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_costs" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "type" "public"."CostType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(8,2),
    "unit" TEXT,
    "receipt" TEXT,
    "vendor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "activity_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_progress_logs" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL,
    "notes" TEXT,
    "issues" TEXT,
    "location" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "activity_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_notes" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."ActivityNoteType" NOT NULL DEFAULT 'GENERAL',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "safetyNotes" TEXT NOT NULL,
    "applicableCrops" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."harvests" (
    "id" TEXT NOT NULL,
    "cropCycleId" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quality" TEXT,
    "cost" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "farmId" TEXT,
    "commodityId" TEXT NOT NULL,
    "harvestId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "quality" TEXT,
    "location" TEXT,
    "status" "public"."InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."OrderType" NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "commodityId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "terms" JSONB,
    "totalAmount" DECIMAL(65,30),
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "buyerOrgId" TEXT NOT NULL,
    "supplierOrgId" TEXT,
    "createdById" TEXT NOT NULL,
    "farmId" TEXT,
    "deliveryAddress" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "commodityId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "status" "public"."DeliveryStatus" NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "driverId" TEXT,
    "currentLocation" JSONB,
    "deliveryProof" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."drivers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_updates" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "location" JSONB,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT,
    "farmId" TEXT,
    "categoryId" TEXT,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "status" "public"."TransactionStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."soil_data" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "sampleDate" TIMESTAMP(3) NOT NULL,
    "results" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soil_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sensors" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sensorType" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "lastReading" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sensor_readings" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "quality" TEXT NOT NULL DEFAULT 'GOOD',

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."observations" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "areaId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT,
    "location" JSONB,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media" (
    "id" TEXT NOT NULL,
    "farmActivityId" TEXT,
    "observationId" TEXT,
    "orderId" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "metadata" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ratings" (
    "id" TEXT NOT NULL,
    "fromOrgId" TEXT NOT NULL,
    "toOrgId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "farmId" TEXT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "farmId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "scope" TEXT NOT NULL DEFAULT 'global',
    "scopeId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."intelligence_responses" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "usage" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "farmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intelligence_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farm_analyses" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "insights" TEXT[],
    "recommendations" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."market_analyses" (
    "id" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "region" TEXT,
    "analysisType" TEXT NOT NULL,
    "predictions" JSONB NOT NULL,
    "insights" TEXT[],
    "recommendations" TEXT[],
    "riskFactors" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_optimizations" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "optimizedPlan" JSONB NOT NULL,
    "alternatives" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_optimizations_pkey" PRIMARY KEY ("id")
);

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
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
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

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "public"."SubscriptionTier" NOT NULL,
    "description" TEXT,
    "priceUSD" DECIMAL(10,2) NOT NULL,
    "priceNGN" DECIMAL(10,2) NOT NULL,
    "billingInterval" "public"."BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "maxUsers" INTEGER NOT NULL DEFAULT -1,
    "maxFarms" INTEGER NOT NULL DEFAULT -1,
    "maxActivitiesPerMonth" INTEGER NOT NULL DEFAULT -1,
    "maxActiveListings" INTEGER NOT NULL DEFAULT -1,
    "storageGB" INTEGER NOT NULL DEFAULT 1,
    "apiCallsPerDay" INTEGER NOT NULL DEFAULT 100,
    "hasAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasAIInsights" BOOLEAN NOT NULL DEFAULT false,
    "hasAPIAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasCustomRoles" BOOLEAN NOT NULL DEFAULT false,
    "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "hasWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" "public"."Currency" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "billingInterval" "public"."BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "isTrialing" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethodId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "paystackCustomerCode" TEXT,
    "paystackSubscriptionCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentIntentId" TEXT,
    "paymentMethod" TEXT,
    "lineItems" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "stripeInvoiceId" TEXT,
    "paystackInvoiceCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_methods" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "public"."PaymentMethodType" NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "bankName" TEXT,
    "accountLast4" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentMethodId" TEXT,
    "paystackAuthorizationCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paystackReference" TEXT,
    "failureReason" TEXT,
    "receiptUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_records" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "public"."users"("githubId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "public"."users"("organizationId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "public"."email_verifications"("token");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_tokenHash_key" ON "public"."email_verifications"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verifications_userId_idx" ON "public"."email_verifications"("userId");

-- CreateIndex
CREATE INDEX "email_verifications_tokenHash_idx" ON "public"."email_verifications"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verifications_expiresAt_idx" ON "public"."email_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "roles_organizationId_idx" ON "public"."roles"("organizationId");

-- CreateIndex
CREATE INDEX "roles_isPlatformAdmin_idx" ON "public"."roles"("isPlatformAdmin");

-- CreateIndex
CREATE INDEX "roles_scope_idx" ON "public"."roles"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_organizationId_key" ON "public"."roles"("name", "organizationId");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "public"."permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "public"."permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "public"."role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "public"."user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "public"."user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_farmId_key" ON "public"."user_roles"("userId", "roleId", "farmId");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "public"."organizations"("type");

-- CreateIndex
CREATE INDEX "organizations_isActive_suspendedAt_idx" ON "public"."organizations"("isActive", "suspendedAt");

-- CreateIndex
CREATE INDEX "organizations_currency_idx" ON "public"."organizations"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "public"."invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_tokenHash_key" ON "public"."invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "public"."invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_organizationId_idx" ON "public"."invitations"("organizationId");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "public"."invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_expiresAt_idx" ON "public"."invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "farms_organizationId_idx" ON "public"."farms"("organizationId");

-- CreateIndex
CREATE INDEX "farms_organizationId_isActive_idx" ON "public"."farms"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "areas_farmId_idx" ON "public"."areas"("farmId");

-- CreateIndex
CREATE INDEX "seasons_farmId_idx" ON "public"."seasons"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_farmId_name_year_key" ON "public"."seasons"("farmId", "name", "year");

-- CreateIndex
CREATE INDEX "commodities_isGlobal_createdBy_idx" ON "public"."commodities"("isGlobal", "createdBy");

-- CreateIndex
CREATE INDEX "commodities_farmId_idx" ON "public"."commodities"("farmId");

-- CreateIndex
CREATE INDEX "crop_cycles_farmId_idx" ON "public"."crop_cycles"("farmId");

-- CreateIndex
CREATE INDEX "crop_cycles_farmId_status_idx" ON "public"."crop_cycles"("farmId", "status");

-- CreateIndex
CREATE INDEX "farm_activities_farmId_status_idx" ON "public"."farm_activities"("farmId", "status");

-- CreateIndex
CREATE INDEX "farm_activities_farmId_type_idx" ON "public"."farm_activities"("farmId", "type");

-- CreateIndex
CREATE INDEX "farm_activities_createdById_idx" ON "public"."farm_activities"("createdById");

-- CreateIndex
CREATE INDEX "farm_activities_farmId_priority_idx" ON "public"."farm_activities"("farmId", "priority");

-- CreateIndex
CREATE INDEX "farm_activities_status_scheduledAt_idx" ON "public"."farm_activities"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "farm_activities_farmId_scheduledAt_idx" ON "public"."farm_activities"("farmId", "scheduledAt");

-- CreateIndex
CREATE INDEX "farm_activities_createdById_status_idx" ON "public"."farm_activities"("createdById", "status");

-- CreateIndex
CREATE INDEX "farm_activities_farmId_createdAt_idx" ON "public"."farm_activities"("farmId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_assignments_activityId_idx" ON "public"."activity_assignments"("activityId");

-- CreateIndex
CREATE INDEX "activity_assignments_userId_idx" ON "public"."activity_assignments"("userId");

-- CreateIndex
CREATE INDEX "activity_assignments_userId_isActive_idx" ON "public"."activity_assignments"("userId", "isActive");

-- CreateIndex
CREATE INDEX "activity_assignments_activityId_isActive_idx" ON "public"."activity_assignments"("activityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "activity_assignments_activityId_userId_key" ON "public"."activity_assignments"("activityId", "userId");

-- CreateIndex
CREATE INDEX "activity_costs_activityId_idx" ON "public"."activity_costs"("activityId");

-- CreateIndex
CREATE INDEX "activity_costs_type_idx" ON "public"."activity_costs"("type");

-- CreateIndex
CREATE INDEX "activity_costs_createdById_idx" ON "public"."activity_costs"("createdById");

-- CreateIndex
CREATE INDEX "activity_progress_logs_activityId_idx" ON "public"."activity_progress_logs"("activityId");

-- CreateIndex
CREATE INDEX "activity_progress_logs_timestamp_idx" ON "public"."activity_progress_logs"("timestamp");

-- CreateIndex
CREATE INDEX "activity_notes_activityId_idx" ON "public"."activity_notes"("activityId");

-- CreateIndex
CREATE INDEX "activity_notes_userId_idx" ON "public"."activity_notes"("userId");

-- CreateIndex
CREATE INDEX "activity_notes_activityId_createdAt_idx" ON "public"."activity_notes"("activityId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_templates_organizationId_idx" ON "public"."activity_templates"("organizationId");

-- CreateIndex
CREATE INDEX "activity_templates_type_idx" ON "public"."activity_templates"("type");

-- CreateIndex
CREATE INDEX "activity_templates_isSystem_idx" ON "public"."activity_templates"("isSystem");

-- CreateIndex
CREATE INDEX "harvests_cropCycleId_idx" ON "public"."harvests"("cropCycleId");

-- CreateIndex
CREATE INDEX "inventory_organizationId_status_idx" ON "public"."inventory"("organizationId", "status");

-- CreateIndex
CREATE INDEX "inventory_farmId_idx" ON "public"."inventory"("farmId");

-- CreateIndex
CREATE INDEX "inventory_organizationId_commodityId_idx" ON "public"."inventory"("organizationId", "commodityId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_buyerOrgId_status_idx" ON "public"."orders"("buyerOrgId", "status");

-- CreateIndex
CREATE INDEX "orders_supplierOrgId_status_idx" ON "public"."orders"("supplierOrgId", "status");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "public"."orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_farmId_idx" ON "public"."orders"("farmId");

-- CreateIndex
CREATE INDEX "orders_commodityId_idx" ON "public"."orders"("commodityId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "public"."order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_deliveryNumber_key" ON "public"."deliveries"("deliveryNumber");

-- CreateIndex
CREATE INDEX "deliveries_orderId_idx" ON "public"."deliveries"("orderId");

-- CreateIndex
CREATE INDEX "deliveries_driverId_status_idx" ON "public"."deliveries"("driverId", "status");

-- CreateIndex
CREATE INDEX "drivers_organizationId_isActive_idx" ON "public"."drivers"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "tracking_updates_deliveryId_timestamp_idx" ON "public"."tracking_updates"("deliveryId", "timestamp");

-- CreateIndex
CREATE INDEX "transactions_organizationId_status_idx" ON "public"."transactions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "transactions_organizationId_type_idx" ON "public"."transactions"("organizationId", "type");

-- CreateIndex
CREATE INDEX "transactions_organizationId_type_createdAt_idx" ON "public"."transactions"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_farmId_type_createdAt_idx" ON "public"."transactions"("farmId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "public"."transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_requiresApproval_idx" ON "public"."transactions"("requiresApproval");

-- CreateIndex
CREATE INDEX "transaction_categories_organizationId_idx" ON "public"."transaction_categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_categories_name_organizationId_key" ON "public"."transaction_categories"("name", "organizationId");

-- CreateIndex
CREATE INDEX "soil_data_areaId_sampleDate_idx" ON "public"."soil_data"("areaId", "sampleDate");

-- CreateIndex
CREATE INDEX "sensors_farmId_isActive_idx" ON "public"."sensors"("farmId", "isActive");

-- CreateIndex
CREATE INDEX "sensors_farmId_sensorType_idx" ON "public"."sensors"("farmId", "sensorType");

-- CreateIndex
CREATE INDEX "sensor_readings_sensorId_timestamp_idx" ON "public"."sensor_readings"("sensorId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_readings_sensorId_timestamp_key" ON "public"."sensor_readings"("sensorId", "timestamp");

-- CreateIndex
CREATE INDEX "observations_farmId_isResolved_idx" ON "public"."observations"("farmId", "isResolved");

-- CreateIndex
CREATE INDEX "observations_userId_farmId_idx" ON "public"."observations"("userId", "farmId");

-- CreateIndex
CREATE INDEX "media_farmActivityId_idx" ON "public"."media"("farmActivityId");

-- CreateIndex
CREATE INDEX "media_observationId_idx" ON "public"."media"("observationId");

-- CreateIndex
CREATE INDEX "media_orderId_idx" ON "public"."media"("orderId");

-- CreateIndex
CREATE INDEX "ratings_fromOrgId_idx" ON "public"."ratings"("fromOrgId");

-- CreateIndex
CREATE INDEX "ratings_toOrgId_idx" ON "public"."ratings"("toOrgId");

-- CreateIndex
CREATE INDEX "ratings_orderId_idx" ON "public"."ratings"("orderId");

-- CreateIndex
CREATE INDEX "messages_orderId_createdAt_idx" ON "public"."messages"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_farmId_createdAt_idx" ON "public"."messages"("farmId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_userId_idx" ON "public"."messages"("userId");

-- CreateIndex
CREATE INDEX "documents_orderId_idx" ON "public"."documents"("orderId");

-- CreateIndex
CREATE INDEX "documents_farmId_idx" ON "public"."documents"("farmId");

-- CreateIndex
CREATE INDEX "activities_organizationId_timestamp_idx" ON "public"."activities"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "activities_userId_timestamp_idx" ON "public"."activities"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "activities_entity_entityId_idx" ON "public"."activities"("entity", "entityId");

-- CreateIndex
CREATE INDEX "settings_scope_scopeId_idx" ON "public"."settings"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "intelligence_responses_userId_idx" ON "public"."intelligence_responses"("userId");

-- CreateIndex
CREATE INDEX "intelligence_responses_farmId_idx" ON "public"."intelligence_responses"("farmId");

-- CreateIndex
CREATE INDEX "intelligence_responses_createdAt_idx" ON "public"."intelligence_responses"("createdAt");

-- CreateIndex
CREATE INDEX "farm_analyses_farmId_idx" ON "public"."farm_analyses"("farmId");

-- CreateIndex
CREATE INDEX "farm_analyses_userId_idx" ON "public"."farm_analyses"("userId");

-- CreateIndex
CREATE INDEX "farm_analyses_analysisType_idx" ON "public"."farm_analyses"("analysisType");

-- CreateIndex
CREATE INDEX "farm_analyses_createdAt_idx" ON "public"."farm_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "market_analyses_commodity_idx" ON "public"."market_analyses"("commodity");

-- CreateIndex
CREATE INDEX "market_analyses_region_idx" ON "public"."market_analyses"("region");

-- CreateIndex
CREATE INDEX "market_analyses_analysisType_idx" ON "public"."market_analyses"("analysisType");

-- CreateIndex
CREATE INDEX "market_analyses_userId_idx" ON "public"."market_analyses"("userId");

-- CreateIndex
CREATE INDEX "market_analyses_createdAt_idx" ON "public"."market_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "activity_optimizations_farmId_idx" ON "public"."activity_optimizations"("farmId");

-- CreateIndex
CREATE INDEX "activity_optimizations_userId_idx" ON "public"."activity_optimizations"("userId");

-- CreateIndex
CREATE INDEX "activity_optimizations_activityType_idx" ON "public"."activity_optimizations"("activityType");

-- CreateIndex
CREATE INDEX "activity_optimizations_createdAt_idx" ON "public"."activity_optimizations"("createdAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "public"."subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscription_plans_tier_idx" ON "public"."subscription_plans"("tier");

-- CreateIndex
CREATE INDEX "subscription_plans_isActive_isPublic_idx" ON "public"."subscription_plans"("isActive", "isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "public"."subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "public"."subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paystackCustomerCode_key" ON "public"."subscriptions"("paystackCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paystackSubscriptionCode_key" ON "public"."subscriptions"("paystackSubscriptionCode");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "public"."subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "public"."subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "public"."subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "public"."subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "subscriptions_paystackCustomerCode_idx" ON "public"."subscriptions"("paystackCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "public"."invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paystackInvoiceCode_key" ON "public"."invoices"("paystackInvoiceCode");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "public"."invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "public"."invoices"("dueDate");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripePaymentMethodId_key" ON "public"."payment_methods"("stripePaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_paystackAuthorizationCode_key" ON "public"."payment_methods"("paystackAuthorizationCode");

-- CreateIndex
CREATE INDEX "payment_methods_organizationId_idx" ON "public"."payment_methods"("organizationId");

-- CreateIndex
CREATE INDEX "payment_methods_isDefault_idx" ON "public"."payment_methods"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "public"."payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paystackReference_key" ON "public"."payments"("paystackReference");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "public"."payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "public"."payments"("createdAt");

-- CreateIndex
CREATE INDEX "usage_records_subscriptionId_featureName_idx" ON "public"."usage_records"("subscriptionId", "featureName");

-- CreateIndex
CREATE INDEX "usage_records_recordedAt_idx" ON "public"."usage_records"("recordedAt");

-- CreateIndex
CREATE INDEX "usage_records_periodStart_periodEnd_idx" ON "public"."usage_records"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farms" ADD CONSTRAINT "farms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."areas" ADD CONSTRAINT "areas_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seasons" ADD CONSTRAINT "seasons_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."commodities" ADD CONSTRAINT "commodities_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crop_cycles" ADD CONSTRAINT "crop_cycles_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crop_cycles" ADD CONSTRAINT "crop_cycles_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "public"."commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crop_cycles" ADD CONSTRAINT "crop_cycles_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farm_activities" ADD CONSTRAINT "farm_activities_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farm_activities" ADD CONSTRAINT "farm_activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farm_activities" ADD CONSTRAINT "farm_activities_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "public"."crop_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farm_activities" ADD CONSTRAINT "farm_activities_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_assignments" ADD CONSTRAINT "activity_assignments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."farm_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_assignments" ADD CONSTRAINT "activity_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_assignments" ADD CONSTRAINT "activity_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_costs" ADD CONSTRAINT "activity_costs_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."farm_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_costs" ADD CONSTRAINT "activity_costs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_costs" ADD CONSTRAINT "activity_costs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_progress_logs" ADD CONSTRAINT "activity_progress_logs_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."farm_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_progress_logs" ADD CONSTRAINT "activity_progress_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_notes" ADD CONSTRAINT "activity_notes_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."farm_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_notes" ADD CONSTRAINT "activity_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_templates" ADD CONSTRAINT "activity_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "public"."crop_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "public"."commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "public"."harvests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "public"."commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deliveries" ADD CONSTRAINT "deliveries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deliveries" ADD CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drivers" ADD CONSTRAINT "drivers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_updates" ADD CONSTRAINT "tracking_updates_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_categories" ADD CONSTRAINT "transaction_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."soil_data" ADD CONSTRAINT "soil_data_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensors" ADD CONSTRAINT "sensors_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensor_readings" ADD CONSTRAINT "sensor_readings_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "public"."sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media" ADD CONSTRAINT "media_farmActivityId_fkey" FOREIGN KEY ("farmActivityId") REFERENCES "public"."farm_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media" ADD CONSTRAINT "media_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "public"."observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings" ADD CONSTRAINT "ratings_fromOrgId_fkey" FOREIGN KEY ("fromOrgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings" ADD CONSTRAINT "ratings_toOrgId_fkey" FOREIGN KEY ("toOrgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."intelligence_responses" ADD CONSTRAINT "intelligence_responses_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."intelligence_responses" ADD CONSTRAINT "intelligence_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farm_analyses" ADD CONSTRAINT "farm_analyses_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farm_analyses" ADD CONSTRAINT "farm_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."market_analyses" ADD CONSTRAINT "market_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_optimizations" ADD CONSTRAINT "activity_optimizations_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_optimizations" ADD CONSTRAINT "activity_optimizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketplace_listings" ADD CONSTRAINT "marketplace_listings_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketplace_listings" ADD CONSTRAINT "marketplace_listings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_alerts" ADD CONSTRAINT "price_alerts_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "public"."commodities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."price_alerts" ADD CONSTRAINT "price_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_methods" ADD CONSTRAINT "payment_methods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_records" ADD CONSTRAINT "usage_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
