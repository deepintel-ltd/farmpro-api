import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationContextService, OrganizationContext as OrganizationContextType } from '../services/organization-context.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Decorator to get organization context from request
 * Usage: @OrganizationContext() context: OrganizationContext
 */
export const OrganizationContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OrganizationContextType => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    
    if (!user) {
      throw new Error('User not found in request context');
    }

    // Get the organization context service from the request
    const organizationContextService = new OrganizationContextService();
    return organizationContextService.getOrganizationContext(request, user);
  },
);

/**
 * Decorator to get organization ID from request
 * Usage: @OrganizationId() organizationId: string
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    
    if (!user) {
      throw new Error('User not found in request context');
    }

    // Get the organization context service from the request
    const organizationContextService = new OrganizationContextService();
    return organizationContextService.getOrganizationId(request, user);
  },
);

/**
 * Decorator to check if current request is impersonating another organization
 * Usage: @IsImpersonating() isImpersonating: boolean
 */
export const IsImpersonating = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationFilter?.isImpersonation || false;
  },
);
