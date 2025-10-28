import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { BudgetsService } from './budgets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { farmBudgetsContract } from '../../contracts/farm-budgets.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import {
  RequireFeature,
  RequirePermission,
} from '../common/decorators/authorization.decorators';
import { OrganizationId } from '../common/decorators/organization-context.decorator';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
  organizationFilter?: {
    organizationId: string;
    isImpersonation: boolean;
  };
}

@ApiTags('budgets')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequireFeature('farm_management')
export class BudgetsController {
  private readonly logger = new Logger(BudgetsController.name);

  constructor(private readonly budgetsService: BudgetsService) {}

  @TsRestHandler(farmBudgetsContract.getBudgets)
  @RequirePermission('farms', 'read')
  public getBudgets(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.getBudgets, async ({ query }) => {
      try {
        const result = await this.budgetsService.getBudgets({
          ...query,
          organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get budgets failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Budgets not found',
          notFoundCode: 'BUDGETS_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve budgets',
          internalErrorCode: 'GET_BUDGETS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmBudgetsContract.getBudget)
  @RequirePermission('farms', 'read')
  public getBudget(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.getBudget, async ({ params }) => {
      try {
        const result = await this.budgetsService.getBudget(params.id, organizationId);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get budget ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Budget not found',
          notFoundCode: 'BUDGET_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve budget',
          internalErrorCode: 'GET_BUDGET_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmBudgetsContract.createBudget)
  @RequirePermission('farms', 'create')
  public createBudget(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.createBudget, async ({ body }) => {
      try {
        const result = await this.budgetsService.createBudget(body, organizationId);

        this.logger.log(`Budget created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create budget failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid budget data',
          badRequestCode: 'INVALID_BUDGET_DATA',
          internalErrorMessage: 'Failed to create budget',
          internalErrorCode: 'CREATE_BUDGET_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmBudgetsContract.updateBudget)
  @RequirePermission('farms', 'update')
  public updateBudget(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.updateBudget, async ({ params, body }) => {
      try {
        const result = await this.budgetsService.updateBudget(
          params.id,
          body,
          organizationId,
        );

        this.logger.log(`Budget ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update budget ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Budget not found',
          notFoundCode: 'BUDGET_NOT_FOUND',
          badRequestMessage: 'Invalid budget data',
          badRequestCode: 'INVALID_BUDGET_DATA',
          internalErrorMessage: 'Failed to update budget',
          internalErrorCode: 'UPDATE_BUDGET_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmBudgetsContract.deleteBudget)
  @RequirePermission('farms', 'delete')
  public deleteBudget(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.deleteBudget, async ({ params }) => {
      try {
        await this.budgetsService.deleteBudget(params.id, organizationId);

        this.logger.log(`Budget ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        this.logger.error(`Delete budget ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Budget not found',
          notFoundCode: 'BUDGET_NOT_FOUND',
          internalErrorMessage: 'Failed to delete budget',
          internalErrorCode: 'DELETE_BUDGET_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmBudgetsContract.getBudgetSummary)
  @RequirePermission('farms', 'read')
  public getBudgetSummary(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.getBudgetSummary, async ({ params }) => {
      try {
        const result = await this.budgetsService.getBudgetSummary(params.id, organizationId);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get budget summary ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Budget not found',
          notFoundCode: 'BUDGET_NOT_FOUND',
          internalErrorMessage: 'Failed to get budget summary',
          internalErrorCode: 'GET_BUDGET_SUMMARY_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmBudgetsContract.getCashFlowProjection)
  @RequirePermission('farms', 'read')
  public getCashFlowProjection(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmBudgetsContract.getCashFlowProjection, async ({ params, query }) => {
      try {
        const result = await this.budgetsService.getCashFlowProjection(
          params.id,
          query.includeProjections ?? true,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get cash flow projection ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Budget not found',
          notFoundCode: 'BUDGET_NOT_FOUND',
          internalErrorMessage: 'Failed to get cash flow projection',
          internalErrorCode: 'GET_CASH_FLOW_PROJECTION_FAILED',
        });
      }
    });
  }
}

