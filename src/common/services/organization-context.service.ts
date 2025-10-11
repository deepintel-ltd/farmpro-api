import { Injectable, Logger } from '@nestjs/common';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

export interface OrganizationContext {
  organizationId: string;
  isImpersonation: boolean;
  impersonatedBy?: string;
  impersonatedByName?: string;
}

@Injectable()
export class OrganizationContextService {
  private readonly logger = new Logger(OrganizationContextService.name);

  /**
   * Get organization context from request
   */
  getOrganizationContext(request: any, user: CurrentUser): OrganizationContext {
    // Check if organization impersonation is active
    if (request.organizationFilter?.organizationId) {
      return {
        organizationId: request.organizationFilter.organizationId,
        isImpersonation: request.organizationFilter.isImpersonation || false,
        impersonatedBy: user.userId,
        impersonatedByName: user.email,
      };
    }

    // Fallback to user's organization
    return {
      organizationId: user.organizationId,
      isImpersonation: false,
    };
  }

  /**
   * Get organization ID from request context
   */
  getOrganizationId(request: any, user: CurrentUser): string {
    const context = this.getOrganizationContext(request, user);
    return context.organizationId;
  }

  /**
   * Check if current request is impersonating another organization
   */
  isImpersonating(request: any): boolean {
    return request.organizationFilter?.isImpersonation || false;
  }

  /**
   * Log organization context for debugging
   */
  logOrganizationContext(request: any, user: CurrentUser, operation: string): void {
    const context = this.getOrganizationContext(request, user);
    
    if (context.isImpersonation) {
      this.logger.log(
        `[${operation}] Platform admin ${user.email} impersonating organization ${context.organizationId}`,
      );
    } else {
      this.logger.debug(
        `[${operation}] User ${user.email} accessing organization ${context.organizationId}`,
      );
    }
  }
}
