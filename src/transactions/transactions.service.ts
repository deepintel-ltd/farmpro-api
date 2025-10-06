import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransactionType, TransactionStatus, Currency } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  CreateTransactionRequestSchema, 
  UpdateTransactionRequestSchema, 
  TransactionFiltersSchema,
  BulkUpdateRequestSchema,
  BulkDeleteRequestSchema,
  BulkMarkPaidRequestSchema,
  CreateCategoryRequestSchema,
  UpdateCategoryRequestSchema,
  ApprovalRequestSchema,
  RejectionRequestSchema
} from '@contracts/transactions.contract';
import { TransactionsContract } from '@contracts/transactions.contract';
import { ExtractRequestBodyType } from '@contracts/type-safety';

// Extract types from the contract for type safety
type MarkAsPaidRequest = ExtractRequestBodyType<TransactionsContract['markAsPaid']>;
type CancelTransactionRequest = ExtractRequestBodyType<TransactionsContract['cancelTransaction']>;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new transaction
   */
  async createTransaction(user: CurrentUser, data: z.infer<typeof CreateTransactionRequestSchema>) {
    this.logger.log(`Creating transaction for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Validate that user has access to the organization
    await this.validateOrganizationAccess(user.organizationId);

    // Validate optional entity access
    if (attributes.farmId) {
      await this.validateFarmAccess(attributes.farmId, user.organizationId);
    }
    if (attributes.orderId) {
      await this.validateOrderAccess(attributes.orderId, user.organizationId);
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        organizationId: user.organizationId,
        type: attributes.type as TransactionType,
        amount: attributes.amount,
        currency: attributes.currency as Currency,
        status: TransactionStatus.PENDING,
        description: attributes.description,
        orderId: attributes.orderId,
        farmId: attributes.farmId,
        categoryId: attributes.categoryId,
        dueDate: attributes.dueDate ? new Date(attributes.dueDate) : null,
        requiresApproval: attributes.requiresApproval || false,
        createdById: user.userId,
        metadata: attributes.metadata || {},
        reference: this.generateReference(attributes.type)
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, title: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    this.logger.log(`Successfully created transaction ${transaction.id}`);

    return await this.mapTransactionToResponse(transaction);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(user: CurrentUser, transactionId: string) {
    this.logger.log(`Getting transaction ${transactionId} for user: ${user.userId}`);

    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId: user.organizationId
        },
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true }
          }
        }
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }

      return await this.mapTransactionToResponse(transaction);
    } catch (error) {
      // If it's already a NotFoundException, rethrow it
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle Prisma validation errors for invalid ID format
      if (error instanceof Error && (
        error.message.includes('Invalid') ||
        error.message.includes('invalid') ||
        error.message.includes('malformed')
      )) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }
      // Rethrow other errors
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(user: CurrentUser, transactionId: string, data: z.infer<typeof UpdateTransactionRequestSchema>) {
    this.logger.log(`Updating transaction ${transactionId} for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    try {
      // Use transaction with locking to prevent race conditions
      const transaction = await this.prisma.$transaction(async (tx) => {
        // Lock the transaction record for update
        const existingTransaction = await tx.transaction.findFirst({
          where: {
            id: transactionId,
            organizationId: user.organizationId
          }
        });

        if (!existingTransaction) {
          throw new NotFoundException(`Transaction ${transactionId} not found`);
        }

        // Validate status transitions
        if (attributes.status && existingTransaction.status !== attributes.status) {
          this.validateStatusTransition(existingTransaction.status, attributes.status as TransactionStatus);
        }

        const updateData: Prisma.TransactionUpdateInput = {};

        if (attributes.status) updateData.status = attributes.status as TransactionStatus;
        if (attributes.amount) updateData.amount = attributes.amount;
        if (attributes.description) updateData.description = attributes.description;
        if (attributes.categoryId) {
          updateData.category = {
            connect: { id: attributes.categoryId }
          };
        }
        if (attributes.paidDate) updateData.paidDate = new Date(attributes.paidDate);
        if (attributes.metadata) {
          updateData.metadata = {
            ...(existingTransaction.metadata as Record<string, any> || {}),
            ...attributes.metadata,
            updatedBy: user.userId,
            updatedAt: new Date().toISOString()
          };
        } else {
          updateData.metadata = {
            ...(existingTransaction.metadata as Record<string, any> || {}),
            updatedBy: user.userId,
            updatedAt: new Date().toISOString()
          };
        }

        return await tx.transaction.update({
          where: { id: transactionId },
          data: updateData,
          include: {
            order: {
              select: { id: true, orderNumber: true, title: true }
            },
            organization: {
              select: { id: true, name: true }
            }
          }
        });
      });

      this.logger.log(`Successfully updated transaction ${transaction.id}`);

      return await this.mapTransactionToResponse(transaction);
    } catch (error) {
      // If it's already a NotFoundException or BadRequestException, rethrow it
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Handle Prisma validation errors for invalid ID format
      if (error instanceof Error && (
        error.message.includes('Invalid') ||
        error.message.includes('invalid') ||
        error.message.includes('malformed')
      )) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }
      // Rethrow other errors
      throw error;
    }
  }

  /**
   * List transactions with filters
   */
  async listTransactions(user: CurrentUser, filters: z.infer<typeof TransactionFiltersSchema>) {
    this.logger.log(`Listing transactions for user: ${user.userId}`);

    const where: Prisma.TransactionWhereInput = {
      organizationId: user.organizationId
    };

    // Apply filters (support both legacy and JSON:API filter syntax)
    const typeFilter = filters.type || filters['filter[type]'];
    const statusFilter = filters.status || filters['filter[status]'];
    const farmIdFilter = filters.farmId || filters['filter[farmId]'];
    const orderIdFilter = filters.orderId || filters['filter[orderId]'];
    const categoryIdFilter = filters.categoryId || filters['filter[categoryId]'];
    const requiresApprovalFilter = filters.requiresApproval !== undefined ? filters.requiresApproval : filters['filter[requiresApproval]'];
    const startDateFilter = filters.startDate || filters['filter[startDate]'];
    const endDateFilter = filters.endDate || filters['filter[endDate]'];
    const minAmountFilter = filters.minAmount || filters['filter[minAmount]'];
    const maxAmountFilter = filters.maxAmount || filters['filter[maxAmount]'];
    const transactionCategoryFilter = filters['filter[transactionCategory]'];

    if (typeFilter) where.type = typeFilter as TransactionType;
    if (statusFilter) where.status = statusFilter as TransactionStatus;
    if (farmIdFilter) where.farmId = farmIdFilter;
    if (orderIdFilter) where.orderId = orderIdFilter;
    if (categoryIdFilter) where.categoryId = categoryIdFilter;
    if (requiresApprovalFilter !== undefined) where.requiresApproval = requiresApprovalFilter;
    
    if (startDateFilter || endDateFilter) {
      where.createdAt = {};
      if (startDateFilter) where.createdAt.gte = new Date(startDateFilter);
      if (endDateFilter) where.createdAt.lte = new Date(endDateFilter);
    }
    
    if (minAmountFilter || maxAmountFilter) {
      where.amount = {};
      if (minAmountFilter) where.amount.gte = minAmountFilter;
      if (maxAmountFilter) where.amount.lte = maxAmountFilter;
    }

    // Apply income/expense filtering using JSON:API filter syntax
    if (transactionCategoryFilter) {
      const incomeTypes = [TransactionType.FARM_REVENUE, TransactionType.ORDER_PAYMENT, TransactionType.REFUND];
      const expenseTypes = [TransactionType.FARM_EXPENSE, TransactionType.PLATFORM_FEE];

      if (transactionCategoryFilter === 'income') {
        where.type = { in: incomeTypes };
      } else if (transactionCategoryFilter === 'expense') {
        where.type = { in: expenseTypes };
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      this.prisma.transaction.count({ where })
    ]);

    const totalPages = Math.ceil(total / filters.limit);

    return {
      data: await Promise.all(transactions.map(async transaction => (await this.mapTransactionToResponse(transaction)).data)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get transaction summary/analytics
   */
  async getTransactionSummary(user: CurrentUser, filters: {
    farmId?: string;
    startDate?: string;
    endDate?: string;
    type?: TransactionType;
  }) {
    this.logger.log(`Getting transaction summary for user: ${user.userId}`);

    const where: Prisma.TransactionWhereInput = {
      organizationId: user.organizationId
    };

    if (filters.farmId) where.farmId = filters.farmId;
    if (filters.type) where.type = filters.type;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    // Check for mixed currencies
    const currencyCheck = await this.prisma.transaction.findMany({
      where,
      select: { currency: true },
      distinct: ['currency']
    });

    if (currencyCheck.length > 1) {
      throw new BadRequestException(
        `Cannot generate summary with mixed currencies: ${currencyCheck.map(c => c.currency).join(', ')}. ` +
        'Please filter by a specific currency or convert all transactions to the same currency.'
      );
    }

    const [revenueData, expenseData, pendingData, completedData, totalCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.FARM_REVENUE },
        _sum: { amount: true }
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.FARM_EXPENSE },
        _sum: { amount: true }
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, status: TransactionStatus.PENDING },
        _sum: { amount: true }
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, status: TransactionStatus.COMPLETED },
        _sum: { amount: true }
      }),
      this.prisma.transaction.count({ where })
    ]);

    const totalRevenue = parseFloat(revenueData._sum.amount?.toString() || '0');
    const totalExpenses = parseFloat(expenseData._sum.amount?.toString() || '0');
    const netProfit = totalRevenue - totalExpenses;
    const pendingAmount = parseFloat(pendingData._sum.amount?.toString() || '0');
    const completedAmount = parseFloat(completedData._sum.amount?.toString() || '0');

    // Get the currency from the first transaction (all should be the same due to validation)
    const currency = currencyCheck.length > 0 ? currencyCheck[0].currency : 'NGN';

    return {
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        transactionCount: totalCount,
        pendingAmount,
        completedAmount,
        currency
      }
    };
  }

  /**
   * Mark transaction as paid
   */
  async markAsPaid(user: CurrentUser, transactionId: string, data: MarkAsPaidRequest) {
    this.logger.log(`Marking transaction ${transactionId} as paid for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Use transaction with locking to prevent race conditions
    const transaction = await this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId: user.organizationId
        }
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }

      if (existingTransaction.status === TransactionStatus.COMPLETED) {
        throw new BadRequestException('Transaction is already completed');
      }

      const updateData: Prisma.TransactionUpdateInput = {
        status: TransactionStatus.COMPLETED,
        paidDate: attributes.paidDate ? new Date(attributes.paidDate) : new Date()
      };

      if (attributes.reference) updateData.reference = attributes.reference;
      if (attributes.metadata) {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          ...attributes.metadata,
          paidBy: user.userId,
          paidAt: new Date().toISOString()
        };
      } else {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          paidBy: user.userId,
          paidAt: new Date().toISOString()
        };
      }

      return await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      });
    });

    this.logger.log(`Successfully marked transaction ${transaction.id} as paid`);

    return await this.mapTransactionToResponse(transaction);
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(user: CurrentUser, transactionId: string, data: CancelTransactionRequest) {
    this.logger.log(`Cancelling transaction ${transactionId} for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Use transaction with locking to prevent race conditions
    const transaction = await this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId: user.organizationId
        }
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }

      if (existingTransaction.status === TransactionStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel a completed transaction');
      }

      if (existingTransaction.status === TransactionStatus.CANCELLED) {
        throw new BadRequestException('Transaction is already cancelled');
      }

      const updateData: Prisma.TransactionUpdateInput = {
        status: TransactionStatus.CANCELLED
      };

      if (attributes.metadata) {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          ...attributes.metadata,
          cancellationReason: attributes.reason,
          cancelledBy: user.userId,
          cancelledAt: new Date().toISOString()
        };
      } else {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          cancellationReason: attributes.reason,
          cancelledBy: user.userId,
          cancelledAt: new Date().toISOString()
        };
      }

      return await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      });
    });

    this.logger.log(`Successfully cancelled transaction ${transaction.id}`);

    return await this.mapTransactionToResponse(transaction);
  }

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  /**
   * Bulk update transactions
   */
  async bulkUpdateTransactions(user: CurrentUser, data: z.infer<typeof BulkUpdateRequestSchema>) {
    this.logger.log(`Bulk updating transactions for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;
    const { transactionIds, updates } = attributes;

    // Validate that all transactions belong to the user's organization
    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        organizationId: user.organizationId
      }
    });

    if (existingTransactions.length !== transactionIds.length) {
      throw new BadRequestException('Some transactions not found or access denied');
    }

    const results = {
      updatedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ transactionId: string; error: string }>
    };

    // Process each transaction update
    for (const transactionId of transactionIds) {
      try {
        const updateData: Prisma.TransactionUpdateInput = {};

        if (updates.status) {
          const existingTransaction = existingTransactions.find(t => t.id === transactionId);
          if (existingTransaction) {
            this.validateStatusTransition(existingTransaction.status, updates.status as TransactionStatus);
          }
          updateData.status = updates.status as TransactionStatus;
        }
        if (updates.description) updateData.description = updates.description;
        if (updates.metadata) {
          const existingTransaction = existingTransactions.find(t => t.id === transactionId);
          updateData.metadata = {
            ...(existingTransaction?.metadata as Record<string, any> || {}),
            ...updates.metadata,
            updatedBy: user.userId,
            updatedAt: new Date().toISOString()
          };
        }

        await this.prisma.transaction.update({
          where: { id: transactionId },
          data: updateData
        });

        results.updatedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.log(`Bulk update completed: ${results.updatedCount} updated, ${results.failedCount} failed`);

    return {
      data: {
        type: 'bulk-transactions' as const,
        attributes: results
      }
    };
  }

  /**
   * Bulk delete transactions
   */
  async bulkDeleteTransactions(user: CurrentUser, data: z.infer<typeof BulkDeleteRequestSchema>) {
    this.logger.log(`Bulk deleting transactions for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;
    const { transactionIds } = attributes;

    // Validate that all transactions belong to the user's organization
    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        organizationId: user.organizationId
      }
    });

    if (existingTransactions.length !== transactionIds.length) {
      throw new BadRequestException('Some transactions not found or access denied');
    }

    const results = {
      deletedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ transactionId: string; error: string }>
    };

    // Process each transaction deletion
    for (const transactionId of transactionIds) {
      try {
        const existingTransaction = existingTransactions.find(t => t.id === transactionId);
        
        // Check if transaction can be deleted (not completed)
        if (existingTransaction?.status === TransactionStatus.COMPLETED) {
          throw new BadRequestException('Cannot delete completed transactions');
        }

        await this.prisma.transaction.delete({
          where: { id: transactionId }
        });

        results.deletedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.log(`Bulk delete completed: ${results.deletedCount} deleted, ${results.failedCount} failed`);

    return {
      data: {
        type: 'bulk-transactions' as const,
        attributes: results
      }
    };
  }

  /**
   * Bulk mark transactions as paid
   */
  async bulkMarkAsPaid(user: CurrentUser, data: z.infer<typeof BulkMarkPaidRequestSchema>) {
    this.logger.log(`Bulk marking transactions as paid for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;
    const { transactionIds, paidDate, reference, metadata } = attributes;

    // Validate that all transactions belong to the user's organization
    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        organizationId: user.organizationId
      }
    });

    if (existingTransactions.length !== transactionIds.length) {
      throw new BadRequestException('Some transactions not found or access denied');
    }

    const results = {
      updatedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ transactionId: string; error: string }>
    };

    // Process each transaction
    for (const transactionId of transactionIds) {
      try {
        const existingTransaction = existingTransactions.find(t => t.id === transactionId);
        
        if (!existingTransaction) {
          throw new NotFoundException(`Transaction ${transactionId} not found`);
        }

        if (existingTransaction.status === TransactionStatus.COMPLETED) {
          throw new BadRequestException('Transaction is already completed');
        }

        const updateData: Prisma.TransactionUpdateInput = {
          status: TransactionStatus.COMPLETED,
          paidDate: paidDate ? new Date(paidDate) : new Date()
        };

        if (reference) updateData.reference = reference;
        if (metadata) {
          updateData.metadata = {
            ...(existingTransaction.metadata as Record<string, any> || {}),
            ...metadata,
            paidBy: user.userId,
            paidAt: new Date().toISOString()
          };
        } else {
          updateData.metadata = {
            ...(existingTransaction.metadata as Record<string, any> || {}),
            paidBy: user.userId,
            paidAt: new Date().toISOString()
          };
        }

        await this.prisma.transaction.update({
          where: { id: transactionId },
          data: updateData
        });

        results.updatedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.log(`Bulk mark as paid completed: ${results.updatedCount} updated, ${results.failedCount} failed`);

    return {
      data: {
        type: 'bulk-transactions' as const,
        attributes: results
      }
    };
  }

  // =============================================================================
  // Transaction Categories
  // =============================================================================

  /**
   * Get transaction categories
   */
  async getTransactionCategories(user: CurrentUser) {
    this.logger.log(`Getting transaction categories for user: ${user.userId}`);

    const categories = await this.prisma.transactionCategory.findMany({
      where: {
        organizationId: user.organizationId
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    return {
      data: categories.map(category => ({
        id: category.id,
        type: 'transaction-categories' as const,
        attributes: {
          id: category.id,
          organizationId: category.organizationId,
          name: category.name,
          description: category.description,
          color: category.color,
          isDefault: category.isDefault,
          createdAt: category.createdAt.toISOString()
        }
      }))
    };
  }

  /**
   * Create transaction category
   */
  async createTransactionCategory(user: CurrentUser, data: z.infer<typeof CreateCategoryRequestSchema>) {
    this.logger.log(`Creating transaction category for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Check if category name already exists
    const existingCategory = await this.prisma.transactionCategory.findFirst({
      where: {
        name: attributes.name,
        organizationId: user.organizationId
      }
    });

    if (existingCategory) {
      throw new BadRequestException('Category name already exists');
    }

    const category = await this.prisma.transactionCategory.create({
      data: {
        organizationId: user.organizationId,
        name: attributes.name,
        description: attributes.description,
        color: attributes.color,
        isDefault: attributes.isDefault
      }
    });

    this.logger.log(`Successfully created transaction category ${category.id}`);

    return {
      data: {
        id: category.id,
        type: 'transaction-categories' as const,
        attributes: {
          id: category.id,
          organizationId: category.organizationId,
          name: category.name,
          description: category.description,
          color: category.color,
          isDefault: category.isDefault,
          createdAt: category.createdAt.toISOString()
        }
      }
    };
  }

  /**
   * Update transaction category
   */
  async updateTransactionCategory(user: CurrentUser, categoryId: string, data: z.infer<typeof UpdateCategoryRequestSchema>) {
    this.logger.log(`Updating transaction category ${categoryId} for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Check if category exists and belongs to organization
    const existingCategory = await this.prisma.transactionCategory.findFirst({
      where: {
        id: categoryId,
        organizationId: user.organizationId
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Transaction category ${categoryId} not found`);
    }

    // Check if new name conflicts with existing category
    if (attributes.name && attributes.name !== existingCategory.name) {
      const conflictingCategory = await this.prisma.transactionCategory.findFirst({
        where: {
          name: attributes.name,
          organizationId: user.organizationId,
          id: { not: categoryId }
        }
      });

      if (conflictingCategory) {
        throw new BadRequestException('Category name already exists');
      }
    }

    const category = await this.prisma.transactionCategory.update({
      where: { id: categoryId },
      data: {
        name: attributes.name,
        description: attributes.description,
        color: attributes.color,
        isDefault: attributes.isDefault
      }
    });

    this.logger.log(`Successfully updated transaction category ${category.id}`);

    return {
      data: {
        id: category.id,
        type: 'transaction-categories' as const,
        attributes: {
          id: category.id,
          organizationId: category.organizationId,
          name: category.name,
          description: category.description,
          color: category.color,
          isDefault: category.isDefault,
          createdAt: category.createdAt.toISOString()
        }
      }
    };
  }

  /**
   * Delete transaction category
   */
  async deleteTransactionCategory(user: CurrentUser, categoryId: string) {
    this.logger.log(`Deleting transaction category ${categoryId} for user: ${user.userId}`);

    // Check if category exists and belongs to organization
    const existingCategory = await this.prisma.transactionCategory.findFirst({
      where: {
        id: categoryId,
        organizationId: user.organizationId
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Transaction category ${categoryId} not found`);
    }

    // Check if category is in use
    const transactionsUsingCategory = await this.prisma.transaction.count({
      where: {
        categoryId: categoryId
      }
    });

    if (transactionsUsingCategory > 0) {
      throw new BadRequestException('Cannot delete category that is in use by transactions');
    }

    await this.prisma.transactionCategory.delete({
      where: { id: categoryId }
    });

    this.logger.log(`Successfully deleted transaction category ${categoryId}`);

    return {
      data: {
        success: true,
        message: 'Transaction category deleted successfully'
      }
    };
  }

  // =============================================================================
  // Approval Workflow
  // =============================================================================

  /**
   * Approve transaction
   */
  async approveTransaction(user: CurrentUser, transactionId: string, data: z.infer<typeof ApprovalRequestSchema>) {
    this.logger.log(`Approving transaction ${transactionId} for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Use transaction with locking to prevent race conditions
    const transaction = await this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId: user.organizationId
        }
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }

      if (!existingTransaction.requiresApproval) {
        throw new BadRequestException('Transaction does not require approval');
      }

      if (existingTransaction.approvedBy) {
        throw new BadRequestException('Transaction is already approved');
      }

      const updateData: Prisma.TransactionUpdateInput = {
        approvedBy: attributes.approvedBy.id,
        approvedAt: new Date()
      };

      if (attributes.metadata) {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          ...attributes.metadata,
          approvalNotes: attributes.approvalNotes,
          approvedBy: user.userId,
          approvedAt: new Date().toISOString()
        };
      } else {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          approvalNotes: attributes.approvalNotes,
          approvedBy: user.userId,
          approvedAt: new Date().toISOString()
        };
      }

      return await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      });
    });

    this.logger.log(`Successfully approved transaction ${transaction.id}`);

    return await this.mapTransactionToResponse(transaction);
  }

  /**
   * Reject transaction
   */
  async rejectTransaction(user: CurrentUser, transactionId: string, data: z.infer<typeof RejectionRequestSchema>) {
    this.logger.log(`Rejecting transaction ${transactionId} for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

    // Use transaction with locking to prevent race conditions
    const transaction = await this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId: user.organizationId
        }
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }

      if (!existingTransaction.requiresApproval) {
        throw new BadRequestException('Transaction does not require approval');
      }

      if (existingTransaction.approvedBy) {
        throw new BadRequestException('Transaction is already approved');
      }

      const updateData: Prisma.TransactionUpdateInput = {
        status: TransactionStatus.CANCELLED
      };

      if (attributes.metadata) {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          ...attributes.metadata,
          rejectionReason: attributes.rejectionReason,
          rejectedBy: user.userId,
          rejectedAt: new Date().toISOString()
        };
      } else {
        updateData.metadata = {
          ...(existingTransaction.metadata as Record<string, any> || {}),
          rejectionReason: attributes.rejectionReason,
          rejectedBy: user.userId,
          rejectedAt: new Date().toISOString()
        };
      }

      return await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      });
    });

    this.logger.log(`Successfully rejected transaction ${transaction.id}`);

    return await this.mapTransactionToResponse(transaction);
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(user: CurrentUser, filters: {
    page: number;
    limit: number;
    priority?: string;
    farmId?: string;
  }) {
    this.logger.log(`Getting pending approvals for user: ${user.userId}`);

    const where: Prisma.TransactionWhereInput = {
      organizationId: user.organizationId,
      requiresApproval: true,
      approvedBy: null,
      status: TransactionStatus.PENDING
    };

    if (filters.farmId) where.farmId = filters.farmId;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNumber: true, title: true }
          },
          organization: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      this.prisma.transaction.count({ where })
    ]);

    const totalPages = Math.ceil(total / filters.limit);

    return {
      data: transactions.map(transaction => {
        const createdByUser = this.getCreatedByUser(transaction);
        
        return {
          id: transaction.id,
          organizationId: transaction.organizationId,
          transactionId: transaction.id,
          requestedBy: createdByUser,
          requestedAt: transaction.createdAt.toISOString(),
          amount: parseFloat(transaction.amount.toString()),
          currency: transaction.currency,
          description: transaction.description,
          priority: (transaction.metadata as any)?.priority || 'medium',
          metadata: transaction.metadata
        };
      }),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages
      }
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Get createdBy user information from transaction relation
   */
  private getCreatedByUser(transaction: any): { id: string; name: string } {
    if (transaction.createdBy) {
      return {
        id: transaction.createdBy.id,
        name: transaction.createdBy.name
      };
    }
    
    // Fallback for transactions without createdBy relation
    return {
      id: 'unknown',
      name: 'Unknown User'
    };
  }

  /**
   * Get user information by ID
   */
  private async getUserById(userId: string): Promise<{ id: string; name: string } | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch user ${userId}: ${error}`);
      return null;
    }
  }

  /**
   * Get multiple users by IDs
   */
  private async getUsersByIds(userIds: string[]): Promise<Array<{ id: string; name: string }>> {
    if (userIds.length === 0) {
      return [];
    }

    try {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      });

      return users.map(user => ({
        id: user.id,
        name: user.name
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch users: ${error}`);
      return [];
    }
  }

  private async validateOrganizationAccess(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }
  }

  private async validateFarmAccess(farmId: string, organizationId: string) {
    try {
      const farm = await this.prisma.farm.findFirst({
        where: {
          id: farmId,
          organizationId
        }
      });

      if (!farm) {
        throw new NotFoundException(`Farm ${farmId} not found or access denied`);
      }
    } catch (error) {
      // If it's already a NotFoundException, rethrow it
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle Prisma validation errors for invalid ID format
      if (error instanceof Error && (
        error.message.includes('Invalid') ||
        error.message.includes('invalid') ||
        error.message.includes('malformed')
      )) {
        throw new NotFoundException(`Farm ${farmId} not found or access denied`);
      }
      // Rethrow other errors
      throw error;
    }
  }

  private async validateOrderAccess(orderId: string, organizationId: string) {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          OR: [
            { buyerOrgId: organizationId },
            { supplierOrgId: organizationId }
          ]
        }
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found or access denied`);
      }
    } catch (error) {
      // If it's already a NotFoundException, rethrow it
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle Prisma validation errors for invalid ID format
      if (error instanceof Error && (
        error.message.includes('Invalid') ||
        error.message.includes('invalid') ||
        error.message.includes('malformed')
      )) {
        throw new NotFoundException(`Order ${orderId} not found or access denied`);
      }
      // Rethrow other errors
      throw error;
    }
  }


  private validateStatusTransition(currentStatus: TransactionStatus, newStatus: TransactionStatus) {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.PENDING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
      [TransactionStatus.COMPLETED]: [TransactionStatus.FAILED], // Only for refunds
      [TransactionStatus.FAILED]: [TransactionStatus.PENDING], // Retry
      [TransactionStatus.CANCELLED]: [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private generateReference(type: TransactionType): string {
    const prefix = type === TransactionType.FARM_REVENUE ? 'REV' :
                   type === TransactionType.FARM_EXPENSE ? 'EXP' :
                   type === TransactionType.ORDER_PAYMENT ? 'PAY' :
                   type === TransactionType.PLATFORM_FEE ? 'FEE' : 'REF';

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);

    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  private async mapTransactionToResponse(transaction: any) {
    return {
      data: {
        id: transaction.id,
        type: 'transactions' as const,
        attributes: {
          id: transaction.id,
          organizationId: transaction.organizationId,
          orderId: transaction.orderId,
          farmId: transaction.farmId,
          categoryId: transaction.categoryId,
          type: transaction.type,
          amount: parseFloat(transaction.amount.toString()),
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          reference: transaction.reference,
          dueDate: transaction.dueDate?.toISOString(),
          paidDate: transaction.paidDate?.toISOString(),
          requiresApproval: transaction.requiresApproval,
          createdBy: this.getCreatedByUser(transaction),
          approvedBy: transaction.approvedBy ? await this.getUserById(transaction.approvedBy) : null,
          approvedAt: transaction.approvedAt?.toISOString(),
          metadata: transaction.metadata,
          createdAt: transaction.createdAt.toISOString(),
        }
      }
    };
  }
}
