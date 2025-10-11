import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CuidQueryParam } from './common';
import {
  FarmResourceSchema,
  FarmCollectionSchema,
  CreateFarmRequestSchema,
  UpdateFarmRequestSchema,
  CommodityCollectionSchema,
  JsonApiErrorResponseSchema,
} from './schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  AllQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  CuidPathParam,
} from './common';
import { OrderCollectionSchema } from './orders.schemas';

const c = initContract();

// =============================================================================
// Farm Contracts
// =============================================================================

export const farmContract = c.router({
  // Get all farms
  getFarms: {
    method: 'GET',
    path: '/farms',
    query: AllQueryParams,
    responses: {
      200: FarmCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all farms with optional filtering, sorting, and pagination',
  },

  // Get single farm
  getFarm: {
    method: 'GET',
    path: '/farms/:id',
    pathParams: CuidPathParam('Farm'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: FarmResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single farm by ID',
  },

  // Create farm
  createFarm: {
    method: 'POST',
    path: '/farms',
    body: CreateFarmRequestSchema,
    responses: {
      201: FarmResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new farm',
  },

  // Update farm
  updateFarm: {
    method: 'PATCH',
    path: '/farms/:id',
    pathParams: CuidPathParam('Farm'),
    body: UpdateFarmRequestSchema,
    responses: {
      200: FarmResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing farm',
  },

  // Delete farm
  deleteFarm: {
    method: 'DELETE',
    path: '/farms/:id',
    pathParams: CuidPathParam('Farm'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete a farm',
  },

  // Get farm relationships - commodities
  getFarmCommodities: {
    method: 'GET',
    path: '/farms/:id/commodities',
    pathParams: CuidPathParam('Farm'),
    query: AllQueryParams,
    responses: {
      200: CommodityCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all commodities for a specific farm',
  },

  // Get farm relationships - orders
  getFarmOrders: {
    method: 'GET',
    path: '/farms/:id/orders',
    pathParams: CuidPathParam('Farm'),
    query: AllQueryParams,
    responses: {
      200: OrderCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all orders for a specific farm',
  },

  // Get farm relationship data - commodities
  getFarmCommodityRelationships: {
    method: 'GET',
    path: '/farms/:id/relationships/commodities',
    pathParams: CuidPathParam('Farm'),
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('commodities'),
            id: CuidQueryParam('id'),
          }),
        ),
        links: z
          .object({
            self: z.string().url(),
            related: z.string().url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get farm-commodity relationship identifiers',
  },

  // Get farm relationship data - orders
  getFarmOrderRelationships: {
    method: 'GET',
    path: '/farms/:id/relationships/orders',
    pathParams: CuidPathParam('Farm'),
    query: AllQueryParams,
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('orders'),
            id: CuidQueryParam('id'),
          }),
        ),
        links: z
          .object({
            self: z.string().url(),
            related: z.string().url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get farm-order relationship identifiers',
  },

  // Get farm dashboard stats
  getFarmDashboardStats: {
    method: 'GET',
    path: '/farms/:id/dashboard-stats',
    pathParams: CuidPathParam('Farm'),
    query: z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
      includeTrends: z.boolean().optional().default(true),
    }).merge(CommonQueryParams),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('farm-dashboard-stats'),
          attributes: z.object({
            totalArea: z.object({
              value: z.number(),
              unit: z.string(),
              trend: z.object({
                direction: z.enum(['up', 'down', 'stable']),
                percentage: z.number(),
                label: z.string(),
              }),
            }),
            activeActivities: z.object({
              value: z.number(),
              trend: z.object({
                direction: z.enum(['up', 'down', 'stable']),
                percentage: z.number(),
                label: z.string(),
              }),
            }),
            cropTypes: z.object({
              value: z.number(),
              trend: z.object({
                direction: z.enum(['up', 'down', 'stable']),
                percentage: z.number(),
                label: z.string(),
              }),
            }),
            completionRate: z.object({
              value: z.number(),
              unit: z.string(),
              trend: z.object({
                direction: z.enum(['up', 'down', 'stable']),
                percentage: z.number(),
                label: z.string(),
              }),
            }),
            period: z.string(),
            lastUpdated: z.string(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get farm dashboard statistics including total area, active activities, crop types, and completion rate',
    description: 'Provides key farm metrics for dashboard display with trend analysis',
  },
});

export type FarmContract = typeof farmContract;
