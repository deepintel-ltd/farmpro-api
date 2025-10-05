import { Controller, UseGuards } from '@nestjs/common';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { transactionsContract } from '@contracts/transactions.contract';
import { TransactionsService } from './transactions.service';
import { GetCurrentUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseUtil } from '../common/utils/error-response.util';

@Controller()
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @TsRestHandler(transactionsContract.createTransaction)
  public createTransaction(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.createTransaction, async ({ body }) => {
      try {
        const result = await this.transactionsService.createTransaction(user, body);
        return { status: 201 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Organization, farm, order, or activity not found',
          notFoundCode: 'RESOURCE_NOT_FOUND',
          badRequestMessage: 'Invalid transaction data',
          badRequestCode: 'INVALID_TRANSACTION_DATA',
          internalErrorMessage: 'Failed to create transaction',
          internalErrorCode: 'CREATE_TRANSACTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.getTransaction)
  public getTransaction(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.getTransaction, async ({ params }) => {
      try {
        const result = await this.transactionsService.getTransaction(user, params.id);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction not found',
          notFoundCode: 'TRANSACTION_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve transaction',
          internalErrorCode: 'GET_TRANSACTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.updateTransaction)
  public updateTransaction(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.updateTransaction, async ({ params, body }) => {
      try {
        const result = await this.transactionsService.updateTransaction(user, params.id, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction not found',
          notFoundCode: 'TRANSACTION_NOT_FOUND',
          badRequestMessage: 'Invalid transaction update data or status transition',
          badRequestCode: 'INVALID_TRANSACTION_UPDATE',
          internalErrorMessage: 'Failed to update transaction',
          internalErrorCode: 'UPDATE_TRANSACTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.listTransactions)
  public listTransactions(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.listTransactions, async ({ query }) => {
      try {
        const result = await this.transactionsService.listTransactions(user, query);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid query parameters',
          badRequestCode: 'INVALID_QUERY_PARAMETERS',
          internalErrorMessage: 'Failed to list transactions',
          internalErrorCode: 'LIST_TRANSACTIONS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.getTransactionSummary)
  public getTransactionSummary(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.getTransactionSummary, async ({ query }) => {
      try {
        const result = await this.transactionsService.getTransactionSummary(user, query);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid query parameters',
          badRequestCode: 'INVALID_QUERY_PARAMETERS',
          internalErrorMessage: 'Failed to get transaction summary',
          internalErrorCode: 'GET_TRANSACTION_SUMMARY_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.markAsPaid)
  public markAsPaid(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.markAsPaid, async ({ params, body }) => {
      try {
        const result = await this.transactionsService.markAsPaid(user, params.id, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction not found',
          notFoundCode: 'TRANSACTION_NOT_FOUND',
          badRequestMessage: 'Transaction is already completed or invalid state',
          badRequestCode: 'INVALID_TRANSACTION_STATE',
          internalErrorMessage: 'Failed to mark transaction as paid',
          internalErrorCode: 'MARK_AS_PAID_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.cancelTransaction)
  public cancelTransaction(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.cancelTransaction, async ({ params, body }) => {
      try {
        const result = await this.transactionsService.cancelTransaction(user, params.id, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction not found',
          notFoundCode: 'TRANSACTION_NOT_FOUND',
          badRequestMessage: 'Transaction cannot be cancelled in current state',
          badRequestCode: 'INVALID_CANCELLATION_STATE',
          internalErrorMessage: 'Failed to cancel transaction',
          internalErrorCode: 'CANCEL_TRANSACTION_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  @TsRestHandler(transactionsContract.bulkUpdateTransactions)
  public bulkUpdateTransactions(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.bulkUpdateTransactions, async ({ body }) => {
      try {
        const result = await this.transactionsService.bulkUpdateTransactions(user, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid bulk update data or transaction access denied',
          badRequestCode: 'INVALID_BULK_UPDATE_DATA',
          internalErrorMessage: 'Failed to bulk update transactions',
          internalErrorCode: 'BULK_UPDATE_TRANSACTIONS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.bulkDeleteTransactions)
  public bulkDeleteTransactions(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.bulkDeleteTransactions, async ({ body }) => {
      try {
        const result = await this.transactionsService.bulkDeleteTransactions(user, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid bulk delete data or transaction access denied',
          badRequestCode: 'INVALID_BULK_DELETE_DATA',
          internalErrorMessage: 'Failed to bulk delete transactions',
          internalErrorCode: 'BULK_DELETE_TRANSACTIONS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.bulkMarkAsPaid)
  public bulkMarkAsPaid(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.bulkMarkAsPaid, async ({ body }) => {
      try {
        const result = await this.transactionsService.bulkMarkAsPaid(user, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid bulk mark as paid data or transaction access denied',
          badRequestCode: 'INVALID_BULK_MARK_PAID_DATA',
          internalErrorMessage: 'Failed to bulk mark transactions as paid',
          internalErrorCode: 'BULK_MARK_AS_PAID_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Transaction Categories
  // =============================================================================

  @TsRestHandler(transactionsContract.getTransactionCategories)
  public getTransactionCategories(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.getTransactionCategories, async () => {
      try {
        const result = await this.transactionsService.getTransactionCategories(user);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to get transaction categories',
          internalErrorCode: 'GET_TRANSACTION_CATEGORIES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.createTransactionCategory)
  public createTransactionCategory(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.createTransactionCategory, async ({ body }) => {
      try {
        const result = await this.transactionsService.createTransactionCategory(user, body);
        return { status: 201 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid category data or name already exists',
          badRequestCode: 'INVALID_CATEGORY_DATA',
          internalErrorMessage: 'Failed to create transaction category',
          internalErrorCode: 'CREATE_TRANSACTION_CATEGORY_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.updateTransactionCategory)
  public updateTransactionCategory(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.updateTransactionCategory, async ({ params, body }) => {
      try {
        const result = await this.transactionsService.updateTransactionCategory(user, params.id, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction category not found',
          notFoundCode: 'TRANSACTION_CATEGORY_NOT_FOUND',
          badRequestMessage: 'Invalid category update data or name already exists',
          badRequestCode: 'INVALID_CATEGORY_UPDATE_DATA',
          internalErrorMessage: 'Failed to update transaction category',
          internalErrorCode: 'UPDATE_TRANSACTION_CATEGORY_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.deleteTransactionCategory)
  public deleteTransactionCategory(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.deleteTransactionCategory, async ({ params }) => {
      try {
        const result = await this.transactionsService.deleteTransactionCategory(user, params.id);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction category not found',
          notFoundCode: 'TRANSACTION_CATEGORY_NOT_FOUND',
          badRequestMessage: 'Cannot delete category that is in use by transactions',
          badRequestCode: 'CATEGORY_IN_USE',
          internalErrorMessage: 'Failed to delete transaction category',
          internalErrorCode: 'DELETE_TRANSACTION_CATEGORY_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Approval Workflow
  // =============================================================================

  @TsRestHandler(transactionsContract.approveTransaction)
  public approveTransaction(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.approveTransaction, async ({ params, body }) => {
      try {
        const result = await this.transactionsService.approveTransaction(user, params.id, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction not found',
          notFoundCode: 'TRANSACTION_NOT_FOUND',
          badRequestMessage: 'Transaction does not require approval or is already approved',
          badRequestCode: 'INVALID_APPROVAL_STATE',
          internalErrorMessage: 'Failed to approve transaction',
          internalErrorCode: 'APPROVE_TRANSACTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.rejectTransaction)
  public rejectTransaction(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.rejectTransaction, async ({ params, body }) => {
      try {
        const result = await this.transactionsService.rejectTransaction(user, params.id, body);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Transaction not found',
          notFoundCode: 'TRANSACTION_NOT_FOUND',
          badRequestMessage: 'Transaction does not require approval or is already approved',
          badRequestCode: 'INVALID_REJECTION_STATE',
          internalErrorMessage: 'Failed to reject transaction',
          internalErrorCode: 'REJECT_TRANSACTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(transactionsContract.getPendingApprovals)
  public getPendingApprovals(
    @GetCurrentUser() user: CurrentUser
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(transactionsContract.getPendingApprovals, async ({ query }) => {
      try {
        const result = await this.transactionsService.getPendingApprovals(user, {
          page: query.page || 1,
          limit: query.limit || 20,
          priority: query.priority,
          farmId: query.farmId
        });
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid query parameters',
          badRequestCode: 'INVALID_QUERY_PARAMETERS',
          internalErrorMessage: 'Failed to get pending approvals',
          internalErrorCode: 'GET_PENDING_APPROVALS_FAILED',
        });
      }
    });
  }
}
