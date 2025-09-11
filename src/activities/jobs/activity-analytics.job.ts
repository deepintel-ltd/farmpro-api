import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Job, JobProcessor } from '../../common/services/job-queue.service';

export interface ActivityAnalyticsJobData {
  organizationId: string;
  farmId?: string;
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class ActivityAnalyticsJobProcessor implements JobProcessor {
  readonly type = 'activity_analytics';
  private readonly logger = new Logger(ActivityAnalyticsJobProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(job: Job): Promise<any> {
    const data = job.data as ActivityAnalyticsJobData;
    
    this.logger.log('Processing activity analytics job', {
      jobId: job.id,
      organizationId: data.organizationId,
      farmId: data.farmId,
      period: data.period
    });

    try {
      // Build where clause
      const where: any = {
        farm: { organizationId: data.organizationId },
        createdAt: {
          gte: data.startDate,
          lte: data.endDate
        }
      };

      if (data.farmId) {
        where.farmId = data.farmId;
      }

      // Get activity statistics
      const [
        totalActivities,
        completedActivities,
        inProgressActivities,
        cancelledActivities,
        activitiesByType,
        activitiesByPriority,
        costAnalysis,
        durationAnalysis
      ] = await Promise.all([
        // Total activities
        this.prisma.farmActivity.count({ where }),
        
        // Completed activities
        this.prisma.farmActivity.count({ 
          where: { ...where, status: 'COMPLETED' } 
        }),
        
        // In progress activities
        this.prisma.farmActivity.count({ 
          where: { ...where, status: 'IN_PROGRESS' } 
        }),
        
        // Cancelled activities
        this.prisma.farmActivity.count({ 
          where: { ...where, status: 'CANCELLED' } 
        }),
        
        // Activities by type
        this.prisma.farmActivity.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
          _sum: { cost: true, actualDuration: true }
        }),
        
        // Activities by priority
        this.prisma.farmActivity.groupBy({
          by: ['priority'],
          where,
          _count: { priority: true }
        }),
        
        // Cost analysis
        this.prisma.farmActivity.aggregate({
          where,
          _sum: { cost: true },
          _avg: { cost: true },
          _min: { cost: true },
          _max: { cost: true }
        }),
        
        // Duration analysis
        this.prisma.farmActivity.aggregate({
          where: {
            ...where,
            actualDuration: { not: null }
          },
          _sum: { actualDuration: true },
          _avg: { actualDuration: true },
          _min: { actualDuration: true },
          _max: { actualDuration: true }
        })
      ]);

      // Calculate completion rate
      const completionRate = totalActivities > 0 
        ? (completedActivities / totalActivities) * 100 
        : 0;

      // Calculate average cost per activity
      const avgCostPerActivity = totalActivities > 0 
        ? (costAnalysis._sum.cost || 0) / totalActivities 
        : 0;

      // Calculate average duration per activity
      const avgDurationPerActivity = completedActivities > 0 
        ? (durationAnalysis._sum.actualDuration || 0) / completedActivities 
        : 0;

      // Prepare analytics result
      const analytics = {
        period: data.period,
        dateRange: {
          start: data.startDate,
          end: data.endDate
        },
        summary: {
          totalActivities,
          completedActivities,
          inProgressActivities,
          cancelledActivities,
          completionRate: Math.round(completionRate * 100) / 100
        },
        costAnalysis: {
          totalCost: costAnalysis._sum.cost || 0,
          averageCost: costAnalysis._avg.cost || 0,
          minCost: costAnalysis._min.cost || 0,
          maxCost: costAnalysis._max.cost || 0,
          averageCostPerActivity: Math.round(avgCostPerActivity * 100) / 100
        },
        durationAnalysis: {
          totalDuration: durationAnalysis._sum.actualDuration || 0,
          averageDuration: durationAnalysis._avg.actualDuration || 0,
          minDuration: durationAnalysis._min.actualDuration || 0,
          maxDuration: durationAnalysis._max.actualDuration || 0,
          averageDurationPerActivity: Math.round(avgDurationPerActivity * 100) / 100
        },
        activitiesByType: activitiesByType.map(item => ({
          type: item.type,
          count: item._count.type,
          totalCost: item._sum.cost || 0,
          totalDuration: item._sum.actualDuration || 0
        })),
        activitiesByPriority: activitiesByPriority.map(item => ({
          priority: item.priority,
          count: item._count.priority
        }))
      };

      // Store analytics result
      await this.prisma.farmAnalysis.create({
        data: {
          farmId: data.farmId || null,
          analysisType: `ACTIVITY_ANALYTICS_${data.period.toUpperCase()}`,
          insights: [
            `Completed ${completedActivities} out of ${totalActivities} activities (${completionRate.toFixed(1)}% completion rate)`,
            `Total cost: $${analytics.costAnalysis.totalCost.toFixed(2)}`,
            `Average cost per activity: $${analytics.costAnalysis.averageCostPerActivity.toFixed(2)}`,
            `Average duration per activity: ${analytics.durationAnalysis.averageDurationPerActivity.toFixed(1)} minutes`
          ],
          recommendations: this.generateRecommendations(analytics),
          confidence: 0.85, // High confidence for statistical analysis
          data: analytics,
          userId: data.userId
        }
      });

      this.logger.log('Activity analytics job completed successfully', {
        jobId: job.id,
        organizationId: data.organizationId,
        farmId: data.farmId,
        totalActivities,
        completionRate: completionRate.toFixed(1)
      });

      return {
        success: true,
        organizationId: data.organizationId,
        farmId: data.farmId,
        period: data.period,
        totalActivities,
        completionRate: completionRate.toFixed(1)
      };

    } catch (error) {
      this.logger.error('Activity analytics job failed', {
        jobId: job.id,
        organizationId: data.organizationId,
        farmId: data.farmId,
        error: error.message
      });

      throw error;
    }
  }

  private generateRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];

    // Completion rate recommendations
    if (analytics.summary.completionRate < 70) {
      recommendations.push('Consider improving activity planning and resource allocation to increase completion rate');
    }

    // Cost efficiency recommendations
    if (analytics.costAnalysis.averageCostPerActivity > 1000) {
      recommendations.push('Review activity costs and identify opportunities for cost reduction');
    }

    // Duration efficiency recommendations
    if (analytics.durationAnalysis.averageDurationPerActivity > 480) { // 8 hours
      recommendations.push('Consider breaking down long activities into smaller, more manageable tasks');
    }

    // Priority distribution recommendations
    const urgentCount = analytics.activitiesByPriority.find((p: any) => p.priority === 'URGENT')?.count || 0;
    const totalCount = analytics.summary.totalActivities;
    if (urgentCount / totalCount > 0.3) {
      recommendations.push('High number of urgent activities - consider better planning to reduce last-minute urgent tasks');
    }

    // Type distribution recommendations
    const maintenanceCount = analytics.activitiesByType.find((t: any) => t.type === 'MAINTENANCE')?.count || 0;
    if (maintenanceCount / totalCount > 0.4) {
      recommendations.push('High maintenance activity ratio - consider preventive measures to reduce reactive maintenance');
    }

    return recommendations;
  }
}
