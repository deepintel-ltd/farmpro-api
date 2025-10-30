import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CuidQueryParam } from './common';
import {
  MarketplaceCommodityCollectionSchema,
  MarketplaceSupplierCollectionSchema,
  MarketplaceSupplierResourceSchema,
  MarketplaceBuyerCollectionSchema,
  MarketplaceSearchRequestSchema,
  MarketplaceSearchResponseSchema,
  PriceTrendsResponseSchema,
  PriceAlertCollectionSchema,
  PriceAlertRequestSchema,
  PriceAlertResourceSchema,
  MarketAnalysisResponseSchema,
  DemandForecastResponseSchema,
  SupplyOpportunityCollectionSchema,
  BuyingOpportunityCollectionSchema,
  MatchRequestSchema,
  MatchResponseSchema,
  ContractTemplateCollectionSchema,
  ContractTemplateResourceSchema,
  ContractGenerationRequestSchema,
  ContractGenerationResponseSchema,
  MarketplaceListingCollectionSchema,
  MarketplaceListingResourceSchema,
  CreateListingRequestSchema,
  UpdateListingRequestSchema,
} from './market.schemas';
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
// Market Discovery & Browse Contracts
// =============================================================================

export const marketContract = c.router({
  // Browse available commodities in marketplace
  getMarketplaceCommodities: {
    method: 'GET',
    path: '/marketplace/commodities',
    query: AllQueryParams.extend({
      category: z.string().optional(),
      location: z.string().optional(),
      priceRange: z.string().optional(), // "min-max" format
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
      availability: z.coerce.boolean().optional(),
      organic: z.coerce.boolean().optional(),
    }),
    responses: {
      200: MarketplaceCommodityCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Browse available commodities in marketplace',
  },

  // Browse commodity suppliers
  getMarketplaceSuppliers: {
    method: 'GET',
    path: '/marketplace/suppliers',
    query: AllQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      location: z.string().optional(),
      rating: z.coerce.number().min(1).max(5).optional(),
      verificationStatus: z.enum(['verified', 'pending', 'rejected']).optional(),
      deliveryDistance: z.coerce.number().positive().optional(),
    }),
    responses: {
      200: MarketplaceSupplierCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Browse commodity suppliers',
  },

  // Get detailed supplier profile
  getMarketplaceSupplier: {
    method: 'GET',
    path: '/marketplace/suppliers/:supplierId',
    pathParams: z.object({
      supplierId: z.string().cuid('Supplier ID must be a valid CUID'),
    }),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: MarketplaceSupplierResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get detailed supplier profile',
  },

  // Browse commodity buyers
  getMarketplaceBuyers: {
    method: 'GET',
    path: '/marketplace/buyers',
    query: AllQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      location: z.string().optional(),
      orderVolume: z.coerce.number().positive().optional(),
      rating: z.coerce.number().min(1).max(5).optional(),
      paymentTerms: z.string().transform((val) => val.split(',').map(term => term.trim())).pipe(z.array(z.enum(['cash', 'credit', 'escrow']))).optional(),
    }),
    responses: {
      200: MarketplaceBuyerCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Browse commodity buyers',
  },

  // Advanced marketplace search
  searchMarketplace: {
    method: 'POST',
    path: '/marketplace/search',
    body: MarketplaceSearchRequestSchema,
    responses: {
      200: MarketplaceSearchResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Advanced marketplace search',
  },

  // =============================================================================
  // Market Intelligence & Pricing Contracts
  // =============================================================================

  // Get commodity price trends
  getPriceTrends: {
    method: 'GET',
    path: '/marketplace/price-trends',
    query: CommonQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      region: z.string().optional(),
      period: z.enum(['7d', '30d', '90d', '1y']).optional(),
      grade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
    }),
    responses: {
      200: PriceTrendsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get commodity price trends',
  },

  // Get price alert notifications
  getPriceAlerts: {
    method: 'GET',
    path: '/marketplace/price-alerts',
    query: CommonQueryParams,
    responses: {
      200: PriceAlertCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get price alert notifications',
  },

  // Create price alert
  createPriceAlert: {
    method: 'POST',
    path: '/marketplace/price-alerts',
    body: PriceAlertRequestSchema,
    responses: {
      201: PriceAlertResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create price alert',
  },

  // Remove price alert
  deletePriceAlert: {
    method: 'DELETE',
    path: '/marketplace/price-alerts/:alertId',
    pathParams: z.object({
      alertId: z.string().cuid('Price Alert ID must be a valid CUID'),
    }),
    body: c.noBody(),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Remove price alert',
  },

  // Get market analysis report
  getMarketAnalysis: {
    method: 'GET',
    path: '/marketplace/market-analysis',
    query: CommonQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      region: z.string().optional(),
      period: z.enum(['7d', '30d', '90d', '1y']).optional(),
    }),
    responses: {
      200: MarketAnalysisResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get market analysis report',
  },

  // =============================================================================
  // Demand & Supply Matching Contracts
  // =============================================================================

  // Get demand forecasting data
  getDemandForecast: {
    method: 'GET',
    path: '/marketplace/demand-forecast',
    query: CommonQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      region: z.string().optional(),
      timeframe: z.enum(['1m', '3m', '6m', '1y']).optional(),
    }),
    responses: {
      200: DemandForecastResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get demand forecasting data',
  },

  // Find supply opportunities for farmers
  getSupplyOpportunities: {
    method: 'GET',
    path: '/marketplace/supply-opportunities',
    query: AllQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      location: z.string().optional(),
      deliveryDate: z.string().datetime().optional(),
      priceRange: z.string().optional(), // "min-max" format
    }),
    responses: {
      200: SupplyOpportunityCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Find supply opportunities for farmers',
  },

  // Find buying opportunities for buyers
  getBuyingOpportunities: {
    method: 'GET',
    path: '/marketplace/buying-opportunities',
    query: AllQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      location: z.string().optional(),
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
      priceRange: z.string().optional(), // "min-max" format
    }),
    responses: {
      200: BuyingOpportunityCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Find buying opportunities for buyers',
  },

  // Request AI-powered matching
  createMatchRequest: {
    method: 'POST',
    path: '/marketplace/match-requests',
    body: MatchRequestSchema,
    responses: {
      200: MatchResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Request AI-powered matching',
  },

  // =============================================================================
  // Contract Templates & Standards Contracts
  // =============================================================================

  // List available contract templates
  getContractTemplates: {
    method: 'GET',
    path: '/marketplace/contract-templates',
    query: AllQueryParams.extend({
      commodityId: CuidQueryParam('id').optional(),
      type: z.enum(['purchase', 'sale', 'supply', 'distribution']).optional(),
      region: z.string().optional(),
    }),
    responses: {
      200: ContractTemplateCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'List available contract templates',
  },

  // Get contract template details
  getContractTemplate: {
    method: 'GET',
    path: '/marketplace/contract-templates/:templateId',
    pathParams: z.object({
      templateId: z.string().cuid('Contract Template ID must be a valid CUID'),
    }),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: ContractTemplateResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get contract template details',
  },

  // Generate contract from template
  generateContract: {
    method: 'POST',
    path: '/marketplace/contracts/generate',
    body: ContractGenerationRequestSchema,
    responses: {
      201: ContractGenerationResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Generate contract from template',
  },

  // =============================================================================
  // Market Participation & Listings Contracts
  // =============================================================================

  // Get user's marketplace listings
  getMyListings: {
    method: 'GET',
    path: '/marketplace/my-listings',
    query: AllQueryParams.extend({
      status: z.enum(['active', 'inactive', 'expired', 'sold']).optional(),
      commodityId: CuidQueryParam('id').optional(),
      expiryDate: z.string().datetime().optional(),
    }),
    responses: {
      200: MarketplaceListingCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get user\'s marketplace listings',
  },

  // Create marketplace listing
  createListing: {
    method: 'POST',
    path: '/marketplace/listings',
    body: CreateListingRequestSchema,
    responses: {
      201: MarketplaceListingResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create marketplace listing',
  },

  // Update marketplace listing
  updateListing: {
    method: 'PATCH',
    path: '/marketplace/listings/:listingId',
    pathParams: z.object({
      listingId: z.string().cuid('Marketplace Listing ID must be a valid CUID'),
    }),
    body: UpdateListingRequestSchema,
    responses: {
      200: MarketplaceListingResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update marketplace listing',
  },

  // Delete marketplace listing
  deleteListing: {
    method: 'DELETE',
    path: '/marketplace/listings/:listingId',
    pathParams: z.object({
      listingId: z.string().cuid('Marketplace Listing ID must be a valid CUID'),
    }),
    body: c.noBody(),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Delete marketplace listing',
  },

  // Get marketplace listing details
  getListing: {
    method: 'GET',
    path: '/marketplace/listings/:listingId',
    pathParams: z.object({
      listingId: z.string().cuid('Marketplace Listing ID must be a valid CUID'),
    }),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: MarketplaceListingResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get marketplace listing details',
  },

  // =============================================================================
  // Farm-to-Market Integration - Market Intelligence
  // =============================================================================

  // Get market intelligence for farm-to-market integration
  getMarketIntelligence: {
    method: 'GET',
    path: '/marketplace/intelligence',
    query: CommonQueryParams.extend({
      commodities: z.union([
        z.array(z.string()),
        z.string().transform((val) => val.split(',').map(s => s.trim())),
      ]).optional(),
      region: z.string().optional(),
      includePriceForecasts: z.preprocess(
        (val) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') return val === 'true';
          return true;
        },
        z.boolean().default(true)
      ),
      includeDemandForecasts: z.preprocess(
        (val) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') return val === 'true';
          return true;
        },
        z.boolean().default(true)
      ),
      includeCompetitorAnalysis: z.preprocess(
        (val) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') return val === 'true';
          return false;
        },
        z.boolean().default(false)
      ),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('market_intelligence'),
          id: z.string(),
          attributes: z.object({
            // Price Intelligence
            priceIntelligence: z.object({
              currentPrices: z.array(z.object({
                commodity: z.string(),
                price: z.number(),
                currency: z.string(),
                unit: z.string(),
                trend: z.enum(['up', 'down', 'stable']),
                change: z.number(),
                lastUpdated: z.string().datetime(),
              })),
              priceForecasts: z.array(z.object({
                commodity: z.string(),
                forecast: z.array(z.object({
                  date: z.string(),
                  predictedPrice: z.number(),
                  confidence: z.number(),
                  factors: z.array(z.string()),
                })),
              })),
              priceAlerts: z.array(z.object({
                commodity: z.string(),
                type: z.enum(['price_drop', 'price_spike', 'opportunity']),
                message: z.string(),
                severity: z.enum(['low', 'medium', 'high']),
                actionable: z.boolean(),
              })),
            }),
            
            // Demand Intelligence
            demandIntelligence: z.object({
              currentDemand: z.array(z.object({
                commodity: z.string(),
                demandLevel: z.enum(['low', 'medium', 'high']),
                confidence: z.number(),
                factors: z.array(z.string()),
              })),
              demandForecasts: z.array(z.object({
                commodity: z.string(),
                forecast: z.array(z.object({
                  period: z.string(),
                  predictedDemand: z.enum(['low', 'medium', 'high']),
                  confidence: z.number(),
                  drivers: z.array(z.string()),
                })),
              })),
              marketOpportunities: z.array(z.object({
                commodity: z.string(),
                opportunity: z.string(),
                potentialRevenue: z.number(),
                confidence: z.number(),
                timeframe: z.string(),
                requirements: z.array(z.string()),
              })),
            }),
            
            lastUpdated: z.string().datetime(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get market intelligence for farm-to-market integration',
    description: 'Comprehensive market intelligence including price trends, demand forecasts, and market opportunities',
  },
});

export type MarketContract = typeof marketContract;
