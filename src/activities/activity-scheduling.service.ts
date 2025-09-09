import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityTemplateService } from './activity-template.service';

@Injectable()
export class ActivitySchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: ActivityTemplateService,
  ) {}

  async checkConflicts(query: {
    farmId: string;
    resourceId?: string;
    startTime: string;
    endTime: string;
  }, organizationId: string) {
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
        type: 'activity-conflicts' as const,
        attributes: {
          activityId: activity.id,
          activityName: activity.name,
          scheduledAt: activity.scheduledAt?.toISOString(),
          status: activity.status,
          conflictType: 'time_overlap',
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
      data: results,
      meta: {
        totalScheduled: results.length,
        totalConflicts: conflicts.length,
        conflicts,
      },
    };
  }

  async getWorkloadAnalysis(query: {
    farmId: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }, organizationId: string) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date();
    const endDate = query.endDate ? new Date(query.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get basic activity count and scheduled activities
    const activities = await this.prisma.farmActivity.findMany({
      where: {
        farmId: query.farmId,
        farm: { organizationId },
        scheduledAt: { gte: startDate, lte: endDate },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        name: true,
        scheduledAt: true,
        status: true,
        estimatedDuration: true,
      },
    });

    // Simple workload calculation
    const totalActivities = activities.length;
    const upcomingActivities = activities.filter(a => 
      a.scheduledAt && a.scheduledAt > new Date()
    ).length;
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const avgActivitiesPerDay = totalDays > 0 ? totalActivities / totalDays : 0;

    return {
      data: [{
        id: 'workload-analysis',
        type: 'workload-analysis' as const,
        attributes: {
          period: { start: startDate.toISOString(), end: endDate.toISOString() },
          totalActivities,
          upcomingActivities,
          avgActivitiesPerDay: Math.round(avgActivitiesPerDay * 100) / 100,
          utilizationRate: this.calculateUtilizationRate(activities, startDate, endDate),
        },
      }],
      meta: {
        farmId: query.farmId,
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
      },
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