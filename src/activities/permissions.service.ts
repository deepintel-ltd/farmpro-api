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
    action: 'read' | 'update' | 'execute' | 'delete' = 'read',
  ): Promise<boolean> {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId: user.organizationId },
      },
      include: {
        farm: true,
        assignments: {
          where: { 
            userId: user.userId,
            isActive: true 
          }
        },
      },
    });

    if (!activity) {
      throw new ForbiddenException('Activity not found or access denied');
    }

    // Check if user is assigned to the activity
    const isAssigned = activity.assignments.length > 0;
    const isCreator = activity.createdById === user.userId;
    const isManager = await this.checkManagerRole(user, activity.farmId);

    switch (action) {
      case 'read':
        // Read access: assigned user, creator, manager, or organization member with permission
        return isAssigned || isCreator || isManager;
      
      case 'update':
        // Update access: assigned user, creator, or manager
        return isAssigned || isCreator || isManager;
      
      case 'execute':
        // Execute access: only assigned users (supervisors and assigned workers)
        return isAssigned;
      
      case 'delete':
        // Delete access: creator or manager only
        return isCreator || isManager;
      
      default:
        return false;
    }
  }

  async checkManagerRole(user: CurrentUser, farmId: string): Promise<boolean> {
    // Check if user has manager role for this farm
    const managerRole = await this.prisma.userRole.findFirst({
      where: {
        userId: user.userId,
        farmId: farmId,
        isActive: true,
        role: {
          name: {
            in: ['FARM_MANAGER', 'FARM_OWNER', 'ADMIN']
          }
        }
      },
      include: {
        role: true
      }
    });

    return !!managerRole;
  }

  async checkAssignment(user: CurrentUser, activityId: string): Promise<boolean> {
    const assignment = await this.prisma.activityAssignment.findFirst({
      where: {
        activityId,
        userId: user.userId,
        isActive: true,
      },
    });

    return !!assignment;
  }
}
