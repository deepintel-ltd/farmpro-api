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
}
