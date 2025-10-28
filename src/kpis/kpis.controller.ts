import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { KPIsService } from './kpis.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { farmKPIsContract } from '../../contracts/farm-kpis.contract';
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

@ApiTags('kpis')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequireFeature('farm_management')
export class KPIsController {
  private readonly logger = new Logger(KPIsController.name);

  constructor(private readonly kpisService: KPIsService) {}

  @TsRestHandler(farmKPIsContract.getKPIs)
  @RequirePermission('farms', 'read')
  public getKPIs(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.getKPIs, async ({ query }) => {
      try {
        const result = await this.kpisService.getKPIs({
          ...query,
          organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'KPIs not found',
          notFoundCode: 'KPIS_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.getKPI)
  @RequirePermission('farms', 'read')
  public getKPI(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.getKPI, async ({ params }) => {
      try {
        const result = await this.kpisService.getKPI(params.id, organizationId);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'KPI not found',
          notFoundCode: 'KPI_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.createKPI)
  @RequirePermission('farms', 'create')
  public createKPI(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.createKPI, async ({ body }) => {
      try {
        const result = await this.kpisService.createKPI(body, organizationId);

        this.logger.log(`KPI created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid KPI data',
          badRequestCode: 'INVALID_KPI_DATA',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.updateKPI)
  @RequirePermission('farms', 'update')
  public updateKPI(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.updateKPI, async ({ params, body }) => {
      try {
        const result = await this.kpisService.updateKPI(params.id, body, organizationId);

        this.logger.log(`KPI ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'KPI not found',
          notFoundCode: 'KPI_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.deleteKPI)
  @RequirePermission('farms', 'delete')
  public deleteKPI(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.deleteKPI, async ({ params }) => {
      try {
        await this.kpisService.deleteKPI(params.id, organizationId);

        this.logger.log(`KPI ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'KPI not found',
          notFoundCode: 'KPI_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.recordMeasurement)
  @RequirePermission('farms', 'update')
  public recordMeasurement(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.recordMeasurement, async ({ params, body }) => {
      try {
        const result = await this.kpisService.recordMeasurement(
          params.id,
          body,
          organizationId,
        );

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'KPI not found',
          notFoundCode: 'KPI_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.getKPIDashboard)
  @RequirePermission('farms', 'read')
  public getKPIDashboard(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.getKPIDashboard, async ({ query }) => {
      try {
        const result = await this.kpisService.getKPIDashboard(query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to get KPI dashboard',
          internalErrorCode: 'GET_KPI_DASHBOARD_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmKPIsContract.getKPITrend)
  @RequirePermission('farms', 'read')
  public getKPITrend(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmKPIsContract.getKPITrend, async ({ params, query }) => {
      try {
        const result = await this.kpisService.getKPITrend(params.id, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'KPI not found',
          notFoundCode: 'KPI_NOT_FOUND',
        });
      }
    });
  }
}

