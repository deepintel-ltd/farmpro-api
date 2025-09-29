import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { OrganizationType } from '@prisma/client';
import {
  ORGANIZATION_FEATURES,
  initializeOrganizationFeatures,
} from '@/common/config/organization-features.config';

@Injectable()
export class PlatformAdminService {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Require that the user is a platform admin
   */
  private requirePlatformAdmin(user: CurrentUser): void {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException(
        'This operation requires platform administrator privileges',
      );
    }
  }

  /**
   * Format organization for API response
   */
  private formatOrganization(org: any): any {
    return {
      ...org,
      createdAt: org.createdAt?.toISOString(),
      updatedAt: org.updatedAt?.toISOString(),
      suspendedAt: org.suspendedAt?.toISOString() || null,
      verifiedAt: org.verifiedAt?.toISOString() || null,
    };
  }

  // ============================================================================
  // Organization Management
  // ============================================================================

  /**
   * Get all organizations (platform admin only)
   */
  async getAllOrganizations(user: CurrentUser, query?: {
    page?: number;
    limit?: number;
    type?: OrganizationType;
    isActive?: boolean;
  }) {
    this.requirePlatformAdmin(user);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.type) where.type = query.type;
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              farms: true,
              buyerOrders: true,
              supplierOrders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations.map(org => this.formatOrganization(org)),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Suspend an organization
   */
  async suspendOrganization(
    user: CurrentUser,
    orgId: string,
    reason: string,
  ) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (org.suspendedAt) {
      throw new BadRequestException('Organization is already suspended');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        suspendedAt: new Date(),
        suspensionReason: reason,
        isActive: false,
      },
    });

    this.logger.log(
      `Platform admin ${user.email} suspended organization ${orgId}. Reason: ${reason}`,
    );

    return this.formatOrganization(updated);
  }

  /**
   * Reactivate a suspended organization
   */
  async reactivateOrganization(user: CurrentUser, orgId: string) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (!org.suspendedAt) {
      throw new BadRequestException('Organization is not suspended');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        suspendedAt: null,
        suspensionReason: null,
        isActive: true,
      },
    });

    this.logger.log(
      `Platform admin ${user.email} reactivated organization ${orgId}`,
    );

    return this.formatOrganization(updated);
  }

  /**
   * Verify an organization
   */
  async verifyOrganization(user: CurrentUser, orgId: string) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (org.isVerified) {
      throw new BadRequestException('Organization is already verified');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: user.userId,
      },
    });

    this.logger.log(
      `Platform admin ${user.email} verified organization ${orgId}`,
    );

    return this.formatOrganization(updated);
  }

  /**
   * Change organization type
   */
  async changeOrganizationType(
    user: CurrentUser,
    orgId: string,
    newType: OrganizationType,
  ) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (org.type === newType) {
      throw new BadRequestException(
        'Organization already has this type',
      );
    }

    // Initialize features for new type
    const { allowedModules, features } = initializeOrganizationFeatures(
      newType,
      org.plan,
    );

    // Filter existing features that are still valid
    const validFeatures = org.features.filter((f) => features.includes(f));

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        type: newType,
        allowedModules,
        features: validFeatures.length > 0 ? validFeatures : features,
      },
    });

    this.logger.log(
      `Platform admin ${user.email} changed organization ${orgId} type from ${org.type} to ${newType}`,
    );

    return this.formatOrganization(updated);
  }

  // ============================================================================
  // Feature Management
  // ============================================================================

  /**
   * Enable a feature for an organization
   */
  async enableFeature(
    user: CurrentUser,
    orgId: string,
    feature: string,
  ) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Validate feature is allowed for org type
    const allowedFeatures = ORGANIZATION_FEATURES[org.type].modules;
    if (!allowedFeatures.includes(feature)) {
      throw new BadRequestException(
        `Feature '${feature}' is not available for ${org.type} organizations`,
      );
    }

    if (org.features.includes(feature)) {
      throw new BadRequestException('Feature is already enabled');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        features: {
          push: feature,
        },
      },
    });

    this.logger.log(
      `Platform admin ${user.email} enabled feature '${feature}' for organization ${orgId}`,
    );

    return this.formatOrganization(updated);
  }

  /**
   * Disable a feature for an organization
   */
  async disableFeature(
    user: CurrentUser,
    orgId: string,
    feature: string,
  ) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (!org.features.includes(feature)) {
      throw new BadRequestException('Feature is not enabled');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        features: org.features.filter((f) => f !== feature),
      },
    });

    this.logger.log(
      `Platform admin ${user.email} disabled feature '${feature}' for organization ${orgId}`,
    );

    return this.formatOrganization(updated);
  }

  /**
   * Update organization plan
   */
  async updateOrganizationPlan(
    user: CurrentUser,
    orgId: string,
    plan: string,
  ) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Reinitialize features based on new plan and org type
    const { allowedModules, features } = initializeOrganizationFeatures(
      org.type,
      plan,
    );

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan,
        allowedModules,
        features,
      },
    });

    this.logger.log(
      `Platform admin ${user.email} updated organization ${orgId} plan to '${plan}'`,
    );

    return this.formatOrganization(updated);
  }

  // ============================================================================
  // System Analytics
  // ============================================================================

  /**
   * Get platform-wide analytics
   */
  async getSystemAnalytics(user: CurrentUser) {
    this.requirePlatformAdmin(user);

    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      orgsByType,
      totalUsers,
      activeUsers,
      totalFarms,
      totalOrders,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.organization.count({
        where: { suspendedAt: { not: null } },
      }),
      this.prisma.organization.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.farm.count(),
      this.prisma.order.count(),
    ]);

    return {
      organizations: {
        total: totalOrgs,
        active: activeOrgs,
        suspended: suspendedOrgs,
        byType: orgsByType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      farms: {
        total: totalFarms,
      },
      orders: {
        total: totalOrders,
      },
    };
  }

  /**
   * Get user details across organizations
   */
  async getUserDetails(user: CurrentUser, userId: string) {
    this.requirePlatformAdmin(user);

    const userDetails = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userDetails) {
      throw new NotFoundException('User not found');
    }

    return userDetails;
  }
}