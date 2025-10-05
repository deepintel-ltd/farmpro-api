import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionPlan, SubscriptionTier } from '@prisma/client';

@Injectable()
export class PlanFeatureMapperService {
  private readonly logger = new Logger(PlanFeatureMapperService.name);

  /**
   * Get module access based on subscription plan
   */
  getModuleAccess(plan: SubscriptionPlan): string[] {
    const baseModules = this.getBaseModules(plan.tier);
    const premiumModules = this.getPremiumModules(plan);
    const allModules = [...baseModules, ...premiumModules];
    
    this.logger.debug(`Plan ${plan.tier} provides modules: ${allModules.join(', ')}`);
    return allModules;
  }

  /**
   * Get features based on subscription plan
   */
  getPlanFeatures(plan: SubscriptionPlan): string[] {
    const baseFeatures = this.getBaseFeatures(plan.tier);
    const premiumFeatures = this.getPremiumFeatures(plan);
    const allFeatures = [...baseFeatures, ...premiumFeatures];
    
    this.logger.debug(`Plan ${plan.tier} provides features: ${allFeatures.join(', ')}`);
    return allFeatures;
  }

  /**
   * Check if plan allows specific feature
   */
  hasFeature(plan: SubscriptionPlan, feature: string): boolean {
    const features = this.getPlanFeatures(plan);
    return features.includes(feature);
  }

  /**
   * Check if plan allows specific module
   */
  hasModule(plan: SubscriptionPlan, module: string): boolean {
    const modules = this.getModuleAccess(plan);
    return modules.includes(module);
  }

  /**
   * Get organization features based on plan tier (for backward compatibility)
   */
  getOrganizationFeatures(orgType: string, planTier: SubscriptionTier): {
    allowedModules: string[];
    features: string[];
  } {
    const plan = this.createMockPlan(planTier);
    const allowedModules = this.getModuleAccess(plan);
    const features = this.getPlanFeatures(plan);
    
    return { allowedModules, features };
  }

  private getBaseModules(tier: SubscriptionTier): string[] {
    const moduleMap: Record<SubscriptionTier, string[]> = {
      FREE: ['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'media'],
      BASIC: ['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'deliveries', 'media'],
      PRO: [
        'farm_management', 'activities', 'inventory', 'analytics', 
        'marketplace', 'orders', 'trading', 'deliveries', 
        'observations', 'crop_cycles', 'intelligence', 'media'
      ],
      ENTERPRISE: [
        'farm_management', 'activities', 'inventory', 'analytics',
        'marketplace', 'orders', 'trading', 'deliveries',
        'observations', 'sensors', 'crop_cycles', 'areas',
        'seasons', 'drivers', 'tracking', 'intelligence', 'media'
      ],
    };

    return moduleMap[tier] || moduleMap.FREE;
  }

  private getPremiumModules(plan: SubscriptionPlan): string[] {
    const premiumModules: string[] = [];

    if (plan.hasAdvancedAnalytics) {
      premiumModules.push('advanced_analytics');
    }

    if (plan.hasAIInsights) {
      premiumModules.push('ai_insights');
    }

    if (plan.hasAPIAccess) {
      premiumModules.push('api_access');
    }

    if (plan.hasCustomRoles) {
      premiumModules.push('custom_roles');
    }

    if (plan.hasWhiteLabel) {
      premiumModules.push('white_label');
    }

    return premiumModules;
  }

  private getBaseFeatures(tier: SubscriptionTier): string[] {
    const featureMap: Record<SubscriptionTier, string[]> = {
      FREE: ['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management'],
      BASIC: ['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management'],
      PRO: [
        'basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management',
        'advanced_analytics', 'ai_insights', 'api_access', 'custom_roles'
      ],
      ENTERPRISE: [
        'basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management',
        'advanced_analytics', 'ai_insights', 'api_access', 'custom_roles',
        'white_label', 'priority_support', 'unlimited_usage'
      ],
    };

    return featureMap[tier] || featureMap.FREE;
  }

  private getPremiumFeatures(plan: SubscriptionPlan): string[] {
    const premiumFeatures: string[] = [];

    if (plan.hasAdvancedAnalytics) {
      premiumFeatures.push('advanced_analytics');
    }

    if (plan.hasAIInsights) {
      premiumFeatures.push('ai_insights');
    }

    if (plan.hasAPIAccess) {
      premiumFeatures.push('api_access');
    }

    if (plan.hasCustomRoles) {
      premiumFeatures.push('custom_roles');
    }

    if (plan.hasPrioritySupport) {
      premiumFeatures.push('priority_support');
    }

    if (plan.hasWhiteLabel) {
      premiumFeatures.push('white_label');
    }

    return premiumFeatures;
  }

  /**
   * Create a mock plan for tier-based feature mapping (backward compatibility)
   */
  private createMockPlan(tier: SubscriptionTier): SubscriptionPlan {
    return {
      id: 'mock-plan',
      name: `Mock ${tier} Plan`,
      tier,
      description: `Mock plan for ${tier}`,
      priceUSD: 0 as any, // Using any to avoid Decimal type issues in mock
      priceNGN: 0 as any, // Using any to avoid Decimal type issues in mock
      billingInterval: 'MONTHLY' as any,
      maxUsers: tier === 'FREE' ? 1 : tier === 'BASIC' ? 3 : tier === 'PRO' ? 10 : -1,
      maxFarms: tier === 'FREE' ? 1 : tier === 'BASIC' ? 2 : tier === 'PRO' ? 5 : -1,
      maxActivitiesPerMonth: tier === 'FREE' ? 50 : -1,
      maxActiveListings: tier === 'FREE' ? 0 : tier === 'BASIC' ? 5 : -1,
      storageGB: tier === 'FREE' ? 1 : tier === 'BASIC' ? 5 : tier === 'PRO' ? 50 : -1,
      apiCallsPerDay: tier === 'FREE' ? 100 : tier === 'BASIC' ? 500 : tier === 'PRO' ? 5000 : -1,
      hasAdvancedAnalytics: tier === 'PRO' || tier === 'ENTERPRISE',
      hasAIInsights: tier === 'PRO' || tier === 'ENTERPRISE',
      hasAPIAccess: tier === 'PRO' || tier === 'ENTERPRISE',
      hasCustomRoles: tier === 'PRO' || tier === 'ENTERPRISE',
      hasPrioritySupport: tier === 'PRO' || tier === 'ENTERPRISE',
      hasWhiteLabel: tier === 'ENTERPRISE',
      features: null,
      isActive: true,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SubscriptionPlan;
  }
}
