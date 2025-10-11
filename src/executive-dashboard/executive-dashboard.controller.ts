import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { ExecutiveDashboardService } from './executive-dashboard.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { executiveDashboardContract } from '../../contracts/executive-dashboard.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
// import { OrganizationIsolationGuard } from '../common/guards/organization-isolation.guard';
// import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
// import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  RequireFeature,
  RequirePermission,
} from '../common/decorators/authorization.decorators';
import { OrganizationId } from '../common/decorators/organization-context.decorator';
// import { PERMISSIONS } from '../common/constants';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@ApiTags('Executive Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller()

@RequireFeature('analytics')
export class ExecutiveDashboardController {
  private readonly logger = new Logger(ExecutiveDashboardController.name);

  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
  ) {}

  @TsRestHandler(executiveDashboardContract.getExecutiveDashboard)
  @RequirePermission("analytics", "read")
  public getExecutiveDashboard(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(executiveDashboardContract.getExecutiveDashboard, async ({ query }) => {
      try {
        const data = await this.executiveDashboardService.getExecutiveDashboard(req.user, query);
        
        return {
          status: 200 as const,
          body: {
            data: {
              type: 'executive-dashboard',
              id: organizationId,
              attributes: data,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get executive dashboard failed:', error);
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve executive dashboard',
          'GET_EXECUTIVE_DASHBOARD_FAILED',
        );
      }
    });
  }

  @TsRestHandler(executiveDashboardContract.getFinancialHealth)
  @RequirePermission("analytics", "read")
  public getFinancialHealth(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(executiveDashboardContract.getFinancialHealth, async ({ query }) => {
      try {
        const data = await this.executiveDashboardService.calculateFinancialHealth(req.user, query);
        
        return {
          status: 200 as const,
          body: {
            data: {
              type: 'financial-health',
              id: organizationId,
              attributes: data,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get financial health failed:', error);
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve financial health',
          'GET_FINANCIAL_HEALTH_FAILED',
        );
      }
    });
  }

  @TsRestHandler(executiveDashboardContract.getRiskIndicators)
  @RequirePermission("analytics", "read")
  public getRiskIndicators(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(executiveDashboardContract.getRiskIndicators, async ({ query }) => {
      try {
        const data = await this.executiveDashboardService.calculateRiskIndicators(req.user, query);
        
        return {
          status: 200 as const,
          body: {
            data: {
              type: 'risk-indicators',
              id: organizationId,
              attributes: data,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get risk indicators failed:', error);
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve risk indicators',
          'GET_RISK_INDICATORS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(executiveDashboardContract.getCashFlowAnalysis)
  @RequirePermission("analytics", "read")
  public getCashFlowAnalysis(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(executiveDashboardContract.getCashFlowAnalysis, async ({ query }) => {
      try {
        const data = await this.executiveDashboardService.calculateCashFlowAnalysis(req.user, query);
        
        return {
          status: 200 as const,
          body: {
            data: {
              type: 'cash-flow',
              id: organizationId,
              attributes: data,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get cash flow analysis failed:', error);
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve cash flow analysis',
          'GET_CASH_FLOW_ANALYSIS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(executiveDashboardContract.getPendingActions)
  @RequirePermission("analytics", "read")
  public getPendingActions(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(executiveDashboardContract.getPendingActions, async ({ query }) => {
      try {
        const data = await this.executiveDashboardService.getPendingActions(req.user, query);
        
        return {
          status: 200 as const,
          body: {
            data: (data as Array<{id: string; type: string; title: string; description: string; priority: string; dueDate?: string; assignedTo?: string; createdAt: string}>).map((action, index) => ({
              type: 'pending-action',
              id: action.id || `action-${index}`,
              attributes: action,
            })),
            meta: {
              total: (data as Array<{id: string; type: string; title: string; description: string; priority: string; dueDate?: string; assignedTo?: string; createdAt: string}>).length,
              page: 1,
              limit: query.limit || 10,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get pending actions failed:', error);
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve pending actions',
          'GET_PENDING_ACTIONS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(executiveDashboardContract.getExecutiveInsights)
  @RequirePermission("analytics", "read")
  public getExecutiveInsights(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(executiveDashboardContract.getExecutiveInsights, async ({ query }) => {
      try {
        const data = await this.executiveDashboardService.getExecutiveInsights(req.user, query);
        
        return {
          status: 200 as const,
          body: {
            data: (data as Array<{id: string; category: string; title: string; description: string; impact: string; confidence: number; actionable: boolean; recommendations?: string[]; createdAt: string}>).map((insight, index) => ({
              type: 'executive-insight',
              id: insight.id || `insight-${index}`,
              attributes: insight,
            })),
            meta: {
              total: (data as Array<{id: string; category: string; title: string; description: string; impact: string; confidence: number; actionable: boolean; recommendations?: string[]; createdAt: string}>).length,
              page: 1,
              limit: query.limit || 10,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get executive insights failed:', error);
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve executive insights',
          'GET_EXECUTIVE_INSIGHTS_FAILED',
        );
      }
    });
  }

}
