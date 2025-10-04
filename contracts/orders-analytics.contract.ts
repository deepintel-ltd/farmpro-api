import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrderAnalyticsQuerySchema,
  OrderFinancialSummaryQuerySchema,
  OrderPerformanceMetricsQuerySchema,
  OrderReportRequestSchema,
} from './orders.schemas';
import {
  CommonErrorResponses,
} from './common';

const c = initContract();

// =============================================================================
// Order Analytics & Reporting Contract
// =============================================================================

export const ordersAnalyticsContract = c.router({
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
              commodityId: z.string().cuid(),
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
          id: z.string().cuid(),
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
});

export type OrdersAnalyticsContract = typeof ordersAnalyticsContract;
