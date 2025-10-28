import { Controller, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { CropCyclesService } from './crop-cycles.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { cropCyclesContract } from '../../contracts/crop-cycles.contract';
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

@ApiTags('crop-cycles')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequireFeature('farm_management')
export class CropCyclesController {
  private readonly logger = new Logger(CropCyclesController.name);

  constructor(private readonly cropCyclesService: CropCyclesService) {}

  @TsRestHandler(cropCyclesContract.getCropCycles)
  @RequirePermission('farms', 'read')
  public getCropCycles(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(cropCyclesContract.getCropCycles, async ({ query }) => {
      try {
        const result = await this.cropCyclesService.getCropCycles({
          ...query,
          organizationId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get crop cycles failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Crop cycles not found',
          notFoundCode: 'CROP_CYCLES_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve crop cycles',
          internalErrorCode: 'GET_CROP_CYCLES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(cropCyclesContract.getCropCycle)
  @RequirePermission('farms', 'read')
  public getCropCycle(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(cropCyclesContract.getCropCycle, async ({ params }) => {
      try {
        const result = await this.cropCyclesService.getCropCycle(
          params.id,
          organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get crop cycle ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Crop cycle not found',
          notFoundCode: 'CROP_CYCLE_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve crop cycle',
          internalErrorCode: 'GET_CROP_CYCLE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(cropCyclesContract.createCropCycle)
  @RequirePermission('farms', 'create')
  public createCropCycle(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(cropCyclesContract.createCropCycle, async ({ body }) => {
      try {
        const result = await this.cropCyclesService.createCropCycle(
          body,
          organizationId,
        );

        this.logger.log(`Crop cycle created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create crop cycle failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid crop cycle data',
          badRequestCode: 'INVALID_CROP_CYCLE_DATA',
          internalErrorMessage: 'Failed to create crop cycle',
          internalErrorCode: 'CREATE_CROP_CYCLE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(cropCyclesContract.updateCropCycle)
  @RequirePermission('farms', 'update')
  public updateCropCycle(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(cropCyclesContract.updateCropCycle, async ({ params, body }) => {
      try {
        const result = await this.cropCyclesService.updateCropCycle(
          params.id,
          body,
          organizationId,
        );

        this.logger.log(`Crop cycle ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update crop cycle ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Crop cycle not found',
          notFoundCode: 'CROP_CYCLE_NOT_FOUND',
          badRequestMessage: 'Invalid crop cycle data',
          badRequestCode: 'INVALID_CROP_CYCLE_DATA',
          internalErrorMessage: 'Failed to update crop cycle',
          internalErrorCode: 'UPDATE_CROP_CYCLE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(cropCyclesContract.deleteCropCycle)
  @RequirePermission('farms', 'delete')
  public deleteCropCycle(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(cropCyclesContract.deleteCropCycle, async ({ params }) => {
      try {
        await this.cropCyclesService.deleteCropCycle(params.id, organizationId);

        this.logger.log(`Crop cycle ${params.id} deleted by user ${req.user.userId}`);

        return ErrorResponseUtil.noContent();
      } catch (error: unknown) {
        this.logger.error(`Delete crop cycle ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Crop cycle not found',
          notFoundCode: 'CROP_CYCLE_NOT_FOUND',
          internalErrorMessage: 'Failed to delete crop cycle',
          internalErrorCode: 'DELETE_CROP_CYCLE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(cropCyclesContract.getRotationRecommendations)
  @RequirePermission('farms', 'read')
  public getRotationRecommendations(): ReturnType<typeof tsRestHandler> {
      return tsRestHandler(cropCyclesContract.getRotationRecommendations, async ({ query }) => {
      try {
        const result = await this.cropCyclesService.getRotationRecommendations({
          ...query,
          farmId: query.farmId,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get rotation recommendations failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to get rotation recommendations',
          internalErrorCode: 'GET_ROTATION_RECOMMENDATIONS_FAILED',
        });
      }
    });
  }
}

