import { z } from 'zod';
import { JsonApiResourceSchema, JsonApiCollectionSchema, JsonApiErrorResponseSchema } from './schemas';

// =============================================================================
// Marketplace Commodity Schemas
// =============================================================================

export const MarketplaceCommoditySchema = z.object({
  name: z.string(),
  category: z.enum(['grain', 'vegetable', 'fruit', 'livestock']),
  variety: z.string().optional(),
  qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
  pricePerUnit: z.number().positive(),
  unit: z.string(),
  availableQuantity: z.number().positive(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
    region: z.string(),
  }),
  supplier: z.object({
    id: z.string().uuid(),
    name: z.string(),
    rating: z.number().min(1).max(5),
    verificationStatus: z.enum(['verified', 'pending', 'rejected']),
  }),
  certifications: z.array(z.string()).optional(),
  organic: z.boolean().default(false),
  availableFrom: z.string().datetime(),
  availableUntil: z.string().datetime(),
  images: z.array(z.string().url()).optional(),
  description: z.string().optional(),
});

export const MarketplaceCommodityResourceSchema = JsonApiResourceSchema(MarketplaceCommoditySchema);

export const MarketplaceCommodityCollectionSchema = JsonApiCollectionSchema(MarketplaceCommoditySchema);

// =============================================================================
// Marketplace Supplier Schemas
// =============================================================================

export const MarketplaceSupplierSchema = z.object({
  name: z.string(),
  businessName: z.string().optional(),
  description: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
    region: z.string(),
  }),
  rating: z.number().min(1).max(5),
  totalRatings: z.number().int().min(0),
  verificationStatus: z.enum(['verified', 'pending', 'rejected']),
  certifications: z.array(z.string()).optional(),
  deliveryRadius: z.number().positive().optional(),
  deliveryOptions: z.array(z.enum(['pickup', 'delivery', 'shipping'])),
  paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])),
  commodities: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
  })),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
  }),
  establishedDate: z.string().datetime().optional(),
  totalTransactions: z.number().int().min(0).optional(),
  responseTime: z.string().optional(), // e.g., "2-4 hours"
});

export const MarketplaceSupplierResourceSchema = JsonApiResourceSchema(MarketplaceSupplierSchema);

export const MarketplaceSupplierCollectionSchema = JsonApiCollectionSchema(MarketplaceSupplierSchema);

// =============================================================================
// Marketplace Buyer Schemas
// =============================================================================

export const MarketplaceBuyerSchema = z.object({
  name: z.string(),
  businessName: z.string().optional(),
  description: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
    region: z.string(),
  }),
  rating: z.number().min(1).max(5),
  totalRatings: z.number().int().min(0),
  verificationStatus: z.enum(['verified', 'pending', 'rejected']),
  orderVolume: z.number().positive().optional(),
  preferredCommodities: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
  })),
  paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  establishedDate: z.string().datetime().optional(),
  totalTransactions: z.number().int().min(0).optional(),
});

export const MarketplaceBuyerCollectionSchema = JsonApiCollectionSchema(MarketplaceBuyerSchema);

// =============================================================================
// Marketplace Search Schemas
// =============================================================================

export const MarketplaceSearchFiltersSchema = z.object({
  commodities: z.array(z.string().uuid()).optional(),
  suppliers: z.array(z.string().uuid()).optional(),
  location: z.object({
    center: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    radius: z.number().positive(),
    regions: z.array(z.string()).optional(),
  }).optional(),
  priceRange: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
  }).optional(),
  quantityRange: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
  }).optional(),
  qualityGrades: z.array(z.enum(['premium', 'grade_a', 'grade_b', 'standard'])).optional(),
  certifications: z.array(z.enum(['organic', 'fairtrade', 'non-gmo'])).optional(),
  deliveryOptions: z.array(z.enum(['pickup', 'delivery', 'shipping'])).optional(),
  paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])).optional(),
  availability: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }).optional(),
});

export const MarketplaceSearchSortSchema = z.object({
  field: z.enum(['price', 'distance', 'rating', 'availability']),
  direction: z.enum(['asc', 'desc']),
});

export const MarketplaceSearchRequestSchema = z.object({
  query: z.string().optional(),
  filters: MarketplaceSearchFiltersSchema.optional(),
  sort: MarketplaceSearchSortSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
});

export const MarketplaceSearchResultSchema = z.object({
  commodities: z.array(MarketplaceCommoditySchema),
  suppliers: z.array(MarketplaceSupplierSchema),
  buyers: z.array(MarketplaceBuyerSchema),
  totalResults: z.number().int().min(0),
  facets: z.object({
    categories: z.array(z.object({
      name: z.string(),
      count: z.number().int().min(0),
    })),
    priceRanges: z.array(z.object({
      range: z.string(),
      count: z.number().int().min(0),
    })),
    locations: z.array(z.object({
      region: z.string(),
      count: z.number().int().min(0),
    })),
  }).optional(),
});

export const MarketplaceSearchResponseSchema = JsonApiResourceSchema(MarketplaceSearchResultSchema);

// =============================================================================
// Price Trends & Analysis Schemas
// =============================================================================

export const PriceDataPointSchema = z.object({
  date: z.string().datetime(),
  price: z.number().positive(),
  volume: z.number().nonnegative().optional(),
  grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
});

export const PriceTrendsResponseSchema = z.object({
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  region: z.string(),
  period: z.string(),
  currentPrice: z.number().positive(),
  priceChange: z.object({
    absolute: z.number(),
    percentage: z.number(),
    direction: z.enum(['up', 'down', 'stable']),
  }),
  data: z.array(PriceDataPointSchema),
  forecast: z.array(PriceDataPointSchema).optional(),
  insights: z.array(z.string()).optional(),
});

// =============================================================================
// Price Alert Schemas
// =============================================================================

export const PriceAlertSchema = z.object({
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  region: z.string().optional(),
  alertType: z.enum(['above', 'below', 'change']),
  threshold: z.number().positive(),
  percentageChange: z.number().optional(),
  notifications: z.array(z.enum(['email', 'sms', 'push'])),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  triggeredAt: z.string().datetime().optional(),
});

export const PriceAlertResourceSchema = JsonApiResourceSchema(PriceAlertSchema);

export const PriceAlertCollectionSchema = JsonApiCollectionSchema(PriceAlertSchema);

export const PriceAlertRequestSchema = z.object({
  data: z.object({
    type: z.literal('price-alerts'),
    attributes: z.object({
      commodityId: z.string().uuid(),
      region: z.string().optional(),
      alertType: z.enum(['above', 'below', 'change']),
      threshold: z.number().positive(),
      percentageChange: z.number().optional(),
      notifications: z.array(z.enum(['email', 'sms', 'push'])),
    }),
  }),
});

// =============================================================================
// Market Analysis Schemas
// =============================================================================

export const MarketAnalysisResponseSchema = z.object({
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  region: z.string(),
  period: z.string(),
  supplyAnalysis: z.object({
    currentSupply: z.number().nonnegative(),
    supplyTrend: z.enum(['increasing', 'decreasing', 'stable']),
    seasonalFactors: z.array(z.string()).optional(),
  }),
  demandAnalysis: z.object({
    currentDemand: z.number().nonnegative(),
    demandTrend: z.enum(['increasing', 'decreasing', 'stable']),
    keyDrivers: z.array(z.string()).optional(),
  }),
  priceForecast: z.object({
    shortTerm: z.object({
      price: z.number().positive(),
      confidence: z.number().min(0).max(1),
    }),
    mediumTerm: z.object({
      price: z.number().positive(),
      confidence: z.number().min(0).max(1),
    }),
  }),
  marketInsights: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
});

// =============================================================================
// Demand Forecast Schemas
// =============================================================================

export const DemandForecastDataPointSchema = z.object({
  period: z.string(),
  predictedDemand: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  factors: z.array(z.string()).optional(),
});

export const DemandForecastResponseSchema = z.object({
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  region: z.string(),
  timeframe: z.string(),
  currentDemand: z.number().nonnegative(),
  forecast: z.array(DemandForecastDataPointSchema),
  seasonality: z.object({
    peakMonths: z.array(z.string()),
    lowMonths: z.array(z.string()),
    seasonalFactors: z.array(z.string()),
  }),
  insights: z.array(z.string()).optional(),
});

// =============================================================================
// Supply & Buying Opportunities Schemas
// =============================================================================

export const SupplyOpportunitySchema = z.object({
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  buyerId: z.string().uuid(),
  buyerName: z.string(),
  requiredQuantity: z.number().positive(),
  unit: z.string(),
  maxPrice: z.number().positive(),
  deliveryDate: z.string().datetime(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  qualityRequirements: z.object({
    grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
    certifications: z.array(z.string()).optional(),
  }).optional(),
  paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  postedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export const SupplyOpportunityCollectionSchema = JsonApiCollectionSchema(SupplyOpportunitySchema);

export const BuyingOpportunitySchema = z.object({
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  availableQuantity: z.number().positive(),
  unit: z.string(),
  pricePerUnit: z.number().positive(),
  qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  certifications: z.array(z.string()).optional(),
  deliveryOptions: z.array(z.enum(['pickup', 'delivery', 'shipping'])),
  paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])),
  availableFrom: z.string().datetime(),
  availableUntil: z.string().datetime().optional(),
  images: z.array(z.string().url()).optional(),
  description: z.string().optional(),
});

export const BuyingOpportunityCollectionSchema = JsonApiCollectionSchema(BuyingOpportunitySchema);

// =============================================================================
// Match Request Schemas
// =============================================================================

export const MatchRequestSchema = z.object({
  data: z.object({
    type: z.literal('match-requests'),
    attributes: z.object({
      type: z.enum(['supply', 'demand']),
      commodityId: z.string().uuid(),
      quantity: z.number().positive(),
      qualityRequirements: z.record(z.string(), z.any()).optional(),
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      maxDistance: z.number().positive(),
      deliveryDate: z.string().datetime(),
      priceRange: z.object({
        min: z.number().nonnegative(),
        max: z.number().positive(),
      }),
      preferences: z.object({
        certifiedSuppliers: z.boolean().optional(),
        verifiedBuyers: z.boolean().optional(),
        paymentTerms: z.array(z.string()).optional(),
      }).optional(),
    }),
  }),
});

export const MatchResultSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  compatibilityScore: z.number().min(0).max(1),
  distance: z.number().positive(),
  estimatedPrice: z.number().positive().optional(),
  matchReason: z.string(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

export const MatchResponseSchema = z.object({
  matches: z.array(MatchResultSchema),
  totalMatches: z.number().int().min(0),
  searchCriteria: z.object({
    commodityId: z.string().uuid(),
    quantity: z.number().positive(),
    maxDistance: z.number().positive(),
  }),
});

// =============================================================================
// Contract Template Schemas
// =============================================================================

export const ContractTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(['purchase', 'sale', 'supply', 'distribution']),
  commodityId: z.string().uuid().optional(),
  region: z.string().optional(),
  templateContent: z.string(),
  customizableFields: z.array(z.string()),
  standardTerms: z.object({
    paymentTerms: z.string(),
    deliveryTerms: z.string(),
    qualityStandards: z.record(z.string(), z.any()),
    penaltyClauses: z.record(z.string(), z.any()),
  }),
  version: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ContractTemplateResourceSchema = JsonApiResourceSchema(ContractTemplateSchema);

export const ContractTemplateCollectionSchema = JsonApiCollectionSchema(ContractTemplateSchema);

// =============================================================================
// Contract Generation Schemas
// =============================================================================

export const ContractGenerationRequestSchema = z.object({
  data: z.object({
    type: z.literal('contract-generation'),
    attributes: z.object({
      templateId: z.string().uuid(),
      orderId: z.string().uuid(),
      customizations: z.object({
        paymentTerms: z.string().optional(),
        deliveryTerms: z.string().optional(),
        qualityStandards: z.record(z.string(), z.any()).optional(),
        penaltyClauses: z.record(z.string(), z.any()).optional(),
        additionalTerms: z.string().optional(),
      }).optional(),
    }),
  }),
});

export const ContractGenerationResponseSchema = z.object({
  contractId: z.string().uuid(),
  templateId: z.string().uuid(),
  orderId: z.string().uuid(),
  generatedContract: z.string(),
  customizations: z.record(z.string(), z.any()).optional(),
  status: z.enum(['draft', 'ready_for_review', 'approved']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

// =============================================================================
// Marketplace Listing Schemas
// =============================================================================

export const MarketplaceListingSchema = z.object({
  inventoryId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  priceType: z.enum(['fixed', 'negotiable', 'auction']),
  minQuantity: z.number().positive().optional(),
  qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
  certifications: z.array(z.string()).optional(),
  availableFrom: z.string().datetime(),
  availableUntil: z.string().datetime().optional(),
  deliveryOptions: z.array(z.enum(['pickup', 'delivery'])),
  deliveryRadius: z.number().positive().optional(),
  paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])),
  isPublic: z.boolean().default(true),
  images: z.array(z.string().url()).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'sold']),
  views: z.number().int().min(0).default(0),
  inquiries: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MarketplaceListingResourceSchema = JsonApiResourceSchema(MarketplaceListingSchema);

export const MarketplaceListingCollectionSchema = JsonApiCollectionSchema(MarketplaceListingSchema);

export const CreateListingRequestSchema = z.object({
  data: z.object({
    type: z.literal('marketplace-listings'),
    attributes: z.object({
      inventoryId: z.string().uuid(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      priceType: z.enum(['fixed', 'negotiable', 'auction']),
      minQuantity: z.number().positive().optional(),
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']),
      certifications: z.array(z.string()).optional(),
      availableFrom: z.string().datetime(),
      availableUntil: z.string().datetime().optional(),
      deliveryOptions: z.array(z.enum(['pickup', 'delivery'])),
      deliveryRadius: z.number().positive().optional(),
      paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])),
      isPublic: z.boolean().default(true),
      images: z.array(z.string().url()).optional(),
    }),
  }),
});

export const UpdateListingRequestSchema = z.object({
  data: z.object({
    type: z.literal('marketplace-listings'),
    attributes: z.object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      quantity: z.number().positive().optional(),
      unitPrice: z.number().positive().optional(),
      priceType: z.enum(['fixed', 'negotiable', 'auction']).optional(),
      minQuantity: z.number().positive().optional(),
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
      certifications: z.array(z.string()).optional(),
      availableFrom: z.string().datetime().optional(),
      availableUntil: z.string().datetime().optional(),
      deliveryOptions: z.array(z.enum(['pickup', 'delivery'])).optional(),
      deliveryRadius: z.number().positive().optional(),
      paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])).optional(),
      isPublic: z.boolean().optional(),
      images: z.array(z.string().url()).optional(),
    }),
  }),
});

// Re-export common schemas
export { JsonApiErrorResponseSchema };
