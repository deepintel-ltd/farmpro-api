import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OrganizationContext, OrganizationId, IsImpersonating } from '../decorators/organization-context.decorator';
import { OrganizationContext as OrgContext } from '../services/organization-context.service';

/**
 * Example controller demonstrating organization context decorators
 * This is for documentation purposes and can be removed in production
 */
@Controller('example-organization-context')
@UseGuards(JwtAuthGuard)
export class OrganizationContextExampleController {
  
  @Get('context')
  async getOrganizationContext(@OrganizationContext() context: OrgContext) {
    return {
      message: 'Organization context information',
      data: {
        organizationId: context.organizationId,
        isImpersonation: context.isImpersonation,
        impersonatedBy: context.impersonatedBy,
        impersonatedByName: context.impersonatedByName,
      },
    };
  }

  @Get('organization-id')
  async getOrganizationId(@OrganizationId() organizationId: string) {
    return {
      message: 'Current organization ID',
      data: {
        organizationId,
      },
    };
  }

  @Get('impersonation-status')
  async getImpersonationStatus(@IsImpersonating() isImpersonating: boolean) {
    return {
      message: 'Impersonation status',
      data: {
        isImpersonating,
        warning: isImpersonating ? 'You are currently impersonating another organization' : null,
      },
    };
  }

  @Get('combined')
  async getCombinedInfo(
    @OrganizationContext() context: OrgContext,
    @OrganizationId() organizationId: string,
    @IsImpersonating() isImpersonating: boolean,
  ) {
    return {
      message: 'Combined organization information',
      data: {
        context,
        organizationId,
        isImpersonating,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
