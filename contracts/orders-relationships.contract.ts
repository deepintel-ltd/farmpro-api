import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UserResourceSchema,
} from './schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  CommonErrorResponses,
  CuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Order Relationships Contract
// =============================================================================

export const ordersRelationshipsContract = c.router({
  // =============================================================================
  // Order Relationships
  // =============================================================================

  // Get order buyer
  getOrderBuyer: {
    method: 'GET',
    path: '/orders/:id/buyer',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get the buyer (user) for a specific order',
  },

  // Get order seller
  getOrderSeller: {
    method: 'GET',
    path: '/orders/:id/seller',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get the seller (user) for a specific order',
  },

  // Get order buyer relationship
  getOrderBuyerRelationship: {
    method: 'GET',
    path: '/orders/:id/relationships/buyer',
    pathParams: CuidPathParam('Order'),
    responses: {
      200: z.object({
        data: z
          .object({
            type: z.literal('users'),
            id: z.string().cuid(),
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

  // Get order seller relationship
  getOrderSellerRelationship: {
    method: 'GET',
    path: '/orders/:id/relationships/seller',
    pathParams: CuidPathParam('Order'),
    responses: {
      200: z.object({
        data: z
          .object({
            type: z.literal('users'),
            id: z.string().cuid(),
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

export type OrdersRelationshipsContract = typeof ordersRelationshipsContract;
