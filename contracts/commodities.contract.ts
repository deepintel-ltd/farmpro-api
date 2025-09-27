import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CommodityResourceSchema,
  CommodityCollectionSchema,
  CreateCommodityRequestSchema,
  UpdateCommodityRequestSchema,
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
// Commodity Contracts
// =============================================================================

export const commodityContract = c.router({
  // Get all commodities
  getCommodities: {
    method: 'GET',
    path: '/commodities',
    query: AllQueryParams,
    responses: {
      200: CommodityCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary:
      'Get all commodities with optional filtering, sorting, and pagination',
  },

  // Get single commodity
  getCommodity: {
    method: 'GET',
    path: '/commodities/:id',
    pathParams: UuidPathParam('Commodity'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: CommodityResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single commodity by ID',
  },

  // Create commodity
  createCommodity: {
    method: 'POST',
    path: '/commodities',
    body: CreateCommodityRequestSchema,
    responses: {
      201: CommodityResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new commodity',
  },

  // Update commodity
  updateCommodity: {
    method: 'PATCH',
    path: '/commodities/:id',
    pathParams: UuidPathParam('Commodity'),
    body: UpdateCommodityRequestSchema,
    responses: {
      200: CommodityResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing commodity',
  },

  // Delete commodity
  deleteCommodity: {
    method: 'DELETE',
    path: '/commodities/:id',
    pathParams: UuidPathParam('Commodity'),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete a commodity',
  },

  // Get commodity orders
  getCommodityOrders: {
    method: 'GET',
    path: '/commodities/:id/orders',
    pathParams: UuidPathParam('Commodity'),
    query: AllQueryParams,
    responses: {
      200: OrderCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all orders for a specific commodity',
  },

  // Get commodity relationship data - orders
  getCommodityOrderRelationships: {
    method: 'GET',
    path: '/commodities/:id/relationships/orders',
    pathParams: UuidPathParam('Commodity'),
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('orders'),
            id: z.uuid(),
          }),
        ),
        links: z
          .object({
            self: z.url(),
            related: z.url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get commodity-order relationship identifiers',
  },
});

export type CommodityContract = typeof commodityContract;
