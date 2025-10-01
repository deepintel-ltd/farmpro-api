import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionService } from './subscription.service';
import { createJsonApiResource } from '../../common/utils/json-api-response.util';

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Record usage for a feature
   */
  async recordUsage(
    organizationId: string,
    featureName: string,
    quantity: number = 1,
    unit?: string,
  ) {
    this.logger.debug(
      `Recording usage for ${organizationId}: ${featureName} (${quantity} ${unit || 'count'})`,
    );

    const subscription = await this.subscriptionService['getCurrentSubscriptionInternal'](
      organizationId,
    );

    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    return this.prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        featureName,
        quantity,
        unit,
        periodStart,
        periodEnd,
      },
    });
  }

  /**
   * Get usage statistics for current period
   */
  async getUsageStats(organizationId: string) {
    this.logger.log(`Fetching usage stats for organization: ${organizationId}`);

    try {
      const subscription = await this.subscriptionService['getCurrentSubscriptionInternal'](
        organizationId,
      );
      const limits = await this.subscriptionService.getSubscriptionLimits(
        organizationId,
      );

      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;

    // Get current usage from the database
    const [userCount, farmCount, activityCount, listingCount] = await Promise.all([
      this.prisma.user.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.farm.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.farmActivity.count({
        where: {
          farm: { organizationId },
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      }),
      this.prisma.marketplaceListing.count({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      }),
    ]);

    // Build features object
    const features = {
      users: {
        used: userCount,
        limit: limits.maxUsers,
        unit: 'count',
        isUnlimited: limits.maxUsers === -1,
        percentageUsed:
          limits.maxUsers === -1 ? 0 : (userCount / limits.maxUsers) * 100,
      },
      farms: {
        used: farmCount,
        limit: limits.maxFarms,
        unit: 'count',
        isUnlimited: limits.maxFarms === -1,
        percentageUsed:
          limits.maxFarms === -1 ? 0 : (farmCount / limits.maxFarms) * 100,
      },
      activities: {
        used: activityCount,
        limit: limits.maxActivitiesPerMonth,
        unit: 'count',
        isUnlimited: limits.maxActivitiesPerMonth === -1,
        percentageUsed:
          limits.maxActivitiesPerMonth === -1
            ? 0
            : (activityCount / limits.maxActivitiesPerMonth) * 100,
      },
      listings: {
        used: listingCount,
        limit: limits.maxActiveListings,
        unit: 'count',
        isUnlimited: limits.maxActiveListings === -1,
        percentageUsed:
          limits.maxActiveListings === -1
            ? 0
            : (listingCount / limits.maxActiveListings) * 100,
      },
    };

      return createJsonApiResource(
        organizationId,
        'usage-stats',
        {
          currentPeriod: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
          features,
        }
      );
    } catch (error) {
      // If no subscription exists, return empty usage stats
      this.logger.warn(`No subscription found for organization: ${organizationId}`);
      
      return createJsonApiResource(
        organizationId,
        'usage-stats',
        {
          currentPeriod: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
          features: {
            users: { used: 0, limit: 0, unit: 'count', isUnlimited: false, percentageUsed: 0 },
            farms: { used: 0, limit: 0, unit: 'count', isUnlimited: false, percentageUsed: 0 },
            activities: { used: 0, limit: 0, unit: 'count', isUnlimited: false, percentageUsed: 0 },
            listings: { used: 0, limit: 0, unit: 'count', isUnlimited: false, percentageUsed: 0 },
          },
        }
      );
    }
  }

  /**
   * Get usage for a specific feature
   */
  async getFeatureUsage(
    organizationId: string,
    featureName: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    this.logger.log(
      `Fetching ${featureName} usage for organization: ${organizationId}`,
    );

    const subscription = await this.subscriptionService['getCurrentSubscriptionInternal'](
      organizationId,
    );

    const periodStart = startDate || subscription.currentPeriodStart;
    const periodEnd = endDate || subscription.currentPeriodEnd;

    // Get usage records
    const records = await this.prisma.usageRecord.findMany({
      where: {
        subscriptionId: subscription.id,
        featureName,
        recordedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: {
        recordedAt: 'asc',
      },
    });

    const totalUsage = records.reduce((sum, record) => sum + record.quantity, 0);

    // Group by day for daily usage
    const dailyUsage = new Map<string, number>();
    records.forEach((record) => {
      const date = record.recordedAt.toISOString().split('T')[0];
      dailyUsage.set(date, (dailyUsage.get(date) || 0) + record.quantity);
    });

    const dailyUsageArray = Array.from(dailyUsage.entries()).map(
      ([date, count]) => ({
        date,
        count,
      }),
    );

    const limits = await this.subscriptionService.getSubscriptionLimits(
      organizationId,
    );
    const limit = this.getFeatureLimit(featureName, limits);

    return createJsonApiResource(
      `${organizationId}-${featureName}`,
      'usage-stats',
      {
        featureName,
        totalUsage,
        limit,
        isUnlimited: limit === -1,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        dailyUsage: dailyUsageArray,
      }
    );
  }

  /**
   * Check if organization is approaching limit
   */
  async isApproachingLimit(
    organizationId: string,
    feature: string,
    threshold: number = 0.8,
  ): Promise<boolean> {
    const stats = await this.getUsageStats(organizationId);
    const featureStats = (stats.data as any).attributes.features[feature];

    if (!featureStats || featureStats.isUnlimited) {
      return false;
    }

    const usagePercentage = featureStats.percentageUsed / 100;
    return usagePercentage >= threshold;
  }

  /**
   * Helper to get feature limit from limits object
   */
  private getFeatureLimit(
    featureName: string,
    limits: {
      maxUsers: number;
      maxFarms: number;
      maxActivitiesPerMonth: number;
      maxActiveListings: number;
    },
  ): number {
    const limitMap = {
      users: limits.maxUsers,
      farms: limits.maxFarms,
      activities: limits.maxActivitiesPerMonth,
      listings: limits.maxActiveListings,
    };

    return limitMap[featureName] ?? -1;
  }
}
