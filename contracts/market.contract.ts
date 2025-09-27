import { initContract } from '@ts-rest/core';
import { z } from 'zod';
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
    path: '/api/marketplace/commodities',
    query: AllQueryParams.extend({
      category: z.string().optional(),
      location: z.string().optional(),
      priceRange: z.string().optional(), // "min-max" format
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
      availability: z.boolean().optional(),
      organic: z.boolean().optional(),
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
    path: '/api/marketplace/suppliers',
    query: AllQueryParams.extend({
      commodityId: z.uuid().optional(),
      location: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      verificationStatus: z.enum(['verified', 'pending', 'rejected']).optional(),
      deliveryDistance: z.number().positive().optional(),
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
    path: '/api/marketplace/suppliers/:supplierId',
    pathParams: UuidPathParam('Supplier'),
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
    path: '/api/marketplace/buyers',
    query: AllQueryParams.extend({
      commodityId: z.uuid().optional(),
      location: z.string().optional(),
      orderVolume: z.number().positive().optional(),
      rating: z.number().min(1).max(5).optional(),
      paymentTerms: z.array(z.enum(['cash', 'credit', 'escrow'])).optional(),
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
    path: '/api/marketplace/search',
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
    path: '/api/marketplace/price-trends',
    query: CommonQueryParams.extend({
      commodityId: z.uuid().optional(),
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
    path: '/api/marketplace/price-alerts',
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
    path: '/api/marketplace/price-alerts',
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
    path: '/api/marketplace/price-alerts/:alertId',
    pathParams: UuidPathParam('PriceAlert'),
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
    path: '/api/marketplace/market-analysis',
    query: CommonQueryParams.extend({
      commodityId: z.uuid().optional(),
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
    path: '/api/marketplace/demand-forecast',
    query: CommonQueryParams.extend({
      commodityId: z.uuid().optional(),
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
    path: '/api/marketplace/supply-opportunities',
    query: AllQueryParams.extend({
      commodityId: z.uuid().optional(),
      location: z.string().optional(),
      deliveryDate: z.iso.datetime().optional(),
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
    path: '/api/marketplace/buying-opportunities',
    query: AllQueryParams.extend({
      commodityId: z.uuid().optional(),
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
    path: '/api/marketplace/match-requests',
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
    path: '/api/marketplace/contract-templates',
    query: AllQueryParams.extend({
      commodityId: z.uuid().optional(),
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
    path: '/api/marketplace/contract-templates/:templateId',
    pathParams: UuidPathParam('ContractTemplate'),
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
    path: '/api/marketplace/contracts/generate',
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
    path: '/api/marketplace/my-listings',
    query: AllQueryParams.extend({
      status: z.enum(['active', 'inactive', 'expired', 'sold']).optional(),
      commodityId: z.uuid().optional(),
      expiryDate: z.iso.datetime().optional(),
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
    path: '/api/marketplace/listings',
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
    path: '/api/marketplace/listings/:listingId',
    pathParams: UuidPathParam('MarketplaceListing'),
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
    path: '/api/marketplace/listings/:listingId',
    pathParams: UuidPathParam('MarketplaceListing'),
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
    path: '/api/marketplace/listings/:listingId',
    pathParams: UuidPathParam('MarketplaceListing'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: MarketplaceListingResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get marketplace listing details',
  },
});

export type MarketContract = typeof marketContract;
