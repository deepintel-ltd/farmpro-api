import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { FarmsService } from './farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { farmContract } from '../../contracts/farms.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@ApiTags('farms')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class FarmsController {
  private readonly logger = new Logger(FarmsController.name);

  constructor(private readonly farmsService: FarmsService) {}

  // =============================================================================
  // Farm CRUD Operations
  // =============================================================================

  @TsRestHandler(farmContract.getFarms)
  public getFarms(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmContract.getFarms, async ({ query }) => {
      try {
        const result = await this.farmsService.getFarms({
          ...query,
          organizationId: req.user.organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get farms failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve farms',
          'GET_FARMS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(farmContract.getFarm)
  public getFarm(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmContract.getFarm, async ({ params }) => {
      try {
        const result = await this.farmsService.getFarm(
          params.id,
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get farm ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve farm',
          internalErrorCode: 'GET_FARM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmContract.createFarm)
  public createFarm(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmContract.createFarm, async ({ body }) => {
      try {
        const result = await this.farmsService.createFarm(
          body,
          req.user.organizationId,
        );

        this.logger.log(`Farm created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create farm failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid farm data',
          badRequestCode: 'INVALID_FARM_DATA',
          internalErrorMessage: 'Failed to create farm',
          internalErrorCode: 'CREATE_FARM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmContract.updateFarm)
  public updateFarm(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmContract.updateFarm, async ({ params, body }) => {
      try {
        const result = await this.farmsService.updateFarm(
          params.id,
          body,
          req.user.organizationId,
        );

        this.logger.log(`Farm ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update farm ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid farm data',
          badRequestCode: 'INVALID_FARM_DATA',
          internalErrorMessage: 'Failed to update farm',
          internalErrorCode: 'UPDATE_FARM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(farmContract.deleteFarm)
  public deleteFarm(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(farmContract.deleteFarm, async ({ params }) => {
      try {
        await this.farmsService.deleteFarm(params.id, req.user.organizationId);

        this.logger.log(`Farm ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        this.logger.error(`Delete farm ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          internalErrorMessage: 'Failed to delete farm',
          internalErrorCode: 'DELETE_FARM_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Farm Relationships
  // =============================================================================

  @TsRestHandler(farmContract.getFarmCommodities)
  public getFarmCommodities(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      farmContract.getFarmCommodities,
      async ({ params, query }) => {
        try {
          const result = await this.farmsService.getFarmCommodities(
            params.id,
            {
              page: query['page[number]'] ?? 1,
              limit: query['page[size]'] ?? 10,
            },
            req.user.organizationId,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(`Get farm ${params.id} commodities failed:`, error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Farm not found',
            notFoundCode: 'FARM_NOT_FOUND',
            internalErrorMessage: 'Failed to retrieve farm commodities',
            internalErrorCode: 'GET_FARM_COMMODITIES_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(farmContract.getFarmCommodityRelationships)
  public getFarmCommodityRelationships(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      farmContract.getFarmCommodityRelationships,
      async ({ params }) => {
        try {
          // Get commodity IDs for the farm
          const commodities = await this.farmsService.getFarmCommodities(
            params.id,
            { page: 1, limit: 1000 }, // Get all relationships
            req.user.organizationId,
          );

          const relationshipData = commodities.data.map((commodity) => ({
            type: 'commodities' as const,
            id: commodity.id,
          }));

          return {
            status: 200 as const,
            body: {
              data: relationshipData,
              links: {
                self: `/api/farms/${params.id}/relationships/commodities`,
                related: `/api/farms/${params.id}/commodities`,
              },
            },
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get farm ${params.id} commodity relationships failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Farm not found',
            notFoundCode: 'FARM_NOT_FOUND',
            internalErrorMessage:
              'Failed to retrieve farm commodity relationships',
            internalErrorCode: 'GET_FARM_COMMODITY_RELATIONSHIPS_FAILED',
          });
        }
      },
    );
  }
}
