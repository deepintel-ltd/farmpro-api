import { PlanFeatureMapperService } from './plan-feature-mapper.service';
import { SubscriptionPlan, SubscriptionTier } from '@prisma/client';

describe('PlanFeatureMapperService', () => {
  let service: PlanFeatureMapperService;

  beforeEach(() => {
    // Create service instance directly (no dependencies)
    service = new PlanFeatureMapperService();
  });

  describe('getModuleAccess', () => {
    it('should return correct modules for FREE plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.FREE,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
      };

      const modules = service.getModuleAccess(plan as SubscriptionPlan);
      expect(modules).toEqual(['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'media']);
    });

    it('should return correct modules for BASIC plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.BASIC,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
      };

      const modules = service.getModuleAccess(plan as SubscriptionPlan);
      expect(modules).toEqual([
        'farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'deliveries', 'media'
      ]);
    });

    it('should return correct modules for PRO plan with premium features', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.PRO,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: true,
        hasPrioritySupport: true,
        hasWhiteLabel: false,
      };

      const modules = service.getModuleAccess(plan as SubscriptionPlan);
      expect(modules).toContain('farm_management');
      expect(modules).toContain('advanced_analytics');
      expect(modules).toContain('ai_insights');
      expect(modules).toContain('api_access');
      expect(modules).toContain('custom_roles');
    });

    it('should return correct modules for ENTERPRISE plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.ENTERPRISE,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: true,
        hasPrioritySupport: true,
        hasWhiteLabel: true,
      };

      const modules = service.getModuleAccess(plan as SubscriptionPlan);
      expect(modules).toContain('farm_management');
      expect(modules).toContain('sensors');
      expect(modules).toContain('areas');
      expect(modules).toContain('seasons');
      expect(modules).toContain('drivers');
      expect(modules).toContain('tracking');
      expect(modules).toContain('white_label');
    });
  });

  describe('getPlanFeatures', () => {
    it('should return correct features for FREE plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.FREE,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
      };

      const features = service.getPlanFeatures(plan as SubscriptionPlan);
      expect(features).toEqual(['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management']);
    });

    it('should return correct features for PRO plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.PRO,
        hasAdvancedAnalytics: true,
        hasAIInsights: true,
        hasAPIAccess: true,
        hasCustomRoles: true,
        hasPrioritySupport: true,
        hasWhiteLabel: false,
      };

      const features = service.getPlanFeatures(plan as SubscriptionPlan);
      expect(features).toContain('basic_farm_management');
      expect(features).toContain('marketplace_access');
      expect(features).toContain('order_management');
      expect(features).toContain('inventory_management');
      expect(features).toContain('advanced_analytics');
      expect(features).toContain('ai_insights');
      expect(features).toContain('api_access');
      expect(features).toContain('custom_roles');
      expect(features).toContain('priority_support');
    });
  });

  describe('hasFeature', () => {
    it('should return true for features included in plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.PRO,
        hasAdvancedAnalytics: true,
      };

      expect(service.hasFeature(plan as SubscriptionPlan, 'advanced_analytics')).toBe(true);
    });

    it('should return false for features not included in plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.BASIC,
        hasAdvancedAnalytics: false,
      };

      expect(service.hasFeature(plan as SubscriptionPlan, 'advanced_analytics')).toBe(false);
    });
  });

  describe('hasModule', () => {
    it('should return true for modules included in plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.BASIC,
        hasAdvancedAnalytics: false,
      };

      expect(service.hasModule(plan as SubscriptionPlan, 'marketplace')).toBe(true);
    });

    it('should return false for modules not included in plan', () => {
      const plan: Partial<SubscriptionPlan> = {
        tier: SubscriptionTier.FREE,
        hasAdvancedAnalytics: false,
      };

      expect(service.hasModule(plan as SubscriptionPlan, 'analytics')).toBe(false);
    });
  });

  describe('getOrganizationFeatures', () => {
    it('should return correct organization features for BASIC plan', () => {
      const result = service.getOrganizationFeatures('FARM_OPERATION', SubscriptionTier.BASIC);
      
      expect(result.allowedModules).toContain('farm_management');
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('inventory');
      expect(result.features).toContain('basic_farm_management');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
      expect(result.features).toContain('inventory_management');
    });

    it('should return correct organization features for PRO plan', () => {
      const result = service.getOrganizationFeatures('FARM_OPERATION', SubscriptionTier.PRO);
      
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('inventory');
      expect(result.allowedModules).toContain('analytics');
      expect(result.allowedModules).toContain('intelligence');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
      expect(result.features).toContain('inventory_management');
      expect(result.features).toContain('advanced_analytics');
      expect(result.features).toContain('ai_insights');
    });
  });
});
