import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { HarvestsService } from './harvests.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { harvestsContract } from '../../contracts/harvests.contract';
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

@ApiTags('harvests')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequireFeature('farm_management')
export class HarvestsController {
  private readonly logger = new Logger(HarvestsController.name);

  constructor(private readonly harvestsService: HarvestsService) {}

  @TsRestHandler(harvestsContract.getHarvests)
  @RequirePermission('farms', 'read')
  public getHarvests(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.getHarvests, async ({ query }) => {
      try {
        const result = await this.harvestsService.getHarvests({
          ...query,
          organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get harvests failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Harvests not found',
          notFoundCode: 'HARVESTS_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve harvests',
          internalErrorCode: 'GET_HARVESTS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(harvestsContract.getHarvest)
  @RequirePermission('farms', 'read')
  public getHarvest(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.getHarvest, async ({ params }) => {
      try {
        const result = await this.harvestsService.getHarvest(params.id, organizationId);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get harvest ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Harvest not found',
          notFoundCode: 'HARVEST_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve harvest',
          internalErrorCode: 'GET_HARVEST_FAILED',
        });
      }
    });
  }

  @TsRestHandler(harvestsContract.createHarvest)
  @RequirePermission('farms', 'create')
  public createHarvest(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.createHarvest, async ({ body }) => {
      try {
        const result = await this.harvestsService.createHarvest(body, organizationId);

        this.logger.log(`Harvest created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create harvest failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid harvest data',
          badRequestCode: 'INVALID_HARVEST_DATA',
          internalErrorMessage: 'Failed to create harvest',
          internalErrorCode: 'CREATE_HARVEST_FAILED',
        });
      }
    });
  }

  @TsRestHandler(harvestsContract.updateHarvest)
  @RequirePermission('farms', 'update')
  public updateHarvest(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.updateHarvest, async ({ params, body }) => {
      try {
        const result = await this.harvestsService.updateHarvest(
          params.id,
          body,
          organizationId,
        );

        this.logger.log(`Harvest ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update harvest ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Harvest not found',
          notFoundCode: 'HARVEST_NOT_FOUND',
          badRequestMessage: 'Invalid harvest data',
          badRequestCode: 'INVALID_HARVEST_DATA',
          internalErrorMessage: 'Failed to update harvest',
          internalErrorCode: 'UPDATE_HARVEST_FAILED',
        });
      }
    });
  }

  @TsRestHandler(harvestsContract.deleteHarvest)
  @RequirePermission('farms', 'delete')
  public deleteHarvest(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.deleteHarvest, async ({ params }) => {
      try {
        await this.harvestsService.deleteHarvest(params.id, organizationId);

        this.logger.log(`Harvest ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        this.logger.error(`Delete harvest ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Harvest not found',
          notFoundCode: 'HARVEST_NOT_FOUND',
          internalErrorMessage: 'Failed to delete harvest',
          internalErrorCode: 'DELETE_HARVEST_FAILED',
        });
      }
    });
  }

  @TsRestHandler(harvestsContract.getRevenueAnalytics)
  @RequirePermission('farms', 'read')
  public getRevenueAnalytics(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.getRevenueAnalytics, async ({ query }) => {
      try {
        const result = await this.harvestsService.getRevenueAnalytics(query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get revenue analytics failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to get revenue analytics',
          internalErrorCode: 'GET_REVENUE_ANALYTICS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(harvestsContract.getYieldComparison)
  @RequirePermission('farms', 'read')
  public getYieldComparison(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(harvestsContract.getYieldComparison, async ({ query }) => {
      try {
        const result = await this.harvestsService.getYieldComparison(query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get yield comparison failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to get yield comparison',
          internalErrorCode: 'GET_YIELD_COMPARISON_FAILED',
        });
      }
    });
  }
}

