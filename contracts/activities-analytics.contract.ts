import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  GenerateReportRequestSchema,
  AnalyticsResourceSchema,
  AnalyticsQueryParams,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Analytics & Reporting Contract
// =============================================================================

export const activitiesAnalyticsContract = c.router({
  // Get analytics
  getAnalytics: {
    method: 'GET',
    path: '/activities/analytics',
    query: AnalyticsQueryParams,
    responses: {
      200: AnalyticsResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity performance analytics',
  },

  // Get completion rates
  getCompletionRates: {
    method: 'GET',
    path: '/activities/completion-rates',
    query: AnalyticsQueryParams,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('completion-rates'),
          attributes: z.object({
            period: z.string(),
            overallRate: z.number(),
            onTimeRate: z.number(),
            byType: z.array(z.object({
              type: z.string(),
              completionRate: z.number(),
              onTimeRate: z.number(),
            })),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity completion statistics',
  },

  // Get cost analysis
  getCostAnalysis: {
    method: 'GET',
    path: '/activities/cost-analysis',
    query: AnalyticsQueryParams,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('cost-analysis'),
          attributes: z.object({
            period: z.string(),
            totalCost: z.number(),
            averageCost: z.number(),
            costVariance: z.number(),
            trends: z.array(z.object({
              period: z.string(),
              cost: z.number(),
            })),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity cost analysis',
  },

  // Generate report
  generateReport: {
    method: 'POST',
    path: '/activities/reports',
    body: GenerateReportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('reports'),
          attributes: z.object({
            status: z.string(),
            message: z.string(),
            downloadUrl: z.string().optional(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Generate custom activity report',
  },
});

export type ActivitiesAnalyticsContract = typeof activitiesAnalyticsContract;
