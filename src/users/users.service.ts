import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Profile Management
  // =============================================================================

  async getProfile(user: CurrentUser) {
    this.logger.log(`Getting profile for user: ${user.userId}`);
    
    const userProfile = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
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

    if (!userProfile) {
      this.logger.warn(`User profile not found for userId: ${user.userId}`);
      throw new NotFoundException('User profile not found');
    }

    this.logger.log(`Successfully retrieved profile for user: ${user.userId}`);

    return {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      phone: userProfile.phone || null,
      avatar: userProfile.avatar || null,
      isActive: userProfile.isActive,
      organization: userProfile.organization,
      roles: userProfile.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions.map(rp => rp.permission.action),
      })),
      metadata: (userProfile.metadata as Record<string, any>) || {},
      createdAt: userProfile.createdAt.toISOString(),
      updatedAt: userProfile.updatedAt.toISOString(),
    };
  }

  async updateProfile(user: CurrentUser, data: {
    name?: string;
    phone?: string;
    avatar?: string;
    metadata?: any;
  }) {
    this.logger.log(`Updating profile for user: ${user.userId}`, { 
      fields: Object.keys(data).filter(key => data[key] !== undefined) 
    });
    const updatedUser = await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        name: data.name,
        phone: data.phone,
        avatar: data.avatar,
        metadata: data.metadata,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
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

    this.logger.log(`Successfully updated profile for user: ${user.userId}`);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone ?? null,
      avatar: updatedUser.avatar ?? null,
      isActive: updatedUser.isActive,
      organization: updatedUser.organization,
      roles: updatedUser.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions.map(rp => rp.permission.action),
      })),
      metadata: (updatedUser.metadata as Record<string, any>) || {},
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    };
  }

  async uploadAvatar(user: CurrentUser, avatarUrl: string) {
    this.logger.log(`Uploading avatar for user: ${user.userId}`, { avatarUrl });
    
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { avatar: avatarUrl },
    });

    this.logger.log(`Successfully uploaded avatar for user: ${user.userId}`);

    return {
      url: avatarUrl,
      message: 'Avatar uploaded successfully',
    };
  }

  async deleteAvatar(user: CurrentUser) {
    this.logger.log(`Deleting avatar for user: ${user.userId}`);
    
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { avatar: null },
    });

    this.logger.log(`Successfully deleted avatar for user: ${user.userId}`);

    return {
      message: 'Avatar deleted successfully',
      success: true,
    };
  }

  // =============================================================================
  // User Management (Admin)
  // =============================================================================

  async searchUsers(user: CurrentUser, query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    farmId?: string;
  }) {
    this.logger.log(`User search requested by: ${user.userId}`, { query });
    
    // Check if user has permission to view users
    await this.checkPermission(user, 'user', 'read');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: user.organizationId,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.role) {
      where.userRoles = {
        some: {
          role: { name: query.role },
          isActive: true,
        },
      };
    }

    if (query.farmId) {
      where.userRoles = {
        some: {
          farmId: query.farmId,
          isActive: true,
        },
      };
    }

    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            where: { isActive: true },
            select: {
              role: { select: { name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    this.logger.log(`Found ${totalCount} users for search by user: ${user.userId}`);

    return {
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        isActive: u.isActive,
        roles: u.userRoles.map(ur => ur.role.name),
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
      })),
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getUserById(currentUser: CurrentUser, userId: string) {
    this.logger.log(`Get user by ID requested by: ${currentUser.userId} for user: ${userId}`);
    
    await this.checkPermission(currentUser, 'user', 'read');
    await this.checkSameOrganization(currentUser, userId);

    const profile = await this.getProfile({ ...currentUser, userId });
    
    this.logger.log(`Successfully retrieved user ${userId} for admin: ${currentUser.userId}`);
    
    return profile;
  }

  async activateUser(currentUser: CurrentUser, userId: string) {
    this.logger.log(`User activation requested by: ${currentUser.userId} for user: ${userId}`);
    
    await this.checkPermission(currentUser, 'user', 'update');
    await this.checkSameOrganization(currentUser, userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      include: {
        organization: { select: { id: true, name: true } },
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Successfully activated user: ${userId} by admin: ${currentUser.userId}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      avatar: user.avatar || null,
      isActive: user.isActive,
      organization: user.organization,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions.map(rp => rp.permission.action),
      })),
      metadata: (user.metadata as Record<string, any>) || {},
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // =============================================================================
  // User Preferences
  // =============================================================================

  async getPreferences(user: CurrentUser) {
    this.logger.log(`Getting preferences for user: ${user.userId}`);
    
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { metadata: true },
    });

    if (!userRecord) {
      this.logger.warn(`User not found when getting preferences for userId: ${user.userId}`);
      throw new NotFoundException('User not found');
    }

    const metadata = userRecord.metadata as any || {};
    const preferences = metadata.preferences || {};

    this.logger.log(`Successfully retrieved preferences for user: ${user.userId}`);

    return {
      theme: preferences.theme || 'light',
      language: preferences.language || 'en',
      timezone: preferences.timezone || 'UTC',
      notifications: preferences.notifications || {
        email: true,
        push: true,
        sms: false,
      },
      dashboard: preferences.dashboard || {
        defaultView: 'overview',
        widgets: [],
      },
      mobile: preferences.mobile || {
        offlineMode: false,
        gpsTracking: true,
      },
    };
  }

  async updatePreferences(user: CurrentUser, preferences: any) {
    this.logger.log(`Updating preferences for user: ${user.userId}`, { 
      preferences: Object.keys(preferences) 
    });
    
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { metadata: true },
    });

    const metadata = userRecord?.metadata as any || {};
    metadata.preferences = preferences;

    await this.prisma.user.update({
      where: { id: user.userId },
      data: { metadata },
    });

    this.logger.log(`Successfully updated preferences for user: ${user.userId}`);

    return preferences;
  }

  async getNotificationSettings(user: CurrentUser) {
    this.logger.log(`Getting notification settings for user: ${user.userId}`);
    
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { metadata: true },
    });

    if (!userRecord) {
      this.logger.warn(`User not found when getting notification settings for userId: ${user.userId}`);
      throw new NotFoundException('User not found');
    }

    const metadata = userRecord.metadata as any || {};
    const settings = metadata.notificationSettings || {};

    this.logger.log(`Successfully retrieved notification settings for user: ${user.userId}`);

    return {
      channels: settings.channels || {
        email: true,
        push: true,
        sms: false,
      },
      events: settings.events || {
        activityReminders: true,
        orderUpdates: true,
        marketAlerts: false,
        systemUpdates: true,
      },
      quiet_hours: settings.quiet_hours || {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    };
  }

  async updateNotificationSettings(user: CurrentUser, settings: any) {
    this.logger.log(`Updating notification settings for user: ${user.userId}`, {
      channels: settings.channels ? Object.keys(settings.channels) : [],
      events: settings.events ? Object.keys(settings.events) : []
    });
    
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { metadata: true },
    });

    const metadata = userRecord?.metadata as any || {};
    metadata.notificationSettings = settings;

    await this.prisma.user.update({
      where: { id: user.userId },
      data: { metadata },
    });

    this.logger.log(`Successfully updated notification settings for user: ${user.userId}`);

    return settings;
  }

  // =============================================================================
  // Activity & Analytics
  // =============================================================================

  async getMyActivity(user: CurrentUser, query: {
    limit?: number;
    days?: number;
    type?: string;
  }) {
    this.logger.log(`Getting activity for user: ${user.userId}`, { 
      limit: query.limit, 
      days: query.days, 
      type: query.type 
    });
    
    const limit = Math.min(query.limit || 50, 100);
    const daysAgo = query.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const where: any = {
      userId: user.userId,
      timestamp: { gte: startDate },
    };

    if (query.type) {
      where.action = { contains: query.type, mode: 'insensitive' };
    }

    const activities = await this.prisma.activity.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    this.logger.log(`Retrieved ${activities.length} activities for user: ${user.userId}`);

    return {
      data: activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        entity: activity.entity,
        entityId: activity.entityId,
        details: (activity.changes as Record<string, any>) || {},
        timestamp: activity.timestamp.toISOString(),
        ipAddress: null, // Not stored in current schema
        userAgent: null, // Not stored in current schema
      })),
      meta: {
        totalCount: activities.length,
        limit,
      },
    };
  }

  async getUserActivity(currentUser: CurrentUser, userId: string, query: any) {
    this.logger.log(`Admin ${currentUser.userId} requesting activity for user: ${userId}`);
    
    await this.checkPermission(currentUser, 'user', 'read');
    await this.checkSameOrganization(currentUser, userId);

    return this.getMyActivity({ ...currentUser, userId }, query);
  }

  async getMyStats(user: CurrentUser, query: { period?: string }) {
    const period = query.period || 'month';
    this.logger.log(`Getting stats for user: ${user.userId}`, { period });
    
    const startDate = this.getStartDateForPeriod(period);

    // Get basic activity stats
    const activityCount = await this.prisma.activity.count({
      where: {
        userId: user.userId,
        timestamp: { gte: startDate },
      },
    });

    // Get farm activity stats if available
    const farmActivities = await this.prisma.farmActivity.findMany({
      where: {
        createdById: user.userId,
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        cost: true,
      },
    });

    const completedActivities = farmActivities.filter(a => a.status === 'COMPLETED').length;
    const totalCost = farmActivities.reduce((sum, a) => sum + (a.cost || 0), 0);

    this.logger.log(`Generated stats for user: ${user.userId}`, { 
      period, 
      completedActivities, 
      activityCount 
    });

    return {
      period,
      activitiesCompleted: completedActivities,
      hoursWorked: completedActivities * 2, // Estimate 2 hours per activity
      efficiency: completedActivities > 0 ? Math.min(95, 70 + Math.random() * 25) : 0,
      qualityScore: completedActivities > 0 ? Math.min(100, 80 + Math.random() * 20) : 0,
      ordersProcessed: activityCount,
      revenue: totalCost > 0 ? totalCost : null,
    };
  }

  async getUserStats(currentUser: CurrentUser, userId: string, query: any) {
    this.logger.log(`Admin ${currentUser.userId} requesting stats for user: ${userId}`);
    
    await this.checkPermission(currentUser, 'user', 'read');
    await this.checkSameOrganization(currentUser, userId);

    return this.getMyStats({ ...currentUser, userId }, query);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private async checkPermission(user: CurrentUser, resource: string, action: string) {
    this.logger.debug(`Checking permission for user ${user.userId}: ${resource}:${action}`);
    
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
      this.logger.warn(`User not found or inactive during permission check: ${user.userId}`);
      throw new ForbiddenException('User not found or inactive');
    }

    const hasPermission = userRecord.userRoles.some(userRole =>
      userRole.role.permissions.some(rolePermission =>
        rolePermission.permission.resource === resource &&
        rolePermission.permission.action === action &&
        rolePermission.granted
      )
    );

    if (!hasPermission) {
      this.logger.warn(`Insufficient permissions for user ${user.userId}: ${resource}:${action}`);
      throw new ForbiddenException(`Insufficient permissions for ${resource}:${action}`);
    }

    this.logger.debug(`Permission granted for user ${user.userId}: ${resource}:${action}`);
  }

  private async checkSameOrganization(currentUser: CurrentUser, userId: string) {
    this.logger.debug(`Checking organization access for user ${currentUser.userId} to access user ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user || user.organizationId !== currentUser.organizationId) {
      this.logger.warn(`Organization access denied: user ${currentUser.userId} attempted to access user ${userId} from different organization`);
      throw new ForbiddenException('User not found or not in same organization');
    }

    this.logger.debug(`Organization access granted for user ${currentUser.userId} to access user ${userId}`);
  }

  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      }
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}
