import { z } from 'zod';
import { CuidQueryParam } from './common';

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
  id: CuidQueryParam('id'),
  organizationId: CuidQueryParam('id'),
  orderId: CuidQueryParam('id').optional(),
  farmId: CuidQueryParam('id').optional(),
  categoryId: CuidQueryParam('id').optional(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']).default('NGN'),
  status: TransactionStatusSchema,
  description: z.string().min(1).max(500),
  reference: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  paidDate: z.string().datetime().optional(),
  requiresApproval: z.boolean().default(false),
  approvedBy: CuidQueryParam('id').optional(),
  approvedAt: z.string().datetime().optional(),
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
      orderId: CuidQueryParam('id').optional(),
      farmId: CuidQueryParam('id').optional(),
      categoryId: CuidQueryParam('id').optional(),
      dueDate: z.string().datetime().optional(),
      requiresApproval: z.boolean().default(false),
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
      categoryId: CuidQueryParam('id').optional(),
      paidDate: z.string().datetime().optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const TransactionFiltersSchema = z.object({
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  farmId: CuidQueryParam('id').optional(),
  orderId: CuidQueryParam('id').optional(),
  categoryId: CuidQueryParam('id').optional(),
  requiresApproval: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
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
// Bulk Operations Schemas
// =============================================================================

export const BulkUpdateRequestSchema = z.object({
  data: z.object({
    type: z.literal('bulk-transactions'),
    attributes: z.object({
      transactionIds: z.array(CuidQueryParam('id')),
      updates: z.object({
        status: TransactionStatusSchema.optional(),
        description: z.string().min(1).max(500).optional(),
        metadata: z.record(z.any()).optional()
      })
    })
  })
});

export const BulkDeleteRequestSchema = z.object({
  data: z.object({
    type: z.literal('bulk-transactions'),
    attributes: z.object({
      transactionIds: z.array(CuidQueryParam('id')),
      reason: z.string().min(1).max(200).optional()
    })
  })
});

export const BulkMarkPaidRequestSchema = z.object({
  data: z.object({
    type: z.literal('bulk-transactions'),
    attributes: z.object({
      transactionIds: z.array(CuidQueryParam('id')),
      paidDate: z.string().datetime().optional(),
      reference: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

// =============================================================================
// Transaction Categories Schemas
// =============================================================================

export const TransactionCategorySchema = z.object({
  id: CuidQueryParam('id'),
  organizationId: CuidQueryParam('id'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime()
});

export const CreateCategoryRequestSchema = z.object({
  data: z.object({
    type: z.literal('transaction-categories'),
    attributes: z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      isDefault: z.boolean().default(false)
    })
  })
});

export const UpdateCategoryRequestSchema = z.object({
  data: z.object({
    type: z.literal('transaction-categories'),
    attributes: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      isDefault: z.boolean().optional()
    })
  })
});

// =============================================================================
// Approval Workflow Schemas
// =============================================================================

export const ApprovalRequestSchema = z.object({
  data: z.object({
    type: z.literal('transaction-approvals'),
    attributes: z.object({
      approvedBy: CuidQueryParam('id'),
      approvalNotes: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const RejectionRequestSchema = z.object({
  data: z.object({
    type: z.literal('transaction-approvals'),
    attributes: z.object({
      rejectedBy: CuidQueryParam('id'),
      rejectionReason: z.string().min(1).max(500),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const PendingApprovalSchema = z.object({
  id: CuidQueryParam('id'),
  organizationId: CuidQueryParam('id'),
  transactionId: CuidQueryParam('id'),
  requestedBy: CuidQueryParam('id'),
  requestedAt: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  metadata: z.record(z.any()).optional()
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

// Bulk Operations Types
export type BulkUpdateRequest = z.infer<typeof BulkUpdateRequestSchema>;
export type BulkDeleteRequest = z.infer<typeof BulkDeleteRequestSchema>;
export type BulkMarkPaidRequest = z.infer<typeof BulkMarkPaidRequestSchema>;

// Transaction Categories Types
export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;

// Approval Workflow Types
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type RejectionRequest = z.infer<typeof RejectionRequestSchema>;
export type PendingApproval = z.infer<typeof PendingApprovalSchema>;
