import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';

export interface PlanRoleTemplate {
  id: string;
  name: string;
  description: string;
  planTier: SubscriptionTier;
  level: number;
  permissions: string[];
}

@Injectable()
export class PlanRoleService {
  private readonly logger = new Logger(PlanRoleService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get plan role template by tier
   */
  async getPlanRoleTemplate(planTier: SubscriptionTier): Promise<PlanRoleTemplate | null> {
    this.logger.log(`Getting plan role template for tier: ${planTier}`);

    const template = await this.prisma.role.findFirst({
      where: {
        organizationId: null, // System-scoped template
        metadata: {
          path: ['planTier'],
          equals: planTier,
        },
        isSystemRole: true,
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
      this.logger.warn(`No role template found for plan tier: ${planTier}`);
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      planTier: planTier,
      level: template.level,
      permissions: template.permissions
        .filter(rp => rp.granted)
        .map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    };
  }

  /**
   * Create organization-specific role from plan template
   */
  async createOrganizationRoleFromTemplate(
    organizationId: string,
    planTier: SubscriptionTier,
    customName?: string,
  ): Promise<string> {
    this.logger.log(`Creating organization role from template for org: ${organizationId}, tier: ${planTier}`);

    const template = await this.getPlanRoleTemplate(planTier);
    if (!template) {
      throw new NotFoundException(`No role template found for plan tier: ${planTier}`);
    }

    // Check if organization already has a role for this plan tier
    const existingRole = await this.prisma.role.findFirst({
      where: {
        organizationId,
        metadata: {
          path: ['planTier'],
          equals: planTier,
        },
      },
    });

    if (existingRole) {
      this.logger.log(`Organization ${organizationId} already has role for tier ${planTier}: ${existingRole.id}`);
      return existingRole.id;
    }

    // Create organization-specific role
    const role = await this.prisma.role.create({
      data: {
        name: customName || `${planTier} Plan User`,
        description: `Default role for ${planTier} plan users in this organization`,
        organizationId,
        level: template.level,
        isActive: true,
        isSystemRole: false,
        scope: 'ORGANIZATION',
        metadata: {
          planTier,
          isPlanRole: true,
          createdFromTemplate: template.id,
        },
      },
    });

    // Copy permissions from template
    await this.copyPermissionsFromTemplate(role.id, template.id);

    this.logger.log(`Created organization role: ${role.id} for org: ${organizationId}`);
    return role.id;
  }

  /**
   * Assign plan role to user
   */
  async assignPlanRoleToUser(
    userId: string,
    organizationId: string,
    planTier: SubscriptionTier,
    farmId?: string,
  ): Promise<void> {
    this.logger.log(`Assigning plan role to user: ${userId}, org: ${organizationId}, tier: ${planTier}`);

    // Get or create organization role for this plan tier
    let roleId = await this.getOrganizationPlanRoleId(organizationId, planTier);
    
    if (!roleId) {
      roleId = await this.createOrganizationRoleFromTemplate(organizationId, planTier);
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
      this.logger.log(`User ${userId} already has role ${roleId}`);
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
          reason: 'plan_based_assignment',
        },
      },
    });

    this.logger.log(`Assigned plan role ${roleId} to user ${userId}`);
  }

  /**
   * Update user roles when organization plan changes
   */
  async updateUserRolesForPlanChange(
    organizationId: string,
    oldPlanTier: SubscriptionTier,
    newPlanTier: SubscriptionTier,
  ): Promise<void> {
    this.logger.log(`Updating user roles for plan change: ${oldPlanTier} -> ${newPlanTier}`);

    // Get all users in the organization
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });

    // Create new plan role if it doesn't exist
    await this.createOrganizationRoleFromTemplate(organizationId, newPlanTier);

    // Update each user's roles
    for (const user of users) {
      // Remove old plan role
      await this.removeUserPlanRole(user.id, organizationId, oldPlanTier);
      
      // Assign new plan role
      await this.assignPlanRoleToUser(user.id, organizationId, newPlanTier);
    }

    this.logger.log(`Updated roles for ${users.length} users in organization ${organizationId}`);
  }

  /**
   * Get organization plan role ID
   */
  private async getOrganizationPlanRoleId(
    organizationId: string,
    planTier: SubscriptionTier,
  ): Promise<string | null> {
    const role = await this.prisma.role.findFirst({
      where: {
        organizationId,
        metadata: {
          path: ['planTier'],
          equals: planTier,
        },
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
   * Remove user's plan role
   */
  private async removeUserPlanRole(
    userId: string,
    organizationId: string,
    planTier: SubscriptionTier,
  ): Promise<void> {
    const roleId = await this.getOrganizationPlanRoleId(organizationId, planTier);
    
    if (roleId) {
      await this.prisma.userRole.deleteMany({
        where: {
          userId,
          roleId,
        },
      });
      
      this.logger.log(`Removed plan role ${roleId} from user ${userId}`);
    }
  }

  /**
   * Get user's plan role
   */
  async getUserPlanRole(userId: string, organizationId: string): Promise<PlanRoleTemplate | null> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          organizationId,
          metadata: {
            path: ['isPlanRole'],
            equals: true,
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
            organization: {
              select: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!userRole) {
      return null;
    }

    const planTier = userRole.role.organization?.plan as SubscriptionTier;
    
    return {
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
      planTier,
      level: userRole.role.level,
      permissions: userRole.role.permissions
        .filter(rp => rp.granted)
        .map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    };
  }

  /**
   * Check if user has plan role
   */
  async hasPlanRole(userId: string, organizationId: string, planTier: SubscriptionTier): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          organizationId,
          metadata: {
            path: ['planTier'],
            equals: planTier,
          },
        },
      },
    });

    return !!userRole;
  }

  /**
   * Handle when user is added to organization
   * Assigns appropriate plan role based on organization's current plan
   */
  async handleOrganizationMember(userId: string, organizationId: string): Promise<void> {
    this.logger.log(`Handling user added to organization: ${userId} -> ${organizationId}`);

    // Get organization's current plan
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    if (!organization) {
      this.logger.warn(`Organization ${organizationId} not found`);
      return;
    }

    // Assign plan role to user
    await this.assignPlanRoleToUser(userId, organizationId, organization.plan as SubscriptionTier);
    
    this.logger.log(`Assigned ${organization.plan} plan role to user ${userId} in organization ${organizationId}`);
  }
}
