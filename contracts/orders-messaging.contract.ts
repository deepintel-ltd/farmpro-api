import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrderMessageResourceSchema,
  OrderMessageCollectionSchema,
  CreateOrderMessageRequestSchema,
  OrderDocumentResourceSchema,
  OrderDocumentCollectionSchema,
  CreateOrderDocumentRequestSchema,
  ContractSignatureRequestSchema,
  OrderTimelineEventSchema,
  OrderTrackingInfoSchema,
  OrderStatusUpdateRequestSchema,
} from './orders.schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  CommonErrorResponses,
  CuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Order Messaging & Documents Contract
// =============================================================================

export const ordersMessagingContract = c.router({
  // =============================================================================
  // Order Communication
  // =============================================================================

  // Get order messages
  getOrderMessages: {
    method: 'GET',
    path: '/orders/:id/messages',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams,
    responses: {
      200: OrderMessageCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get order conversation history',
  },

  // Send order message
  sendOrderMessage: {
    method: 'POST',
    path: '/orders/:id/messages',
    pathParams: CuidPathParam('Order'),
    body: CreateOrderMessageRequestSchema,
    responses: {
      201: OrderMessageResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Send message about order',
  },

  // Mark message as read
  markMessageAsRead: {
    method: 'PATCH',
    path: '/orders/:id/messages/:messageId/read',
    pathParams: CuidPathParam('Order').extend({
      messageId: z.string().regex(/^c[0-9a-z]{24}$/, 'Invalid message ID'),
    }),
    body: z.object({}),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Mark message as read',
  },

  // =============================================================================
  // Order Documents & Contracts
  // =============================================================================

  // Get order documents
  getOrderDocuments: {
    method: 'GET',
    path: '/orders/:id/documents',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: OrderDocumentCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get order-related documents',
  },

  // Upload order document
  uploadOrderDocument: {
    method: 'POST',
    path: '/orders/:id/documents',
    pathParams: CuidPathParam('Order'),
    body: CreateOrderDocumentRequestSchema,
    responses: {
      201: OrderDocumentResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Upload document to order',
  },

  // Get order contract
  getOrderContract: {
    method: 'GET',
    path: '/orders/:id/contract',
    pathParams: CuidPathParam('Order'),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('contracts'),
          id: z.string().uuid(),
          attributes: z.object({
            url: z.string().url(),
            terms: z.string(),
            generatedAt: z.string().datetime(),
          }),
        }),
        links: z.object({
          self: z.string().url(),
          download: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get auto-generated contract',
  },

  // Sign order contract
  signOrderContract: {
    method: 'POST',
    path: '/orders/:id/contract/sign',
    pathParams: CuidPathParam('Order'),
    body: ContractSignatureRequestSchema,
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Digitally sign order contract',
  },

  // =============================================================================
  // Order Tracking & Status
  // =============================================================================

  // Get order timeline
  getOrderTimeline: {
    method: 'GET',
    path: '/orders/:id/timeline',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams,
    responses: {
      200: z.object({
        data: z.array(OrderTimelineEventSchema),
        links: z.object({
          self: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get order status timeline',
  },

  // Get order tracking
  getOrderTracking: {
    method: 'GET',
    path: '/orders/:id/tracking',
    pathParams: CuidPathParam('Order'),
    responses: {
      200: z.object({
        data: OrderTrackingInfoSchema,
        links: z.object({
          self: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get order tracking information',
  },

  // Add status update
  addStatusUpdate: {
    method: 'POST',
    path: '/orders/:id/status-updates',
    pathParams: CuidPathParam('Order'),
    body: OrderStatusUpdateRequestSchema,
    responses: {
      201: z.object({
        data: OrderTimelineEventSchema,
      }),
      ...CommonErrorResponses,
    },
    summary: 'Add status update to order timeline',
  },
});

export type OrdersMessagingContract = typeof ordersMessagingContract;
