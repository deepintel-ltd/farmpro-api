import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { JsonApiErrorResponseSchema } from './common';
import { JsonApiCollectionSchema } from './schemas';

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
  categoryId: z.string().cuid().optional(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']).default('NGN'),
  status: TransactionStatusSchema,
  description: z.string().min(1).max(500),
  reference: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  paidDate: z.string().datetime().optional(),
  requiresApproval: z.boolean().default(false),
  createdBy: z.object({
    id: z.string().cuid(),
    name: z.string()
  }),
  approvedBy: z.object({
    id: z.string().cuid(),
    name: z.string()
  }).optional(),
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
      orderId: z.string().cuid().optional(),
      farmId: z.string().cuid().optional(),
      categoryId: z.string().cuid().optional(),
      dueDate: z.string().datetime().optional(),
      requiresApproval: z.boolean().default(false),
      createdBy: z.object({
        id: z.string().cuid(),
        name: z.string()
      }).optional(),
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
      categoryId: z.string().cuid().optional(),
      paidDate: z.string().datetime().optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const TransactionFiltersSchema = z.object({
  // Direct field filters
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  farmId: z.string().cuid().optional(),
  orderId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  requiresApproval: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  
  // JSON:API compliant filter syntax
  'filter[type]': TransactionTypeSchema.optional(),
  'filter[status]': TransactionStatusSchema.optional(),
  'filter[farmId]': z.string().cuid().optional(),
  'filter[orderId]': z.string().cuid().optional(),
  'filter[categoryId]': z.string().cuid().optional(),
  'filter[requiresApproval]': z.coerce.boolean().optional(),
  'filter[startDate]': z.string().datetime().optional(),
  'filter[endDate]': z.string().datetime().optional(),
  'filter[minAmount]': z.coerce.number().positive().optional(),
  'filter[maxAmount]': z.coerce.number().positive().optional(),
  
  // Income/Expense filtering using JSON:API filter syntax
  'filter[transactionCategory]': z.enum(['income', 'expense']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const TransactionSummaryQuerySchema = z.object({
  farmId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: TransactionTypeSchema.optional()
});

export const TransactionSummarySchema = z.object({
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  netProfit: z.number(),
  transactionCount: z.number(),
  pendingAmount: z.number(),
  completedAmount: z.number(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']).default('USD')
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
});

// =============================================================================
// Bulk Operations Schemas
// =============================================================================

export const BulkUpdateRequestSchema = z.object({
  data: z.object({
    type: z.literal('bulk-transactions'),
    attributes: z.object({
      transactionIds: z.array(z.string().cuid()),
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
      transactionIds: z.array(z.string().cuid()),
      reason: z.string().min(1).max(200).optional()
    })
  })
});

export const BulkMarkPaidRequestSchema = z.object({
  data: z.object({
    type: z.literal('bulk-transactions'),
    attributes: z.object({
      transactionIds: z.array(z.string().cuid()),
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
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
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
      approvedBy: z.object({
        id: z.string().cuid(),
        name: z.string()
      }),
      approvalNotes: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const RejectionRequestSchema = z.object({
  data: z.object({
    type: z.literal('transaction-approvals'),
    attributes: z.object({
      rejectedBy: z.object({
        id: z.string().cuid(),
        name: z.string()
      }),
      rejectionReason: z.string().min(1).max(500),
      metadata: z.record(z.any()).optional()
    })
  })
});

export const PendingApprovalSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  transactionId: z.string().cuid(),
  requestedBy: z.object({
    id: z.string().cuid(),
    name: z.string()
  }),
  requestedAt: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  metadata: z.record(z.any()).optional()
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
    query: TransactionSummaryQuerySchema,
    summary: 'Get transaction summary and analytics'
  },

  // List transactions with filters
  listTransactions: {
    method: 'GET',
    path: '/transactions',
    responses: {
      200: JsonApiCollectionSchema(TransactionSchema).extend({
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
  },

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  // Bulk update transactions
  bulkUpdateTransactions: {
    method: 'PATCH',
    path: '/transactions/bulk',
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('bulk-transactions'),
          attributes: z.object({
            updatedCount: z.number(),
            failedCount: z.number(),
            errors: z.array(z.object({
              transactionId: z.string(),
              error: z.string()
            })).optional()
          })
        })
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    body: BulkUpdateRequestSchema,
    summary: 'Bulk update multiple transactions'
  },

  // Bulk delete transactions
  bulkDeleteTransactions: {
    method: 'DELETE',
    path: '/transactions/bulk',
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('bulk-transactions'),
          attributes: z.object({
            deletedCount: z.number(),
            failedCount: z.number(),
            errors: z.array(z.object({
              transactionId: z.string(),
              error: z.string()
            })).optional()
          })
        })
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    body: BulkDeleteRequestSchema,
    summary: 'Bulk delete multiple transactions'
  },

  // Bulk mark transactions as paid
  bulkMarkAsPaid: {
    method: 'PATCH',
    path: '/transactions/bulk/paid',
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('bulk-transactions'),
          attributes: z.object({
            updatedCount: z.number(),
            failedCount: z.number(),
            errors: z.array(z.object({
              transactionId: z.string(),
              error: z.string()
            })).optional()
          })
        })
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    body: BulkMarkPaidRequestSchema,
    summary: 'Bulk mark multiple transactions as paid'
  },

  // =============================================================================
  // Transaction Categories
  // =============================================================================

  // Get transaction categories
  getTransactionCategories: {
    method: 'GET',
    path: '/transactions/categories',
    responses: {
      200: z.object({
        data: z.array(TransactionCategorySchema)
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    summary: 'Get all transaction categories for organization'
  },

  // Create transaction category
  createTransactionCategory: {
    method: 'POST',
    path: '/transactions/categories',
    responses: {
      201: z.object({
        data: TransactionCategorySchema
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    body: CreateCategoryRequestSchema,
    summary: 'Create a new transaction category'
  },

  // Update transaction category
  updateTransactionCategory: {
    method: 'PATCH',
    path: '/transactions/categories/:id',
    responses: {
      200: z.object({
        data: TransactionCategorySchema
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
    body: UpdateCategoryRequestSchema,
    summary: 'Update transaction category'
  },

  // Delete transaction category
  deleteTransactionCategory: {
    method: 'DELETE',
    path: '/transactions/categories/:id',
    responses: {
      200: z.object({
        data: z.object({
          success: z.boolean(),
          message: z.string()
        })
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
    summary: 'Delete transaction category'
  },

  // =============================================================================
  // Approval Workflow
  // =============================================================================

  // Approve transaction
  approveTransaction: {
    method: 'PATCH',
    path: '/transactions/:id/approve',
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
    body: ApprovalRequestSchema,
    summary: 'Approve a transaction'
  },

  // Reject transaction
  rejectTransaction: {
    method: 'PATCH',
    path: '/transactions/:id/reject',
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
    body: RejectionRequestSchema,
    summary: 'Reject a transaction'
  },

  // Get pending approvals
  getPendingApprovals: {
    method: 'GET',
    path: '/transactions/pending-approvals',
    responses: {
      200: z.object({
        data: z.array(PendingApprovalSchema),
        meta: PaginationMetaSchema
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema
    },
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      farmId: z.string().cuid().optional()
    }),
    summary: 'Get transactions pending approval'
  }
});

export type TransactionsContract = typeof transactionsContract;
