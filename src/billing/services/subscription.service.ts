import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanService } from './plan.service';
import { PlanFeatureMapperService } from './plan-feature-mapper.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
} from '../dto/subscription.dto';
import { SubscriptionStatus, BillingInterval } from '@prisma/client';
import { createJsonApiResource } from '../../common/utils/json-api-response.util';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly TRIAL_DAYS = 14;

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly planFeatureMapper: PlanFeatureMapperService,
  ) {}

  /**
   * Get current organization subscription (internal method)
   */
  private async getCurrentSubscriptionInternal(organizationId: string) {
    this.logger.log(
      `Fetching subscription for organization: ${organizationId}`,
    );

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
   * Get current organization subscription (JSON API format)
   */
  async getCurrentSubscription(organizationId: string) {
    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);

    return createJsonApiResource(subscription.id, 'subscriptions', {
      ...subscription,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      trialStart: subscription.trialStart?.toISOString() ?? null,
      trialEnd: subscription.trialEnd?.toISOString() ?? null,
      canceledAt: subscription.canceledAt?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    });
  }

  /**
   * Create a new subscription
   */
  async createSubscription(organizationId: string, dto: CreateSubscriptionDto) {
    this.logger.log(
      `Creating subscription for organization: ${organizationId}`,
      dto,
    );

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
    const plan = await this.planService['findOneInternal'](dto.planId);

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
        status: isTrialing
          ? SubscriptionStatus.TRIALING
          : SubscriptionStatus.ACTIVE,
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

    return createJsonApiResource(subscription.id, 'subscriptions', {
      ...subscription,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      trialStart: subscription.trialStart?.toISOString() ?? null,
      trialEnd: subscription.trialEnd?.toISOString() ?? null,
      canceledAt: subscription.canceledAt?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    });
  }

  /**
   * Update subscription
   */
  async updateSubscription(organizationId: string, dto: UpdateSubscriptionDto) {
    this.logger.log(
      `Updating subscription for organization: ${organizationId}`,
      dto,
    );

    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);

    const updatedSubscription = await this.prisma.subscription.update({
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

    return createJsonApiResource(updatedSubscription.id, 'subscriptions', {
      ...updatedSubscription,
      currentPeriodStart: updatedSubscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: updatedSubscription.currentPeriodEnd.toISOString(),
      trialStart: updatedSubscription.trialStart?.toISOString() ?? null,
      trialEnd: updatedSubscription.trialEnd?.toISOString() ?? null,
      canceledAt: updatedSubscription.canceledAt?.toISOString() ?? null,
      createdAt: updatedSubscription.createdAt.toISOString(),
      updatedAt: updatedSubscription.updatedAt.toISOString(),
    });
  }

  /**
   * Change subscription plan
   */
  async changePlan(organizationId: string, dto: ChangePlanDto) {
    this.logger.log(`Changing plan for organization: ${organizationId}`, dto);

    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);
    const newPlan = await this.planService['findOneInternal'](dto.planId);

    // Prevent downgrade to FREE from paid plans
    if (newPlan.tier === 'FREE' && subscription.plan.tier !== 'FREE') {
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

    // Get organization to update features
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Calculate new organization features based on new plan
    const allowedModules = this.planFeatureMapper.getModuleAccess(newPlan);
    const planFeatures = this.planFeatureMapper.getPlanFeatures(newPlan);

    this.logger.log(
      `Updating organization features for plan change: ${subscription.plan.tier} -> ${newPlan.tier}`,
    );
    this.logger.debug(`New allowed modules: ${allowedModules.join(', ')}`);
    this.logger.debug(`New features: ${planFeatures.join(', ')}`);

    // Update subscription and organization features in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update subscription
      const updatedSubscription = await tx.subscription.update({
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

      // Update organization features
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          allowedModules,
          features: planFeatures,
        },
      });

      return updatedSubscription;
    });

    this.logger.log(
      `Successfully changed plan for subscription: ${subscription.id} and updated organization features`,
    );

    return createJsonApiResource(result.id, 'subscriptions', {
      organizationId: result.organizationId,
      planId: result.planId,
      status: result.status,
      currency: result.currency,
      currentPeriodStart: result.currentPeriodStart.toISOString(),
      currentPeriodEnd: result.currentPeriodEnd.toISOString(),
      billingInterval: result.billingInterval,
      trialStart: result.trialStart?.toISOString(),
      trialEnd: result.trialEnd?.toISOString(),
      isTrialing: result.isTrialing,
      autoRenew: result.autoRenew,
      paymentMethodId: result.paymentMethodId,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      canceledAt: result.canceledAt?.toISOString(),
      cancelReason: result.cancelReason,
      metadata: result.metadata,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId: string, dto: CancelSubscriptionDto) {
    this.logger.log(
      `Canceling subscription for organization: ${organizationId}`,
      dto,
    );

    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already canceled');
    }

    const now = new Date();
    const updateData: any = {
      cancelReason: dto.cancelReason,
      canceledAt: now,
    };

    updateData.autoRenew = false;

    if (dto.immediate) {
      // Cancel immediately
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.currentPeriodEnd = now;
      updateData.cancelAtPeriodEnd = false;
    } else {
      updateData.cancelAtPeriodEnd = true;
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

    return createJsonApiResource(canceledSubscription.id, 'subscriptions', {
      ...canceledSubscription,
      currentPeriodStart: canceledSubscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: canceledSubscription.currentPeriodEnd.toISOString(),
      trialStart: canceledSubscription.trialStart?.toISOString() ?? null,
      trialEnd: canceledSubscription.trialEnd?.toISOString() ?? null,
      canceledAt: canceledSubscription.canceledAt?.toISOString() ?? null,
      cancelReason: canceledSubscription.cancelReason,
      createdAt: canceledSubscription.createdAt.toISOString(),
      updatedAt: canceledSubscription.updatedAt.toISOString(),
    });
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(organizationId: string) {
    this.logger.log(
      `Resuming subscription for organization: ${organizationId}`,
    );

    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);

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

    return createJsonApiResource(resumedSubscription.id, 'subscriptions', {
      ...resumedSubscription,
      currentPeriodStart: resumedSubscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: resumedSubscription.currentPeriodEnd.toISOString(),
      trialStart: resumedSubscription.trialStart?.toISOString() ?? null,
      trialEnd: resumedSubscription.trialEnd?.toISOString() ?? null,
      canceledAt: resumedSubscription.canceledAt?.toISOString() ?? null,
      cancelReason: resumedSubscription.cancelReason,
      createdAt: resumedSubscription.createdAt.toISOString(),
      updatedAt: resumedSubscription.updatedAt.toISOString(),
    });
  }

  /**
   * Check if subscription is active
   */
  async isActive(organizationId: string): Promise<boolean> {
    try {
      const subscription =
        await this.getCurrentSubscriptionInternal(organizationId);
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
    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);
    return this.planService.checkFeatureAccess(subscription.planId, feature);
  }

  /**
   * Get subscription limits
   */
  async getSubscriptionLimits(organizationId: string) {
    const subscription =
      await this.getCurrentSubscriptionInternal(organizationId);
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
