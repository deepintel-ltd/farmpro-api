import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  IntelligenceRequestSchema,
  IntelligenceResponseSchema,
  FarmAnalysisRequestSchema,
  FarmAnalysisResponseSchema,
  MarketIntelligenceRequestSchema,
  MarketIntelligenceResponseSchema,
  ActivityOptimizationRequestSchema,
  ActivityOptimizationResponseSchema,
  IntelligenceErrorSchema,
  IntelligenceQuerySchema,
  IntelligenceListResponseSchema,
} from './intelligence.schemas';

const c = initContract();

export const intelligenceContract = c.router({
  // General intelligence endpoint
  generateResponse: {
    method: 'POST',
    path: '/intelligence/generate',
    responses: {
      200: IntelligenceResponseSchema,
      400: IntelligenceErrorSchema,
      401: IntelligenceErrorSchema,
      429: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    body: IntelligenceRequestSchema,
    summary: 'Generate AI response for general queries',
    description: 'Generate AI-powered responses for general farm management questions and queries',
  },

  // Farm analysis endpoints
  analyzeFarm: {
    method: 'POST',
    path: '/intelligence/farm/analyze',
    responses: {
      200: FarmAnalysisResponseSchema,
      400: IntelligenceErrorSchema,
      401: IntelligenceErrorSchema,
      404: IntelligenceErrorSchema,
      429: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    body: FarmAnalysisRequestSchema,
    summary: 'Analyze farm data and provide insights',
    description: 'Perform comprehensive analysis of farm data including crop health, yield prediction, and optimization recommendations',
  },

  getFarmAnalysis: {
    method: 'GET',
    path: '/intelligence/farm/analysis/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: FarmAnalysisResponseSchema,
      404: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'Get farm analysis by ID',
    description: 'Retrieve a specific farm analysis result by its identifier',
  },

  listFarmAnalyses: {
    method: 'GET',
    path: '/intelligence/farm/analyses',
    query: IntelligenceQuerySchema,
    responses: {
      200: IntelligenceListResponseSchema,
      400: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'List farm analyses',
    description: 'Get paginated list of farm analyses with optional filtering',
  },

  // Market intelligence endpoints
  analyzeMarket: {
    method: 'POST',
    path: '/intelligence/market/analyze',
    responses: {
      200: MarketIntelligenceResponseSchema,
      400: IntelligenceErrorSchema,
      401: IntelligenceErrorSchema,
      429: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    body: MarketIntelligenceRequestSchema,
    summary: 'Analyze market conditions and trends',
    description: 'Perform market analysis including price predictions, demand forecasting, and trading recommendations',
  },

  getMarketAnalysis: {
    method: 'GET',
    path: '/intelligence/market/analysis/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: MarketIntelligenceResponseSchema,
      404: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'Get market analysis by ID',
    description: 'Retrieve a specific market analysis result by its identifier',
  },

  listMarketAnalyses: {
    method: 'GET',
    path: '/intelligence/market/analyses',
    query: IntelligenceQuerySchema,
    responses: {
      200: IntelligenceListResponseSchema,
      400: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'List market analyses',
    description: 'Get paginated list of market analyses with optional filtering',
  },

  // Activity optimization endpoints
  optimizeActivity: {
    method: 'POST',
    path: '/intelligence/activity/optimize',
    responses: {
      200: ActivityOptimizationResponseSchema,
      400: IntelligenceErrorSchema,
      401: IntelligenceErrorSchema,
      404: IntelligenceErrorSchema,
      429: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    body: ActivityOptimizationRequestSchema,
    summary: 'Optimize farm activities',
    description: 'Generate optimized activity plans considering constraints and objectives',
  },

  getActivityOptimization: {
    method: 'GET',
    path: '/intelligence/activity/optimization/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: ActivityOptimizationResponseSchema,
      404: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'Get activity optimization by ID',
    description: 'Retrieve a specific activity optimization result by its identifier',
  },

  listActivityOptimizations: {
    method: 'GET',
    path: '/intelligence/activity/optimizations',
    query: IntelligenceQuerySchema,
    responses: {
      200: IntelligenceListResponseSchema,
      400: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'List activity optimizations',
    description: 'Get paginated list of activity optimizations with optional filtering',
  },

  // General intelligence history
  getIntelligenceHistory: {
    method: 'GET',
    path: '/intelligence/history',
    query: IntelligenceQuerySchema,
    responses: {
      200: IntelligenceListResponseSchema,
      400: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'Get intelligence history',
    description: 'Get paginated list of all intelligence requests and responses with optional filtering',
  },

  getIntelligenceResponse: {
    method: 'GET',
    path: '/intelligence/response/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: IntelligenceResponseSchema,
      404: IntelligenceErrorSchema,
      500: IntelligenceErrorSchema,
    },
    summary: 'Get intelligence response by ID',
    description: 'Retrieve a specific intelligence response by its identifier',
  },

  // Health check
  health: {
    method: 'GET',
    path: '/intelligence/health',
    responses: {
      200: z.object({
        status: z.enum(['healthy', 'unhealthy']),
        timestamp: z.date(),
        version: z.string(),
        models: z.array(z.string()).describe('Available AI models'),
      }),
      500: IntelligenceErrorSchema,
    },
    summary: 'Intelligence service health check',
    description: 'Check the health and availability of the intelligence service',
  },
});

export type IntelligenceContract = typeof intelligenceContract;
