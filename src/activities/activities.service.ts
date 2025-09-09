import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateActivityDto,
  UpdateActivityDto,
  StartActivityDto,
  UpdateProgressDto,
  CompleteActivityDto,
  PauseActivityDto,
  ActivityQueryOptions,
  CalendarEvent,
  CalendarQueryOptions,
  MyTasksQueryOptions,
  AnalyticsQueryOptions,
  ActivityAnalytics,
} from './dto/activities.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivities(organizationId: string, query: ActivityQueryOptions) {
    const where: any = {
      farm: { organizationId },
    };

    if (query.farmId) where.farmId = query.farmId;
    if (query.areaId) where.areaId = query.areaId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.assignedTo) where.userId = query.assignedTo;

    const [activities, totalCount] = await Promise.all([
      this.prisma.farmActivity.findMany({
        where,
        include: {
          farm: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: query.page ? (query.page - 1) * (query.pageSize || 25) : 0,
        take: query.pageSize || 25,
      }),
      this.prisma.farmActivity.count({ where }),
    ]);

    return {
      data: activities.map(activity => this.formatActivityResponse(activity)),
      meta: { totalCount },
    };
  }

  async getActivity(activityId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return this.formatActivityResponse(activity);
  }

  async createActivity(data: CreateActivityDto, userId: string, organizationId: string) {
    // Verify farm belongs to organization
    const farm = await this.prisma.farm.findFirst({
      where: { id: data.farmId, organizationId },
    });

    if (!farm) {
      throw new BadRequestException('Invalid farm ID');
    }

    const activity = await this.prisma.farmActivity.create({
      data: {
        farmId: data.farmId,
        areaId: data.areaId,
        cropCycleId: data.cropCycleId,
        userId,
        type: data.type,
        name: data.name,
        description: data.description || '',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        status: 'PLANNED',
        cost: data.estimatedCost,
        metadata: data.instructions ? { instructions: data.instructions } : undefined,
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(activity);
  }

  async updateActivity(activityId: string, data: UpdateActivityDto, userId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user can edit (assigned user)
    if (activity.userId !== userId) {
      throw new ForbiddenException('Not authorized to edit this activity');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        name: data.name,
        description: data.description,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        cost: data.estimatedCost,
        metadata: data.instructions ? { instructions: data.instructions } : undefined,
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async deleteActivity(activityId: string, userId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.status === 'IN_PROGRESS') {
      throw new BadRequestException('Cannot delete activity in progress');
    }

    // Check if user can delete (assigned user)
    if (activity.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this activity');
    }

    await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: { status: 'CANCELLED' },
    });
  }

  async startActivity(activityId: string, data: StartActivityDto, userId: string) {
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    if (activity.status !== 'PLANNED') {
      throw new BadRequestException('Activity cannot be started');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        status: 'IN_PROGRESS',
        metadata: {
          ...(activity.metadata as object || {}),
          startedAt: new Date().toISOString(),
          location: data.location,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async updateProgress(activityId: string, data: UpdateProgressDto, userId: string) {
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    if (activity.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Activity is not in progress');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        metadata: {
          ...(activity.metadata as object || {}),
          percentComplete: data.percentComplete,
          issues: data.issues,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async completeActivity(activityId: string, data: CompleteActivityDto, userId: string) {
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    if (activity.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Activity is not in progress');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(data.completedAt),
        cost: data.actualCost,
        metadata: {
          ...(activity.metadata as object || {}),
          results: data.results,
          issues: data.issues,
          recommendations: data.recommendations,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async pauseActivity(activityId: string, data: PauseActivityDto, userId: string) {
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    if (activity.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Activity is not in progress');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        metadata: {
          ...(activity.metadata as object || {}),
          pauseReason: data.reason,
          pauseNotes: data.notes,
          estimatedResumeTime: data.estimatedResumeTime,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async resumeActivity(activityId: string, userId: string) {
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: { status: 'IN_PROGRESS' },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async getCalendarEvents(query: CalendarQueryOptions, organizationId: string): Promise<CalendarEvent[]> {
    const activities = await this.prisma.farmActivity.findMany({
      where: {
        farmId: query.farmId,
        farm: { organizationId },
        scheduledAt: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
        ...(query.userId && { userId: query.userId }),
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return activities.map(activity => ({
      id: activity.id,
      title: activity.name,
      start: activity.scheduledAt || new Date(),
      end: activity.completedAt || new Date(Date.now() + 2 * 60 * 60 * 1000), // Default 2 hours
      allDay: false,
      color: this.getActivityColor(activity.type, activity.status),
      activity: this.formatActivityResponse(activity) as any,
    }));
  }

  async getMyTasks(userId: string, query: MyTasksQueryOptions) {
    const where: any = {
      userId,
    };

    if (query.status) where.status = query.status;
    if (query.farmId) where.farmId = query.farmId;

    const [activities, totalCount] = await Promise.all([
      this.prisma.farmActivity.findMany({
        where,
        include: {
          farm: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      }),
      this.prisma.farmActivity.count({ where }),
    ]);

    return {
      data: activities.map(activity => this.formatActivityResponse(activity)),
      meta: { totalCount },
    };
  }

  async getAnalytics(query: AnalyticsQueryOptions): Promise<ActivityAnalytics> {
    const startDate = this.getStartDate(query.period || 'month');
    const endDate = new Date();

    const activities = await this.prisma.farmActivity.findMany({
      where: {
        farmId: query.farmId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.type && { type: query.type }),
      },
      select: {
        id: true,
        type: true,
        status: true,
        cost: true,
        scheduledAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.status === 'COMPLETED').length;
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;


    const typeBreakdown = Object.entries(
      activities.reduce((acc, activity) => {
        if (!acc[activity.type]) {
          acc[activity.type] = { count: 0, totalCost: 0 };
        }
        acc[activity.type].count++;
        acc[activity.type].totalCost += activity.cost || 0;
        return acc;
      }, {} as Record<string, any>)
    ).map(([type, stats]) => ({
      type: type as any,
      count: stats.count,
      avgDuration: 0, // Not available in current schema
      avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
    }));

    return {
      period: query.period || 'month',
      totalActivities,
      completionRate,
      averageDuration: 0, // Not available in current schema
      costEfficiency: 0, // Would need estimated vs actual cost
      typeBreakdown,
    };
  }

  private formatActivityResponse(activity: any) {
    return {
      id: activity.id,
      type: 'activities' as const,
      attributes: {
        id: activity.id,
        farmId: activity.farmId,
        areaId: activity.areaId,
        cropCycleId: activity.cropCycleId,
        type: activity.type,
        name: activity.name,
        description: activity.description,
        status: activity.status,
        scheduledAt: activity.scheduledAt?.toISOString() || null,
        completedAt: activity.completedAt?.toISOString() || null,
        cost: activity.cost,
        userId: activity.userId,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
        farm: activity.farm,
        area: activity.area,
        user: activity.user,
      },
    };
  }

  private getActivityColor(type: string, status: string): string {
    const colors = {
      LAND_PREP: '#8B4513',
      PLANTING: '#4CAF50',
      FERTILIZING: '#2196F3',
      IRRIGATION: '#00BCD4',
      PEST_CONTROL: '#F44336',
      HARVESTING: '#FF9800',
      MAINTENANCE: '#9C27B0',
      MONITORING: '#607D8B',
      OTHER: '#757575',
    };

    let color = colors[type as keyof typeof colors] || colors.OTHER;

    if (status === 'COMPLETED') color += '80'; // Add transparency
    if (status === 'CANCELLED') color = '#BDBDBD';

    return color;
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart;
      }
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