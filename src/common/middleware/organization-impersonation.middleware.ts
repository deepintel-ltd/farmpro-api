import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: CurrentUser;
  organizationFilter?: {
    organizationId: string;
    isImpersonation: boolean;
  };
}

@Injectable()
export class OrganizationImpersonationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OrganizationImpersonationMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Skip if no user (unauthenticated requests)
    if (!req.user) {
      return next();
    }

    // Extract X-Organization-Id header
    const organizationIdHeader = req.headers['x-organization-id'] as string;

    // If no header provided, use user's organization
    if (!organizationIdHeader) {
      req.organizationFilter = {
        organizationId: req.user.organizationId,
        isImpersonation: false,
      };
      return next();
    }

    // Only platform admins can impersonate other organizations
    if (!req.user.isPlatformAdmin) {
      this.logger.warn(
        `Non-platform admin user ${req.user.email} attempted to use X-Organization-Id header`,
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
      req.organizationFilter = {
        organizationId: organizationIdHeader,
        isImpersonation: true,
      };

      this.logger.log(
        `Platform admin ${req.user.email} impersonating organization ${organization.name} (${organizationIdHeader})`,
      );

      // Add header to response to indicate impersonation is active
      res.setHeader('X-Impersonated-Organization', organizationIdHeader);
      res.setHeader('X-Impersonated-Organization-Name', organization.name);

    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error validating organization ${organizationIdHeader}:`, error.message);
      throw new UnauthorizedException('Invalid organization ID');
    }

    next();
  }
}
