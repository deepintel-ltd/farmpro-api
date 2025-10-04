import { z } from 'zod';
import {
  JsonApiResourceSchema,
  JsonApiCollectionSchema,
  JsonApiCreateRequestSchema,
  JsonApiUpdateRequestSchema,
} from './schemas';

// =============================================================================
// Order Core Schemas
// =============================================================================

/**
 * CUID validation schema
 */
const cuidSchema = z.string().regex(/^c[0-9a-z]{24}$/, 'Invalid CUID format');

/**
 * Order type enum
 */
export const OrderTypeSchema = z.enum(['BUY', 'SELL']);

/**
 * Order status enum
 */
export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED'
]);

/**
 * Price type enum
 */
export const PriceTypeSchema = z.enum(['fixed', 'negotiable', 'market']);

/**
 * Payment method enum
 */
export const PaymentMethodSchema = z.enum(['cash', 'credit', 'escrow', 'bank_transfer']);

/**
 * Quality grade enum
 */
export const QualityGradeSchema = z.enum(['premium', 'standard', 'utility', 'organic']);

/**
 * Delivery condition enum
 */
export const DeliveryConditionSchema = z.enum(['excellent', 'good', 'acceptable', 'damaged']);

/**
 * Dispute type enum
 */
export const DisputeTypeSchema = z.enum(['quality', 'delivery', 'payment', 'other']);

/**
 * Dispute severity enum
 */
export const DisputeSeveritySchema = z.enum(['low', 'medium', 'high']);

/**
 * Message type enum
 */
export const MessageTypeSchema = z.enum(['inquiry', 'negotiation', 'update', 'issue', 'general']);

/**
 * Document type enum
 */
export const DocumentTypeSchema = z.enum(['contract', 'invoice', 'certificate', 'receipt', 'quality_report', 'other']);

/**
 * Coordinates schema
 */
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.number().min(-180).max(180, 'Invalid longitude')
});

/**
 * Delivery address schema
 */
export const DeliveryAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  coordinates: CoordinatesSchema.optional()
});

/**
 * Quality requirements schema
 */
export const QualityRequirementsSchema = z.object({
  grade: z.string().optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  certifications: z.array(z.string()).optional()
});

/**
 * Order item schema
 */
export const OrderItemSchema = z.object({
  id: cuidSchema.optional(),
  commodityId: cuidSchema,
  inventoryId: cuidSchema.optional(), // For SELL orders
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  qualityRequirements: QualityRequirementsSchema.optional(),
  unitPrice: z.number().positive().optional(),
  priceType: PriceTypeSchema.optional(),
  notes: z.string().optional()
});

/**
 * Order schema with comprehensive validation
 */
export const OrderSchema = z.object({
  id: z.string().cuid().optional(),
  type: OrderTypeSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  status: OrderStatusSchema,
  deliveryDate: z.string().datetime('Invalid delivery date format'),
  deliveryLocation: z.string().optional(),
  deliveryAddress: DeliveryAddressSchema,
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  paymentTerms: z.string().optional(),
  specialInstructions: z.string().optional(),
  terms: z.record(z.string(), z.any()).optional(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
  
  // Relationships
  buyerId: z.string().cuid().optional(),
  sellerId: z.string().cuid().optional(),
  buyerOrgId: z.string().cuid().optional(),
  supplierOrgId: z.string().cuid().optional(),
  currency: z.enum(['USD', 'NGN']).default('NGN'),
  
  // Timestamps
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  acceptedAt: z.string().datetime().optional(),
  confirmedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional()
});

// =============================================================================
// Order Lifecycle Schemas
// =============================================================================

/**
 * Publish order request schema
 */
export const PublishOrderRequestSchema = z.object({
  // No additional fields needed for publish
});

/**
 * Accept order request schema
 */
export const AcceptOrderRequestSchema = z.object({
  message: z.string().optional(),
  proposedChanges: z.object({
    items: z.array(z.object({
      itemId: z.string().cuid(),
      unitPrice: z.number().positive().optional(),
      quantity: z.number().positive().optional(),
      deliveryDate: z.string().datetime().optional()
    })).optional()
  }).optional(),
  requiresNegotiation: z.boolean().default(false)
});

/**
 * Reject order request schema
 */
export const RejectOrderRequestSchema = z.object({
  reason: z.enum(['price', 'quantity', 'timing', 'quality', 'other']),
  message: z.string().min(1, 'Rejection message is required')
});

/**
 * Counter offer request schema
 */
export const CounterOfferRequestSchema = z.object({
  message: z.string().min(1, 'Counter offer message is required'),
  changes: z.object({
    totalAmount: z.number().positive().optional(),
    deliveryDate: z.string().datetime().optional(),
    items: z.array(z.object({
      itemId: z.string().cuid(),
      unitPrice: z.number().positive().optional(),
      quantity: z.number().positive().optional()
    })).optional()
  }),
  expiresAt: z.string().datetime('Invalid expiration date format')
});

/**
 * Start fulfillment request schema
 */
export const StartFulfillmentRequestSchema = z.object({
  estimatedCompletionDate: z.string().datetime('Invalid completion date format'),
  notes: z.string().optional(),
  trackingInfo: z.object({
    batchNumbers: z.array(z.string()).optional(),
    qualityTestResults: z.record(z.string(), z.any()).optional(),
    processingNotes: z.string().optional()
  }).optional()
});

/**
 * Complete order request schema
 */
export const CompleteOrderRequestSchema = z.object({
  deliveryConfirmation: z.object({
    deliveredAt: z.string().datetime('Invalid delivery date format'),
    receivedBy: z.string().min(1, 'Received by is required'),
    condition: DeliveryConditionSchema,
    notes: z.string().optional()
  }),
  qualityAssessment: z.object({
    meetsSpecifications: z.boolean(),
    actualGrade: z.string().optional(),
    issues: z.string().optional()
  })
});

// =============================================================================
// Order Item Management Schemas
// =============================================================================

/**
 * Create order item request schema
 */
export const CreateOrderItemRequestSchema = z.object({
  commodityId: cuidSchema,
  inventoryId: cuidSchema.optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  qualityRequirements: QualityRequirementsSchema.optional(),
  unitPrice: z.number().positive().optional(),
  priceType: PriceTypeSchema.optional()
});

/**
 * Update order item request schema
 */
export const UpdateOrderItemRequestSchema = z.object({
  quantity: z.number().positive().optional(),
  qualityRequirements: QualityRequirementsSchema.optional(),
  unitPrice: z.number().positive().optional(),
  notes: z.string().optional()
});

// =============================================================================
// Order Search & Discovery Schemas
// =============================================================================

/**
 * Order search filters schema
 */
export const OrderSearchFiltersSchema = z.object({
  commodities: z.array(cuidSchema).optional(),
  location: z.object({
    center: CoordinatesSchema,
    radius: z.number().positive('Radius must be positive')
  }).optional(),
  priceRange: z.object({
    min: z.number().min(0, 'Min price must be non-negative'),
    max: z.number().min(0, 'Max price must be non-negative')
  }).optional(),
  quantityRange: z.object({
    min: z.number().min(0, 'Min quantity must be non-negative'),
    max: z.number().min(0, 'Max quantity must be non-negative')
  }).optional(),
  deliveryWindow: z.object({
    start: z.string().datetime('Invalid start date format'),
    end: z.string().datetime('Invalid end date format')
  }).optional(),
  qualityGrades: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  supplierRatings: z.object({
    min: z.number().min(0).max(5, 'Rating must be between 0 and 5')
  }).optional()
});

/**
 * Order search sort schema
 */
export const OrderSearchSortSchema = z.object({
  field: z.enum(['price', 'distance', 'rating', 'deliveryDate']),
  direction: z.enum(['asc', 'desc'])
});

/**
 * Order search request schema
 */
export const OrderSearchRequestSchema = z.object({
  filters: OrderSearchFiltersSchema.optional(),
  sort: OrderSearchSortSchema.optional()
});

// =============================================================================
// Order Communication Schemas
// =============================================================================

/**
 * Order message schema
 */
export const OrderMessageSchema = z.object({
  id: z.string().cuid().optional(),
  orderId: z.string().cuid(),
  content: z.string().min(1, 'Message content is required'),
  type: MessageTypeSchema,
  attachments: z.array(z.string().url()).optional(),
  isUrgent: z.boolean().default(false),
  senderId: z.string().cuid(),
  readAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional()
});

/**
 * Create order message request schema
 */
export const CreateOrderMessageRequestSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  type: MessageTypeSchema,
  attachments: z.array(z.string().url()).optional(),
  isUrgent: z.boolean().default(false)
});

// =============================================================================
// Order Documents & Contracts Schemas
// =============================================================================

/**
 * Order document schema
 */
export const OrderDocumentSchema = z.object({
  id: z.string().cuid().optional(),
  orderId: z.string().cuid(),
  type: DocumentTypeSchema,
  name: z.string().min(1, 'Document name is required'),
  description: z.string().optional(),
  url: z.string().url('Invalid document URL'),
  isRequired: z.boolean().default(false),
  uploadedBy: z.string().cuid(),
  uploadedAt: z.string().datetime().optional()
});

/**
 * Create order document request schema
 */
export const CreateOrderDocumentRequestSchema = z.object({
  type: DocumentTypeSchema,
  name: z.string().min(1, 'Document name is required'),
  description: z.string().optional(),
  isRequired: z.boolean().default(false)
});

/**
 * Contract signature request schema
 */
export const ContractSignatureRequestSchema = z.object({
  signature: z.string().min(1, 'Digital signature is required'),
  signedAt: z.string().datetime('Invalid signature date format'),
  ipAddress: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format')
});

// =============================================================================
// Order Tracking & Status Schemas
// =============================================================================

/**
 * Order timeline event schema
 */
export const OrderTimelineEventSchema = z.object({
  id: z.string().cuid().optional(),
  orderId: z.string().cuid(),
  status: z.string(),
  message: z.string(),
  location: CoordinatesSchema.optional(),
  estimatedCompletion: z.string().datetime().optional(),
  attachments: z.array(z.string().url()).optional(),
  createdAt: z.string().datetime().optional()
});

/**
 * Order status update request schema
 */
export const OrderStatusUpdateRequestSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  message: z.string().min(1, 'Status message is required'),
  location: CoordinatesSchema.optional(),
  estimatedCompletion: z.string().datetime().optional(),
  attachments: z.array(z.string().url()).optional()
});

/**
 * Order tracking info schema
 */
export const OrderTrackingInfoSchema = z.object({
  orderId: z.string().cuid(),
  currentStatus: z.string(),
  location: CoordinatesSchema.optional(),
  estimatedDelivery: z.string().datetime().optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  lastUpdated: z.string().datetime().optional()
});

// =============================================================================
// Order Analytics & Reporting Schemas
// =============================================================================

/**
 * Order analytics query schema
 */
export const OrderAnalyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  type: OrderTypeSchema.optional(),
  status: OrderStatusSchema.optional(),
  commodityId: cuidSchema.optional()
});

/**
 * Order financial summary query schema
 */
export const OrderFinancialSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  type: OrderTypeSchema.optional(),
  status: OrderStatusSchema.optional()
});

/**
 * Order performance metrics query schema
 */
export const OrderPerformanceMetricsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  metric: z.enum(['completion_rate', 'cycle_time', 'satisfaction', 'volume']).optional()
});

/**
 * Order report request schema
 */
export const OrderReportRequestSchema = z.object({
  reportType: z.enum(['financial', 'performance', 'compliance', 'custom']),
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime('Invalid start date format'),
      end: z.string().datetime('Invalid end date format')
    }).optional(),
    status: z.array(z.string()).optional(),
    commodities: z.array(z.string().cuid()).optional(),
    partners: z.array(z.string().cuid()).optional()
  }),
  format: z.enum(['pdf', 'excel', 'csv']),
  includeCharts: z.boolean().default(true)
});

// =============================================================================
// Order Disputes & Resolution Schemas
// =============================================================================

/**
 * Order dispute schema
 */
export const OrderDisputeSchema = z.object({
  id: z.string().cuid().optional(),
  orderId: z.string().cuid(),
  type: DisputeTypeSchema,
  description: z.string().min(1, 'Dispute description is required'),
  evidence: z.array(z.string().url()).optional(),
  requestedResolution: z.enum(['refund', 'replacement', 'discount', 'other']),
  severity: DisputeSeveritySchema,
  status: z.enum(['open', 'in_review', 'resolved', 'closed']).optional(),
  createdBy: z.string().cuid(),
  createdAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional()
});

/**
 * Create order dispute request schema
 */
export const CreateOrderDisputeRequestSchema = z.object({
  type: DisputeTypeSchema,
  description: z.string().min(1, 'Dispute description is required'),
  evidence: z.array(z.string().url()).optional(),
  requestedResolution: z.enum(['refund', 'replacement', 'discount', 'other']),
  severity: DisputeSeveritySchema
});

/**
 * Dispute response request schema
 */
export const DisputeResponseRequestSchema = z.object({
  response: z.string().min(1, 'Response is required'),
  evidence: z.array(z.string().url()).optional(),
  proposedResolution: z.string().optional()
});

/**
 * Dispute resolution request schema
 */
export const DisputeResolutionRequestSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
  compensation: z.number().min(0, 'Compensation must be non-negative').optional(),
  terms: z.record(z.string(), z.any()).optional()
});

// =============================================================================
// JSON API Resource Schemas
// =============================================================================

export const OrderResourceSchema = JsonApiResourceSchema(OrderSchema);
export const OrderCollectionSchema = JsonApiCollectionSchema(OrderSchema);

export const OrderItemResourceSchema = JsonApiResourceSchema(OrderItemSchema);
export const OrderItemCollectionSchema = JsonApiCollectionSchema(OrderItemSchema);

export const OrderMessageResourceSchema = JsonApiResourceSchema(OrderMessageSchema);
export const OrderMessageCollectionSchema = JsonApiCollectionSchema(OrderMessageSchema);

export const OrderDocumentResourceSchema = JsonApiResourceSchema(OrderDocumentSchema);
export const OrderDocumentCollectionSchema = JsonApiCollectionSchema(OrderDocumentSchema);

export const OrderDisputeResourceSchema = JsonApiResourceSchema(OrderDisputeSchema);
export const OrderDisputeCollectionSchema = JsonApiCollectionSchema(OrderDisputeSchema);

// =============================================================================
// Request/Response Schemas
// =============================================================================

export const CreateOrderRequestSchema = JsonApiCreateRequestSchema(OrderSchema);
export const UpdateOrderRequestSchema = JsonApiUpdateRequestSchema(OrderSchema);


// =============================================================================
// Type Exports
// =============================================================================

export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PriceType = z.infer<typeof PriceTypeSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type QualityGrade = z.infer<typeof QualityGradeSchema>;
export type DeliveryCondition = z.infer<typeof DeliveryConditionSchema>;
export type DisputeType = z.infer<typeof DisputeTypeSchema>;
export type DisputeSeverity = z.infer<typeof DisputeSeveritySchema>;
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type DeliveryAddress = z.infer<typeof DeliveryAddressSchema>;
export type QualityRequirements = z.infer<typeof QualityRequirementsSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;

export type OrderResource = z.infer<typeof OrderResourceSchema>;
export type OrderCollection = z.infer<typeof OrderCollectionSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;

export type OrderMessage = z.infer<typeof OrderMessageSchema>;
export type OrderDocument = z.infer<typeof OrderDocumentSchema>;
export type OrderDispute = z.infer<typeof OrderDisputeSchema>;
export type OrderTimelineEvent = z.infer<typeof OrderTimelineEventSchema>;
export type OrderTrackingInfo = z.infer<typeof OrderTrackingInfoSchema>;
