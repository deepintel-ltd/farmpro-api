import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Injectable()
export class OrganizationValidationService {
  private readonly logger = new Logger(OrganizationValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that a platform admin can access the specified organization
   */
  async validateOrganizationAccess(
    organizationId: string,
    user: CurrentUser,
  ): Promise<{ id: string; name: string; type: string; isActive: boolean } | null> {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can select organizations');
    }

    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          suspendedAt: true,
        },
      });

      if (!organization) {
        this.logger.warn(
          `Platform admin ${user.email} attempted to access non-existent organization ${organizationId}`,
        );
        return null;
      }

      if (!organization.isActive || organization.suspendedAt) {
        this.logger.warn(
          `Platform admin ${user.email} attempted to access inactive/suspended organization ${organizationId}`,
        );
        return null;
      }

      this.logger.debug(
        `Platform admin ${user.email} validated access to organization ${organizationId}`,
      );

      return {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        isActive: organization.isActive,
      };
    } catch (error) {
      this.logger.error(
        `Error validating organization access for platform admin ${user.email}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get all organizations that a platform admin can access
   */
  async getSelectableOrganizations(user: CurrentUser) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can access organization list');
    }

    const organizations = await this.prisma.organization.findMany({
      where: {
        isActive: true,
        suspendedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        plan: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            farms: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return organizations.map(org => ({
      id: org.id,
      name: org.name,
      type: org.type,
      plan: org.plan,
      isVerified: org.isVerified,
      createdAt: org.createdAt,
      userCount: org._count.users,
      farmCount: org._count.farms,
    }));
  }
}
