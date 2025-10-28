/*
  Warnings:

  - You are about to drop the column `quality` on the `harvests` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `areas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `harvests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."BudgetCategory" AS ENUM ('LAND_PREP', 'PLANTING', 'FERTILIZING', 'IRRIGATION', 'PEST_CONTROL', 'HARVESTING', 'MAINTENANCE', 'INFRASTRUCTURE', 'PROCUREMENT', 'LABOR', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InfrastructureType" AS ENUM ('BOREHOLE', 'IRRIGATION_SYSTEM', 'STORAGE', 'PROCESSING', 'FENCE', 'BUILDING', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InfrastructureStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "public"."MaintenanceSchedule" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "public"."UptimeStatus" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "public"."KPIMetric" AS ENUM ('PEST_DAMAGE', 'DISEASE_DAMAGE', 'IRRIGATION_UPTIME', 'WEED_COVERAGE', 'PLANT_STAND_SUCCESS', 'BUDGET_VARIANCE', 'CASH_POSITION', 'LABOR_AVAILABILITY', 'EQUIPMENT_UPTIME', 'YIELD_ACHIEVEMENT', 'REVENUE_TARGET', 'COST_EFFICIENCY', 'ACTIVITY_COMPLETION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."KPIOperator" AS ENUM ('LESS_THAN', 'LESS_THAN_EQUAL', 'GREATER_THAN', 'GREATER_THAN_EQUAL', 'EQUAL');

-- CreateEnum
CREATE TYPE "public"."KPIStatus" AS ENUM ('ON_TARGET', 'WARNING', 'CRITICAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."KPICategory" AS ENUM ('PRODUCTION', 'FINANCIAL', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "public"."MeasurementSource" AS ENUM ('MANUAL', 'AUTOMATED', 'CALCULATED');

-- AlterTable
ALTER TABLE "public"."areas" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."crop_cycles" ADD COLUMN     "expectedHarvestDate" TIMESTAMP(3),
ADD COLUMN     "generation" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "variety" TEXT,
ADD COLUMN     "yieldUnit" TEXT;

-- AlterTable
ALTER TABLE "public"."harvests" DROP COLUMN "quality",
ADD COLUMN     "activityId" TEXT,
ADD COLUMN     "actualRevenue" DOUBLE PRECISION,
ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "cropType" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'NGN',
ADD COLUMN     "estimatedValue" DOUBLE PRECISION,
ADD COLUMN     "farmId" TEXT,
ADD COLUMN     "inventoryId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "qualityGrade" TEXT,
ADD COLUMN     "qualityMoisture" DOUBLE PRECISION,
ADD COLUMN     "qualityNotes" TEXT,
ADD COLUMN     "storageLocation" TEXT,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "variety" TEXT,
ADD COLUMN     "weather" JSONB;

-- CreateTable
CREATE TABLE "public"."budgets" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "public"."BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_allocations" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" "public"."BudgetCategory" NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."infrastructure" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."InfrastructureType" NOT NULL,
    "description" TEXT,
    "status" "public"."InfrastructureStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedEndDate" TIMESTAMP(3) NOT NULL,
    "actualEndDate" TIMESTAMP(3),
    "estimatedBudget" DOUBLE PRECISION,
    "actualBudget" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'NGN',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "targetUptime" DOUBLE PRECISION,
    "actualUptime" DOUBLE PRECISION,
    "specifications" JSONB,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceSchedule" "public"."MaintenanceSchedule",
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infrastructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."infrastructure_uptime_logs" (
    "id" TEXT NOT NULL,
    "infrastructureId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "public"."UptimeStatus" NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "infrastructure_uptime_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kpis" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" "public"."KPIMetric" NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetOperator" "public"."KPIOperator" NOT NULL,
    "unit" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "status" "public"."KPIStatus" NOT NULL DEFAULT 'UNKNOWN',
    "warningThreshold" DOUBLE PRECISION,
    "criticalThreshold" DOUBLE PRECISION,
    "category" "public"."KPICategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastMeasured" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kpi_measurements" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "source" "public"."MeasurementSource" NOT NULL DEFAULT 'MANUAL',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_farmId_idx" ON "public"."budgets"("farmId");

-- CreateIndex
CREATE INDEX "budgets_status_idx" ON "public"."budgets"("status");

-- CreateIndex
CREATE INDEX "budgets_farmId_status_idx" ON "public"."budgets"("farmId", "status");

-- CreateIndex
CREATE INDEX "budget_allocations_budgetId_idx" ON "public"."budget_allocations"("budgetId");

-- CreateIndex
CREATE INDEX "budget_allocations_category_idx" ON "public"."budget_allocations"("category");

-- CreateIndex
CREATE INDEX "infrastructure_farmId_idx" ON "public"."infrastructure"("farmId");

-- CreateIndex
CREATE INDEX "infrastructure_type_idx" ON "public"."infrastructure"("type");

-- CreateIndex
CREATE INDEX "infrastructure_status_idx" ON "public"."infrastructure"("status");

-- CreateIndex
CREATE INDEX "infrastructure_farmId_type_status_idx" ON "public"."infrastructure"("farmId", "type", "status");

-- CreateIndex
CREATE INDEX "infrastructure_uptime_logs_infrastructureId_idx" ON "public"."infrastructure_uptime_logs"("infrastructureId");

-- CreateIndex
CREATE INDEX "infrastructure_uptime_logs_timestamp_idx" ON "public"."infrastructure_uptime_logs"("timestamp");

-- CreateIndex
CREATE INDEX "kpis_farmId_idx" ON "public"."kpis"("farmId");

-- CreateIndex
CREATE INDEX "kpis_metric_idx" ON "public"."kpis"("metric");

-- CreateIndex
CREATE INDEX "kpis_status_idx" ON "public"."kpis"("status");

-- CreateIndex
CREATE INDEX "kpis_farmId_metric_idx" ON "public"."kpis"("farmId", "metric");

-- CreateIndex
CREATE INDEX "kpis_farmId_status_idx" ON "public"."kpis"("farmId", "status");

-- CreateIndex
CREATE INDEX "kpi_measurements_kpiId_idx" ON "public"."kpi_measurements"("kpiId");

-- CreateIndex
CREATE INDEX "kpi_measurements_measuredAt_idx" ON "public"."kpi_measurements"("measuredAt");

-- CreateIndex
CREATE INDEX "crop_cycles_generation_idx" ON "public"."crop_cycles"("generation");

-- CreateIndex
CREATE INDEX "harvests_farmId_idx" ON "public"."harvests"("farmId");

-- CreateIndex
CREATE INDEX "harvests_areaId_idx" ON "public"."harvests"("areaId");

-- CreateIndex
CREATE INDEX "harvests_harvestDate_idx" ON "public"."harvests"("harvestDate");

-- AddForeignKey
ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budgets" ADD CONSTRAINT "budgets_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_allocations" ADD CONSTRAINT "budget_allocations_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "public"."budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."infrastructure" ADD CONSTRAINT "infrastructure_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."infrastructure_uptime_logs" ADD CONSTRAINT "infrastructure_uptime_logs_infrastructureId_fkey" FOREIGN KEY ("infrastructureId") REFERENCES "public"."infrastructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_measurements" ADD CONSTRAINT "kpi_measurements_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "public"."kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
