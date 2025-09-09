import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAssignmentService } from './activity-assignment.service';
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
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: ActivityAssignmentService,
  ) {}

  async getActivities(organizationId: string, query: ActivityQueryOptions) {
    const where: any = {
      farm: { organizationId },
    };

    if (query.farmId) where.farmId = query.farmId;
    if (query.areaId) where.areaId = query.areaId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    // Handle assignedTo filter properly with assignments
    if (query.assignedTo) {
      where.assignments = {
        some: {
          userId: query.assignedTo,
          isActive: true,
        }
      };
    }

    // Add date range filters
    if (query.startDate || query.endDate) {
      where.scheduledAt = {};
      if (query.startDate) where.scheduledAt.gte = new Date(query.startDate);
      if (query.endDate) where.scheduledAt.lte = new Date(query.endDate);
    }

    const [activities, totalCount] = await Promise.all([
      this.prisma.farmActivity.findMany({
        where,
        include: {
          farm: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: {
            where: { isActive: true },
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          },
          _count: {
            select: {
              costs: true,
              progressLogs: true,
            }
          }
        },
        orderBy: query.sort === 'priority' 
          ? [{ priority: 'desc' }, { scheduledAt: 'asc' }]
          : { scheduledAt: 'asc' },
        skip: query.page ? (query.page - 1) * (query.pageSize || 25) : 0,
        take: query.pageSize || 25,
      }),
      this.prisma.farmActivity.count({ where }),
    ]);

    return {
      data: activities.map(activity => this.formatActivityResponse(activity)),
      meta: { 
        totalCount,
        page: query.page || 1,
        pageSize: query.pageSize || 25,
      },
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
    this.validateActivityData(data);

    // Verify farm belongs to organization
    const farm = await this.prisma.farm.findFirst({
      where: { id: data.farmId, organizationId },
    });
    if (!farm) {
      throw new BadRequestException('Invalid farm ID');
    }

    // Use assignment service for creating activity with assignments
    const assignedUserIds = data.assignedTo || [userId];
    
    const result = await this.prisma.$transaction(async (tx) => {
      // Create activity
      const activity = await tx.farmActivity.create({
        data: {
          farmId: data.farmId,
          areaId: data.areaId,
          cropCycleId: data.cropCycleId,
          createdById: userId,
          type: data.type,
          name: data.name,
          description: data.description || '',
          priority: data.priority || 'NORMAL',
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          estimatedDuration: data.estimatedDuration,
          status: 'PLANNED',
          cost: 0,
          metadata: {
            instructions: data.instructions,
            safetyNotes: data.safetyNotes,
            resources: data.resources || [],
          },
        },
        include: {
          farm: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Create assignments
      const assignments = await Promise.all(
        assignedUserIds.map(assignedUserId =>
          tx.activityAssignment.create({
            data: {
              activityId: activity.id,
              userId: assignedUserId,
              role: 'ASSIGNED',
              assignedById: userId,
              isActive: true,
            },
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          })
        )
      );

      return { ...activity, assignments };
    });

    return this.formatActivityResponse(result);
  }

  async updateActivity(activityId: string, data: UpdateActivityDto, userId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirstOrThrow({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        assignments: { where: { userId, isActive: true } }
      }
    });

    // Check if user can update (assigned or creator)
    const canUpdate = activity.createdById === userId || activity.assignments.length > 0;
    if (!canUpdate) {
      throw new ForbiddenException('Not authorized to edit this activity');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        name: data.name,
        description: data.description,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        priority: data.priority,
        estimatedDuration: data.estimatedDuration,
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true } } }
        },
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
    // Check if user can delete (creator only for simplicity)
    if (activity.createdById !== userId) {
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

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(userId, activityId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    if (activity.status !== 'PLANNED') {
      throw new BadRequestException('Activity cannot be started - current status: ' + activity.status);
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

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(userId, activityId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    if (activity.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Activity is not in progress - current status: ' + activity.status);
    }

    // Validate progress percentage
    if (data.percentComplete < 0 || data.percentComplete > 100) {
      throw new BadRequestException('Progress percentage must be between 0 and 100');
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

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(userId, activityId);
    if (!isAssigned) {
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

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(userId, activityId);
    if (!isAssigned) {
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

  async resumeActivity(activityId: string, userId: string, data?: { notes?: string }) {
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(userId, activityId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: { 
        status: 'IN_PROGRESS',
        metadata: data?.notes ? {
          ...(activity.metadata as object || {}),
          resumeNotes: data.notes,
          resumedAt: new Date().toISOString(),
        } : activity.metadata,
      },
      include: {
        farm: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async getCalendarEvents(query: CalendarQueryOptions, organizationId: string): Promise<CalendarEvent[]> {
    const where: any = {
      farmId: query.farmId,
      farm: { organizationId },
      scheduledAt: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };

    // Filter by assigned user if provided
    if (query.userId) {
      where.assignments = {
        some: {
          userId: query.userId,
          isActive: true,
        }
      };
    }

    const activities = await this.prisma.farmActivity.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return activities.map(activity => {
      const scheduledTime = activity.scheduledAt || new Date();
      let endTime: Date;

      // Calculate end time based on activity state and duration
      if (activity.status === 'COMPLETED' && activity.completedAt) {
        endTime = activity.completedAt;
      } else if (activity.estimatedDuration) {
        endTime = new Date(scheduledTime.getTime() + activity.estimatedDuration * 60 * 1000);
      } else {
        // Default to 2 hours if no duration specified
        endTime = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000);
      }

      return {
        id: activity.id,
        title: activity.name,
        start: scheduledTime,
        end: endTime,
        allDay: false,
        color: this.getActivityColor(activity.type, activity.status),
        activity: this.formatActivityResponse(activity) as any,
      };
    });
  }

  async getMyTasks(userId: string, query: MyTasksQueryOptions, organizationId: string) {
    // Use the assignment service to get user's activities
    return this.assignmentService.getUserActivities(userId, organizationId, {
      status: query.status,
      farmId: query.farmId,
      priority: query.priority,
      limit: 50,
    });
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

  async getTeamPerformance(query: any, organizationId: string) {
    const startDate = this.getStartDate(query.period || 'month');
    const endDate = new Date();

    // Get team activity assignments with performance data
    const assignments = await this.prisma.activityAssignment.findMany({
      where: {
        isActive: true,
        activity: {
          farm: { organizationId },
          ...(query.farmId && { farmId: query.farmId }),
          createdAt: { gte: startDate, lte: endDate },
        },
        ...(query.userId && { userId: query.userId }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        activity: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            cost: true,
            scheduledAt: true,
            completedAt: true,
            createdAt: true,
            metadata: true,
          }
        }
      },
    });

    // Calculate team performance metrics
    const teamStats = assignments.reduce((acc, assignment) => {
      const userId = assignment.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: assignment.user,
          totalAssigned: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          totalCost: 0,
          avgCompletionTime: 0,
          helpRequests: 0,
        };
      }

      const stats = acc[userId];
      stats.totalAssigned++;
      stats.totalCost += assignment.activity.cost || 0;

      // Count activity statuses
      if (assignment.activity.status === 'COMPLETED') {
        stats.completed++;
      } else if (assignment.activity.status === 'IN_PROGRESS') {
        stats.inProgress++;
      }

      // Check for overdue activities
      if (assignment.activity.scheduledAt && assignment.activity.scheduledAt < new Date() && assignment.activity.status !== 'COMPLETED') {
        stats.overdue++;
      }

      // Count help requests from metadata
      const helpRequests = (assignment.activity.metadata as any)?.helpRequests || [];
      const userHelpRequests = helpRequests.filter((req: any) => req.requestedBy === userId);
      stats.helpRequests += userHelpRequests.length;

      return acc;
    }, {} as Record<string, any>);

    // Calculate team-wide metrics
    const teamMetrics = Object.values(teamStats).reduce((total: any, userStats: any) => {
      total.totalActivities += userStats.totalAssigned;
      total.totalCompleted += userStats.completed;
      total.totalCost += userStats.totalCost;
      total.totalHelpRequests += userStats.helpRequests;
      return total;
    }, {
      totalActivities: 0,
      totalCompleted: 0,
      totalCost: 0,
      totalHelpRequests: 0,
    });

    const overallCompletionRate = teamMetrics.totalActivities > 0 
      ? (teamMetrics.totalCompleted / teamMetrics.totalActivities) * 100 
      : 0;

    // Format user performance data
    const userPerformance = Object.values(teamStats).map((stats: any) => ({
      id: stats.user.id,
      type: 'team-member-performance' as const,
      attributes: {
        user: stats.user,
        totalAssigned: stats.totalAssigned,
        completed: stats.completed,
        inProgress: stats.inProgress,
        overdue: stats.overdue,
        completionRate: stats.totalAssigned > 0 ? (stats.completed / stats.totalAssigned) * 100 : 0,
        totalCost: stats.totalCost,
        avgCostPerActivity: stats.totalAssigned > 0 ? stats.totalCost / stats.totalAssigned : 0,
        helpRequests: stats.helpRequests,
        efficiency: stats.totalAssigned > 0 ? (stats.completed - stats.overdue) / stats.totalAssigned * 100 : 0,
      },
    }));

    return {
      data: [{
        id: 'team-performance',
        type: 'team-performance-summary' as const,
        attributes: {
          period: query.period || 'month',
          overallCompletionRate,
          totalActivities: teamMetrics.totalActivities,
          totalCompleted: teamMetrics.totalCompleted,
          totalCost: teamMetrics.totalCost,
          avgCostPerActivity: teamMetrics.totalActivities > 0 ? teamMetrics.totalCost / teamMetrics.totalActivities : 0,
          totalHelpRequests: teamMetrics.totalHelpRequests,
          teamSize: Object.keys(teamStats).length,
        },
      }],
      included: userPerformance,
      meta: {
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
        teamSize: Object.keys(teamStats).length,
        totalMembers: Object.keys(teamStats).length,
      },
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
        priority: activity.priority,
        scheduledAt: activity.scheduledAt?.toISOString() || null,
        completedAt: activity.completedAt?.toISOString() || null,
        startedAt: activity.startedAt?.toISOString() || null,
        estimatedDuration: activity.estimatedDuration,
        actualDuration: activity.actualDuration,
        cost: activity.cost,
        createdById: activity.createdById,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
        farm: activity.farm,
        area: activity.area,
        createdBy: activity.createdBy,
        assignments: activity.assignments?.map((assignment: any) => ({
          id: assignment.id,
          userId: assignment.userId,
          role: assignment.role,
          assignedAt: assignment.assignedAt.toISOString(),
          user: assignment.user,
        })) || [],
        assignedUsers: activity.assignments?.map((assignment: any) => assignment.user) || [],
        costCount: activity._count?.costs || 0,
        progressLogCount: activity._count?.progressLogs || 0,
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

  private validateActivityData(data: CreateActivityDto) {
    if (!data.name?.trim()) {
      throw new BadRequestException('Activity name is required');
    }
    if (data.estimatedDuration && data.estimatedDuration <= 0) {
      throw new BadRequestException('Estimated duration must be positive');
    }
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
