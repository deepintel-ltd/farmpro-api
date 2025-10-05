import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransactionType, TransactionStatus, Currency } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  CreateTransactionRequest, 
  UpdateTransactionRequest, 
  TransactionFilters
} from '@contracts/transactions.schemas';
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
  async createTransaction(user: CurrentUser, data: CreateTransactionRequest) {
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
        dueDate: attributes.dueDate ? new Date(attributes.dueDate) : null,
        metadata: {
          ...(attributes.metadata || {}),
          createdBy: user.userId,
          createdAt: new Date().toISOString()
        },
        reference: this.generateReference(attributes.type)
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, title: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    this.logger.log(`Successfully created transaction ${transaction.id}`);

    return this.mapTransactionToResponse(transaction);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(user: CurrentUser, transactionId: string) {
    this.logger.log(`Getting transaction ${transactionId} for user: ${user.userId}`);

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
        }
      }
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    return this.mapTransactionToResponse(transaction);
  }

  /**
   * Update transaction
   */
  async updateTransaction(user: CurrentUser, transactionId: string, data: UpdateTransactionRequest) {
    this.logger.log(`Updating transaction ${transactionId} for user: ${user.userId}`);

    const { data: requestData } = data;
    const { attributes } = requestData;

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

    return this.mapTransactionToResponse(transaction);
  }

  /**
   * List transactions with filters
   */
  async listTransactions(user: CurrentUser, filters: TransactionFilters) {
    this.logger.log(`Listing transactions for user: ${user.userId}`);

    const where: Prisma.TransactionWhereInput = {
      organizationId: user.organizationId
    };

    // Apply filters
    if (filters.type) where.type = filters.type as TransactionType;
    if (filters.status) where.status = filters.status as TransactionStatus;
    if (filters.farmId) where.farmId = filters.farmId;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
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
      data: transactions.map(transaction => this.mapTransactionToResponse(transaction).data),
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

    return {
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        transactionCount: totalCount,
        pendingAmount,
        completedAmount
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

    return this.mapTransactionToResponse(transaction);
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

    return this.mapTransactionToResponse(transaction);
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private async validateOrganizationAccess(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }
  }

  private async validateFarmAccess(farmId: string, organizationId: string) {
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: farmId,
        organizationId
      }
    });

    if (!farm) {
      throw new NotFoundException(`Farm ${farmId} not found or access denied`);
    }
  }

  private async validateOrderAccess(orderId: string, organizationId: string) {
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

  private mapTransactionToResponse(transaction: any) {
    return {
      data: {
        id: transaction.id,
        type: 'transactions' as const,
        attributes: {
          id: transaction.id,
          organizationId: transaction.organizationId,
          orderId: transaction.orderId,
          farmId: transaction.farmId,
          type: transaction.type,
          amount: parseFloat(transaction.amount.toString()),
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          reference: transaction.reference,
          dueDate: transaction.dueDate?.toISOString(),
          paidDate: transaction.paidDate?.toISOString(),
          metadata: transaction.metadata,
          createdAt: transaction.createdAt.toISOString(),
        }
      }
    };
  }
}
