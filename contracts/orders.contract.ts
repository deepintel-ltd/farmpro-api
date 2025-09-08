import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrderResourceSchema,
  OrderCollectionSchema,
  CreateOrderRequestSchema,
  UpdateOrderRequestSchema,
  UserResourceSchema,
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

const c = initContract();

// =============================================================================
// Order Contracts
// =============================================================================

export const orderContract = c.router({
  // Get all orders
  getOrders: {
    method: 'GET',
    path: '/orders',
    query: AllQueryParams,
    responses: {
      200: OrderCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all orders with optional filtering, sorting, and pagination',
  },

  // Get single order
  getOrder: {
    method: 'GET',
    path: '/orders/:id',
    pathParams: UuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single order by ID',
  },

  // Create order
  createOrder: {
    method: 'POST',
    path: '/orders',
    body: CreateOrderRequestSchema,
    responses: {
      201: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new order',
  },

  // Update order
  updateOrder: {
    method: 'PATCH',
    path: '/orders/:id',
    pathParams: UuidPathParam('Order'),
    body: UpdateOrderRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing order',
  },

  // Delete order
  deleteOrder: {
    method: 'DELETE',
    path: '/orders/:id',
    pathParams: UuidPathParam('Order'),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete an order',
  },

  // Get order buyer (user)
  getOrderBuyer: {
    method: 'GET',
    path: '/orders/:id/buyer',
    pathParams: UuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get the buyer (user) for a specific order',
  },

  // Get order seller (user)
  getOrderSeller: {
    method: 'GET',
    path: '/orders/:id/seller',
    pathParams: UuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get the seller (user) for a specific order',
  },

  // Get order relationship data - buyer
  getOrderBuyerRelationship: {
    method: 'GET',
    path: '/orders/:id/relationships/buyer',
    pathParams: UuidPathParam('Order'),
    responses: {
      200: z.object({
        data: z
          .object({
            type: z.literal('users'),
            id: z.string().uuid(),
          })
          .nullable(),
        links: z
          .object({
            self: z.string().url(),
            related: z.string().url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get order-buyer relationship identifier',
  },

  // Get order relationship data - seller
  getOrderSellerRelationship: {
    method: 'GET',
    path: '/orders/:id/relationships/seller',
    pathParams: UuidPathParam('Order'),
    responses: {
      200: z.object({
        data: z
          .object({
            type: z.literal('users'),
            id: z.string().uuid(),
          })
          .nullable(),
        links: z
          .object({
            self: z.string().url(),
            related: z.string().url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get order-seller relationship identifier',
  },
});

export type OrderContract = typeof orderContract;
