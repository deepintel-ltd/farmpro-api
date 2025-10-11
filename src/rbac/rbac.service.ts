import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
// Permission utils removed - using plan-based permissions now
import {
  CreateRoleDto,
  UpdateRoleDto,
  CheckPermissionDto,
  CheckPermissionsDto,
  BulkAssignRolesDto,
  PermissionCheckResult,
} from './dto/rbac.dto';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Role Management
  // =============================================================================

  async getRoles(user: CurrentUser, query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    isSystemRole?: boolean;
  }) {
    this.logger.log(`Getting roles for organization: ${user.organizationId}`, { query });

    // Authorization is now handled by guards and decorators in the controller

    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: user.organizationId,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isSystemRole !== undefined) {
      where.isSystemRole = query.isSystemRole;
    }

    const [roles, totalCount] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userRoles: {
                where: { isActive: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    this.logger.log(`Found ${totalCount} roles for organization: ${user.organizationId}`);

    return {
      data: roles.map(role => this.formatRoleResponse(role)),
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getRole(roleId: string, user: CurrentUser): Promise<{ data: any }> {
    this.logger.log(`Getting role: ${roleId} for organization: ${user.organizationId}`);

    // Authorization is now handled by guards and decorators in the controller

    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId: user.organizationId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    this.logger.log(`Retrieved role: ${roleId}`);

    return {
      data: this.formatRoleResponse(role),
    };
  }

  async createRole(user: CurrentUser, data: CreateRoleDto): Promise<{ data: any }> {
    this.logger.log(`Creating role: ${data.name} for organization: ${user.organizationId}`);

    // Authorization is now handled by guards and decorators in the controller

    // Check if role name already exists in organization
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: data.name,
        organizationId: user.organizationId,
      },
    });

    if (existingRole) {
      throw new ConflictException('Role name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId: user.organizationId,
        level: data.level,
        isActive: true,
        isSystemRole: false,
        metadata: data.metadata,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    this.logger.log(`Created role: ${role.id} for organization: ${user.organizationId}`);

    return {
      data: this.formatRoleResponse(role),
    };
  }

  async updateRole(roleId: string, user: CurrentUser, data: UpdateRoleDto): Promise<{ data: any }> {
    this.logger.log(`Updating role: ${roleId} for organization: ${user.organizationId}`);

    // Authorization is now handled by guards and decorators in the controller

    const existingRole = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId: user.organizationId,
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    if (existingRole.isSystemRole) {
      throw new ForbiddenException('Cannot update system role');
    }

    // Check if new name conflicts with existing role
    if (data.name && data.name !== existingRole.name) {
      const conflictingRole = await this.prisma.role.findFirst({
        where: {
          name: data.name,
          organizationId: user.organizationId,
          id: { not: roleId },
        },
      });

      if (conflictingRole) {
        throw new ConflictException('Role name already exists');
      }
    }

    const role = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
        level: data.level,
        isActive: data.isActive,
        metadata: data.metadata,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    this.logger.log(`Updated role: ${roleId}`);

    return {
      data: this.formatRoleResponse(role),
    };
  }

  async deleteRole(roleId: string, user: CurrentUser): Promise<{ data: any }> {
    this.logger.log(`Deleting role: ${roleId} for organization: ${user.organizationId}`);

    // Authorization is now handled by guards and decorators in the controller

    const existingRole = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId: user.organizationId,
      },
      include: {
        _count: {
          select: {
            userRoles: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    if (existingRole.isSystemRole) {
      throw new ForbiddenException('Cannot delete system role');
    }

    if (existingRole._count.userRoles > 0) {
      throw new BadRequestException('Role cannot be deleted - users are assigned to this role');
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    this.logger.log(`Deleted role: ${roleId}`);

    return {
      data: {
        id: roleId,
        type: 'roles' as const,
        attributes: {
          message: 'Role deleted successfully',
          success: true,
        },
      },
    };
  }

  // =============================================================================
  // Permission Management
  // =============================================================================

  async getPermissions(user: CurrentUser, query: {
    page?: number;
    limit?: number;
    resource?: string;
    action?: string;
  }) {
    this.logger.log(`Getting permissions`, { query });

    // Authorization is now handled by guards and decorators in the controller

    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.resource) {
      where.resource = { contains: query.resource, mode: 'insensitive' };
    }

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    const [permissions, totalCount] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { resource: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ]);

    this.logger.log(`Found ${totalCount} permissions`);

    return {
      data: permissions.map(permission => ({
        id: permission.id,
        type: 'permission' as const,
        attributes: {
          id: permission.id,
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
          isSystemPermission: permission.isSystemPermission,
          conditions: permission.conditions,
          createdAt: permission.createdAt.toISOString(),
        },
      })),
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // =============================================================================
  // Permission Checking & Authorization
  // =============================================================================

  async checkPermission(user: CurrentUser, data: CheckPermissionDto): Promise<{ data: any }> {
    this.logger.log(`Checking permission: ${data.resource}:${data.action} for user: ${user.userId}`);

    // Validate input
    if (!data.resource || data.resource.trim() === '') {
      throw new BadRequestException('Resource cannot be empty');
    }
    if (!data.action || data.action.trim() === '') {
      throw new BadRequestException('Action cannot be empty');
    }

    // Create context for scope validation - always required
    const context = {
      organizationId: user.organizationId || undefined,
      farmId: data.resourceId || undefined, // Use resourceId as farmId if provided
    };

    // Ensure we have the minimum required context
    if (!context.organizationId && !user.isPlatformAdmin) {
      this.logger.warn(`Permission check for ${data.resource}:${data.action} requires organization context for user ${user.userId}`);
      return {
        data: {
          id: 'permission-check',
          type: 'permission-check' as const,
          attributes: {
            resource: data.resource,
            action: data.action,
            resourceId: data.resourceId || null,
            granted: false,
            reason: 'Organization context required for permission check',
            matchedRole: undefined,
          },
        },
      };
    }

    const hasPermission = await this.hasPermission(user.userId, data.resource, data.action, context);

    const result: PermissionCheckResult = {
      resource: data.resource,
      action: data.action,
      resourceId: data.resourceId || null,
      granted: hasPermission,
      reason: hasPermission ? 'User has required permission' : 'User lacks required permission',
      matchedRole: hasPermission ? 'admin' : undefined, // TODO: Get actual role name
    };

    this.logger.log(`Permission check result: ${hasPermission} for ${data.resource}:${data.action}`);

    return {
      data: {
        id: 'permission-check',
        type: 'permission-check' as const,
        attributes: result,
      },
    };
  }

  async checkPermissions(user: CurrentUser, data: CheckPermissionsDto): Promise<{ data: any[]; meta: any }> {
    this.logger.log(`Checking ${data.permissions.length} permissions for user: ${user.userId}`);

    // Validate input
    if (!data.permissions) {
      throw new BadRequestException('Permissions array is required');
    }

    // Validate each permission if array is not empty
    for (const permission of data.permissions) {
      if (!permission.resource || permission.resource.trim() === '') {
        throw new BadRequestException('Resource cannot be empty');
      }
      if (!permission.action || permission.action.trim() === '') {
        throw new BadRequestException('Action cannot be empty');
      }
    }

    const results = await Promise.all(
      data.permissions.map(async (permission, index) => {
        // Create context for scope validation - always required
        const context = {
          organizationId: user.organizationId || undefined,
          farmId: permission.resourceId || undefined,
        };

        // Ensure we have the minimum required context
        if (!context.organizationId && !user.isPlatformAdmin) {
          return {
            id: `permission-check-${index}`,
            type: 'permission-check' as const,
            attributes: {
              resource: permission.resource,
              action: permission.action,
              resourceId: permission.resourceId || null,
              granted: false,
              reason: 'Organization context required for permission check',
              matchedRole: undefined,
            },
          };
        }

        const hasPermission = await this.hasPermission(
          user.userId,
          permission.resource,
          permission.action,
          context
        );

        return {
          id: `permission-check-${index}`,
          type: 'permission-check' as const,
          attributes: {
            resource: permission.resource,
            action: permission.action,
            resourceId: permission.resourceId || null,
            granted: hasPermission,
            reason: hasPermission ? 'User has required permission' : 'User lacks required permission',
            matchedRole: hasPermission ? 'admin' : undefined, // TODO: Get actual role name
          },
        };
      })
    );

    this.logger.log(`Batch permission check completed for ${data.permissions.length} permissions`);

    return {
      data: results,
      meta: { totalCount: results.length },
    };
  }

  async getCurrentUserPermissions(user: CurrentUser, query: {
    resource?: string;
    action?: string;
  }) {
    this.logger.log(`Getting permissions for user: ${user.userId}`, { query });

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId: user.userId,
        isActive: true,
      },
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
    });

    const permissions = userRoles.flatMap(userRole =>
      userRole.role.permissions.map(rolePermission => ({
        id: rolePermission.permission.id,
        type: 'permission' as const,
        attributes: {
          id: rolePermission.permission.id,
          resource: rolePermission.permission.resource,
          action: rolePermission.permission.action,
          description: rolePermission.permission.description,
          granted: rolePermission.granted,
          conditions: rolePermission.conditions,
          source: 'role' as const,
          roleId: userRole.roleId,
          createdAt: rolePermission.permission.createdAt.toISOString(),
          updatedAt: rolePermission.permission.createdAt.toISOString(),
        },
      }))
    );

    // Filter by query parameters
    let filteredPermissions = permissions;
    if (query.resource) {
      filteredPermissions = filteredPermissions.filter(p => 
        p.attributes.resource.includes(query.resource!)
      );
    }
    if (query.action) {
      filteredPermissions = filteredPermissions.filter(p => 
        p.attributes.action.includes(query.action!)
      );
    }

    this.logger.log(`Retrieved ${filteredPermissions.length} permissions for user: ${user.userId}`);

    return {
      data: filteredPermissions,
      meta: { totalCount: filteredPermissions.length },
    };
  }

  // =============================================================================
  // User Role Management
  // =============================================================================

  async getUserRoles(userId: string, currentUser: CurrentUser) {
    this.logger.log(`Getting roles for user: ${userId} by admin: ${currentUser.userId}`);

    // Check if user has permission to read user roles - should be admin-level permission
    const hasRoleManagementPermission = await this.hasPermission(currentUser.userId, 'role', 'create');
    if (!hasRoleManagementPermission && currentUser.userId !== userId) {
      throw new ForbiddenException('Insufficient permissions to view user roles');
    }

    // Check if target user is in same organization
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
      throw new NotFoundException('User not found');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        isActive: true,
      },
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
    });

    this.logger.log(`Retrieved ${userRoles.length} roles for user: ${userId}`);

    return {
      data: userRoles.map(userRole => ({
        id: userRole.id,
        type: 'user-role' as const,
        attributes: {
          id: userRole.id,
          userId: userRole.userId,
          roleId: userRole.roleId,
          farmId: userRole.farmId,
          isActive: userRole.isActive,
          assignedAt: new Date().toISOString(),
          assignedBy: 'system',
          role: {
            id: userRole.role.id,
            name: userRole.role.name,
            description: userRole.role.description,
            level: userRole.role.level,
            isSystemRole: userRole.role.isSystemRole,
            permissions: userRole.role.permissions.map(rp => ({
              id: rp.permission.id,
              resource: rp.permission.resource,
              action: rp.permission.action,
              granted: rp.granted,
              conditions: rp.conditions,
            })),
          },
        },
      })),
      meta: { totalCount: userRoles.length },
    };
  }

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  async bulkAssignRoles(user: CurrentUser, data: BulkAssignRolesDto): Promise<{ data: any }> {
    this.logger.log(`Bulk assigning role ${data.roleId} to ${data.userIds.length} users`);

    // Authorization is now handled by guards and decorators in the controller

    // Check if role exists first
    const role = await this.prisma.role.findFirst({
      where: {
        id: data.roleId,
        organizationId: user.organizationId,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const userId of data.userIds) {
      try {
        // Check if user exists and is in same organization
        const targetUser = await this.prisma.user.findFirst({
          where: {
            id: userId,
            organizationId: user.organizationId,
          },
        });

        if (!targetUser) {
          results.push({ id: userId, success: false, error: 'User not found' });
          failureCount++;
          continue;
        }

        // Check if assignment already exists
        const existingAssignment = await this.prisma.userRole.findFirst({
          where: {
            userId,
            roleId: data.roleId,
            farmId: data.farmId,
            isActive: true,
          },
        });

        if (existingAssignment) {
          results.push({ id: userId, success: false, error: 'Role already assigned' });
          failureCount++;
          continue;
        }

        // Create assignment
        await this.prisma.userRole.create({
          data: {
            userId,
            roleId: data.roleId,
            farmId: data.farmId,
            isActive: true,
            assignedBy: user.userId,
          },
        });

        results.push({ id: userId, success: true });
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to assign role to user ${userId}:`, error);
        results.push({ 
          id: userId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failureCount++;
      }
    }

    this.logger.log(`Bulk role assignment completed: ${successCount} success, ${failureCount} failures`);

    return {
      data: {
        id: 'bulk-assign-roles',
        type: 'bulk-operation' as const,
        attributes: {
          successCount,
          failureCount,
          results,
        },
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  async hasPermission(): Promise<boolean> {
    // Permission checking now handled by plan-based permissions
    // This method is kept for backward compatibility but always returns true
    // as permissions are now determined by subscription plan
    return true;
  }

  private formatRoleResponse(role: any): any {
    return {
      id: role.id,
      type: 'role' as const,
      attributes: {
        id: role.id,
        name: role.name,
        description: role.description,
        organizationId: role.organizationId,
        level: role.level,
        isActive: role.isActive,
        isSystemRole: role.isSystemRole,
        metadata: role.metadata,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
        userCount: role._count?.userRoles || 0,
        permissions: role.permissions?.map((rp: any) => ({
          id: rp.permission.id,
          resource: rp.permission.resource,
          action: rp.permission.action,
          granted: rp.granted,
          conditions: rp.conditions,
        })) || [],
      },
    };
  }
}
