import { initContract } from '@ts-rest/core';
import { z } from 'zod';
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
  UuidPathParam,
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
    path: '/api/farms',
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
    path: '/api/farms/:id',
    pathParams: UuidPathParam('Farm'),
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
    path: '/api/farms',
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
    path: '/api/farms/:id',
    pathParams: UuidPathParam('Farm'),
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
    path: '/api/farms/:id',
    pathParams: UuidPathParam('Farm'),
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
    path: '/api/farms/:id/commodities',
    pathParams: UuidPathParam('Farm'),
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
    path: '/api/farms/:id/orders',
    pathParams: UuidPathParam('Farm'),
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
    path: '/api/farms/:id/relationships/commodities',
    pathParams: UuidPathParam('Farm'),
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('commodities'),
            id: z.string().uuid(),
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
    path: '/api/farms/:id/relationships/orders',
    pathParams: UuidPathParam('Farm'),
    query: AllQueryParams,
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('orders'),
            id: z.string().uuid(),
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
});

export type FarmContract = typeof farmContract;
