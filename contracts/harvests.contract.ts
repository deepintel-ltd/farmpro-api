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
// Harvests Schemas
// =============================================================================

export const HarvestAttributesSchema = z.object({
  farmId: CuidQueryParam('farmId'),
  areaId: CuidQueryParam('areaId').optional(),
  cropCycleId: CuidQueryParam('cropCycleId').optional(),
  activityId: CuidQueryParam('activityId').optional(),
  cropType: z.string().min(1),
  variety: z.string().optional(),
  harvestDate: z.string().datetime(),
  quantity: z.number().positive(),
  unit: z.string(),
  quality: z.object({
    grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
    moisture: z.number().optional(),
    notes: z.string().optional(),
  }),
  estimatedValue: z.number().nonnegative().optional(),
  actualRevenue: z.number().nonnegative().nullable().optional(),
  currency: z.string().default('NGN'),
  storage: z.object({
    location: z.string(),
    inventoryId: CuidQueryParam('id').optional(),
  }).optional(),
  weather: z.object({
    conditions: z.string().optional(),
    temperature: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const HarvestResourceSchema = z.object({
  data: z.object({
    type: z.literal('harvests'),
    id: CuidQueryParam('id'),
    attributes: HarvestAttributesSchema,
    relationships: z.object({
      farm: z.object({
        data: z.object({
          type: z.literal('farms'),
          id: CuidQueryParam('id'),
        }),
      }).optional(),
      cropCycle: z.object({
        data: z.object({
          type: z.literal('crop-cycles'),
          id: CuidQueryParam('id'),
        }).nullable(),
      }).optional(),
      activity: z.object({
        data: z.object({
          type: z.literal('activities'),
          id: CuidQueryParam('id'),
        }).nullable(),
      }).optional(),
    }).optional(),
  }),
});

export const HarvestCollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('harvests'),
      id: CuidQueryParam('id'),
      attributes: HarvestAttributesSchema,
    })
  ),
  meta: z.object({
    totalCount: z.number(),
    totalQuantity: z.number().optional(),
    totalValue: z.number().optional(),
  }).optional(),
});

export const CreateHarvestRequestSchema = z.object({
  data: z.object({
    type: z.literal('harvests'),
    attributes: z.object({
      farmId: CuidQueryParam('farmId'),
      areaId: CuidQueryParam('areaId').optional(),
      cropCycleId: CuidQueryParam('cropCycleId').optional(),
      activityId: CuidQueryParam('activityId').optional(),
      cropType: z.string().min(1),
      variety: z.string().optional(),
      harvestDate: z.string().datetime(),
      quantity: z.number().positive(),
      unit: z.string(),
      quality: z.object({
        grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
        moisture: z.number().optional(),
        notes: z.string().optional(),
      }),
      estimatedValue: z.number().nonnegative().optional(),
      currency: z.string().default('NGN'),
      storage: z.object({
        location: z.string(),
      }).optional(),
      weather: z.object({
        conditions: z.string().optional(),
        temperature: z.number().optional(),
      }).optional(),
      notes: z.string().optional(),
      createInventory: z.coerce.boolean().optional().default(true),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const UpdateHarvestRequestSchema = z.object({
  data: z.object({
    type: z.literal('harvests'),
    id: CuidQueryParam('id'),
    attributes: z.object({
      quantity: z.number().positive().optional(),
      quality: z.object({
        grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
        moisture: z.number().optional(),
        notes: z.string().optional(),
      }).optional(),
      estimatedValue: z.number().nonnegative().optional(),
      actualRevenue: z.number().nonnegative().nullable().optional(),
      storage: z.object({
        location: z.string(),
        inventoryId: CuidQueryParam('id').optional(),
      }).optional(),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

// =============================================================================
// Harvests Contract
// =============================================================================

export const harvestsContract = c.router({
  // Get all harvests
  getHarvests: {
    method: 'GET',
    path: '/harvests',
    query: CommonQueryParams.extend({
      farmId: CuidQueryParam('farmId').optional(),
      areaId: CuidQueryParam('areaId').optional(),
      cropCycleId: CuidQueryParam('cropCycleId').optional(),
      cropType: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
    }),
    responses: {
      200: HarvestCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all harvests with filtering',
  },

  // Get single harvest
  getHarvest: {
    method: 'GET',
    path: '/harvests/:id',
    pathParams: CuidPathParam('Harvest'),
    query: CommonQueryParams,
    responses: {
      200: HarvestResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single harvest by ID',
  },

  // Create harvest
  createHarvest: {
    method: 'POST',
    path: '/harvests',
    body: CreateHarvestRequestSchema,
    responses: {
      201: HarvestResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new harvest record (optionally creates inventory)',
  },

  // Update harvest
  updateHarvest: {
    method: 'PATCH',
    path: '/harvests/:id',
    pathParams: CuidPathParam('Harvest'),
    body: UpdateHarvestRequestSchema,
    responses: {
      200: HarvestResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing harvest',
  },

  // Delete harvest
  deleteHarvest: {
    method: 'DELETE',
    path: '/harvests/:id',
    pathParams: CuidPathParam('Harvest'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete a harvest',
  },

  // Get revenue analytics
  getRevenueAnalytics: {
    method: 'GET',
    path: '/harvests/revenue-analytics',
    query: z.object({
      farmId: CuidQueryParam('farmId').optional(),
      period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      cropType: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('revenue-analytics'),
          id: z.string(),
          attributes: z.object({
            totalRevenue: z.number(),
            projectedRevenue: z.number(),
            variance: z.number(),
            currency: z.string(),
            byMonth: z.array(
              z.object({
                month: z.string(),
                actualRevenue: z.number(),
                projectedRevenue: z.number(),
                harvests: z.number(),
              })
            ),
            byCrop: z.array(
              z.object({
                cropType: z.string(),
                quantity: z.number(),
                unit: z.string(),
                revenue: z.number(),
                averagePrice: z.number(),
              })
            ),
            byQuality: z.array(
              z.object({
                grade: z.string(),
                quantity: z.number(),
                revenue: z.number(),
                percentage: z.number(),
              })
            ),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get revenue analytics from harvests',
  },

  // Get yield comparison
  getYieldComparison: {
    method: 'GET',
    path: '/harvests/yield-comparison',
    query: z.object({
      farmId: CuidQueryParam('farmId'),
      cropType: z.string(),
      compareWith: z.enum(['expected', 'previous_year', 'area_average']).optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('yield-comparison'),
          id: z.string(),
          attributes: z.object({
            cropType: z.string(),
            currentYield: z.number(),
            comparisonYield: z.number(),
            variance: z.number(),
            variancePercentage: z.number(),
            unit: z.string(),
            performance: z.enum(['above_target', 'on_target', 'below_target']),
            insights: z.array(z.string()),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Compare actual yield against targets or benchmarks',
  },
});

export type HarvestsContract = typeof harvestsContract;
