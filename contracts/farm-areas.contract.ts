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
// Farm Areas/Zones Schemas
// =============================================================================

export const AreaAttributesSchema = z.object({
  farmId: CuidQueryParam('farmId'),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  size: z.number().positive(),
  unit: z.enum(['acres', 'hectares', 'sqm']).default('acres'),
  coordinates: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
    })
  ).optional(),
  soilType: z.string().optional(),
  status: z.enum(['ACTIVE', 'FALLOW', 'MAINTENANCE']).default('ACTIVE'),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const AreaResourceSchema = z.object({
  data: z.object({
    type: z.literal('areas'),
    id: CuidQueryParam('id'),
    attributes: AreaAttributesSchema,
    relationships: z.object({
      farm: z.object({
        data: z.object({
          type: z.literal('farms'),
          id: CuidQueryParam('id'),
        }),
      }).optional(),
    }).optional(),
  }),
});

export const AreaCollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('areas'),
      id: CuidQueryParam('id'),
      attributes: AreaAttributesSchema,
    })
  ),
  meta: z.object({
    totalCount: z.number(),
    pageCount: z.number().optional(),
  }).optional(),
});

export const CreateAreaRequestSchema = z.object({
  data: z.object({
    type: z.literal('areas'),
    attributes: z.object({
      farmId: CuidQueryParam('farmId'),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      size: z.number().positive(),
      unit: z.enum(['acres', 'hectares', 'sqm']).default('acres'),
      coordinates: z.array(
        z.object({
          lat: z.number(),
          lng: z.number(),
        })
      ).optional(),
      soilType: z.string().optional(),
      status: z.enum(['ACTIVE', 'FALLOW', 'MAINTENANCE']).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const UpdateAreaRequestSchema = z.object({
  data: z.object({
    type: z.literal('areas'),
    id: CuidQueryParam('id'),
    attributes: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      size: z.number().positive().optional(),
      unit: z.enum(['acres', 'hectares', 'sqm']).optional(),
      coordinates: z.array(
        z.object({
          lat: z.number(),
          lng: z.number(),
        })
      ).optional(),
      soilType: z.string().optional(),
      status: z.enum(['ACTIVE', 'FALLOW', 'MAINTENANCE']).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

// =============================================================================
// Farm Areas Contract
// =============================================================================

export const farmAreasContract = c.router({
  // Get all areas for a farm
  getFarmAreas: {
    method: 'GET',
    path: '/farms/:farmId/areas',
    pathParams: z.object({
      farmId: CuidQueryParam('farmId'),
    }),
    query: CommonQueryParams.extend({
      status: z.enum(['ACTIVE', 'FALLOW', 'MAINTENANCE']).optional(),
    }),
    responses: {
      200: AreaCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all areas/zones for a specific farm',
  },

  // Get single area
  getArea: {
    method: 'GET',
    path: '/areas/:id',
    pathParams: CuidPathParam('Area'),
    query: CommonQueryParams,
    responses: {
      200: AreaResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single farm area by ID',
  },

  // Create area
  createArea: {
    method: 'POST',
    path: '/areas',
    body: CreateAreaRequestSchema,
    responses: {
      201: AreaResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new farm area/zone',
  },

  // Update area
  updateArea: {
    method: 'PATCH',
    path: '/areas/:id',
    pathParams: CuidPathParam('Area'),
    body: UpdateAreaRequestSchema,
    responses: {
      200: AreaResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing farm area',
  },

  // Delete area
  deleteArea: {
    method: 'DELETE',
    path: '/areas/:id',
    pathParams: CuidPathParam('Area'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete a farm area',
  },
});

export type FarmAreasContract = typeof farmAreasContract;
