// import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { PlatformAdminService } from './platform-admin.service';
// import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
// import { PlatformAdminGuard } from '@/common/guards/platform-admin.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { BypassOrgIsolation } from '@/common/decorators/authorization.decorators';
import { platformAdminContract } from '../../contracts/platform-admin.contract';
import { PrismaService } from '@/prisma/prisma.service';
import { getSelectableOrganizations } from '@/common/utils/organization.utils';

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

@BypassOrgIsolation()
export class PlatformAdminController {
  private readonly logger = new Logger(PlatformAdminController.name);

  constructor(
    private readonly platformAdminService: PlatformAdminService,
    private readonly prisma: PrismaService,
  ) {}

  @TsRestHandler(platformAdminContract.getAllOrganizations)
  async getAllOrganizations(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.getAllOrganizations, async ({ query }) => {
      try {
        // Check if this is a request for selectable organizations
        if (query['filter[selectable]']) {
          const organizations = await getSelectableOrganizations(
            this.prisma,
            req.user,
          );
          
          return {
            status: 200 as const,
            body: {
              data: organizations.map(org => ({
                type: 'organizations' as const,
                id: org.id,
                attributes: {
                  name: org.name,
                  type: org.type,
                  plan: org.plan,
                  isVerified: org.isVerified,
                  createdAt: org.createdAt.toISOString(),
                  _count: {
                    users: org.userCount,
                    farms: org.farmCount,
                  },
                },
              })),
              meta: {
                page: query.page || 1,
                limit: query.limit || 20,
                total: organizations.length,
                pages: 1,
              },
            },
          };
        }

        // Regular organization listing
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

  /**
   * Update organization endpoint
   */
  @TsRestHandler(platformAdminContract.updateOrganization)
  async updateOrganization(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(platformAdminContract.updateOrganization, async ({ params, body }) => {
      try {
        const result = await this.platformAdminService.updateOrganization(
          req.user,
          params.id,
          body.data.attributes,
        );

        return {
          status: 200 as const,
          body: {
            data: {
              type: 'organizations' as const,
              id: result.id,
              attributes: result,
            },
          },
        };
      } catch (error) {
        this.logger.error(`Failed to update organization ${params.id}`, error);
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
