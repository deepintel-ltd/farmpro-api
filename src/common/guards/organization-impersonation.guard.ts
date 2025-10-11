import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Organization Impersonation Guard
 * 
 * Allows platform administrators to impersonate other organizations by sending
 * an X-Organization-Id header. This is useful for:
 * - Platform admins testing features as different organizations
 * - Support staff helping customers with issues
 * - Debugging organization-specific problems
 * 
 * The guard:
 * 1. Checks if X-Organization-Id header is present
 * 2. Validates that the user is a platform admin
 * 3. Verifies the target organization exists and is active
 * 4. Sets req.organizationFilter with the impersonated organization
 * 5. Adds response headers to indicate impersonation is active
 */
@Injectable()
export class OrganizationImpersonationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationImpersonationGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user: CurrentUser = request.user;

    // Skip if no user (should not happen after JwtAuthGuard)
    if (!user) {
      return true;
    }

    // Extract X-Organization-Id header
    const organizationIdHeader = request.headers['x-organization-id'] as string;

    // If no header provided, use user's organization
    if (!organizationIdHeader) {
      request.organizationFilter = {
        organizationId: user.organizationId,
        isImpersonation: false,
      };
      return true;
    }

    // Only platform admins can impersonate other organizations
    if (!user.isPlatformAdmin) {
      this.logger.warn(
        `Non-platform admin user ${user.email} attempted to use X-Organization-Id header`,
      );
      throw new ForbiddenException('Only platform administrators can impersonate organizations');
    }

    // Validate the organization exists and is active
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationIdHeader },
        select: {
          id: true,
          name: true,
          isActive: true,
          suspendedAt: true,
        },
      });

      if (!organization) {
        throw new UnauthorizedException('Organization not found');
      }

      if (!organization.isActive) {
        throw new UnauthorizedException('Organization is inactive');
      }

      if (organization.suspendedAt) {
        throw new UnauthorizedException('Organization is suspended');
      }

      // Set organization filter for impersonation
      request.organizationFilter = {
        organizationId: organizationIdHeader,
        isImpersonation: true,
      };

      this.logger.log(
        `Platform admin ${user.email} impersonating organization ${organization.name} (${organizationIdHeader})`,
      );

      // Add header to response to indicate impersonation is active
      response.setHeader('X-Impersonated-Organization', organizationIdHeader);
      response.setHeader('X-Impersonated-Organization-Name', organization.name);

    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error validating organization ${organizationIdHeader}:`, error.message);
      throw new UnauthorizedException('Invalid organization ID');
    }

    return true;
  }
}

