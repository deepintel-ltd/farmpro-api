import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { MarketService } from '../market/market.service';
import { ActivityUpdatesGateway } from './activity-updates.gateway';
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

  // State machine definition for activity lifecycle
  private readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'PLANNED': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['COMPLETED', 'PAUSED', 'CANCELLED'],
    'PAUSED': ['IN_PROGRESS', 'CANCELLED'],
    'COMPLETED': [], // Terminal state
    'CANCELLED': [], // Terminal state
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: ActivityAssignmentService,
    private readonly marketService: MarketService,
    private readonly activityUpdatesGateway: ActivityUpdatesGateway,
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
      data: activities.map(activity => ({
        id: activity.id,
        type: 'activities' as const,
        attributes: this.formatActivityResponse(activity)
      })),
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
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return this.formatActivityResponse(activity);
  }

  async createActivity(data: CreateActivityDto, userId: string, organizationId: string) {
    this.logger.log('Creating new activity', {
      userId,
      organizationId,
      farmId: data.farmId,
      type: data.type,
      name: data.name,
      priority: data.priority,
      assignedCount: data.assignedTo?.length || 0
    });

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

    this.logger.log('Activity created successfully', {
      activityId: result.id,
      userId,
      organizationId,
      farmId: data.farmId,
      type: data.type,
      assignedUsers: assignedUserIds
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

    // Broadcast activity update via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(activityId, {
      type: 'activity_updated',
      activity: this.formatActivityResponse(updated),
      updatedBy: userId,
      changes: data,
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

    // Validate state transition - only allow cancellation from certain states
    this.validateStateTransition(activity.status, 'CANCELLED', 'cancel activity');

    // Check if user can delete (creator only for simplicity)
    if (activity.createdById !== userId) {
      throw new ForbiddenException('Not authorized to delete this activity');
    }

    await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: { status: 'CANCELLED' },
    });
  }

  async startActivity(activityId: string, data: StartActivityDto, userId: string, organizationId?: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: { 
        id: activityId,
        ...(organizationId && { farm: { organizationId } })
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(activityId, userId, activity.farm.organizationId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    // Validate state transition
    this.validateStateTransition(activity.status, 'IN_PROGRESS', 'start activity');

    this.logger.log('Starting activity', {
      activityId,
      userId,
      farmId: activity.farmId,
      type: activity.type,
      name: activity.name,
      previousStatus: activity.status,
      location: data.location
    });

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
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Broadcast activity started via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(activityId, {
      type: 'activity_started',
      activity: this.formatActivityResponse(updated),
      startedBy: userId,
      location: data.location,
    });

    return this.formatActivityResponse(updated);
  }

  async updateProgress(activityId: string, data: UpdateProgressDto, userId: string, organizationId?: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: { 
        id: activityId,
        ...(organizationId && { farm: { organizationId } })
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(activityId, userId, activity.farm.organizationId);
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
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async completeActivity(activityId: string, data: CompleteActivityDto, userId: string, organizationId?: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: { 
        id: activityId,
        ...(organizationId && { farm: { organizationId } })
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(activityId, userId, activity.farm.organizationId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    // Validate state transition
    this.validateStateTransition(activity.status, 'COMPLETED', 'complete activity');

    this.logger.log('Completing activity', {
      activityId,
      userId,
      farmId: activity.farmId,
      type: activity.type,
      name: activity.name,
      previousStatus: activity.status,
      actualCost: data.actualCost,
      results: data.results
    });

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
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async completeHarvestActivity(activityId: string, harvestData: any, userId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: { 
        id: activityId,
        farm: { organizationId },
        type: 'HARVESTING'
      },
      include: {
        farm: { select: { organizationId: true } },
        cropCycle: {
          include: {
            commodity: true
          }
        }
      }
    });

    if (!activity) {
      throw new NotFoundException('Harvest activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(activityId, userId, organizationId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    // Validate state transition
    this.validateStateTransition(activity.status, 'COMPLETED', 'complete harvest activity');

    this.logger.log('Completing harvest activity with inventory integration', {
      activityId,
      userId,
      farmId: activity.farmId,
      cropCycleId: activity.cropCycleId,
      commodityId: activity.cropCycle?.commodityId,
      harvestQuantity: harvestData.quantityHarvested,
      qualityGrade: harvestData.qualityGrade
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Complete the activity
      const updatedActivity = await tx.farmActivity.update({
        where: { id: activityId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(harvestData.completedAt || new Date()),
          cost: harvestData.actualCost || 0,
          metadata: {
            ...(activity.metadata as object || {}),
            results: harvestData.results,
            issues: harvestData.issues,
            recommendations: harvestData.recommendations,
            harvestData: {
              quantityHarvested: harvestData.quantityHarvested,
              qualityGrade: harvestData.qualityGrade,
              harvestMethod: harvestData.harvestMethod,
              storageLocation: harvestData.storageLocation,
              batchNumber: harvestData.batchNumber,
            }
          },
        },
        include: {
          farm: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Create harvest record
      const harvest = await tx.harvest.create({
        data: {
          cropCycleId: activity.cropCycleId!,
          harvestDate: new Date(harvestData.completedAt || new Date()),
          quantity: harvestData.quantityHarvested,
          quality: harvestData.qualityGrade,
          cost: harvestData.actualCost || 0,
          metadata: {
            activityId: activityId,
            harvestMethod: harvestData.harvestMethod,
            storageLocation: harvestData.storageLocation,
            batchNumber: harvestData.batchNumber,
            harvestedBy: userId,
            notes: harvestData.notes,
          }
        }
      });

      // Create inventory entry
      const inventory = await tx.inventory.create({
        data: {
          organizationId: organizationId,
          farmId: activity.farmId,
          commodityId: activity.cropCycle!.commodityId,
          harvestId: harvest.id,
          quantity: harvestData.quantityHarvested,
          unit: harvestData.unit || 'kg',
          quality: harvestData.qualityGrade,
          location: harvestData.storageLocation,
          status: 'AVAILABLE',
          metadata: {
            sourceActivityId: activityId,
            harvestDate: harvest.harvestDate,
            batchNumber: harvestData.batchNumber,
            qualityGrade: harvestData.qualityGrade,
            harvestMethod: harvestData.harvestMethod,
            createdFromHarvest: true,
          }
        }
      });

      // Log the harvest completion activity
      await tx.activity.create({
        data: {
          action: 'HARVEST_COMPLETED',
          organizationId: organizationId,
          entity: 'FarmActivity',
          entityId: activityId,
          metadata: {
            description: `Harvest activity completed: ${harvestData.quantityHarvested} ${harvestData.unit || 'kg'} of ${activity.cropCycle?.commodity.name}`,
            harvestId: harvest.id,
            inventoryId: inventory.id,
            quantityHarvested: harvestData.quantityHarvested,
            qualityGrade: harvestData.qualityGrade,
            batchNumber: harvestData.batchNumber,
          },
        },
      });

      return { updatedActivity, harvest, inventory };
    });

    this.logger.log('Harvest activity completed successfully with inventory integration', {
      activityId,
      harvestId: result.harvest.id,
      inventoryId: result.inventory.id,
      quantityHarvested: harvestData.quantityHarvested,
      qualityGrade: harvestData.qualityGrade
    });

    // Trigger market opportunity analysis asynchronously
    this.triggerMarketAnalysis(activity.cropCycle!.commodityId, harvestData, organizationId).catch(error => {
      this.logger.error('Failed to trigger market analysis after harvest completion', {
        activityId,
        commodityId: activity.cropCycle!.commodityId,
        error: error.message
      });
    });

    // Broadcast harvest completion via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(activityId, {
      type: 'harvest_completed',
      activity: this.formatActivityResponse(result.updatedActivity),
      harvest: {
        id: result.harvest.id,
        quantity: result.harvest.quantity,
        quality: result.harvest.quality,
        harvestDate: result.harvest.harvestDate,
      },
      inventory: {
        id: result.inventory.id,
        quantity: result.inventory.quantity,
        unit: result.inventory.unit,
        quality: result.inventory.quality,
        location: result.inventory.location,
        status: result.inventory.status,
      },
      completedBy: userId,
    });

    return {
      activity: this.formatActivityResponse(result.updatedActivity),
      harvest: {
        id: result.harvest.id,
        quantity: result.harvest.quantity,
        quality: result.harvest.quality,
        harvestDate: result.harvest.harvestDate,
      },
      inventory: {
        id: result.inventory.id,
        quantity: result.inventory.quantity,
        unit: result.inventory.unit,
        quality: result.inventory.quality,
        location: result.inventory.location,
        status: result.inventory.status,
      }
    };
  }

  async pauseActivity(activityId: string, data: PauseActivityDto, userId: string, organizationId?: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: { 
        id: activityId,
        ...(organizationId && { farm: { organizationId } })
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(activityId, userId, activity.farm.organizationId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    // Validate state transition
    this.validateStateTransition(activity.status, 'CANCELLED', 'pause activity');

    const updated = await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        status: 'CANCELLED', // Using CANCELLED as closest equivalent to PAUSED
        metadata: {
          ...(activity.metadata as object || {}),
          pauseReason: data.reason,
          pauseNotes: data.notes,
          estimatedResumeTime: data.estimatedResumeTime,
          pausedAt: new Date().toISOString(),
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return this.formatActivityResponse(updated);
  }

  async resumeActivity(activityId: string, userId: string, data?: { notes?: string }, organizationId?: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: { 
        id: activityId,
        ...(organizationId && { farm: { organizationId } })
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(activityId, userId, activity.farm.organizationId);
    if (!isAssigned) {
      throw new ForbiddenException('Not assigned to this activity');
    }

    // Validate state transition
    this.validateStateTransition(activity.status, 'IN_PROGRESS', 'resume activity');

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
        createdBy: { select: { id: true, name: true, email: true } },
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
        start: scheduledTime.toISOString(),
        end: endTime.toISOString(),
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
      percentComplete: (activity.metadata?.percentComplete as number) || 0,
      assignedTo: activity.assignments?.map((assignment: any) => assignment.userId) || [],
      resources: activity.metadata?.resources || [],
      actualResources: activity.metadata?.actualResources || [],
      instructions: activity.metadata?.instructions || '',
      safetyNotes: activity.metadata?.safetyNotes || '',
      estimatedCost: activity.metadata?.estimatedCost || 0,
      actualCost: activity.metadata?.actualCost || null,
      location: activity.metadata?.location || null,
      results: activity.metadata?.results || null,
      issues: activity.metadata?.issues || null,
      recommendations: activity.metadata?.recommendations || null,
      metadata: activity.metadata,
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      createdBy: activity.createdById,
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

  private validateStateTransition(currentStatus: string, newStatus: string, context?: string): void {
    const allowedTransitions = this.ALLOWED_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions) {
      this.logger.error('Invalid activity status detected', {
        currentStatus,
        newStatus,
        context,
        allowedStates: Object.keys(this.ALLOWED_TRANSITIONS)
      });
      throw new BadRequestException(`Invalid current status: ${currentStatus}`);
    }

    if (!allowedTransitions.includes(newStatus)) {
      const contextMsg = context ? ` during ${context}` : '';
      this.logger.warn('Invalid state transition attempted', {
        currentStatus,
        newStatus,
        context,
        allowedTransitions,
        message: `${currentStatus} -> ${newStatus}${contextMsg}`
      });
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} -> ${newStatus}${contextMsg}. ` +
        `Allowed transitions from ${currentStatus}: ${allowedTransitions.join(', ')}`
      );
    }

    this.logger.log('State transition validated successfully', {
      currentStatus,
      newStatus,
      context,
      transition: `${currentStatus} -> ${newStatus}`
    });
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

  private async triggerMarketAnalysis(commodityId: string, harvestData: any, organizationId: string) {
    try {
      this.logger.log('Triggering market opportunity analysis', {
        commodityId,
        quantityHarvested: harvestData.quantityHarvested,
        qualityGrade: harvestData.qualityGrade,
        organizationId
      });

      // Get commodity information
      const commodity = await this.prisma.commodity.findUnique({
        where: { id: commodityId },
        select: { id: true, name: true, category: true }
      });

      if (!commodity) {
        this.logger.warn('Commodity not found for market analysis', { commodityId });
        return;
      }

      // Get current market analysis for this commodity
      const marketAnalysis = await this.marketService.getMarketAnalysis(
        { userId: 'system' } as any, // System user for automated analysis
        {
          commodityId: commodityId,
          region: 'North America', // Default region - could be made configurable
          period: '30d'
        }
      );

      // Get price trends for the commodity
      const priceTrends = await this.marketService.getPriceTrends(
        { userId: 'system' } as any,
        {
          commodityId: commodityId,
          region: 'North America',
          period: '30d',
          grade: harvestData.qualityGrade
        }
      );

      // Log market analysis results
      await this.prisma.activity.create({
        data: {
          action: 'MARKET_ANALYSIS_TRIGGERED',
          organizationId: organizationId,
          entity: 'Commodity',
          entityId: commodityId,
          metadata: {
            description: `Market analysis triggered for harvest: ${harvestData.quantityHarvested} ${harvestData.unit || 'kg'} of ${commodity.name}`,
            commodityId: commodityId,
            commodityName: commodity.name,
            quantityHarvested: harvestData.quantityHarvested,
            qualityGrade: harvestData.qualityGrade,
            marketAnalysis: {
              currentPrice: priceTrends.currentPrice,
              priceChange: priceTrends.priceChange,
              marketInsights: marketAnalysis.marketInsights,
              recommendations: marketAnalysis.recommendations
            },
            analysisTimestamp: new Date().toISOString()
          },
        },
      });

      this.logger.log('Market analysis completed successfully', {
        commodityId,
        currentPrice: priceTrends.currentPrice,
        priceChange: priceTrends.priceChange.percentage
      });

    } catch (error) {
      this.logger.error('Market analysis failed', {
        commodityId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
