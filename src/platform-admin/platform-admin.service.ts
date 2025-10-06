import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { OrganizationType, SubscriptionTier } from '@prisma/client';
import { UpdateOrganizationRequest } from '../../contracts/platform-admin.schemas';
import { ORGANIZATION_FEATURES } from '@/common/config/organization-features.config';
import { PlanFeatureMapperService } from '@/billing/services/plan-feature-mapper.service';

@Injectable()
export class PlatformAdminService {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planFeatureMapper: PlanFeatureMapperService,
  ) {}

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
   * Update organization method (JSON:API compliant)
   * Handles status, verification, type, plan, and feature updates in one endpoint
   */
  async updateOrganization(
    user: CurrentUser,
    orgId: string,
    updates: UpdateOrganizationRequest['data']['attributes'],
  ) {
    this.requirePlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const updateData = this.buildUpdateData(user, org, updates);

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return this.formatOrganization(updated);
  }

  /**
   * Build update data object based on the provided updates
   */
  private buildUpdateData(
    user: CurrentUser,
    org: any,
    updates: UpdateOrganizationRequest['data']['attributes'],
  ): any {
    const updateData: any = {};

    this.handleStatusUpdate(user, org, updates, updateData);
    this.handleVerificationUpdate(user, org, updates, updateData);
    this.handleTypeUpdate(user, org, updates, updateData);
    this.handlePlanUpdate(user, org, updates, updateData);
    this.handleFeaturesUpdate(user, org, updates, updateData);

    return updateData;
  }

  /**
   * Handle organization status changes (active/suspended)
   */
  private handleStatusUpdate(
    user: CurrentUser,
    org: any,
    updates: UpdateOrganizationRequest['data']['attributes'],
    updateData: any,
  ): void {
    if (updates.status === undefined) return;

    if (updates.status === 'suspended') {
      if (!updates.suspensionReason) {
        throw new BadRequestException('suspensionReason is required when suspending an organization');
      }
      if (org.suspendedAt) {
        throw new BadRequestException('Organization is already suspended');
      }
      Object.assign(updateData, {
        suspendedAt: new Date(),
        suspensionReason: updates.suspensionReason,
        isActive: false,
      });
      this.logger.log(
        `Platform admin ${user.email} suspended organization ${org.id}. Reason: ${updates.suspensionReason}`,
      );
    } else if (updates.status === 'active') {
      if (!org.suspendedAt) {
        throw new BadRequestException('Organization is not suspended');
      }
      Object.assign(updateData, {
        suspendedAt: null,
        suspensionReason: null,
        isActive: true,
      });
      this.logger.log(`Platform admin ${user.email} reactivated organization ${org.id}`);
    }
  }

  /**
   * Handle organization verification changes
   */
  private handleVerificationUpdate(
    user: CurrentUser,
    org: any,
    updates: UpdateOrganizationRequest['data']['attributes'],
    updateData: any,
  ): void {
    if (updates.isVerified === undefined) return;

    if (updates.isVerified) {
      if (org.isVerified) {
        throw new BadRequestException('Organization is already verified');
      }
      Object.assign(updateData, {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: user.userId,
      });
      this.logger.log(`Platform admin ${user.email} verified organization ${org.id}`);
    } else {
      Object.assign(updateData, {
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
      });
      this.logger.log(`Platform admin ${user.email} unverified organization ${org.id}`);
    }
  }

  /**
   * Handle organization type changes
   */
  private handleTypeUpdate(
    user: CurrentUser,
    org: any,
    updates: UpdateOrganizationRequest['data']['attributes'],
    updateData: any,
  ): void {
    if (updates.organizationType === undefined) return;

    if (org.type === updates.organizationType) {
      throw new BadRequestException('Organization already has this type');
    }

    const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
      updates.organizationType,
      org.plan as SubscriptionTier,
    );
    const validFeatures = org.features.filter((f: string) => features.includes(f));

    Object.assign(updateData, {
      type: updates.organizationType,
      allowedModules,
      features: validFeatures.length > 0 ? validFeatures : features,
    });

    this.logger.log(
      `Platform admin ${user.email} changed organization ${org.id} type from ${org.type} to ${updates.organizationType}`,
    );
  }

  /**
   * Handle organization plan updates
   */
  private handlePlanUpdate(
    user: CurrentUser,
    org: any,
    updates: UpdateOrganizationRequest['data']['attributes'],
    updateData: any,
  ): void {
    if (updates.plan === undefined) return;

    const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
      org.type,
      updates.plan as SubscriptionTier,
    );

    Object.assign(updateData, {
      plan: updates.plan,
      allowedModules,
      features,
    });

    this.logger.log(
      `Platform admin ${user.email} updated organization ${org.id} plan to '${updates.plan}'`,
    );
  }

  /**
   * Handle feature toggles
   */
  private handleFeaturesUpdate(
    user: CurrentUser,
    org: any,
    updates: UpdateOrganizationRequest['data']['attributes'],
    updateData: any,
  ): void {
    if (updates.features === undefined) return;

    const allowedFeatures = ORGANIZATION_FEATURES[org.type].modules;
    const currentFeatures = org.features;
    const newFeatures = [...currentFeatures];

    for (const [feature, enabled] of Object.entries(updates.features)) {
      if (!allowedFeatures.includes(feature)) {
        throw new BadRequestException(
          `Feature '${feature}' is not available for ${org.type} organizations`,
        );
      }

      if (enabled && !currentFeatures.includes(feature)) {
        newFeatures.push(feature);
        this.logger.log(
          `Platform admin ${user.email} enabled feature '${feature}' for organization ${org.id}`,
        );
      } else if (!enabled && currentFeatures.includes(feature)) {
        const index = newFeatures.indexOf(feature);
        if (index > -1) {
          newFeatures.splice(index, 1);
        }
        this.logger.log(
          `Platform admin ${user.email} disabled feature '${feature}' for organization ${org.id}`,
        );
      }
    }

    updateData.features = newFeatures;
  }

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
      data: organizations.map(org => ({
        id: org.id,
        type: 'organizations' as const,
        attributes: this.formatOrganization(org),
      })),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
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
