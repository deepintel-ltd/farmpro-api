import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CommonQueryParams,
  CommonErrorResponses,
  CuidPathParam,
  CuidQueryParam,
} from './common';

const c = initContract();

// =============================================================================
// Farm Budgets Schemas
// =============================================================================

export const BudgetAttributesSchema = z.object({
  farmId: CuidQueryParam('farmId'),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  totalBudget: z.number().positive(),
  currency: z.string().default('NGN'),
  allocations: z.array(
    z.object({
      category: z.enum(['LAND_PREP', 'PLANTING', 'FERTILIZING', 'IRRIGATION', 'PEST_CONTROL', 'HARVESTING', 'MAINTENANCE', 'INFRASTRUCTURE', 'PROCUREMENT', 'LABOR', 'OTHER']),
      allocated: z.number().nonnegative(),
      spent: z.number().nonnegative().optional(),
      remaining: z.number().optional(),
    })
  ),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).default('DRAFT'),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const BudgetResourceSchema = z.object({
  data: z.object({
    type: z.literal('budgets'),
    id: CuidQueryParam('id'),
    attributes: BudgetAttributesSchema,
  }),
});

export const BudgetCollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('budgets'),
      id: CuidQueryParam('id'),
      attributes: BudgetAttributesSchema,
    })
  ),
  meta: z.object({
    totalCount: z.number(),
  }).optional(),
});

export const CreateBudgetRequestSchema = z.object({
  data: z.object({
    type: z.literal('budgets'),
    attributes: z.object({
      farmId: CuidQueryParam('farmId'),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      period: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }),
      totalBudget: z.number().positive(),
      currency: z.string().default('NGN'),
      allocations: z.array(
        z.object({
          category: z.enum(['LAND_PREP', 'PLANTING', 'FERTILIZING', 'IRRIGATION', 'PEST_CONTROL', 'HARVESTING', 'MAINTENANCE', 'INFRASTRUCTURE', 'PROCUREMENT', 'LABOR', 'OTHER']),
          allocated: z.number().nonnegative(),
        })
      ),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const UpdateBudgetRequestSchema = z.object({
  data: z.object({
    type: z.literal('budgets'),
    id: CuidQueryParam('id'),
    attributes: z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      period: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }).optional(),
      totalBudget: z.number().positive().optional(),
      allocations: z.array(
        z.object({
          category: z.enum(['LAND_PREP', 'PLANTING', 'FERTILIZING', 'IRRIGATION', 'PEST_CONTROL', 'HARVESTING', 'MAINTENANCE', 'INFRASTRUCTURE', 'PROCUREMENT', 'LABOR', 'OTHER']),
          allocated: z.number().nonnegative(),
        })
      ).optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

// =============================================================================
// Farm Budgets Contract
// =============================================================================

export const farmBudgetsContract = c.router({
  // Get all budgets
  getBudgets: {
    method: 'GET',
    path: '/budgets',
    query: CommonQueryParams.extend({
      farmId: CuidQueryParam('farmId').optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
      activeOnly: z.coerce.boolean().optional(),
    }),
    responses: {
      200: BudgetCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all farm budgets with filtering',
  },

  // Get single budget
  getBudget: {
    method: 'GET',
    path: '/budgets/:id',
    pathParams: CuidPathParam('Budget'),
    query: CommonQueryParams,
    responses: {
      200: BudgetResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single budget by ID',
  },

  // Create budget
  createBudget: {
    method: 'POST',
    path: '/budgets',
    body: CreateBudgetRequestSchema,
    responses: {
      201: BudgetResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new farm budget',
  },

  // Update budget
  updateBudget: {
    method: 'PATCH',
    path: '/budgets/:id',
    pathParams: CuidPathParam('Budget'),
    body: UpdateBudgetRequestSchema,
    responses: {
      200: BudgetResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing budget',
  },

  // Delete budget
  deleteBudget: {
    method: 'DELETE',
    path: '/budgets/:id',
    pathParams: CuidPathParam('Budget'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete a budget',
  },

  // Get budget summary with actual spending
  getBudgetSummary: {
    method: 'GET',
    path: '/budgets/:id/summary',
    pathParams: CuidPathParam('Budget'),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('budget-summary'),
          id: CuidQueryParam('id'),
          attributes: z.object({
            totalBudget: z.number(),
            totalSpent: z.number(),
            totalRemaining: z.number(),
            utilizationPercentage: z.number(),
            variance: z.number(),
            variancePercentage: z.number(),
            currency: z.string(),
            categoryBreakdown: z.array(
              z.object({
                category: z.string(),
                allocated: z.number(),
                spent: z.number(),
                remaining: z.number(),
                utilizationPercentage: z.number(),
                variance: z.number(),
                status: z.enum(['ON_TRACK', 'WARNING', 'OVER_BUDGET']),
              })
            ),
            alerts: z.array(
              z.object({
                category: z.string(),
                type: z.enum(['APPROACHING_LIMIT', 'OVER_BUDGET', 'UNDERSPENT']),
                message: z.string(),
                severity: z.enum(['low', 'medium', 'high']),
              })
            ),
            lastUpdated: z.string().datetime(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get budget summary with actual spending and variance analysis',
  },

  // Get cash flow projection
  getCashFlowProjection: {
    method: 'GET',
    path: '/budgets/:id/cash-flow',
    pathParams: CuidPathParam('Budget'),
    query: z.object({
      includeProjections: z.coerce.boolean().optional().default(true),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('cash-flow'),
          id: CuidQueryParam('id'),
          attributes: z.object({
            currentBalance: z.number(),
            projectedInflows: z.array(
              z.object({
                date: z.string().datetime(),
                amount: z.number(),
                source: z.string(),
                confidence: z.enum(['low', 'medium', 'high']),
              })
            ),
            projectedOutflows: z.array(
              z.object({
                date: z.string().datetime(),
                amount: z.number(),
                category: z.string(),
                confidence: z.enum(['low', 'medium', 'high']),
              })
            ),
            monthlyProjections: z.array(
              z.object({
                month: z.string(),
                openingBalance: z.number(),
                inflows: z.number(),
                outflows: z.number(),
                closingBalance: z.number(),
              })
            ),
            alerts: z.array(
              z.object({
                date: z.string().datetime(),
                message: z.string(),
                severity: z.enum(['low', 'medium', 'high']),
              })
            ),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get cash flow projection for budget period',
  },
});

export type FarmBudgetsContract = typeof farmBudgetsContract;
