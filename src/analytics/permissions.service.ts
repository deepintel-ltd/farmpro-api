import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AnalyticsPermissionsService {
  private readonly logger = new Logger(AnalyticsPermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has analytics permission
   */
  async checkAnalyticsPermission(user: CurrentUser, action: string = 'read'): Promise<void> {
    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    const hasPermission = await this.checkUserPermission(user, 'analytics', action);
    if (!hasPermission) {
      throw new ForbiddenException(`Insufficient permissions for analytics:${action}`);
    }
  }

  /**
   * Check if user has finance analytics permission
   */
  async checkFinanceAnalyticsPermission(user: CurrentUser): Promise<void> {
    const hasPermission = await this.checkUserPermission(user, 'finance', 'read');
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for finance analytics');
    }
  }

  /**
   * Check if user has market research permission
   */
  async checkMarketResearchPermission(user: CurrentUser): Promise<void> {
    const hasPermission = await this.checkUserPermission(user, 'market', 'read');
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for market research');
    }
  }

  /**
   * Check if user has reports permission
   */
  async checkReportsPermission(user: CurrentUser, action: string = 'read'): Promise<void> {
    const hasPermission = await this.checkUserPermission(user, 'reports', action);
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
      where: { id: commodityId },
    });

    if (!commodity) {
      throw new ForbiddenException('Commodity not found or access denied for analytics');
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

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Generic method to check user permissions
   */
  private async checkUserPermission(user: CurrentUser, resource: string, action: string): Promise<boolean> {
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
      return false;
    }

    return userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === resource &&
          rolePermission.permission.action === action &&
          rolePermission.granted,
      ),
    );
  }
}
