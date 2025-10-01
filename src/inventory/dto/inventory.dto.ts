import { z } from 'zod';
import {
  CreateInventoryRequestSchema,
  UpdateInventoryRequestSchema,
  InventoryTransferRequestSchema,
  InventoryQualityTestRequestSchema,
  InventorySchema,
} from '../../../contracts/schemas';

// Extract the data.attributes part from the JSON API schemas
export const CreateInventoryDtoSchema = CreateInventoryRequestSchema.shape.data.shape.attributes;
export const UpdateInventoryDtoSchema = UpdateInventoryRequestSchema.shape.data.shape.attributes;

export type CreateInventoryDto = z.infer<typeof InventorySchema>;
export type UpdateInventoryDto = z.infer<typeof UpdateInventoryDtoSchema>;
export type InventoryTransferDto = z.infer<typeof InventoryTransferRequestSchema>;
export type InventoryQualityTestDto = z.infer<typeof InventoryQualityTestRequestSchema>;
