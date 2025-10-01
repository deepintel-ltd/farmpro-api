import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanService } from './plan.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
} from '../dto/subscription.dto';
import { SubscriptionStatus, BillingInterval } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly TRIAL_DAYS = 14;

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
  ) {}

  /**
   * Get current organization subscription
   */
  async getCurrentSubscription(organizationId: string) {
    this.logger.log(`Fetching subscription for organization: ${organizationId}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        `No subscription found for organization ${organizationId}`,
      );
    }

    return subscription;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    organizationId: string,
    dto: CreateSubscriptionDto,
  ) {
    this.logger.log(`Creating subscription for organization: ${organizationId}`, dto);

    // Check if organization already has a subscription
    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (existing) {
      throw new ConflictException(
        'Organization already has an active subscription',
      );
    }

    // Validate the plan
    const plan = await this.planService.findOne(dto.planId);

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);

    if (dto.billingInterval === BillingInterval.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Handle trial period
    let isTrialing = false;
    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;

    if (dto.startTrial && plan.tier !== 'FREE') {
      isTrialing = true;
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + this.TRIAL_DAYS);
    }

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        organizationId,
        planId: dto.planId,
        status: isTrialing ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currency: dto.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        billingInterval: dto.billingInterval ?? plan.billingInterval,
        isTrialing,
        trialStart,
        trialEnd,
        paymentMethodId: dto.paymentMethodId,
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });

    this.logger.log(`Successfully created subscription: ${subscription.id}`);

    return subscription;
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    organizationId: string,
    dto: UpdateSubscriptionDto,
  ) {
    this.logger.log(`Updating subscription for organization: ${organizationId}`, dto);

    const subscription = await this.getCurrentSubscription(organizationId);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        autoRenew: dto.autoRenew,
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });
  }

  /**
   * Change subscription plan
   */
  async changePlan(organizationId: string, dto: ChangePlanDto) {
    this.logger.log(`Changing plan for organization: ${organizationId}`, dto);

    const subscription = await this.getCurrentSubscription(organizationId);
    const newPlan = await this.planService.findOne(dto.planId);

    // Prevent downgrade to FREE from paid plans
    if (
      newPlan.tier === 'FREE' &&
      subscription.plan.tier !== 'FREE'
    ) {
      throw new BadRequestException(
        'Cannot downgrade to FREE plan. Please cancel your subscription instead.',
      );
    }

    // Calculate new period end based on billing interval
    const now = new Date();
    const newPeriodEnd = new Date(now);

    const interval = dto.billingInterval ?? newPlan.billingInterval;
    if (interval === BillingInterval.YEARLY) {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    } else {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    }

    // Update subscription
    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: dto.planId,
        billingInterval: interval,
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        status: SubscriptionStatus.ACTIVE,
        isTrialing: false,
        trialStart: null,
        trialEnd: null,
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });

    this.logger.log(`Successfully changed plan for subscription: ${subscription.id}`);

    return updatedSubscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    organizationId: string,
    dto: CancelSubscriptionDto,
  ) {
    this.logger.log(`Canceling subscription for organization: ${organizationId}`, dto);

    const subscription = await this.getCurrentSubscription(organizationId);

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already canceled');
    }

    const now = new Date();
    const updateData: any = {
      cancelReason: dto.cancelReason,
      canceledAt: now,
    };

    if (dto.immediate) {
      // Cancel immediately
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.currentPeriodEnd = now;
    } else {
      // Cancel at period end
      updateData.cancelAtPeriodEnd = true;
      updateData.autoRenew = false;
    }

    const canceledSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
      include: {
        plan: true,
        paymentMethod: true,
      },
    });

    this.logger.log(`Successfully canceled subscription: ${subscription.id}`);

    return canceledSubscription;
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(organizationId: string) {
    this.logger.log(`Resuming subscription for organization: ${organizationId}`);

    const subscription = await this.getCurrentSubscription(organizationId);

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Subscription is already active');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException(
        'Cannot resume a subscription that was canceled immediately',
      );
    }

    const resumedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        autoRenew: true,
        canceledAt: null,
        cancelReason: null,
      },
      include: {
        plan: true,
        paymentMethod: true,
      },
    });

    this.logger.log(`Successfully resumed subscription: ${subscription.id}`);

    return resumedSubscription;
  }

  /**
   * Check if subscription is active
   */
  async isActive(organizationId: string): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription(organizationId);
      return (
        subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.TRIALING
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if subscription has access to a feature
   */
  async hasFeatureAccess(
    organizationId: string,
    feature: string,
  ): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(organizationId);
    return this.planService.checkFeatureAccess(subscription.planId, feature);
  }

  /**
   * Get subscription limits
   */
  async getSubscriptionLimits(organizationId: string) {
    const subscription = await this.getCurrentSubscription(organizationId);
    return this.planService.getPlanLimits(subscription.planId);
  }

  /**
   * Check if usage is within limits
   */
  async checkLimit(
    organizationId: string,
    limitType: 'users' | 'farms' | 'activities' | 'listings',
    currentUsage: number,
  ): Promise<{ allowed: boolean; limit: number; isUnlimited: boolean }> {
    const limits = await this.getSubscriptionLimits(organizationId);

    const limitMap = {
      users: limits.maxUsers,
      farms: limits.maxFarms,
      activities: limits.maxActivitiesPerMonth,
      listings: limits.maxActiveListings,
    };

    const limit = limitMap[limitType];
    const isUnlimited = this.planService.isUnlimited(limit);
    const allowed = isUnlimited || currentUsage < limit;

    return { allowed, limit, isUnlimited };
  }
}
