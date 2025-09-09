import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkPermission(
    user: CurrentUser,
    resource: string,
    action: string,
  ): Promise<void> {
    // For now, implement basic permission checking
    // In production, you'd have proper RBAC implementation

    if (!user.userId || !user.organizationId) {
      throw new ForbiddenException('Invalid user context');
    }

    // Basic permission check - user must be active and in organization
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

    // Check if user has required permission
    const hasPermission = userRecord.userRoles.some((userRole) =>
      userRole.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.resource === resource &&
          rolePermission.permission.action === action &&
          rolePermission.granted,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions for ${resource}:${action}`,
      );
    }
  }

  async checkFarmAccess(user: CurrentUser, farmId: string): Promise<void> {
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: farmId,
        organizationId: user.organizationId,
      },
    });

    if (!farm) {
      throw new ForbiddenException('Farm not found or access denied');
    }
  }

  async checkActivityAccess(
    user: CurrentUser,
    activityId: string,
  ): Promise<void> {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId: user.organizationId },
      },
      include: {
        farm: true,
      },
    });

    if (!activity) {
      throw new ForbiddenException('Activity not found or access denied');
    }

    // Additional check: user must be assigned to activity or be the creator for certain actions
    const isAssignedOrCreator = activity.userId === user.userId;

    if (!isAssignedOrCreator) {
      // For read-only operations, organization membership is enough
      // For execute operations, assignment is required
      // This is handled in the service layer
    }
  }
}
