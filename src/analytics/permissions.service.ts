import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AnalyticsPermissionsService {
  private readonly logger = new Logger(AnalyticsPermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has analytics read permission
   */
  async checkAnalyticsPermission(user: CurrentUser, action: string = 'read'): Promise<void> {
    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    const userRecord = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Check if user has required analytics permission
    const hasPermission = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === 'analytics' &&
          rolePermission.permission.action === action &&
          rolePermission.granted,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Insufficient permissions for analytics:${action}`);
    }
  }

  /**
   * Check if user has finance analytics permission
   */
  async checkFinanceAnalyticsPermission(user: CurrentUser): Promise<void> {
    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    const userRecord = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Check if user has finance read permission
    const hasPermission = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === 'finance' &&
          rolePermission.permission.action === 'read' &&
          rolePermission.granted,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for finance analytics');
    }
  }

  /**
   * Check if user has market research permission
   */
  async checkMarketResearchPermission(user: CurrentUser): Promise<void> {
    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    const userRecord = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Check if user has market read permission
    const hasPermission = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === 'market' &&
          rolePermission.permission.action === 'read' &&
          rolePermission.granted,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for market research');
    }
  }

  /**
   * Check if user has reports permission
   */
  async checkReportsPermission(user: CurrentUser, action: string = 'read'): Promise<void> {
    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    const userRecord = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Check if user has reports permission
    const hasPermission = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === 'reports' &&
          rolePermission.permission.action === action &&
          rolePermission.granted,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Insufficient permissions for reports:${action}`);
    }
  }

  /**
   * Check if user has access to specific farm for analytics
   */
  async checkFarmAnalyticsAccess(user: CurrentUser, farmId: string): Promise<void> {
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: farmId,
        organizationId: user.organizationId,
      },
    });

    if (!farm) {
      throw new ForbiddenException('Farm not found or access denied for analytics');
    }
  }

  /**
   * Check if user has access to specific commodity for analytics
   */
  async checkCommodityAnalyticsAccess(user: CurrentUser, commodityId: string): Promise<void> {
    const commodity = await this.prisma.commodity.findFirst({
      where: {
        id: commodityId,
      },
    });

    if (!commodity) {
      throw new ForbiddenException('Commodity not found or access denied for analytics');
    }
  }

  /**
   * Check if user has access to specific organization for analytics
   */
  async checkOrganizationAnalyticsAccess(user: CurrentUser, organizationId: string): Promise<void> {
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to organization analytics');
    }
  }

  /**
   * Check if user has admin permissions for analytics
   */
  async checkAdminAnalyticsPermission(user: CurrentUser): Promise<void> {
    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    const userRecord = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Check if user has admin role
    const isAdmin = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === 'admin' &&
          rolePermission.permission.action === 'read' &&
          rolePermission.granted,
      ),
    );

    if (!isAdmin) {
      throw new ForbiddenException('Insufficient permissions for admin analytics');
    }
  }

  /**
   * Validate dashboard access with farm context
   */
  async validateDashboardAccess(user: CurrentUser, farmId?: string): Promise<void> {
    await this.checkAnalyticsPermission(user, 'read');
    
    if (farmId) {
      await this.checkFarmAnalyticsAccess(user, farmId);
    }
  }

  /**
   * Validate profitability access with farm context
   */
  async validateProfitabilityAccess(user: CurrentUser, farmId?: string): Promise<void> {
    await this.checkFinanceAnalyticsPermission(user);
    
    if (farmId) {
      await this.checkFarmAnalyticsAccess(user, farmId);
    }
  }

  /**
   * Validate market research access with commodity context
   */
  async validateMarketResearchAccess(user: CurrentUser, commodityId?: string): Promise<void> {
    await this.checkMarketResearchPermission(user);
    
    if (commodityId) {
      await this.checkCommodityAnalyticsAccess(user, commodityId);
    }
  }

  /**
   * Validate planning access with farm context
   */
  async validatePlanningAccess(user: CurrentUser, farmId?: string): Promise<void> {
    await this.checkAnalyticsPermission(user, 'read');
    
    if (farmId) {
      await this.checkFarmAnalyticsAccess(user, farmId);
    }
  }

  /**
   * Validate data export permission
   */
  async validateDataExportPermission(user: CurrentUser): Promise<void> {
    await this.checkReportsPermission(user, 'create');
  }

  /**
   * Validate report creation permission
   */
  async validateReportCreationPermission(user: CurrentUser): Promise<void> {
    await this.checkReportsPermission(user, 'create');
  }

  /**
   * Validate report scheduling permission
   */
  async validateReportSchedulingPermission(user: CurrentUser): Promise<void> {
    await this.checkReportsPermission(user, 'create');
  }

  /**
   * Check if user can access advanced analytics features
   */
  async validateAdvancedAnalyticsPermission(user: CurrentUser): Promise<void> {
    await this.checkAnalyticsPermission(user, 'read');
    
    // Additional check for advanced features - could be based on user role level
    const userRecord = await this.prisma.user.findFirst({
      where: {
        id: user.userId,
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Check if user has advanced analytics permission
    const hasAdvancedPermission = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === 'analytics' &&
          rolePermission.permission.action === 'advanced' &&
          rolePermission.granted,
      ),
    );

    if (!hasAdvancedPermission) {
      throw new ForbiddenException('Insufficient permissions for advanced analytics');
    }
  }
}
