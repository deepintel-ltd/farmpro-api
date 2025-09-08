import { z } from 'zod';

// =============================================================================
// Core Resource Schemas
// =============================================================================

/**
 * Farm resource schema with comprehensive validation rules
 */
export const FarmSchema = z.object({
  name: z.string().min(1, 'Farm name is required').max(255, 'Farm name too long'),
  location: z.object({
    latitude: z.number().min(-90).max(90, 'Invalid latitude'),
    longitude: z.number().min(-180).max(180, 'Invalid longitude'),
    address: z.string().min(1, 'Address is required')
  }),
  size: z.number().positive('Farm size must be positive'),
  cropTypes: z.array(z.string().min(1)).min(1, 'At least one crop type required'),
  establishedDate: z.string().datetime('Invalid date format'),
  certifications: z.array(z.string()).optional()
});

/**
 * Commodity resource schema with category and quality validation
 */
export const CommoditySchema = z.object({
  name: z.string().min(1, 'Commodity name is required').max(255, 'Commodity name too long'),
  category: z.enum(['grain', 'vegetable', 'fruit', 'livestock'], {
    errorMap: () => ({ message: 'Invalid commodity category' })
  }),
  variety: z.string().optional(),
  qualityGrade: z.enum(['premium', 'standard', 'utility'], {
    errorMap: () => ({ message: 'Invalid quality grade' })
  }),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.enum(['bushel', 'pound', 'ton', 'head'], {
    errorMap: () => ({ message: 'Invalid unit type' })
  }),
  harvestDate: z.string().datetime('Invalid harvest date format'),
  storageLocation: z.string().min(1, 'Storage location is required')
});

/**
 * Order resource schema with business logic validation
 */
export const OrderSchema = z.object({
  orderType: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Order type must be buy or sell' })
  }),
  commodityId: z.string().uuid('Invalid commodity ID format'),
  quantity: z.number().positive('Order quantity must be positive'),
  pricePerUnit: z.number().positive('Price per unit must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
  deliveryDate: z.string().datetime('Invalid delivery date format'),
  deliveryLocation: z.string().min(1, 'Delivery location is required'),
  status: z.enum(['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' })
  }),
  terms: z.object({
    paymentMethod: z.enum(['cash', 'credit', 'escrow'], {
      errorMap: () => ({ message: 'Invalid payment method' })
    }),
    deliveryTerms: z.string().min(1, 'Delivery terms are required'),
    qualityRequirements: z.string().optional()
  })
});

/**
 * User resource schema with role-based validation
 */
export const UserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  role: z.enum(['farmer', 'buyer', 'admin'], {
    errorMap: () => ({ message: 'Invalid user role' })
  }),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: z.string().min(2, 'Country is required').max(2, 'Country must be 2 characters')
  }).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

// =============================================================================
// JSON API Resource Wrapper Schemas
// =============================================================================

/**
 * JSON API relationship schema
 */
export const JsonApiRelationshipSchema = z.object({
  data: z.union([
    z.object({
      type: z.string(),
      id: z.string()
    }),
    z.array(z.object({
      type: z.string(),
      id: z.string()
    }))
  ]).optional(),
  links: z.object({
    self: z.string().url().optional(),
    related: z.string().url().optional()
  }).optional(),
  meta: z.record(z.any()).optional()
});

/**
 * JSON API links schema
 */
export const JsonApiLinksSchema = z.object({
  self: z.string().url().optional(),
  first: z.string().url().optional(),
  last: z.string().url().optional(),
  prev: z.string().url().optional(),
  next: z.string().url().optional(),
  related: z.string().url().optional()
});

/**
 * JSON API meta schema for pagination and additional information
 */
export const JsonApiMetaSchema = z.object({
  totalCount: z.number().optional(),
  pageCount: z.number().optional(),
  currentPage: z.number().optional(),
  perPage: z.number().optional()
}).catchall(z.any()); // Allow additional meta fields

/**
 * Generic JSON API resource schema
 */
export const JsonApiResourceSchema = <T extends z.ZodType>(attributesSchema: T) =>
  z.object({
    data: z.object({
      id: z.string(),
      type: z.string(),
      attributes: attributesSchema,
      relationships: z.record(JsonApiRelationshipSchema).optional()
    }),
    included: z.array(z.object({
      id: z.string(),
      type: z.string(),
      attributes: z.record(z.any()),
      relationships: z.record(JsonApiRelationshipSchema).optional()
    })).optional(),
    meta: JsonApiMetaSchema.optional(),
    links: JsonApiLinksSchema.optional()
  });

/**
 * JSON API collection response schema
 */
export const JsonApiCollectionSchema = <T extends z.ZodType>(attributesSchema: T) =>
  z.object({
    data: z.array(z.object({
      id: z.string(),
      type: z.string(),
      attributes: attributesSchema,
      relationships: z.record(JsonApiRelationshipSchema).optional()
    })),
    included: z.array(z.object({
      id: z.string(),
      type: z.string(),
      attributes: z.record(z.any()),
      relationships: z.record(JsonApiRelationshipSchema).optional()
    })).optional(),
    meta: JsonApiMetaSchema.optional(),
    links: JsonApiLinksSchema.optional()
  });

// =============================================================================
// Specific Resource Response Schemas
// =============================================================================

export const FarmResourceSchema = JsonApiResourceSchema(FarmSchema);
export const FarmCollectionSchema = JsonApiCollectionSchema(FarmSchema);

export const CommodityResourceSchema = JsonApiResourceSchema(CommoditySchema);
export const CommodityCollectionSchema = JsonApiCollectionSchema(CommoditySchema);

export const OrderResourceSchema = JsonApiResourceSchema(OrderSchema);
export const OrderCollectionSchema = JsonApiCollectionSchema(OrderSchema);

export const UserResourceSchema = JsonApiResourceSchema(UserSchema);
export const UserCollectionSchema = JsonApiCollectionSchema(UserSchema);

// =============================================================================
// Error Response Schemas
// =============================================================================

/**
 * JSON API error object schema following specification
 */
export const JsonApiErrorSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.string().regex(/^\d{3}$/, 'Status must be a 3-digit HTTP status code'),
  code: z.string().optional(),
  title: z.string().min(1, 'Error title is required'),
  detail: z.string().optional(),
  source: z.object({
    pointer: z.string().optional(),
    parameter: z.string().optional(),
    header: z.string().optional()
  }).optional(),
  meta: z.record(z.any()).optional()
});

/**
 * JSON API error response schema
 */
export const JsonApiErrorResponseSchema = z.object({
  errors: z.array(JsonApiErrorSchema).min(1, 'At least one error is required'),
  meta: JsonApiMetaSchema.optional(),
  links: JsonApiLinksSchema.optional()
});

/**
 * Validation error response schema for zod validation failures
 */
export const ValidationErrorResponseSchema = z.object({
  errors: z.array(z.object({
    status: z.literal('400'),
    code: z.literal('VALIDATION_ERROR'),
    title: z.literal('Validation Failed'),
    detail: z.string(),
    source: z.object({
      pointer: z.string()
    })
  }))
});

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * JSON API resource creation request schema
 */
export const JsonApiCreateRequestSchema = <T extends z.ZodType>(attributesSchema: T) =>
  z.object({
    data: z.object({
      type: z.string(),
      attributes: attributesSchema,
      relationships: z.record(z.object({
        data: z.union([
          z.object({
            type: z.string(),
            id: z.string()
          }),
          z.array(z.object({
            type: z.string(),
            id: z.string()
          }))
        ])
      })).optional()
    })
  });

/**
 * JSON API resource update request schema
 */
export const JsonApiUpdateRequestSchema = <T extends z.ZodObject<any>>(attributesSchema: T) =>
  z.object({
    data: z.object({
      id: z.string(),
      type: z.string(),
      attributes: attributesSchema.partial(),
      relationships: z.record(z.object({
        data: z.union([
          z.object({
            type: z.string(),
            id: z.string()
          }),
          z.array(z.object({
            type: z.string(),
            id: z.string()
          }))
        ])
      })).optional()
    })
  });

// =============================================================================
// Specific Request Schemas
// =============================================================================

export const CreateFarmRequestSchema = JsonApiCreateRequestSchema(FarmSchema);
export const UpdateFarmRequestSchema = JsonApiUpdateRequestSchema(FarmSchema);

export const CreateCommodityRequestSchema = JsonApiCreateRequestSchema(CommoditySchema);
export const UpdateCommodityRequestSchema = JsonApiUpdateRequestSchema(CommoditySchema);

export const CreateOrderRequestSchema = JsonApiCreateRequestSchema(OrderSchema);
export const UpdateOrderRequestSchema = JsonApiUpdateRequestSchema(OrderSchema);

export const CreateUserRequestSchema = JsonApiCreateRequestSchema(UserSchema);
export const UpdateUserRequestSchema = JsonApiUpdateRequestSchema(UserSchema);

// =============================================================================
// Query Parameter Schemas
// =============================================================================

/**
 * JSON API query parameters schema for filtering, sorting, and pagination
 */
export const JsonApiQuerySchema = z.object({
  include: z.string().optional(),
  'fields[farms]': z.string().optional(),
  'fields[commodities]': z.string().optional(),
  'fields[orders]': z.string().optional(),
  'fields[users]': z.string().optional(),
  sort: z.string().optional(),
  'page[number]': z.coerce.number().int().positive().optional(),
  'page[size]': z.coerce.number().int().positive().max(100).optional(),
  filter: z.record(z.string()).optional()
});

// =============================================================================
// Type Exports
// =============================================================================

export type Farm = z.infer<typeof FarmSchema>;
export type Commodity = z.infer<typeof CommoditySchema>;
export type Order = z.infer<typeof OrderSchema>;
export type User = z.infer<typeof UserSchema>;

export type JsonApiResource<T> = z.infer<ReturnType<typeof JsonApiResourceSchema<z.ZodType<T>>>>;
export type JsonApiCollection<T> = z.infer<ReturnType<typeof JsonApiCollectionSchema<z.ZodType<T>>>>;
export type JsonApiError = z.infer<typeof JsonApiErrorSchema>;
export type JsonApiErrorResponse = z.infer<typeof JsonApiErrorResponseSchema>;

export type FarmResource = z.infer<typeof FarmResourceSchema>;
export type FarmCollection = z.infer<typeof FarmCollectionSchema>;
export type CommodityResource = z.infer<typeof CommodityResourceSchema>;
export type CommodityCollection = z.infer<typeof CommodityCollectionSchema>;
export type OrderResource = z.infer<typeof OrderResourceSchema>;
export type OrderCollection = z.infer<typeof OrderCollectionSchema>;
export type UserResource = z.infer<typeof UserResourceSchema>;
export type UserCollection = z.infer<typeof UserCollectionSchema>;

export type CreateFarmRequest = z.infer<typeof CreateFarmRequestSchema>;
export type UpdateFarmRequest = z.infer<typeof UpdateFarmRequestSchema>;
export type CreateCommodityRequest = z.infer<typeof CreateCommodityRequestSchema>;
export type UpdateCommodityRequest = z.infer<typeof UpdateCommodityRequestSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export type JsonApiQuery = z.infer<typeof JsonApiQuerySchema>;

// =============================================================================
// Legacy Schema (keeping for compatibility)
// =============================================================================

export const HealthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  service: z.string(),
});
