import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrderDisputeResourceSchema,
  OrderDisputeCollectionSchema,
  CreateOrderDisputeRequestSchema,
  DisputeResponseRequestSchema,
  DisputeResolutionRequestSchema,
} from './orders.schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  CommonErrorResponses,
  CuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Order Disputes & Resolution Contract
// =============================================================================

export const ordersDisputesContract = c.router({
  // =============================================================================
  // Order Disputes & Resolution
  // =============================================================================

  // Create order dispute
  createOrderDispute: {
    method: 'POST',
    path: '/orders/:id/dispute',
    pathParams: CuidPathParam('Order'),
    body: CreateOrderDisputeRequestSchema,
    responses: {
      201: OrderDisputeResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Raise dispute about order',
  },

  // Get order disputes
  getOrderDisputes: {
    method: 'GET',
    path: '/orders/:id/disputes',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: OrderDisputeCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get order disputes',
  },

  // Respond to dispute
  respondToDispute: {
    method: 'POST',
    path: '/orders/:id/disputes/:disputeId/respond',
    pathParams: CuidPathParam('Order').extend({
      disputeId: z.string().uuid('Invalid dispute ID'),
    }),
    body: DisputeResponseRequestSchema,
    responses: {
      201: OrderDisputeResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Respond to dispute',
  },

  // Resolve dispute
  resolveDispute: {
    method: 'POST',
    path: '/orders/:id/disputes/:disputeId/resolve',
    pathParams: CuidPathParam('Order').extend({
      disputeId: z.string().uuid('Invalid dispute ID'),
    }),
    body: DisputeResolutionRequestSchema,
    responses: {
      200: OrderDisputeResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Resolve dispute',
  },
});

export type OrdersDisputesContract = typeof ordersDisputesContract;
