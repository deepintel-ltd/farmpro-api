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
  OrderMessageResourceSchema,
  OrderMessageCollectionSchema,
  CreateOrderMessageRequestSchema,
  OrderDocumentResourceSchema,
  OrderDocumentCollectionSchema,
  CreateOrderDocumentRequestSchema,
  OrderDisputeResourceSchema,
  OrderDisputeCollectionSchema,
  CreateOrderDisputeRequestSchema,
  DisputeResponseRequestSchema,
  DisputeResolutionRequestSchema,
  PublishOrderRequestSchema,
  AcceptOrderRequestSchema,
  RejectOrderRequestSchema,
  CounterOfferRequestSchema,
  StartFulfillmentRequestSchema,
  CompleteOrderRequestSchema,
  OrderSearchRequestSchema,
  OrderAnalyticsQuerySchema,
  OrderFinancialSummaryQuerySchema,
  OrderPerformanceMetricsQuerySchema,
  OrderReportRequestSchema,
  OrderStatusUpdateRequestSchema,
  ContractSignatureRequestSchema,
  OrderTimelineEventSchema,
  OrderTrackingInfoSchema,
} from './orders.schemas';
import {
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

export const orderContract: any = c.router({
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
      buyerOrgId: z.string().uuid().optional(),
      supplierOrgId: z.string().uuid().optional(),
      commodityId: z.string().uuid().optional(),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
    body: c.noBody(),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order').extend({
      itemId: z.string().uuid('Invalid item ID'),
    }),
    body: UpdateOrderItemRequestSchema,
    responses: {
      200: OrderItemResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update order item',
  },

  // Delete order item
  deleteOrderItem: {
    method: 'DELETE',
    path: '/orders/:id/items/:itemId',
    pathParams: UuidPathParam('Order').extend({
      itemId: z.string().uuid('Invalid item ID'),
    }),
    body: c.noBody(),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Remove item from order',
  },

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
    query: CommonQueryParams.merge(ResourceFieldsParams),
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

  // =============================================================================
  // Order Communication
  // =============================================================================

  // Get order messages
  getOrderMessages: {
    method: 'GET',
    path: '/orders/:id/messages',
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order').extend({
      messageId: z.string().uuid('Invalid message ID'),
    }),
    body: c.noBody(),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    path: '/orders/:id/status-update',
    pathParams: UuidPathParam('Order'),
    body: OrderStatusUpdateRequestSchema,
    responses: {
      201: OrderTimelineEventSchema,
      ...CommonErrorResponses,
    },
    summary: 'Add status update to order',
  },

  // =============================================================================
  // Order Analytics & Reporting
  // =============================================================================

  // Get order analytics
  getOrderAnalytics: {
    method: 'GET',
    path: '/orders/analytics',
    query: OrderAnalyticsQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('analytics'),
          id: z.string(),
          attributes: z.object({
            volume: z.number(),
            successRate: z.number(),
            averageValue: z.number(),
            topCommodities: z.array(z.object({
              commodityId: z.string().uuid(),
              name: z.string(),
              count: z.number(),
            })),
            period: z.string(),
          }),
        }),
        links: z.object({
          self: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get order analytics dashboard',
  },

  // Get financial summary
  getOrderFinancialSummary: {
    method: 'GET',
    path: '/orders/financial-summary',
    query: OrderFinancialSummaryQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('financial-summary'),
          id: z.string(),
          attributes: z.object({
            totalRevenue: z.number(),
            totalCosts: z.number(),
            netMargin: z.number(),
            averageOrderValue: z.number(),
            period: z.string(),
          }),
        }),
        links: z.object({
          self: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get financial summary of orders',
  },

  // Get performance metrics
  getOrderPerformanceMetrics: {
    method: 'GET',
    path: '/orders/performance-metrics',
    query: OrderPerformanceMetricsQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('performance-metrics'),
          id: z.string(),
          attributes: z.object({
            completionRate: z.number(),
            averageCycleTime: z.number(),
            customerSatisfaction: z.number(),
            onTimeDeliveryRate: z.number(),
            period: z.string(),
          }),
        }),
        links: z.object({
          self: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get order performance KPIs',
  },

  // Generate order report
  generateOrderReport: {
    method: 'POST',
    path: '/orders/reports',
    body: OrderReportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          type: z.literal('report-jobs'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.enum(['pending', 'processing', 'completed', 'failed']),
            estimatedCompletion: z.string().datetime().optional(),
            downloadUrl: z.string().url().optional(),
          }),
        }),
        links: z.object({
          self: z.string().url(),
          status: z.string().url(),
        }).optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Generate custom order report',
  },

  // =============================================================================
  // Order Disputes & Resolution
  // =============================================================================

  // Create order dispute
  createOrderDispute: {
    method: 'POST',
    path: '/orders/:id/dispute',
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order'),
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
    pathParams: UuidPathParam('Order').extend({
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
    pathParams: UuidPathParam('Order').extend({
      disputeId: z.string().uuid('Invalid dispute ID'),
    }),
    body: DisputeResolutionRequestSchema,
    responses: {
      200: OrderDisputeResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Resolve dispute',
  },

  // =============================================================================
  // Order Relationships
  // =============================================================================

  // Get order buyer
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

  // Get order seller
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

  // Get order buyer relationship
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

  // Get order seller relationship
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
