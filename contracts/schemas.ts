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
 * User resource schema with role-based validation
 */
export const UserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  role: z.enum(['farmer', 'buyer', 'admin'], {
    errorMap: () => ({ message: 'Invalid user role' })
  }),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format').optional(),
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

/**
 * Inventory resource schema with comprehensive validation
 */
export const InventorySchema = z.object({
  farmId: z.string().uuid('Invalid farm ID'),
  commodityId: z.string().uuid('Invalid commodity ID'),
  harvestId: z.string().uuid().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  quality: z.object({
    grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
    moisture: z.number().optional(),
    specifications: z.record(z.any()).optional(),
    certifications: z.array(z.string()).optional()
  }),
  location: z.object({
    facility: z.string().min(1, 'Facility is required'),
    section: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  costBasis: z.number().positive('Cost basis must be positive'),
  batchNumber: z.string().optional(),
  harvestDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  storageConditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    requirements: z.string().optional()
  }).optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'CONSUMED', 'EXPIRED']).default('AVAILABLE'),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

/**
 * Inventory movement schema for tracking changes
 */
export const InventoryMovementSchema = z.object({
  inventoryId: z.string().uuid(),
  type: z.enum(['adjustment', 'reservation', 'release', 'transfer', 'consumption']),
  quantity: z.number(),
  reason: z.string(),
  notes: z.string().optional(),
  performedBy: z.string().uuid(),
  performedAt: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

/**
 * Inventory quality test schema
 */
export const InventoryQualityTestSchema = z.object({
  inventoryId: z.string().uuid(),
  testType: z.enum(['moisture', 'protein', 'contamination', 'pesticide', 'custom']),
  testDate: z.string().datetime(),
  testedBy: z.string(),
  results: z.object({
    passed: z.boolean(),
    values: z.record(z.any()),
    grade: z.string().optional(),
    notes: z.string().optional()
  }),
  certificate: z.string().optional(),
  nextTestDue: z.string().datetime().optional()
});

/**
 * Storage facility schema
 */
export const StorageFacilitySchema = z.object({
  name: z.string().min(1, 'Facility name is required'),
  farmId: z.string().uuid('Invalid farm ID'),
  capacity: z.number().positive('Capacity must be positive'),
  currentUtilization: z.number().min(0).max(100, 'Utilization must be between 0-100'),
  location: z.object({
    facility: z.string(),
    section: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  conditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
    lastChecked: z.string().datetime().optional()
  }).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

/**
 * Inventory valuation schema
 */
export const InventoryValuationSchema = z.object({
  method: z.enum(['fifo', 'lifo', 'average', 'current_market']),
  totalValue: z.number().positive(),
  commodityBreakdown: z.array(z.object({
    commodityId: z.string().uuid(),
    commodityName: z.string(),
    quantity: z.number().positive(),
    unitValue: z.number().positive(),
    totalValue: z.number().positive()
  })),
  locationBreakdown: z.array(z.object({
    location: z.string(),
    value: z.number().positive(),
    percentage: z.number().min(0).max(100)
  })),
  asOfDate: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

/**
 * Cost basis schema
 */
export const CostBasisSchema = z.object({
  inventoryId: z.string().uuid(),
  productionCosts: z.number().positive(),
  storageCosts: z.number().min(0),
  handlingCosts: z.number().min(0),
  adjustments: z.array(z.object({
    amount: z.number(),
    reason: z.string(),
    date: z.string().datetime()
  })),
  totalCostBasis: z.number().positive(),
  effectiveDate: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

/**
 * Aging report schema
 */
export const AgingReportSchema = z.object({
  period: z.string(),
  ageBuckets: z.array(z.object({
    ageRange: z.string(),
    quantity: z.number().min(0),
    value: z.number().min(0),
    percentage: z.number().min(0).max(100)
  })),
  turnoverAnalysis: z.object({
    averageAge: z.number().positive(),
    turnoverRate: z.number().min(0).max(100),
    slowMovingItems: z.array(z.string())
  }),
  recommendations: z.array(z.string()),
  generatedAt: z.string().datetime()
});

/**
 * Demand forecast schema
 */
export const DemandForecastSchema = z.object({
  commodityId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional(),
  period: z.string(),
  forecastData: z.array(z.object({
    date: z.string().datetime(),
    predictedDemand: z.number().min(0),
    confidence: z.number().min(0).max(100),
    factors: z.record(z.any()).optional()
  })),
  recommendations: z.object({
    suggestedInventoryLevel: z.number().min(0),
    reorderPoint: z.number().min(0),
    reorderQuantity: z.number().min(0)
  }),
  generatedAt: z.string().datetime()
});

/**
 * Reorder points schema
 */
export const ReorderPointsSchema = z.object({
  commodityId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional(),
  reorderPoints: z.array(z.object({
    commodityId: z.string().uuid(),
    commodityName: z.string(),
    currentStock: z.number().min(0),
    reorderPoint: z.number().min(0),
    reorderQuantity: z.number().min(0),
    leadTime: z.number().positive(),
    urgency: z.enum(['low', 'medium', 'high', 'critical'])
  })),
  generatedAt: z.string().datetime()
});

/**
 * Replenishment plan schema
 */
export const ReplenishmentPlanSchema = z.object({
  commodityId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional(),
  timeHorizon: z.enum(['30', '60', '90', '180']),
  plan: z.array(z.object({
    date: z.string().datetime(),
    action: z.enum(['order', 'harvest', 'transfer', 'maintain']),
    quantity: z.number().min(0),
    commodityId: z.string().uuid(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    notes: z.string().optional()
  })),
  totalCost: z.number().min(0),
  generatedAt: z.string().datetime()
});

/**
 * Waste analysis schema
 */
export const WasteAnalysisSchema = z.object({
  period: z.string(),
  totalWaste: z.number().min(0),
  wasteByReason: z.array(z.object({
    reason: z.string(),
    quantity: z.number().min(0),
    value: z.number().min(0),
    percentage: z.number().min(0).max(100)
  })),
  wasteByCommodity: z.array(z.object({
    commodityId: z.string().uuid(),
    commodityName: z.string(),
    quantity: z.number().min(0),
    value: z.number().min(0)
  })),
  reductionOpportunities: z.array(z.string()),
  generatedAt: z.string().datetime()
});

/**
 * Traceability schema
 */
export const TraceabilitySchema = z.object({
  inventoryId: z.string().uuid(),
  chain: z.array(z.object({
    step: z.string(),
    location: z.string(),
    timestamp: z.string().datetime(),
    actor: z.string(),
    details: z.record(z.any()).optional()
  })),
  certifications: z.array(z.string()),
  qualityChecks: z.array(z.object({
    date: z.string().datetime(),
    type: z.string(),
    result: z.string(),
    certificate: z.string().optional()
  })),
  generatedAt: z.string().datetime()
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


export const UserResourceSchema = JsonApiResourceSchema(UserSchema);
export const UserCollectionSchema = JsonApiCollectionSchema(UserSchema);

export const InventoryResourceSchema = JsonApiResourceSchema(InventorySchema);
export const InventoryCollectionSchema = JsonApiCollectionSchema(InventorySchema);

export const InventoryMovementResourceSchema = JsonApiResourceSchema(InventoryMovementSchema);
export const InventoryMovementCollectionSchema = JsonApiCollectionSchema(InventoryMovementSchema);

export const InventoryQualityTestResourceSchema = JsonApiResourceSchema(InventoryQualityTestSchema);
export const InventoryQualityTestCollectionSchema = JsonApiCollectionSchema(InventoryQualityTestSchema);

export const StorageFacilityResourceSchema = JsonApiResourceSchema(StorageFacilitySchema);
export const StorageFacilityCollectionSchema = JsonApiCollectionSchema(StorageFacilitySchema);

export const InventoryValuationResourceSchema = JsonApiResourceSchema(InventoryValuationSchema);
export const CostBasisResourceSchema = JsonApiResourceSchema(CostBasisSchema);
export const AgingReportResourceSchema = JsonApiResourceSchema(AgingReportSchema);
export const DemandForecastResourceSchema = JsonApiResourceSchema(DemandForecastSchema);
export const ReorderPointsResourceSchema = JsonApiResourceSchema(ReorderPointsSchema);
export const ReplenishmentPlanResourceSchema = JsonApiResourceSchema(ReplenishmentPlanSchema);
export const WasteAnalysisResourceSchema = JsonApiResourceSchema(WasteAnalysisSchema);
export const TraceabilityResourceSchema = JsonApiResourceSchema(TraceabilitySchema);


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


export const CreateUserRequestSchema = JsonApiCreateRequestSchema(UserSchema);
export const UpdateUserRequestSchema = JsonApiUpdateRequestSchema(UserSchema);

export const CreateInventoryRequestSchema = JsonApiCreateRequestSchema(InventorySchema);
export const UpdateInventoryRequestSchema = JsonApiUpdateRequestSchema(InventorySchema);


// Inventory-specific request schemas
export const InventoryAdjustmentRequestSchema = z.object({
  adjustment: z.number(),
  reason: z.enum(['damage', 'spoilage', 'theft', 'count_error', 'consumption', 'sale', 'transfer']),
  notes: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  approvedBy: z.string().uuid().optional()
});

export const InventoryReservationRequestSchema = z.object({
  quantity: z.number().positive(),
  orderId: z.string().uuid(),
  reservedUntil: z.string().datetime(),
  notes: z.string().optional()
});

export const InventoryTransferRequestSchema = z.object({
  fromInventoryId: z.string().uuid(),
  toLocation: z.object({
    farmId: z.string().uuid(),
    facility: z.string(),
    section: z.string().optional()
  }),
  quantity: z.number().positive(),
  transferDate: z.string().datetime(),
  transportMethod: z.string().optional(),
  notes: z.string().optional()
});

export const InventoryQualityTestRequestSchema = z.object({
  testType: z.enum(['moisture', 'protein', 'contamination', 'pesticide', 'custom']),
  testDate: z.string().datetime(),
  testedBy: z.string(),
  results: z.object({
    passed: z.boolean(),
    values: z.record(z.any()),
    grade: z.string().optional(),
    notes: z.string().optional()
  }),
  certificate: z.string().optional(),
  nextTestDue: z.string().datetime().optional()
});

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
export type User = z.infer<typeof UserSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
export type InventoryQualityTest = z.infer<typeof InventoryQualityTestSchema>;
export type StorageFacility = z.infer<typeof StorageFacilitySchema>;
export type InventoryValuation = z.infer<typeof InventoryValuationSchema>;
export type CostBasis = z.infer<typeof CostBasisSchema>;
export type AgingReport = z.infer<typeof AgingReportSchema>;
export type DemandForecast = z.infer<typeof DemandForecastSchema>;
export type ReorderPoints = z.infer<typeof ReorderPointsSchema>;
export type ReplenishmentPlan = z.infer<typeof ReplenishmentPlanSchema>;
export type WasteAnalysis = z.infer<typeof WasteAnalysisSchema>;
export type Traceability = z.infer<typeof TraceabilitySchema>;

export type JsonApiResource<T> = z.infer<ReturnType<typeof JsonApiResourceSchema<z.ZodType<T>>>>;
export type JsonApiCollection<T> = z.infer<ReturnType<typeof JsonApiCollectionSchema<z.ZodType<T>>>>;
export type JsonApiError = z.infer<typeof JsonApiErrorSchema>;
export type JsonApiErrorResponse = z.infer<typeof JsonApiErrorResponseSchema>;

export type FarmResource = z.infer<typeof FarmResourceSchema>;
export type FarmCollection = z.infer<typeof FarmCollectionSchema>;
export type CommodityResource = z.infer<typeof CommodityResourceSchema>;
export type CommodityCollection = z.infer<typeof CommodityCollectionSchema>;
export type UserResource = z.infer<typeof UserResourceSchema>;
export type UserCollection = z.infer<typeof UserCollectionSchema>;
export type InventoryResource = z.infer<typeof InventoryResourceSchema>;
export type InventoryCollection = z.infer<typeof InventoryCollectionSchema>;
export type InventoryMovementResource = z.infer<typeof InventoryMovementResourceSchema>;
export type InventoryMovementCollection = z.infer<typeof InventoryMovementCollectionSchema>;
export type InventoryQualityTestResource = z.infer<typeof InventoryQualityTestResourceSchema>;
export type InventoryQualityTestCollection = z.infer<typeof InventoryQualityTestCollectionSchema>;

export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>;
export type OrganizationAnalyticsQuery = z.infer<typeof OrganizationAnalyticsQuerySchema>;
export type OrganizationActivityQuery = z.infer<typeof OrganizationActivityQuerySchema>;
export type OrganizationComplianceQuery = z.infer<typeof OrganizationComplianceQuerySchema>;
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
export type OrganizationBackupRequest = z.infer<typeof OrganizationBackupRequestSchema>;
export type OrganizationBilling = z.infer<typeof OrganizationBillingSchema>;
export type OrganizationUsage = z.infer<typeof OrganizationUsageSchema>;
export type OrganizationTeamMember = z.infer<typeof OrganizationTeamMemberSchema>;
export type OrganizationTeamStats = z.infer<typeof OrganizationTeamStatsSchema>;

export type OrganizationResource = z.infer<typeof OrganizationResourceSchema>;
export type OrganizationCollection = z.infer<typeof OrganizationCollectionSchema>;
export type OrganizationSettingsResource = z.infer<typeof OrganizationSettingsResourceSchema>;
export type OrganizationTeamStatsResource = z.infer<typeof OrganizationTeamStatsResourceSchema>;
export type OrganizationTeamCollection = z.infer<typeof OrganizationTeamCollectionSchema>;
export type OrganizationUsageResource = z.infer<typeof OrganizationUsageResourceSchema>;
export type OrganizationBillingResource = z.infer<typeof OrganizationBillingResourceSchema>;

export type CreateFarmRequest = z.infer<typeof CreateFarmRequestSchema>;
export type UpdateFarmRequest = z.infer<typeof UpdateFarmRequestSchema>;
export type CreateCommodityRequest = z.infer<typeof CreateCommodityRequestSchema>;
export type UpdateCommodityRequest = z.infer<typeof UpdateCommodityRequestSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type CreateInventoryRequest = z.infer<typeof CreateInventoryRequestSchema>;
export type UpdateInventoryRequest = z.infer<typeof UpdateInventoryRequestSchema>;
export type InventoryAdjustmentRequest = z.infer<typeof InventoryAdjustmentRequestSchema>;
export type InventoryReservationRequest = z.infer<typeof InventoryReservationRequestSchema>;
export type InventoryTransferRequest = z.infer<typeof InventoryTransferRequestSchema>;
export type InventoryQualityTestRequest = z.infer<typeof InventoryQualityTestRequestSchema>;

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;
export type UpdateOrganizationRequest = z.infer<typeof UpdateOrganizationRequestSchema>;
export type UpdateOrganizationSettingsRequest = z.infer<typeof UpdateOrganizationSettingsRequestSchema>;
export type OrganizationVerificationRequest = z.infer<typeof OrganizationVerificationRequestSchema>;
export type IntegrationConfigRequest = z.infer<typeof IntegrationConfigRequestSchema>;
export type OrganizationExportRequest = z.infer<typeof OrganizationExportRequestSchema>;
export type OrganizationBillingRequest = z.infer<typeof OrganizationBillingRequestSchema>;

export type JsonApiQuery = z.infer<typeof JsonApiQuerySchema>;

// =============================================================================
// Legacy Schema (keeping for compatibility)
// =============================================================================

export const HealthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  service: z.string(),
});

// =============================================================================
// Organization Management Schemas
// =============================================================================

/**
 * Organization resource schema with comprehensive validation
 */
export const OrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255, 'Organization name too long'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format').optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: z.string().min(2, 'Country is required').max(2, 'Country must be 2 characters')
  }).optional(),
  taxId: z.string().optional(),
  website: z.string().url('Invalid website URL').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  type: z.enum(['individual', 'cooperative', 'corporation', 'nonprofit'], {
    errorMap: () => ({ message: 'Invalid organization type' })
  }),
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  plan: z.string().optional(),
  maxUsers: z.number().positive().optional(),
  maxFarms: z.number().positive().optional(),
  features: z.array(z.string()).optional(),
  logo: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});



/**
 * Organization settings schema
 */
export const OrganizationSettingsSchema = z.object({
  allowCustomRoles: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
  passwordPolicy: z.object({
    minLength: z.number().min(8).max(128),
    requireSpecialChar: z.boolean(),
    requireNumbers: z.boolean()
  }).optional(),
  defaultTimezone: z.string().default('UTC'),
  defaultCurrency: z.string().length(3).default('USD'),
  features: z.array(z.string()).optional(),
  integrations: z.record(z.any()).optional(),
  notifications: z.object({
    emailFromName: z.string().optional(),
    emailFromAddress: z.string().email().optional()
  }).optional()
});

/**
 * Organization verification request schema
 */
export const OrganizationVerificationRequestSchema = z.object({
  documents: z.array(z.string()).min(1, 'At least one document is required'),
  businessType: z.string().min(1, 'Business type is required'),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

/**
 * Organization analytics query schema
 */
export const OrganizationAnalyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  metric: z.string().optional(),
  farmId: z.string().uuid().optional()
});

/**
 * Organization activity feed query schema
 */
export const OrganizationActivityQuerySchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
  days: z.coerce.number().positive().max(365).optional(),
  type: z.string().optional(),
  userId: z.string().uuid().optional()
});

/**
 * Organization compliance report query schema
 */
export const OrganizationComplianceQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  standard: z.string().optional(),
  farmId: z.string().uuid().optional()
});

/**
 * Integration configuration schema
 */
export const IntegrationConfigSchema = z.object({
  config: z.record(z.any()),
  credentials: z.record(z.any()).optional(),
  isActive: z.boolean().default(true)
});

/**
 * Organization export request schema
 */
export const OrganizationExportRequestSchema = z.object({
  dataTypes: z.array(z.string()).min(1, 'At least one data type is required'),
  format: z.enum(['json', 'csv', 'excel'], {
    errorMap: () => ({ message: 'Invalid export format' })
  }),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
});

/**
 * Organization backup request schema
 */
export const OrganizationBackupRequestSchema = z.object({
  includeMedia: z.boolean().default(false),
  retention: z.enum(['30d', '90d', '1y'], {
    errorMap: () => ({ message: 'Invalid retention period' })
  })
});

/**
 * Organization billing schema
 */
export const OrganizationBillingSchema = z.object({
  planId: z.string(),
  billingCycle: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid billing cycle' })
  }),
  paymentMethod: z.string().optional(),
  status: z.enum(['active', 'past_due', 'cancelled', 'incomplete']),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean().default(false)
});

/**
 * Organization usage schema
 */
export const OrganizationUsageSchema = z.object({
  users: z.object({
    current: z.number(),
    limit: z.number(),
    percentage: z.number()
  }),
  farms: z.object({
    current: z.number(),
    limit: z.number(),
    percentage: z.number()
  }),
  storage: z.object({
    current: z.number(), // in MB
    limit: z.number(),
    percentage: z.number()
  }),
  apiCalls: z.object({
    current: z.number(),
    limit: z.number(),
    percentage: z.number()
  })
});

/**
 * Organization team member schema
 */
export const OrganizationTeamMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  isActive: z.boolean(),
  lastActive: z.string().datetime().optional(),
  permissions: z.array(z.string()).optional()
});

/**
 * Organization team stats schema
 */
export const OrganizationTeamStatsSchema = z.object({
  period: z.string(),
  roleId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional(),
  totalMembers: z.number(),
  activeMembers: z.number(),
  productivity: z.number(),
  efficiency: z.number(),
  completedTasks: z.number(),
  hoursWorked: z.number()
});

// Organization request schemas
export const CreateOrganizationRequestSchema = JsonApiCreateRequestSchema(OrganizationSchema);
export const UpdateOrganizationRequestSchema = JsonApiUpdateRequestSchema(OrganizationSchema);
export const UpdateOrganizationSettingsRequestSchema = JsonApiUpdateRequestSchema(OrganizationSettingsSchema);
export const IntegrationConfigRequestSchema = JsonApiCreateRequestSchema(IntegrationConfigSchema);
export const OrganizationBillingRequestSchema = JsonApiCreateRequestSchema(OrganizationBillingSchema);

// =============================================================================
// User Management Extended Schemas
// =============================================================================

// Profile Management
export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  metadata: z.object({
    preferences: z.record(z.any()).optional(),
    certifications: z.array(z.string()).optional(),
    specialties: z.array(z.string()).optional(),
  }).optional(),
});

// User Management Query Params
export const UserQueryParamsSchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  farmId: z.string().uuid().optional(),
});

// Role Assignment
export const AssignRoleRequestSchema = z.object({
  roleId: z.string().uuid(),
  farmId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

// User Preferences
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['en', 'es', 'fr']).optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }).optional(),
  dashboard: z.object({
    defaultView: z.string(),
    widgets: z.array(z.any()),
  }).optional(),
  mobile: z.object({
    offlineMode: z.boolean(),
    gpsTracking: z.boolean(),
  }).optional(),
});

// Notification Settings
export const NotificationSettingsSchema = z.object({
  channels: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
  events: z.object({
    activityReminders: z.boolean(),
    orderUpdates: z.boolean(),
    marketAlerts: z.boolean(),
    systemUpdates: z.boolean(),
  }),
  quiet_hours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
});

// Activity & Stats Query Params
export const ActivityQueryParamsSchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
  days: z.coerce.number().positive().max(365).optional(),
  type: z.string().optional(),
});

export const StatsQueryParamsSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
});

// User Profile Response
export const UserProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  avatar: z.string().url().nullable(),
  isActive: z.boolean(),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  roles: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    permissions: z.array(z.string()),
  })),
  metadata: z.record(z.any()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Activity Log
export const ActivityLogItemSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  details: z.record(z.any()),
  timestamp: z.string().datetime(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

// User Stats
export const UserStatsResponseSchema = z.object({
  period: z.string(),
  activitiesCompleted: z.number(),
  hoursWorked: z.number(),
  efficiency: z.number(),
  qualityScore: z.number(),
  ordersProcessed: z.number(),
  revenue: z.number().nullable(),
});

// Resource wrappers for user management
export const UserProfileResourceSchema = JsonApiResourceSchema(UserProfileResponseSchema);
export const ActivityLogCollectionSchema = JsonApiCollectionSchema(ActivityLogItemSchema);
export const PreferencesResourceSchema = JsonApiResourceSchema(UserPreferencesSchema);
export const NotificationSettingsResourceSchema = JsonApiResourceSchema(NotificationSettingsSchema);
export const StatsResourceSchema = JsonApiResourceSchema(UserStatsResponseSchema);

// Organization resource schemas
export const OrganizationResourceSchema = JsonApiResourceSchema(OrganizationSchema);
export const OrganizationCollectionSchema = JsonApiCollectionSchema(OrganizationSchema);
export const OrganizationSettingsResourceSchema = JsonApiResourceSchema(OrganizationSettingsSchema);
export const OrganizationTeamStatsResourceSchema = JsonApiResourceSchema(OrganizationTeamStatsSchema);
export const OrganizationTeamCollectionSchema = JsonApiCollectionSchema(OrganizationTeamMemberSchema);
export const OrganizationUsageResourceSchema = JsonApiResourceSchema(OrganizationUsageSchema);
export const OrganizationBillingResourceSchema = JsonApiResourceSchema(OrganizationBillingSchema);

