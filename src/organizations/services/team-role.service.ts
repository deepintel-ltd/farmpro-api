import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoleScope } from '@prisma/client';

export interface TeamRoleTemplate {
  id: string;
  name: string;
  description: string;
  level: number;
  category: 'management' | 'field' | 'data' | 'viewer';
  permissions: string[];
}

export type TeamRoleType = 'farm_manager' | 'field_worker' | 'data_entry' | 'viewer';

@Injectable()
export class TeamRoleService {
  private readonly logger = new Logger(TeamRoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all team role templates
   */
  async getTeamRoleTemplates(): Promise<TeamRoleTemplate[]> {
    this.logger.log('Getting all team role templates');

    const templates = await this.prisma.role.findMany({
      where: {
        isSystemRole: true,
        scope: RoleScope.ORGANIZATION,
        metadata: {
          path: ['roleType'],
          equals: 'team_member',
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { level: 'desc' },
    });

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      level: template.level,
      category: (template.metadata as any)?.category || 'viewer',
      permissions: template.permissions
        .filter(rp => rp.granted)
        .map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    }));
  }

  /**
   * Get team role template by type
   */
  async getTeamRoleTemplate(roleType: TeamRoleType): Promise<TeamRoleTemplate | null> {
    this.logger.log(`Getting team role template for type: ${roleType}`);

    const template = await this.prisma.role.findFirst({
      where: {
        isSystemRole: true,
        scope: RoleScope.ORGANIZATION,
        metadata: {
          path: ['roleType'],
          equals: 'team_member',
        },
        name: this.getRoleNameFromType(roleType),
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!template) {
      this.logger.warn(`No team role template found for type: ${roleType}`);
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      level: template.level,
      category: (template.metadata as any)?.category || 'viewer',
      permissions: template.permissions
        .filter(rp => rp.granted)
        .map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    };
  }

  /**
   * Create organization-specific team role from template
   */
  async createOrganizationTeamRole(
    organizationId: string,
    roleType: TeamRoleType,
    customName?: string,
  ): Promise<string> {
    this.logger.log(`Creating organization team role for org: ${organizationId}, type: ${roleType}`);

    const template = await this.getTeamRoleTemplate(roleType);
    if (!template) {
      throw new NotFoundException(`No team role template found for type: ${roleType}`);
    }

    // Check if organization already has this team role
    const existingRole = await this.prisma.role.findFirst({
      where: {
        organizationId,
        metadata: {
          path: ['roleType'],
          equals: 'team_member',
        },
        name: customName || template.name,
      },
    });

    if (existingRole) {
      this.logger.log(`Organization ${organizationId} already has team role: ${existingRole.id}`);
      return existingRole.id;
    }

    // Create organization-specific team role
    const role = await this.prisma.role.create({
      data: {
        name: customName || template.name,
        description: template.description,
        organizationId,
        level: template.level,
        isActive: true,
        isSystemRole: false,
        scope: RoleScope.ORGANIZATION,
        metadata: {
          roleType: 'team_member',
          category: template.category,
          createdFromTemplate: template.id,
        },
      },
    });

    // Copy permissions from template
    await this.copyPermissionsFromTemplate(role.id, template.id);

    this.logger.log(`Created organization team role: ${role.id} for org: ${organizationId}`);
    return role.id;
  }

  /**
   * Assign team role to user
   */
  async assignTeamRoleToUser(
    userId: string,
    organizationId: string,
    roleType: TeamRoleType,
    farmId?: string,
  ): Promise<void> {
    this.logger.log(`Assigning team role to user: ${userId}, org: ${organizationId}, type: ${roleType}`);

    // Get or create organization team role
    let roleId = await this.getOrganizationTeamRoleId(organizationId, roleType);
    
    if (!roleId) {
      roleId = await this.createOrganizationTeamRole(organizationId, roleType);
    }

    // Check if user already has this role
    const existingUserRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        farmId: farmId || null,
      },
    });

    if (existingUserRole) {
      this.logger.log(`User ${userId} already has team role ${roleId}`);
      return;
    }

    // Assign role to user
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        farmId: farmId || null,
        isActive: true,
        assignedAt: new Date(),
        metadata: {
          assignedBy: 'system',
          reason: 'team_role_assignment',
          roleType,
        },
      },
    });

    this.logger.log(`Assigned team role ${roleId} to user ${userId}`);
  }

  /**
   * Get user's team role
   */
  async getUserTeamRole(userId: string, organizationId: string): Promise<TeamRoleTemplate | null> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          organizationId,
          metadata: {
            path: ['roleType'],
            equals: 'team_member',
          },
        },
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

    if (!userRole) {
      return null;
    }

    return {
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
      level: userRole.role.level,
      category: (userRole.role.metadata as any)?.category || 'viewer',
      permissions: userRole.role.permissions
        .filter(rp => rp.granted)
        .map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    };
  }

  /**
   * Check if user has team role
   */
  async hasTeamRole(userId: string, organizationId: string, roleType: TeamRoleType): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          organizationId,
          metadata: {
            path: ['roleType'],
            equals: 'team_member',
          },
          name: this.getRoleNameFromType(roleType),
        },
      },
    });

    return !!userRole;
  }

  /**
   * Get organization team role ID
   */
  private async getOrganizationTeamRoleId(
    organizationId: string,
    roleType: TeamRoleType,
  ): Promise<string | null> {
    const role = await this.prisma.role.findFirst({
      where: {
        organizationId,
        metadata: {
          path: ['roleType'],
          equals: 'team_member',
        },
        name: this.getRoleNameFromType(roleType),
      },
      select: { id: true },
    });

    return role?.id || null;
  }

  /**
   * Copy permissions from template to organization role
   */
  private async copyPermissionsFromTemplate(roleId: string, templateId: string): Promise<void> {
    this.logger.log(`Copying permissions from template ${templateId} to role ${roleId}`);

    // Get template permissions
    const templatePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: templateId,
        granted: true,
      },
      include: {
        permission: true,
      },
    });

    // Create role permissions
    const rolePermissions = templatePermissions.map(tp => ({
      roleId,
      permissionId: tp.permissionId,
      granted: true,
      conditions: tp.conditions,
    }));

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });

    this.logger.log(`Copied ${rolePermissions.length} permissions to role ${roleId}`);
  }

  /**
   * Get role name from type
   */
  private getRoleNameFromType(roleType: TeamRoleType): string {
    const roleNames = {
      farm_manager: 'Farm Manager',
      field_worker: 'Field Worker',
      data_entry: 'Data Entry',
      viewer: 'Viewer',
    };

    return roleNames[roleType];
  }
}
