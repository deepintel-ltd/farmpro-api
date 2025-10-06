import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CommonQueryParams, CommonErrorResponses } from './common';

const c = initContract();

// =============================================================================
// Executive Dashboard Schemas
// =============================================================================

export const FinancialHealthScoreSchema = z.object({
  score: z.number().min(0).max(100),
  trend: z.number(), // percentage change from previous period
  factors: z.object({
    cashFlow: z.number().min(0).max(100),
    profitability: z.number().min(0).max(100),
    growth: z.number().min(0).max(100),
    efficiency: z.number().min(0).max(100),
  }),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  recommendations: z.array(z.string()),
  lastCalculated: z.string().datetime(),
});

export const RiskIndicatorSchema = z.object({
  overallRisk: z.enum(['Low', 'Medium', 'High', 'Critical']),
  riskTrend: z.number(), // percentage change
  indicators: z.object({
    overduePayments: z.number(),
    budgetVariance: z.number(), // percentage over/under budget
    cashFlowRisk: z.enum(['Low', 'Medium', 'High']),
    marketRisk: z.enum(['Low', 'Medium', 'High']),
    operationalRisk: z.enum(['Low', 'Medium', 'High']),
  }),
  alerts: z.array(z.object({
    id: z.string().cuid(),
    type: z.enum(['financial', 'operational', 'market', 'compliance']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string(),
    description: z.string(),
    actionRequired: z.boolean(),
    createdAt: z.string().datetime(),
  })),
  lastCalculated: z.string().datetime(),
});

export const CashFlowAnalysisSchema = z.object({
  currentCashFlow: z.number(),
  projectedCashFlow: z.number(),
  trend: z.number(), // percentage change
  breakdown: z.object({
    operating: z.number(),
    investing: z.number(),
    financing: z.number(),
  }),
  burnRate: z.number(), // monthly cash burn
  runway: z.number(), // months of runway remaining
  lastCalculated: z.string().datetime(),
});

export const ExecutiveMetricSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  trend: z.number(),
  trendDirection: z.enum(['up', 'down', 'stable']),
  color: z.enum(['success', 'warning', 'error', 'info', 'primary']),
  description: z.string(),
  lastUpdated: z.string().datetime(),
});

export const ExecutiveDashboardSchema = z.object({
  financialHealth: FinancialHealthScoreSchema,
  riskIndicators: RiskIndicatorSchema,
  cashFlow: CashFlowAnalysisSchema,
  keyMetrics: z.array(ExecutiveMetricSchema),
  pendingActions: z.array(z.object({
    id: z.string().cuid(),
    type: z.enum(['approval', 'review', 'decision', 'follow_up']),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    dueDate: z.string().datetime().optional(),
    assignedTo: z.string().optional(),
    createdAt: z.string().datetime(),
  })),
  insights: z.array(z.object({
    id: z.string().cuid(),
    category: z.enum(['performance', 'efficiency', 'market', 'sustainability', 'risk']),
    title: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
    confidence: z.number().min(0).max(1),
    actionable: z.boolean(),
    recommendations: z.array(z.string()).optional(),
  })),
  lastUpdated: z.string().datetime(),
});

// =============================================================================
// Query Schemas
// =============================================================================

export const ExecutiveDashboardQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
  includeInsights: z.coerce.boolean().optional().default(true),
  includeProjections: z.coerce.boolean().optional().default(true),
  useCache: z.coerce.boolean().optional().default(true),
}).merge(CommonQueryParams);

export const FinancialHealthQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
  includeBreakdown: z.coerce.boolean().optional().default(true),
  useCache: z.coerce.boolean().optional().default(true),
}).merge(CommonQueryParams);

export const RiskIndicatorsQuerySchema = z.object({
  includeAlerts: z.coerce.boolean().optional().default(true),
  alertSeverity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  useCache: z.coerce.boolean().optional().default(true),
}).merge(CommonQueryParams);

export const CashFlowQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
  includeProjections: z.coerce.boolean().optional().default(true),
  projectionMonths: z.number().min(1).max(12).optional().default(6),
  useCache: z.coerce.boolean().optional().default(true),
}).merge(CommonQueryParams);

// =============================================================================
// Contract Definition
// =============================================================================

export const executiveDashboardContract = c.router({
  // =============================================================================
  // Executive Dashboard - Main Overview
  // =============================================================================
  
  getExecutiveDashboard: {
    method: 'GET',
    path: '/organizations/executive-dashboard',
    query: ExecutiveDashboardQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('executive-dashboard'),
          id: z.string(),
          attributes: ExecutiveDashboardSchema,
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get comprehensive executive dashboard overview',
    description: 'Provides executive-level metrics, financial health, risk indicators, and actionable insights for strategic decision-making',
  },

  // =============================================================================
  // Financial Health Score
  // =============================================================================
  
  getFinancialHealth: {
    method: 'GET',
    path: '/organizations/financial-health',
    query: FinancialHealthQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('financial-health'),
          id: z.string(),
          attributes: FinancialHealthScoreSchema,
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get organization financial health score',
    description: 'Calculates and returns a comprehensive financial health score based on cash flow, profitability, growth, and efficiency metrics',
  },

  // =============================================================================
  // Risk Indicators
  // =============================================================================
  
  getRiskIndicators: {
    method: 'GET',
    path: '/organizations/risk-indicators',
    query: RiskIndicatorsQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('risk-indicators'),
          id: z.string(),
          attributes: RiskIndicatorSchema,
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get organization risk indicators and alerts',
    description: 'Provides comprehensive risk assessment including financial, operational, and market risks with actionable alerts',
  },

  // =============================================================================
  // Cash Flow Analysis
  // =============================================================================
  
  getCashFlowAnalysis: {
    method: 'GET',
    path: '/organizations/cash-flow',
    query: CashFlowQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('cash-flow'),
          id: z.string(),
          attributes: CashFlowAnalysisSchema,
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get organization cash flow analysis',
    description: 'Provides detailed cash flow analysis including current status, projections, burn rate, and runway calculations',
  },

  // =============================================================================
  // Executive Actions
  // =============================================================================
  
  getPendingActions: {
    method: 'GET',
    path: '/organizations/pending-actions',
    query: z.object({
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      type: z.enum(['approval', 'review', 'decision', 'follow_up']).optional(),
      limit: z.coerce.number().min(1).max(50).optional().default(10),
      useCache: z.coerce.boolean().optional().default(true),
    }).merge(CommonQueryParams),
    responses: {
      200: z.object({
        data: z.array(z.object({
          type: z.literal('pending-action'),
          id: z.string(),
          attributes: z.object({
            type: z.enum(['approval', 'review', 'decision', 'follow_up']),
            title: z.string(),
            description: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            dueDate: z.string().datetime().optional(),
            assignedTo: z.string().optional(),
            createdAt: z.string().datetime(),
          }),
        })),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get pending executive actions',
    description: 'Retrieves all pending actions requiring executive attention, including approvals, reviews, and decisions',
  },

  // =============================================================================
  // Executive Insights
  // =============================================================================
  
  getExecutiveInsights: {
    method: 'GET',
    path: '/organizations/executive-insights',
    query: z.object({
      category: z.enum(['performance', 'efficiency', 'market', 'sustainability', 'risk']).optional(),
      impact: z.enum(['low', 'medium', 'high']).optional(),
      actionable: z.coerce.boolean().optional(),
      limit: z.coerce.number().min(1).max(20).optional().default(10),
      useCache: z.coerce.boolean().optional().default(true),
    }).merge(CommonQueryParams),
    responses: {
      200: z.object({
        data: z.array(z.object({
          type: z.literal('executive-insight'),
          id: z.string(),
          attributes: z.object({
            category: z.enum(['performance', 'efficiency', 'market', 'sustainability', 'risk']),
            title: z.string(),
            description: z.string(),
            impact: z.enum(['low', 'medium', 'high']),
            confidence: z.number().min(0).max(1),
            actionable: z.boolean(),
            recommendations: z.array(z.string()).optional(),
            createdAt: z.string().datetime(),
          }),
        })),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get executive insights and recommendations',
    description: 'Provides AI-powered insights and recommendations for strategic decision-making',
  },
});

export type ExecutiveDashboardContract = typeof executiveDashboardContract;
