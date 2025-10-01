import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, BillingInterval } from '@prisma/client';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active subscription plans
   */
  async findAll(filters?: {
    tier?: SubscriptionTier;
    billingInterval?: BillingInterval;
    isPublic?: boolean;
  }) {
    this.logger.log('Fetching all subscription plans', filters);

    return this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isPublic: filters?.isPublic ?? true,
        tier: filters?.tier,
        billingInterval: filters?.billingInterval,
      },
      orderBy: [
        { tier: 'asc' },
        { billingInterval: 'asc' },
      ],
    });
  }

  /**
   * Get a single subscription plan by ID
   */
  async findOne(id: string) {
    this.logger.log(`Fetching subscription plan: ${id}`);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    return plan;
  }

  /**
   * Get plan by tier and interval
   */
  async findByTierAndInterval(tier: SubscriptionTier, interval: BillingInterval) {
    this.logger.log(`Fetching plan for tier: ${tier}, interval: ${interval}`);

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        tier,
        billingInterval: interval,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `No active plan found for tier ${tier} with ${interval} billing`,
      );
    }

    return plan;
  }

  /**
   * Check if a plan allows a specific feature
   */
  async checkFeatureAccess(planId: string, feature: string): Promise<boolean> {
    const plan = await this.findOne(planId);

    const featureMap: Record<string, boolean> = {
      advancedAnalytics: plan.hasAdvancedAnalytics,
      aiInsights: plan.hasAIInsights,
      apiAccess: plan.hasAPIAccess,
      customRoles: plan.hasCustomRoles,
      prioritySupport: plan.hasPrioritySupport,
      whiteLabel: plan.hasWhiteLabel,
    };

    return featureMap[feature] ?? false;
  }

  /**
   * Get plan limits
   */
  async getPlanLimits(planId: string) {
    const plan = await this.findOne(planId);

    return {
      maxUsers: plan.maxUsers,
      maxFarms: plan.maxFarms,
      maxActivitiesPerMonth: plan.maxActivitiesPerMonth,
      maxActiveListings: plan.maxActiveListings,
      storageGB: plan.storageGB,
      apiCallsPerDay: plan.apiCallsPerDay,
    };
  }

  /**
   * Check if a limit is unlimited (-1)
   */
  isUnlimited(limit: number): boolean {
    return limit === -1;
  }
}
