import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrderResourceSchema,
  OrderCollectionSchema,
  OrderSearchRequestSchema,
} from './orders.schemas';
import {
  CommonQueryParams,
  AllQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  UuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Order Marketplace Operations Contract
// =============================================================================

export const ordersMarketplaceContract = c.router({
  // =============================================================================
  // Order Search & Discovery
  // =============================================================================

  // Get marketplace orders
  getMarketplaceOrders: {
    method: 'GET',
    path: '/orders/marketplace',
    query: AllQueryParams.extend({
      type: z.enum(['BUY', 'SELL']).optional(),
      commodityId: z.string().uuid().optional(),
      location: z.string().optional(),
      priceRange: z.string().optional(),
      deliveryDate: z.string().optional(),
      qualityGrade: z.string().optional(),
      distance: z.number().optional(),
    }),
    responses: {
      200: OrderCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Browse public orders in marketplace',
  },

  // Get marketplace order details
  getMarketplaceOrder: {
    method: 'GET',
    path: '/orders/marketplace/:id',
    pathParams: UuidPathParam('Order'),
    query: CommonQueryParams,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get marketplace order details',
  },

  // Search orders
  searchOrders: {
    method: 'POST',
    path: '/orders/search',
    body: OrderSearchRequestSchema,
    responses: {
      200: OrderCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Advanced order search',
  },

  // Get order recommendations
  getOrderRecommendations: {
    method: 'GET',
    path: '/orders/recommendations',
    query: CommonQueryParams.extend({
      type: z.enum(['BUY', 'SELL']).optional(),
      limit: z.number().int().positive().optional(),
    }),
    responses: {
      200: OrderCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get personalized order recommendations',
  },
});

export type OrdersMarketplaceContract = typeof ordersMarketplaceContract;
