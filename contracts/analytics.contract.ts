import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CommonQueryParams, CommonErrorResponses } from './common';

const c = initContract();

// =============================================================================
// Core Analytics Schemas - Essential Business Logic Only
// =============================================================================

export const AnalyticsPeriodSchema = z.enum(['week', 'month', 'quarter', 'year']);

export const AnalyticsMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  trend: z.enum(['up', 'down', 'stable']),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  benchmark: z.number().optional(),
  target: z.number().optional(),
});

export const AnalyticsChartSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'scatter']),
  title: z.string(),
  data: z.array(z.object({
    label: z.string(),
    value: z.number(),
    timestamp: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })),
  xAxis: z.string(),
  yAxis: z.string(),
  series: z.array(z.string()).optional(),
});

export const AnalyticsInsightSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['performance', 'efficiency', 'market', 'sustainability', 'risk']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  actionable: z.boolean(),
  confidence: z.number().min(0).max(1),
  recommendations: z.array(z.string()).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
});

export const AnalyticsSummarySchema = z.object({
  totalRevenue: z.number(),
  totalCosts: z.number(),
  netProfit: z.number(),
  profitMargin: z.number(),
  roi: z.number().optional(),
  efficiency: z.number().optional(),
  sustainability: z.number().optional(),
});

export const AnalyticsResponseSchema = z.object({
  data: z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.object({
      period: AnalyticsPeriodSchema,
      farmId: z.string().uuid().optional(),
      metrics: z.array(AnalyticsMetricSchema),
      charts: z.array(AnalyticsChartSchema),
      insights: z.array(AnalyticsInsightSchema).optional(),
      summary: AnalyticsSummarySchema,
      generatedAt: z.string().datetime(),
      cacheKey: z.string().optional(),
    }),
  }),
});

// =============================================================================
// Query Schemas - Simplified Parameters
// =============================================================================

export const BaseAnalyticsQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional().default('month'),
  farmId: z.string().uuid().optional(),
  includeInsights: z.boolean().optional().default(true),
  useCache: z.boolean().optional().default(true),
});

export const FinancialQuerySchema = BaseAnalyticsQuerySchema.extend({
  commodityId: z.string().uuid().optional(),
  includeBreakdown: z.boolean().optional().default(false),
  compareWithPrevious: z.boolean().optional().default(true),
});

export const ActivityQuerySchema = BaseAnalyticsQuerySchema.extend({
  activityType: z.string().optional(),
  includeEfficiency: z.boolean().optional().default(true),
  includeCosts: z.boolean().optional().default(true),
});

export const MarketQuerySchema = BaseAnalyticsQuerySchema.extend({
  commodityId: z.string().uuid().optional(),
  region: z.string().optional(),
  includePredictions: z.boolean().optional().default(false),
});

export const FarmToMarketQuerySchema = BaseAnalyticsQuerySchema.extend({
  cropCycleId: z.string().uuid().optional(),
  commodityId: z.string().uuid().optional(),
  includeQuality: z.boolean().optional().default(true),
  includePricing: z.boolean().optional().default(true),
});

export const ExportRequestSchema = z.object({
  type: z.enum(['dashboard', 'financial', 'activities', 'market', 'farm-to-market']),
  format: z.enum(['csv', 'excel', 'json']),
  period: AnalyticsPeriodSchema,
  farmId: z.string().uuid().optional(),
  includeCharts: z.boolean().optional().default(false),
  includeInsights: z.boolean().optional().default(true),
});

export const ReportRequestSchema = z.object({
  templateId: z.string().optional(),
  title: z.string(),
  type: z.enum(['dashboard', 'financial', 'activities', 'market', 'farm-to-market']),
  period: AnalyticsPeriodSchema,
  farmIds: z.array(z.string().uuid()).optional(),
  commodities: z.array(z.string().uuid()).optional(),
  includeComparisons: z.boolean().optional().default(false),
  includePredictions: z.boolean().optional().default(false),
  format: z.enum(['pdf', 'html', 'excel']),
  recipients: z.array(z.string().email()).optional(),
});

// =============================================================================
// Essential Analytics Contract - 8 Core Endpoints
// =============================================================================

export const analyticsContract = c.router({
  
  // =============================================================================
  // Core Dashboard - Main KPIs Overview
  // =============================================================================
  
  getDashboard: {
    method: 'GET',
    path: '/api/analytics/dashboard',
    query: BaseAnalyticsQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get unified farm dashboard with key performance indicators',
    description: 'Provides comprehensive overview of farm performance including financial, operational, and market metrics',
  },

  // =============================================================================
  // Financial Performance - Revenue, Costs, Profitability
  // =============================================================================
  
  getFinancialAnalytics: {
    method: 'GET',
    path: '/api/analytics/financial',
    query: FinancialQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get financial performance analytics',
    description: 'Detailed financial analysis including revenue, costs, profitability, and ROI metrics',
  },

  // =============================================================================
  // Farm-to-Market Integration - Core Value Proposition  
  // =============================================================================
  
  getFarmToMarketAnalytics: {
    method: 'GET',
    path: '/api/analytics/farm-to-market',
    query: FarmToMarketQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get integrated farm-to-market journey analytics',
    description: 'Complete value chain analysis from production to market sale including quality, pricing, and efficiency metrics',
  },

  // =============================================================================
  // Operational Efficiency - Activity & Resource Optimization
  // =============================================================================
  
  getActivityAnalytics: {
    method: 'GET',
    path: '/api/analytics/activities',
    query: ActivityQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get farm activity efficiency and resource utilization',
    description: 'Activity performance analysis including completion rates, resource utilization, and cost efficiency',
  },

  // =============================================================================
  // Market Performance - Sales & Customer Analytics
  // =============================================================================
  
  getMarketAnalytics: {
    method: 'GET',
    path: '/api/analytics/market',
    query: MarketQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get market performance and customer analytics',
    description: 'Market analysis including sales performance, customer insights, and competitive positioning',
  },

  // =============================================================================
  // AI-Powered Insights - Leverage Intelligence Module
  // =============================================================================
  
  getInsights: {
    method: 'GET',
    path: '/api/analytics/insights',
    query: BaseAnalyticsQuerySchema.merge(CommonQueryParams),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('analytics_insights'),
          id: z.string(),
          attributes: z.object({
            insights: z.array(AnalyticsInsightSchema),
            generatedAt: z.string().datetime(),
            model: z.string().optional(),
            confidence: z.number().min(0).max(1),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get AI-powered analytics insights',
    description: 'Generate intelligent insights and recommendations using the intelligence module',
  },

  // =============================================================================
  // Data Export - Essential Reporting Capability
  // =============================================================================
  
  exportAnalytics: {
    method: 'POST',
    path: '/api/analytics/export',
    body: ExportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          type: z.literal('analytics_export'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.literal('processing'),
            downloadUrl: z.string().url(),
            expiresAt: z.string().datetime(),
            estimatedCompletion: z.string().datetime().optional(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Export analytics data',
    description: 'Export analytics data in various formats for external analysis',
  },

  // =============================================================================
  // Report Generation - Advanced Reporting
  // =============================================================================
  
  generateReport: {
    method: 'POST',
    path: '/api/analytics/reports',
    body: ReportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          type: z.literal('analytics_report'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.literal('generating'),
            title: z.string(),
            type: z.string(),
            format: z.string(),
            downloadUrl: z.string().url().optional(),
            estimatedCompletion: z.string().datetime().optional(),
            recipients: z.array(z.string().email()).optional(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Generate comprehensive analytics report',
    description: 'Generate detailed reports with charts, insights, and recommendations',
  },
});

// =============================================================================
// Type Exports
// =============================================================================

export type AnalyticsContract = typeof analyticsContract;

// Query types
export type BaseAnalyticsQuery = z.infer<typeof BaseAnalyticsQuerySchema>;
export type FinancialQuery = z.infer<typeof FinancialQuerySchema>;
export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;
export type MarketQuery = z.infer<typeof MarketQuerySchema>;
export type FarmToMarketQuery = z.infer<typeof FarmToMarketQuerySchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;

// Response types
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
export type AnalyticsMetric = z.infer<typeof AnalyticsMetricSchema>;
export type AnalyticsChart = z.infer<typeof AnalyticsChartSchema>;
export type AnalyticsInsight = z.infer<typeof AnalyticsInsightSchema>;
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
