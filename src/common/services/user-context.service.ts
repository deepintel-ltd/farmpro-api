import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';
import {
  getPlanPermissions,
  matchesPermission,
} from '@/common/constants/plan-permissions.constant';

export interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  planTier: SubscriptionTier;
  isPlatformAdmin: boolean;
  permissions: Set<string>;
  features: Set<string>;
  modules: Set<string>;

  // Helper methods
  can(resource: string, action: string): boolean;
  hasFeature(feature: string): boolean;
  hasModule(module: string): boolean;
}

interface CachedContext {
  context: UserContext;
  expiresAt: number;
}

@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private cache = new Map<string, CachedContext>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {
    // Clear expired cache entries every minute
    setInterval(() => this.clearExpiredCache(), 60 * 1000);
  }

  /**
   * Get user context (cached for 5 minutes)
   */
  async getUserContext(userId: string): Promise<UserContext> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return cached.context;
    }

    // Build context from database
    this.logger.debug(`Cache miss for user ${userId}, building context`);
    const context = await this.buildUserContext(userId);

    // Cache it
    this.cache.set(userId, {
      context,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return context;
  }

  /**
   * Build user context from database (single query)
   */
  private async buildUserContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
        userRoles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.organizationId) {
      throw new Error(`User ${userId} has no organization`);
    }

    const planTier =
      (user.organization?.subscription?.plan?.tier as SubscriptionTier) || 'FREE';
    const isPlatformAdmin = user.userRoles.some(
      ur => ur.role.isPlatformAdmin,
    );

    // Get permissions from plan tier
    const planPermissions = getPlanPermissions(planTier);
    const permissions = new Set(planPermissions);

    // Get features and modules from plan
    const plan = user.organization?.subscription?.plan;
    const features = this.extractFeatures(plan);
    const modules = this.extractModules(planTier);

    const context: UserContext = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      planTier,
      isPlatformAdmin,
      permissions,
      features,
      modules,

      can: (resource: string, action: string) => {
        if (isPlatformAdmin) return true;

        const required = `${resource}:${action}`;
        return Array.from(permissions).some(granted =>
          matchesPermission(required, granted),
        );
      },

      hasFeature: (feature: string) => {
        if (isPlatformAdmin) return true;
        return features.has(feature);
      },

      hasModule: (module: string) => {
        if (isPlatformAdmin) return true;
        return modules.has(module);
      },
    };

    return context;
  }

  /**
   * Invalidate cache for a specific user
   */
  invalidateCache(userId: string): void {
    this.cache.delete(userId);
    this.logger.debug(`Invalidated cache for user ${userId}`);
  }

  /**
   * Invalidate cache for all users in an organization
   * Called when organization plan changes
   */
  invalidateOrganizationCache(organizationId: string): void {
    let count = 0;
    for (const [userId, cached] of this.cache.entries()) {
      if (cached.context.organizationId === organizationId) {
        this.cache.delete(userId);
        count++;
      }
    }
    this.logger.log(
      `Invalidated cache for ${count} users in organization ${organizationId}`,
    );
  }

  /**
   * Clear all expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [userId, cached] of this.cache.entries()) {
      if (now >= cached.expiresAt) {
        this.cache.delete(userId);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * Extract features from subscription plan
   */
  private extractFeatures(plan: any): Set<string> {
    const features = new Set<string>();
    if (!plan) return features;

    if (plan.hasAdvancedAnalytics) features.add('advanced_analytics');
    if (plan.hasAIInsights) features.add('ai_insights');
    if (plan.hasAPIAccess) features.add('api_access');
    if (plan.hasCustomRoles) features.add('custom_roles');
    if (plan.hasPrioritySupport) features.add('priority_support');
    if (plan.hasWhiteLabel) features.add('white_label');

    return features;
  }

  /**
   * Extract modules from plan tier
   */
  private extractModules(tier: SubscriptionTier): Set<string> {
    const moduleMap: Record<SubscriptionTier, string[]> = {
      FREE: ['farm_management', 'activities', 'marketplace', 'inventory'],
      BASIC: [
        'farm_management',
        'activities',
        'marketplace',
        'inventory',
        'orders',
        'analytics',
      ],
      PRO: [
        'farm_management',
        'activities',
        'marketplace',
        'inventory',
        'orders',
        'analytics',
        'intelligence',
        'api',
      ],
      ENTERPRISE: [
        'farm_management',
        'activities',
        'marketplace',
        'inventory',
        'orders',
        'analytics',
        'intelligence',
        'api',
        'rbac',
        'advanced_analytics',
      ],
    };

    return new Set(moduleMap[tier] || moduleMap.FREE);
  }
}
