import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrderResourceSchema,
  OrderCollectionSchema,
  CreateOrderRequestSchema,
  UpdateOrderRequestSchema,
  OrderItemResourceSchema,
  OrderItemCollectionSchema,
  CreateOrderItemRequestSchema,
  UpdateOrderItemRequestSchema,
  PublishOrderRequestSchema,
  AcceptOrderRequestSchema,
  RejectOrderRequestSchema,
  CounterOfferRequestSchema,
  StartFulfillmentRequestSchema,
  CompleteOrderRequestSchema,
} from './orders.schemas';
import {
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

/**
 * CUID validation schema
 */
const cuidSchema = z.string().regex(/^c[0-9a-z]{24}$/, 'Invalid CUID format');

const c = initContract();

// =============================================================================
// Order CRUD Operations Contract
// =============================================================================

export const ordersCrudContract = c.router({
  // =============================================================================
  // Order CRUD Operations
  // =============================================================================

  // Get all orders
  getOrders: {
    method: 'GET',
    path: '/orders',
    query: AllQueryParams.extend({
      type: z.enum(['BUY', 'SELL']).optional(),
      status: z.string().optional(),
      buyerOrgId: z.string().cuid().optional(),
      supplierOrgId: z.string().cuid().optional(),
      commodityId: z.string().cuid().optional(),
      dateRange: z.string().optional(),
    }),
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
    pathParams: CuidPathParam('Order'),
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
    pathParams: CuidPathParam('Order'),
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
    pathParams: CuidPathParam('Order'),
    body: z.object({}),
    responses: {
      200: z.object({ message: z.string() }),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Cancel order',
  },

  // =============================================================================
  // Order Lifecycle Management
  // =============================================================================

  // Publish order
  publishOrder: {
    method: 'POST',
    path: '/orders/:id/publish',
    pathParams: CuidPathParam('Order'),
    body: PublishOrderRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Publish draft order to marketplace',
  },

  // Accept order
  acceptOrder: {
    method: 'POST',
    path: '/orders/:id/accept',
    pathParams: CuidPathParam('Order'),
    body: AcceptOrderRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Accept order as supplier/buyer',
  },

  // Reject order
  rejectOrder: {
    method: 'POST',
    path: '/orders/:id/reject',
    pathParams: CuidPathParam('Order'),
    body: RejectOrderRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Reject order',
  },

  // Counter offer
  counterOffer: {
    method: 'POST',
    path: '/orders/:id/counter-offer',
    pathParams: CuidPathParam('Order'),
    body: CounterOfferRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Make counter offer',
  },

  // Confirm order
  confirmOrder: {
    method: 'POST',
    path: '/orders/:id/confirm',
    pathParams: CuidPathParam('Order'),
    body: z.object({}),
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Confirm order agreement and move to production',
  },

  // Start fulfillment
  startFulfillment: {
    method: 'POST',
    path: '/orders/:id/start-fulfillment',
    pathParams: CuidPathParam('Order'),
    body: StartFulfillmentRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Begin order fulfillment process',
  },

  // Complete order
  completeOrder: {
    method: 'POST',
    path: '/orders/:id/complete',
    pathParams: CuidPathParam('Order'),
    body: CompleteOrderRequestSchema,
    responses: {
      200: OrderResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Mark order as completed',
  },

  // =============================================================================
  // Order Item Management
  // =============================================================================

  // Get order items
  getOrderItems: {
    method: 'GET',
    path: '/orders/:id/items',
    pathParams: CuidPathParam('Order'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: OrderItemCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get order items with detailed specifications',
  },

  // Add order item
  addOrderItem: {
    method: 'POST',
    path: '/orders/:id/items',
    pathParams: CuidPathParam('Order'),
    body: CreateOrderItemRequestSchema,
    responses: {
      201: OrderItemResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Add item to draft order',
  },

  // Update order item
  updateOrderItem: {
    method: 'PATCH',
    path: '/orders/:id/items/:itemId',
    pathParams: CuidPathParam('Order').extend({
      itemId: cuidSchema,
    }),
    body: UpdateOrderItemRequestSchema,
    responses: {
      200: OrderItemResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update order item details',
  },

  // Delete order item
  deleteOrderItem: {
    method: 'DELETE',
    path: '/orders/:id/items/:itemId',
    pathParams: CuidPathParam('Order').extend({
      itemId: cuidSchema,
    }),
    body: z.object({}),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Remove item from order',
  },
});

export type OrdersCrudContract = typeof ordersCrudContract;
