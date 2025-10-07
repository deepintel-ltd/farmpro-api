import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';
import { OrganizationValidationService } from '@/common/services/organization-validation.service';

// Metadata key for bypassing organization isolation
export const BYPASS_ORG_ISOLATION_KEY = 'bypassOrgIsolation';

/**
 * Organization Isolation Guard
 *
 * Ensures that users can only access data within their organization.
 * Platform admins bypass this restriction.
 *
 * This guard should be applied globally to ensure data isolation by default.
 */
@Injectable()
export class OrganizationIsolationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationIsolationGuard.name);

  constructor(
    private reflector: Reflector,
    private organizationValidationService: OrganizationValidationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    // Check if this route explicitly bypasses org isolation
    const bypassOrgIsolation = this.reflector.getAllAndOverride<boolean>(
      BYPASS_ORG_ISOLATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (bypassOrgIsolation) {
      this.logger.debug('Organization isolation bypassed for this route');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Platform admins can access all organizations
    if (user.isPlatformAdmin) {
      // Check if platform admin has selected a specific organization
      const selectedOrgId = request.headers['x-organization-id'];
      
      if (selectedOrgId) {
        // Validate the selected organization
        const org = await this.organizationValidationService.validateOrganizationAccess(
          selectedOrgId,
          user,
        );
        
        if (org) {
          // Set organization filter for the selected organization
          request.organizationFilter = {
            organizationId: selectedOrgId,
          };
          this.logger.debug(
            `Platform admin ${user.email} accessing resource with selected org ${selectedOrgId}`,
          );
        } else {
          this.logger.warn(
            `Platform admin ${user.email} attempted to access invalid organization ${selectedOrgId}`,
          );
          throw new ForbiddenException('Invalid organization selected');
        }
      } else {
        this.logger.debug(
          `Platform admin ${user.email} accessing resource without organization selection`,
        );
      }
      
      return true;
    }

    // Regular users must have organization context
    if (!user.organizationId) {
      throw new ForbiddenException('User must belong to an organization');
    }

    // Organization is suspended
    if (user.organization?.isSuspended) {
      throw new ForbiddenException(
        'Your organization has been suspended. Please contact support.',
      );
    }

    // Add organization filter to request for use in services
    request.organizationFilter = {
      organizationId: user.organizationId,
    };

    this.logger.debug(
      `User ${user.email} accessing resource within org ${user.organizationId}`,
    );

    return true;
  }
}
