import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { FarmAreasService } from './farm-areas.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { farmAreasContract } from '../../contracts/farm-areas.contract';
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

@ApiTags('farm-areas')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequireFeature('farm_management')
export class FarmAreasController {
  private readonly logger = new Logger(FarmAreasController.name);

  constructor(private readonly farmAreasService: FarmAreasService) {}

  // =============================================================================
  // Farm Areas CRUD Operations
  // =============================================================================

  @TsRestHandler(farmAreasContract.getFarmAreas)
  @RequirePermission('farms', 'read')
  public getFarmAreas(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmAreasContract.getFarmAreas, async ({ params, query }) => {
      try {
        const result = await this.farmAreasService.getFarmAreas(params.farmId, {
          ...query,
          organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get farm areas for ${params.farmId} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve farm areas',
          internalErrorCode: 'GET_FARM_AREAS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmAreasContract.getArea)
  @RequirePermission('farms', 'read')
  public getArea(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmAreasContract.getArea, async ({ params }) => {
      try {
        const result = await this.farmAreasService.getArea(
          params.id,
          organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get area ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Area not found',
          notFoundCode: 'AREA_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve area',
          internalErrorCode: 'GET_AREA_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmAreasContract.createArea)
  @RequirePermission('farms', 'create')
  public createArea(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmAreasContract.createArea, async ({ body }) => {
      try {
        const result = await this.farmAreasService.createArea(
          body,
          organizationId,
        );

        this.logger.log(`Area created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create area failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid area data',
          badRequestCode: 'INVALID_AREA_DATA',
          internalErrorMessage: 'Failed to create area',
          internalErrorCode: 'CREATE_AREA_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmAreasContract.updateArea)
  @RequirePermission('farms', 'update')
  public updateArea(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmAreasContract.updateArea, async ({ params, body }) => {
      try {
        const result = await this.farmAreasService.updateArea(
          params.id,
          body,
          organizationId,
        );

        this.logger.log(`Area ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update area ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Area not found',
          notFoundCode: 'AREA_NOT_FOUND',
          badRequestMessage: 'Invalid area data',
          badRequestCode: 'INVALID_AREA_DATA',
          internalErrorMessage: 'Failed to update area',
          internalErrorCode: 'UPDATE_AREA_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmAreasContract.deleteArea)
  @RequirePermission('farms', 'delete')
  public deleteArea(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmAreasContract.deleteArea, async ({ params }) => {
      try {
        await this.farmAreasService.deleteArea(params.id, organizationId);

        this.logger.log(`Area ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        this.logger.error(`Delete area ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Area not found',
          notFoundCode: 'AREA_NOT_FOUND',
          internalErrorMessage: 'Failed to delete area',
          internalErrorCode: 'DELETE_AREA_FAILED',
        });
      }
    });
  }
}
