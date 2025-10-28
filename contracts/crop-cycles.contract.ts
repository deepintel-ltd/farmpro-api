import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CommonQueryParams,
  CommonErrorResponses,
  CuidPathParam,
  CuidQueryParam,
} from './common';

const c = initContract();

// =============================================================================
// Crop Cycles Schemas
// =============================================================================

export const CropCycleAttributesSchema = z.object({
  farmId: CuidQueryParam('farmId'),
  areaId: CuidQueryParam('areaId').optional(),
  cropType: z.string().min(1),
  variety: z.string().optional(),
  generation: z.string().regex(/^C\d+$/).optional(), // C1, C2, C3, etc.
  plantingDate: z.string().datetime(),
  expectedHarvestDate: z.string().datetime(),
  actualHarvestDate: z.string().datetime().nullable().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'HARVESTED', 'FAILED']).default('PLANNED'),
  plantedArea: z.number().positive().optional(),
  plantedAreaUnit: z.enum(['acres', 'hectares', 'sqm']).optional(),
  expectedYield: z.number().positive().optional(),
  actualYield: z.number().positive().nullable().optional(),
  yieldUnit: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CropCycleResourceSchema = z.object({
  data: z.object({
    type: z.literal('crop-cycles'),
    id: CuidQueryParam('id'),
    attributes: CropCycleAttributesSchema,
    relationships: z.object({
      farm: z.object({
        data: z.object({
          type: z.literal('farms'),
          id: CuidQueryParam('id'),
        }),
      }).optional(),
      area: z.object({
        data: z.object({
          type: z.literal('areas'),
          id: CuidQueryParam('id'),
        }).nullable(),
      }).optional(),
      activities: z.object({
        data: z.array(
          z.object({
            type: z.literal('activities'),
            id: CuidQueryParam('id'),
          })
        ),
      }).optional(),
    }).optional(),
  }),
});

export const CropCycleCollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('crop-cycles'),
      id: CuidQueryParam('id'),
      attributes: CropCycleAttributesSchema,
    })
  ),
  meta: z.object({
    totalCount: z.number(),
    pageCount: z.number().optional(),
  }).optional(),
});

export const CreateCropCycleRequestSchema = z.object({
  data: z.object({
    type: z.literal('crop-cycles'),
    attributes: z.object({
      farmId: CuidQueryParam('farmId'),
      areaId: CuidQueryParam('areaId').optional(),
      cropType: z.string().min(1),
      variety: z.string().optional(),
      generation: z.string().regex(/^C\d+$/).optional(),
      plantingDate: z.string().datetime(),
      expectedHarvestDate: z.string().datetime(),
      plantedArea: z.number().positive().optional(),
      plantedAreaUnit: z.enum(['acres', 'hectares', 'sqm']).optional(),
      expectedYield: z.number().positive().optional(),
      yieldUnit: z.string().optional(),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const UpdateCropCycleRequestSchema = z.object({
  data: z.object({
    type: z.literal('crop-cycles'),
    id: CuidQueryParam('id'),
    attributes: z.object({
      cropType: z.string().min(1).optional(),
      variety: z.string().optional(),
      generation: z.string().regex(/^C\d+$/).optional(),
      plantingDate: z.string().datetime().optional(),
      expectedHarvestDate: z.string().datetime().optional(),
      actualHarvestDate: z.string().datetime().nullable().optional(),
      status: z.enum(['PLANNED', 'ACTIVE', 'HARVESTED', 'FAILED']).optional(),
      plantedArea: z.number().positive().optional(),
      expectedYield: z.number().positive().optional(),
      actualYield: z.number().positive().nullable().optional(),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

// =============================================================================
// Crop Cycles Contract
// =============================================================================

export const cropCyclesContract = c.router({
  // Get all crop cycles
  getCropCycles: {
    method: 'GET',
    path: '/crop-cycles',
    query: CommonQueryParams.extend({
      farmId: CuidQueryParam('farmId').optional(),
      areaId: CuidQueryParam('areaId').optional(),
      cropType: z.string().optional(),
      generation: z.string().optional(),
      status: z.enum(['PLANNED', 'ACTIVE', 'HARVESTED', 'FAILED']).optional(),
      activeOnly: z.coerce.boolean().optional(),
    }),
    responses: {
      200: CropCycleCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all crop cycles with filtering',
  },

  // Get single crop cycle
  getCropCycle: {
    method: 'GET',
    path: '/crop-cycles/:id',
    pathParams: CuidPathParam('CropCycle'),
    query: CommonQueryParams,
    responses: {
      200: CropCycleResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single crop cycle by ID',
  },

  // Create crop cycle
  createCropCycle: {
    method: 'POST',
    path: '/crop-cycles',
    body: CreateCropCycleRequestSchema,
    responses: {
      201: CropCycleResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new crop cycle',
  },

  // Update crop cycle
  updateCropCycle: {
    method: 'PATCH',
    path: '/crop-cycles/:id',
    pathParams: CuidPathParam('CropCycle'),
    body: UpdateCropCycleRequestSchema,
    responses: {
      200: CropCycleResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing crop cycle',
  },

  // Delete crop cycle
  deleteCropCycle: {
    method: 'DELETE',
    path: '/crop-cycles/:id',
    pathParams: CuidPathParam('CropCycle'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete a crop cycle',
  },

  // Get crop rotation recommendations
  getRotationRecommendations: {
    method: 'GET',
    path: '/crop-cycles/rotation-recommendations',
    query: z.object({
      farmId: CuidQueryParam('farmId'),
      areaId: CuidQueryParam('areaId').optional(),
      previousCrop: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('rotation-recommendations'),
          id: z.string(),
          attributes: z.object({
            recommendations: z.array(
              z.object({
                cropType: z.string(),
                reason: z.string(),
                benefits: z.array(z.string()),
                considerations: z.array(z.string()).optional(),
              })
            ),
            lastCropCycle: z.object({
              cropType: z.string(),
              harvestDate: z.string().datetime().nullable(),
            }).nullable(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get crop rotation recommendations based on farm history',
  },
});

export type CropCyclesContract = typeof cropCyclesContract;
