import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { PlatformAdminService } from './platform-admin.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '@/common/guards/platform-admin.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { BypassOrgIsolation } from '@/common/decorators/authorization.decorators';
import { platformAdminContract } from '../../contracts/platform-admin.contract';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

/**
 * Platform Admin Controller
 *
 * All routes in this controller require platform administrator privileges.
 * Organization isolation is bypassed for these routes.
 */
@ApiTags('platform-admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@BypassOrgIsolation()
export class PlatformAdminController {
  private readonly logger = new Logger(PlatformAdminController.name);

  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @TsRestHandler(platformAdminContract.getAllOrganizations)
  async getAllOrganizations(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.getAllOrganizations, async ({ query }) => {
      try {
        const result = await this.platformAdminService.getAllOrganizations(
          req.user,
          query,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error('Failed to get organizations', error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.suspendOrganization)
  async suspendOrganization(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.suspendOrganization, async ({ params, body }) => {
      try {
        const result = await this.platformAdminService.suspendOrganization(
          req.user,
          params.id,
          body.reason,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to suspend organization ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.reactivateOrganization)
  async reactivateOrganization(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.reactivateOrganization, async ({ params }) => {
      try {
        const result = await this.platformAdminService.reactivateOrganization(
          req.user,
          params.id,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to reactivate organization ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.verifyOrganization)
  async verifyOrganization(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.verifyOrganization, async ({ params }) => {
      try {
        const result = await this.platformAdminService.verifyOrganization(
          req.user,
          params.id,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to verify organization ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.changeOrganizationType)
  async changeOrganizationType(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.changeOrganizationType, async ({ params, body }) => {
      try {
        const result = await this.platformAdminService.changeOrganizationType(
          req.user,
          params.id,
          body.type as any,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to change organization type for ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.enableFeature)
  async enableFeature(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.enableFeature, async ({ params, body }) => {
      try {
        const result = await this.platformAdminService.enableFeature(
          req.user,
          params.id,
          body.feature,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to enable feature for organization ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.disableFeature)
  async disableFeature(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.disableFeature, async ({ params, body }) => {
      try {
        const result = await this.platformAdminService.disableFeature(
          req.user,
          params.id,
          body.feature,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to disable feature for organization ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.updateOrganizationPlan)
  async updateOrganizationPlan(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.updateOrganizationPlan, async ({ params, body }) => {
      try {
        const result = await this.platformAdminService.updateOrganizationPlan(
          req.user,
          params.id,
          body.plan,
        );
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Failed to update plan for organization ${params.id}`, error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.getSystemAnalytics)
  async getSystemAnalytics(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.getSystemAnalytics, async () => {
      try {
        const result = await this.platformAdminService.getSystemAnalytics(req.user);
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error('Failed to get system analytics', error);
        throw error;
      }
    });
  }

  @TsRestHandler(platformAdminContract.getUserDetails)
  async getUserDetails(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.getUserDetails, async ({ params }) => {
      try {
        const result = await this.platformAdminService.getUserDetails(
          req.user,
          params.id,
        );
        return { status: 200 as const, body: result as any };
      } catch (error) {
        this.logger.error(`Failed to get user details for ${params.id}`, error);
        throw error;
      }
    });
  }
}