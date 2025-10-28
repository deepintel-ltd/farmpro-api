import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { InfrastructureService } from './infrastructure.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { infrastructureContract } from '../../contracts/infrastructure.contract';
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

@ApiTags('infrastructure')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequireFeature('farm_management')
export class InfrastructureController {
  private readonly logger = new Logger(InfrastructureController.name);

  constructor(private readonly infrastructureService: InfrastructureService) {}

  @TsRestHandler(infrastructureContract.getInfrastructure)
  @RequirePermission('farms', 'read')
  public getInfrastructure(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.getInfrastructure, async ({ query }) => {
      try {
        const result = await this.infrastructureService.getInfrastructure({
          ...query,
          organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Infrastructure not found',
          notFoundCode: 'INFRASTRUCTURE_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(infrastructureContract.getInfrastructureItem)
  @RequirePermission('farms', 'read')
  public getInfrastructureItem(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.getInfrastructureItem, async ({ params }) => {
      try {
        const result = await this.infrastructureService.getInfrastructureItem(
          params.id,
          organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Infrastructure not found',
          notFoundCode: 'INFRASTRUCTURE_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(infrastructureContract.createInfrastructure)
  @RequirePermission('farms', 'create')
  public createInfrastructure(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.createInfrastructure, async ({ body }) => {
      try {
        const result = await this.infrastructureService.createInfrastructure(
          body,
          organizationId,
        );

        this.logger.log(`Infrastructure created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid infrastructure data',
          badRequestCode: 'INVALID_INFRASTRUCTURE_DATA',
        });
      }
    });
  }

  @TsRestHandler(infrastructureContract.updateInfrastructure)
  @RequirePermission('farms', 'update')
  public updateInfrastructure(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.updateInfrastructure, async ({ params, body }) => {
      try {
        const result = await this.infrastructureService.updateInfrastructure(
          params.id,
          body,
          organizationId,
        );

        this.logger.log(`Infrastructure ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Infrastructure not found',
          notFoundCode: 'INFRASTRUCTURE_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(infrastructureContract.deleteInfrastructure)
  @RequirePermission('farms', 'delete')
  public deleteInfrastructure(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.deleteInfrastructure, async ({ params }) => {
      try {
        await this.infrastructureService.deleteInfrastructure(params.id, organizationId);

        this.logger.log(`Infrastructure ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Infrastructure not found',
          notFoundCode: 'INFRASTRUCTURE_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(infrastructureContract.logUptime)
  @RequirePermission('farms', 'update')
  public logUptime(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.logUptime, async ({ params, body }) => {
      try {
        const result = await this.infrastructureService.logUptime(
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
          notFoundMessage: 'Infrastructure not found',
          notFoundCode: 'INFRASTRUCTURE_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(infrastructureContract.getUptimeAnalytics)
  @RequirePermission('farms', 'read')
  public getUptimeAnalytics(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(infrastructureContract.getUptimeAnalytics, async ({ params }) => {
      try {
        const result = await this.infrastructureService.getUptimeAnalytics(
          params.id,
          organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Infrastructure not found',
          notFoundCode: 'INFRASTRUCTURE_NOT_FOUND',
        });
      }
    });
  }
}

