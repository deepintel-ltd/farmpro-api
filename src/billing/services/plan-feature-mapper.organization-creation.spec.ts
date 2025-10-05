import { PlanFeatureMapperService } from './plan-feature-mapper.service';
import { SubscriptionTier } from '@prisma/client';

describe('PlanFeatureMapperService - Organization Creation Integration', () => {
  let service: PlanFeatureMapperService;

  beforeEach(() => {
    // Create service instance directly (no dependencies)
    service = new PlanFeatureMapperService();
  });

  describe('getOrganizationFeatures', () => {
    it('should return correct features for FARM_OPERATION with BASIC plan', () => {
      const result = service.getOrganizationFeatures('FARM_OPERATION', SubscriptionTier.BASIC);
      
      expect(result.allowedModules).toContain('farm_management');
      expect(result.allowedModules).toContain('activities');
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('deliveries');
      expect(result.allowedModules).toContain('media');
      
      expect(result.features).toContain('basic_farm_management');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
    });

    it('should return correct features for COMMODITY_TRADER with BASIC plan', () => {
      const result = service.getOrganizationFeatures('COMMODITY_TRADER', SubscriptionTier.BASIC);
      
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('deliveries');
      expect(result.allowedModules).toContain('media');
      
      expect(result.features).toContain('basic_farm_management');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
    });

    it('should return correct features for FARM_OPERATION with PRO plan', () => {
      const result = service.getOrganizationFeatures('FARM_OPERATION', SubscriptionTier.PRO);
      
      expect(result.allowedModules).toContain('farm_management');
      expect(result.allowedModules).toContain('activities');
      expect(result.allowedModules).toContain('inventory');
      expect(result.allowedModules).toContain('analytics');
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('trading');
      expect(result.allowedModules).toContain('deliveries');
      expect(result.allowedModules).toContain('observations');
      expect(result.allowedModules).toContain('crop_cycles');
      expect(result.allowedModules).toContain('intelligence');
      expect(result.allowedModules).toContain('media');
      
      expect(result.features).toContain('basic_farm_management');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
      expect(result.features).toContain('advanced_analytics');
      expect(result.features).toContain('ai_insights');
      expect(result.features).toContain('api_access');
      expect(result.features).toContain('custom_roles');
    });

    it('should return correct features for FARM_OPERATION with ENTERPRISE plan', () => {
      const result = service.getOrganizationFeatures('FARM_OPERATION', SubscriptionTier.ENTERPRISE);
      
      expect(result.allowedModules).toContain('farm_management');
      expect(result.allowedModules).toContain('activities');
      expect(result.allowedModules).toContain('inventory');
      expect(result.allowedModules).toContain('analytics');
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('trading');
      expect(result.allowedModules).toContain('deliveries');
      expect(result.allowedModules).toContain('observations');
      expect(result.allowedModules).toContain('sensors');
      expect(result.allowedModules).toContain('crop_cycles');
      expect(result.allowedModules).toContain('areas');
      expect(result.allowedModules).toContain('seasons');
      expect(result.allowedModules).toContain('drivers');
      expect(result.allowedModules).toContain('tracking');
      expect(result.allowedModules).toContain('intelligence');
      expect(result.allowedModules).toContain('media');
      
      expect(result.features).toContain('basic_farm_management');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
      expect(result.features).toContain('advanced_analytics');
      expect(result.features).toContain('ai_insights');
      expect(result.features).toContain('api_access');
      expect(result.features).toContain('custom_roles');
      expect(result.features).toContain('white_label');
      expect(result.features).toContain('priority_support');
      expect(result.features).toContain('unlimited_usage');
    });

    it('should return correct features for FARM_OPERATION with FREE plan', () => {
      const result = service.getOrganizationFeatures('FARM_OPERATION', SubscriptionTier.FREE);
      
      expect(result.allowedModules).toContain('farm_management');
      expect(result.allowedModules).toContain('activities');
      expect(result.allowedModules).toContain('marketplace');
      expect(result.allowedModules).toContain('orders');
      expect(result.allowedModules).toContain('inventory');
      expect(result.allowedModules).toContain('media');
      
      expect(result.features).toContain('basic_farm_management');
      expect(result.features).toContain('marketplace_access');
      expect(result.features).toContain('order_management');
      expect(result.features).toContain('inventory_management');
      
      // FREE plan should not have premium features
      expect(result.allowedModules).not.toContain('analytics');
      expect(result.allowedModules).not.toContain('intelligence');
      expect(result.features).not.toContain('advanced_analytics');
      expect(result.features).not.toContain('ai_insights');
    });
  });
});
