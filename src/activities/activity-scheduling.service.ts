import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityTemplateService } from './activity-template.service';
import { ConflictCheckQueryOptions, WorkloadQueryOptions } from './dto/activities.dto';

@Injectable()
export class ActivitySchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: ActivityTemplateService,
  ) {}

  async checkConflicts(query: ConflictCheckQueryOptions, organizationId: string) {
    const startTime = new Date(query.startTime);
    const endTime = new Date(query.endTime);

    // Simple conflict check - find activities in the same time window
    const conflicts = await this.prisma.farmActivity.findMany({
      where: {
        farmId: query.farmId,
        farm: { organizationId },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        scheduledAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      select: {
        id: true,
        name: true,
        scheduledAt: true,
        status: true,
      },
    });

    return {
      data: conflicts.map(activity => ({
        id: activity.id,
        type: 'conflicts' as const,
        attributes: {
          resourceId: query.resourceId || 'default',
          conflictingActivities: [{
            id: activity.id,
            name: activity.name,
            type: 'PLANTING' as const, // This should come from the actual activity
            status: activity.status,
            scheduledAt: activity.scheduledAt?.toISOString(),
            description: '',
            priority: 'NORMAL' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: '',
          }],
          suggestions: [{
            action: 'reschedule' as const,
            description: 'Consider rescheduling this activity to avoid conflicts',
            newTime: new Date(endTime.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Next day
          }],
        },
      })),
      meta: {
        totalConflicts: conflicts.length,
        hasConflicts: conflicts.length > 0,
        timeWindow: { start: query.startTime, end: query.endTime },
      },
    };
  }

  async bulkSchedule(
    request: {
      activities: Array<{
        templateId: string;
        scheduledAt: string;
        farmId: string;
        areaId?: string;
        customizations?: any;
      }>;
      resolveConflicts?: 'auto' | 'manual';
    },
    userId: string,
    organizationId: string
  ) {
    const results = [];
    const conflicts = [];

    for (const activityData of request.activities) {
      try {
        const activity = await this.templateService.createFromTemplate(
          activityData.templateId,
          activityData,
          userId,
          organizationId
        );
        results.push(activity);
      } catch (error) {
        conflicts.push({
          templateId: activityData.templateId,
          scheduledAt: activityData.scheduledAt,
          error: (error as Error).message,
        });
      }
    }

    return {
      id: 'bulk-schedule-result',
      type: 'bulk-schedule-results' as const,
      attributes: {
        scheduled: results.length,
        conflicts: conflicts.length,
        failed: conflicts.length,
        activities: results,
        conflictDetails: conflicts.map(conflict => ({
          resourceId: 'default',
          conflictingActivities: [],
          suggestions: [{
            action: 'reschedule' as const,
            description: conflict.error,
          }],
        })),
      },
    };
  }

  async getWorkloadAnalysis(query: WorkloadQueryOptions, organizationId: string) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date();
    const endDate = query.endDate ? new Date(query.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // Get user assignments for workload analysis
    const assignments = await this.prisma.activityAssignment.findMany({
      where: {
        activity: {
          farmId: query.farmId,
          farm: { organizationId },
          scheduledAt: { gte: startDate, lte: endDate },
        },
        isActive: true,
        ...(query.userId && { userId: query.userId }),
      },
      include: {
        user: { select: { id: true, name: true } },
        activity: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            scheduledAt: true,
            estimatedDuration: true,
            description: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
          }
        }
      },
    });

    // Group by user
    const userWorkloads = assignments.reduce((acc, assignment) => {
      const userId = assignment.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId: assignment.user.id,
          userName: assignment.user.name,
          totalHours: 0,
          capacity: 8 * 30, // 8 hours per day, 30 days
          activities: [],
        };
      }
      acc[userId].totalHours += assignment.activity.estimatedDuration || 0;
      acc[userId].activities.push(assignment.activity);
      return acc;
    }, {} as Record<string, any>);

    return {
      data: Object.values(userWorkloads).map((workload: any) => ({
        id: workload.userId,
        type: 'workload-analysis' as const,
        attributes: {
          userId: workload.userId,
          userName: workload.userName,
          totalHours: workload.totalHours,
          capacity: workload.capacity,
          utilization: workload.capacity > 0 ? (workload.totalHours / workload.capacity) * 100 : 0,
          activities: workload.activities,
        },
      })),
    };
  }

  private calculateUtilizationRate(activities: any[], startDate: Date, endDate: Date): number {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const activeDays = new Set(
      activities
        .map(a => a.scheduledAt?.toISOString().split('T')[0])
        .filter(Boolean)
    ).size;
    
    return totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
  }
}
