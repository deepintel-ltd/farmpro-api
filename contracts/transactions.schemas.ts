import { z } from 'zod';

// =============================================================================
// Core Transaction Schemas
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

// =============================================================================
// Type Exports
// =============================================================================

export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;
export type UpdateTransactionRequest = z.infer<typeof UpdateTransactionRequestSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;
