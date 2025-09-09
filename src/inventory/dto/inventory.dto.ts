import { z } from 'zod';
import {
  CreateInventoryRequestSchema,
  UpdateInventoryRequestSchema,
  InventoryAdjustmentRequestSchema,
  InventoryReservationRequestSchema,
  InventoryTransferRequestSchema,
  InventoryQualityTestRequestSchema,
} from '../../../contracts/schemas';

// Extract the data.attributes part from the JSON API schemas
export const CreateInventoryDtoSchema = CreateInventoryRequestSchema.shape.data.shape.attributes;
export const UpdateInventoryDtoSchema = UpdateInventoryRequestSchema.shape.data.shape.attributes;

export type CreateInventoryDto = z.infer<typeof CreateInventoryDtoSchema>;
export type UpdateInventoryDto = z.infer<typeof UpdateInventoryDtoSchema>;
export type InventoryAdjustmentDto = z.infer<typeof InventoryAdjustmentRequestSchema>;
export type InventoryReservationDto = z.infer<typeof InventoryReservationRequestSchema>;
export type InventoryTransferDto = z.infer<typeof InventoryTransferRequestSchema>;
export type InventoryQualityTestDto = z.infer<typeof InventoryQualityTestRequestSchema>;
