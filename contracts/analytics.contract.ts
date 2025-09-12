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
});

export const AnalyticsChartSchema = z.object({
  type: z.enum(['line', 'bar', 'pie']),
  title: z.string(),
  data: z.array(z.object({
    label: z.string(),
    value: z.number(),
    timestamp: z.string().optional(),
  })),
  xAxis: z.string(),
  yAxis: z.string(),
});

export const AnalyticsSummarySchema = z.object({
  totalRevenue: z.number(),
  totalCosts: z.number(),
  netProfit: z.number(),
  profitMargin: z.number(),
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
      summary: AnalyticsSummarySchema,
      generatedAt: z.string().datetime(),
    }),
  }),
});

// =============================================================================
// Query Schemas - Simplified Parameters
// =============================================================================

export const BaseAnalyticsQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional().default('month'),
  farmId: z.string().uuid().optional(),
});

export const FinancialQuerySchema = BaseAnalyticsQuerySchema.extend({
  commodityId: z.string().uuid().optional(),
  includeBreakdown: z.boolean().optional().default(false),
});

export const ActivityQuerySchema = BaseAnalyticsQuerySchema.extend({
  activityType: z.string().optional(),
});

export const MarketQuerySchema = BaseAnalyticsQuerySchema.extend({
  commodityId: z.string().uuid().optional(),
});

export const ExportRequestSchema = z.object({
  type: z.enum(['financial', 'activities', 'market']),
  format: z.enum(['csv', 'excel']),
  period: AnalyticsPeriodSchema,
  farmId: z.string().uuid().optional(),
});

// =============================================================================
// Essential Analytics Contract - 6 Core Endpoints
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
    summary: 'Get farm dashboard with key performance indicators',
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
  },

  // =============================================================================
  // Farm-to-Market Integration - Core Value Proposition  
  // =============================================================================
  
  getFarmToMarketAnalytics: {
    method: 'GET',
    path: '/api/analytics/farm-to-market',
    query: MarketQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get integrated farm-to-market journey analytics',
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
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Export analytics data',
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
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// Response types
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
export type AnalyticsMetric = z.infer<typeof AnalyticsMetricSchema>;
export type AnalyticsChart = z.infer<typeof AnalyticsChartSchema>;
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;