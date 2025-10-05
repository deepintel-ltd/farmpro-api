import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { JsonApiErrorResponseSchema } from './common';

const c = initContract();

// =============================================================================
// Transaction Schemas
// =============================================================================

export const TransactionTypeSchema = z.enum([
  'FARM_EXPENSE',
  'FARM_REVENUE', 
  'ORDER_PAYMENT',
  'PLATFORM_FEE',
  'REFUND'
]);

export const TransactionStatusSchema = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]);

export const TransactionSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  orderId: z.string().cuid().optional(),
  farmId: z.string().cuid().optional(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']).default('NGN'),
  status: TransactionStatusSchema,
  description: z.string().min(1).max(500),
  reference: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  paidDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime()
});

// =============================================================================
// Request/Response Schemas
// =============================================================================

export const CreateTransactionRequestSchema = z.object({
  data: z.object({
    type: z.literal('transactions'),
    attributes: z.object({
      type: TransactionTypeSchema,
      amount: z.number().positive(),
      currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']).default('NGN'),
      description: z.string().min(1).max(500),
      orderId: z.string().cuid().optional(),
      farmId: z.string().cuid().optional(),
      dueDate: z.string().datetime().optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const UpdateTransactionRequestSchema = z.object({
  data: z.object({
    type: z.literal('transactions'),
    attributes: z.object({
      status: TransactionStatusSchema.optional(),
      amount: z.number().positive().optional(),
      description: z.string().min(1).max(500).optional(),
      paidDate: z.string().datetime().optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const TransactionFiltersSchema = z.object({
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  farmId: z.string().cuid().optional(),
  orderId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

export const TransactionSummarySchema = z.object({
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  netProfit: z.number(),
  transactionCount: z.number(),
  pendingAmount: z.number(),
  completedAmount: z.number()
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
});

// =============================================================================
// Contract Definition
// =============================================================================

export const transactionsContract = c.router({
  // Create a new transaction
  createTransaction: {
    method: 'POST',
    path: '/transactions',
    responses: {
      201: z.object({
        data: TransactionSchema
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    body: CreateTransactionRequestSchema,
    summary: 'Create a new transaction'
  },

  // Get transaction by ID
  getTransaction: {
    method: 'GET',
    path: '/transactions/:id',
    responses: {
      200: z.object({
        data: TransactionSchema
      }),
      404: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    pathParams: z.object({
      id: z.string().cuid()
    }),
    summary: 'Get transaction by ID'
  },

  // Update transaction
  updateTransaction: {
    method: 'PATCH',
    path: '/transactions/:id',
    responses: {
      200: z.object({
        data: TransactionSchema
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    pathParams: z.object({
      id: z.string().cuid()
    }),
    body: UpdateTransactionRequestSchema,
    summary: 'Update transaction'
  },

  // Get transaction summary/analytics
  getTransactionSummary: {
    method: 'GET',
    path: '/transactions/summary',
    responses: {
      200: z.object({
        data: TransactionSummarySchema
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    query: z.object({
      farmId: z.string().cuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      type: TransactionTypeSchema.optional()
    }),
    summary: 'Get transaction summary and analytics'
  },

  // List transactions with filters
  listTransactions: {
    method: 'GET',
    path: '/transactions',
    responses: {
      200: z.object({
        data: z.array(TransactionSchema),
        meta: PaginationMetaSchema
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    query: TransactionFiltersSchema,
    summary: 'List transactions with filters'
  },

  // Mark transaction as paid
  markAsPaid: {
    method: 'PATCH',
    path: '/transactions/:id/paid',
    responses: {
      200: z.object({
        data: TransactionSchema
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    pathParams: z.object({
      id: z.string().cuid()
    }),
    body: z.object({
      data: z.object({
        type: z.literal('transactions'),
        attributes: z.object({
          paidDate: z.string().datetime().optional(),
          reference: z.string().optional(),
          metadata: z.record(z.any()).optional()
        })
      })
    }),
    summary: 'Mark transaction as paid'
  },

  // Cancel transaction
  cancelTransaction: {
    method: 'PATCH',
    path: '/transactions/:id/cancel',
    responses: {
      200: z.object({
        data: TransactionSchema
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    pathParams: z.object({
      id: z.string().cuid()
    }),
    body: z.object({
      data: z.object({
        type: z.literal('transactions'),
        attributes: z.object({
          reason: z.string().min(1).max(200).optional(),
          metadata: z.record(z.any()).optional()
        })
      })
    }),
    summary: 'Cancel transaction'
  }
});

export type TransactionsContract = typeof transactionsContract;
