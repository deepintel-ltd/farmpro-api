import { z } from 'zod';
import {
  CreateInventoryRequestSchema,
  UpdateInventoryRequestSchema,
  InventoryAdjustmentRequestSchema,
  InventoryReservationRequestSchema,
  InventoryTransferRequestSchema,
  InventoryQualityTestRequestSchema,
  InventorySchema,
} from '../../../contracts/schemas';

// Extract the data.attributes part from the JSON API schemas
export const CreateInventoryDtoSchema = CreateInventoryRequestSchema.shape.data.shape.attributes;
export const UpdateInventoryDtoSchema = UpdateInventoryRequestSchema.shape.data.shape.attributes;

// Additional DTOs for new endpoints
export const BatchMergeDtoSchema = z.object({
  sourceBatches: z.array(z.string()),
  newBatchNumber: z.string(),
  reason: z.string(),
});

export const BatchSplitDtoSchema = z.object({
  splits: z.array(z.object({
    quantity: z.number().positive(),
    newBatchNumber: z.string(),
    location: z.object({
      facility: z.string(),
      section: z.string().optional(),
    }),
    notes: z.string().optional(),
  })),
});

export const FacilityConditionsDtoSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
  issues: z.string().optional(),
  recordedBy: z.string(),
  recordedAt: z.string().datetime(),
});

export const CostBasisUpdateDtoSchema = z.object({
  newCostBasis: z.number().positive(),
  reason: z.enum(['market_adjustment', 'revaluation', 'error_correction']),
  notes: z.string(),
  effectiveDate: z.string().datetime(),
});

export const ReplenishmentPlanDtoSchema = z.object({
  commodityId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional(),
  timeHorizon: z.enum(['30', '60', '90', '180']),
  considerSeasonality: z.boolean().optional(),
  includeGrowthPlanning: z.boolean().optional(),
});

export const AlertConfigurationDtoSchema = z.object({
  lowStockThreshold: z.number().positive(),
  expiryWarningDays: z.number().positive(),
  qualityCheckReminder: z.number().positive(),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    dashboard: z.boolean(),
  }),
  recipients: z.array(z.string()),
});

export const ReportGenerationDtoSchema = z.object({
  reportType: z.enum(['stock_levels', 'movements', 'valuation', 'waste', 'custom']),
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    commodities: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
  }),
  format: z.enum(['pdf', 'excel', 'csv']),
  includeCharts: z.boolean().optional(),
});

export type CreateInventoryDto = z.infer<typeof InventorySchema>;
export type UpdateInventoryDto = z.infer<typeof UpdateInventoryDtoSchema>;
export type InventoryAdjustmentDto = z.infer<typeof InventoryAdjustmentRequestSchema>;
export type InventoryReservationDto = z.infer<typeof InventoryReservationRequestSchema>;
export type InventoryTransferDto = z.infer<typeof InventoryTransferRequestSchema>;
export type InventoryQualityTestDto = z.infer<typeof InventoryQualityTestRequestSchema>;
export type BatchMergeDto = z.infer<typeof BatchMergeDtoSchema>;
export type BatchSplitDto = z.infer<typeof BatchSplitDtoSchema>;
export type FacilityConditionsDto = z.infer<typeof FacilityConditionsDtoSchema>;
export type CostBasisUpdateDto = z.infer<typeof CostBasisUpdateDtoSchema>;
export type ReplenishmentPlanDto = z.infer<typeof ReplenishmentPlanDtoSchema>;
export type AlertConfigurationDto = z.infer<typeof AlertConfigurationDtoSchema>;
export type ReportGenerationDto = z.infer<typeof ReportGenerationDtoSchema>;
