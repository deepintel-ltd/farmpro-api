import { OrganizationType } from '@prisma/client';

export interface OrganizationFeatureConfig {
  modules: string[];
  capabilities: string[];
  marketplaceAccess: boolean;
  tradingAccess: boolean;
  farmManagement: boolean;
}

export const ORGANIZATION_FEATURES: Record<
  OrganizationType,
  OrganizationFeatureConfig
> = {
  FARM_OPERATION: {
    modules: [
      'farm_management',
      'activities',
      'inventory',
      'analytics',
      'observations',
      'sensors',
      'crop_cycles',
      'areas',
      'seasons',
    ],
    capabilities: [
      'create_farms',
      'manage_crops',
      'track_activities',
      'view_analytics',
      'manage_inventory',
      'create_observations',
      'view_sensors',
      'manage_seasons',
    ],
    marketplaceAccess: false,
    tradingAccess: false,
    farmManagement: true,
  },

  COMMODITY_TRADER: {
    modules: [
      'marketplace',
      'orders',
      'trading',
      'analytics',
      'inventory',
      'deliveries',
    ],
    capabilities: [
      'browse_commodities',
      'create_orders',
      'manage_trades',
      'view_market_analytics',
      'negotiate_prices',
      'track_deliveries',
      'manage_inventory',
    ],
    marketplaceAccess: true,
    tradingAccess: true,
    farmManagement: false,
  },

  LOGISTICS_PROVIDER: {
    modules: ['deliveries', 'tracking', 'orders', 'drivers'],
    capabilities: [
      'manage_deliveries',
      'track_shipments',
      'view_orders',
      'manage_drivers',
      'update_delivery_status',
      'upload_delivery_proof',
    ],
    marketplaceAccess: false,
    tradingAccess: false,
    farmManagement: false,
  },

  INTEGRATED_FARM: {
    modules: [
      'farm_management',
      'marketplace',
      'orders',
      'trading',
      'activities',
      'inventory',
      'analytics',
      'observations',
      'sensors',
      'crop_cycles',
      'areas',
      'seasons',
      'deliveries',
    ],
    capabilities: [
      'create_farms',
      'manage_crops',
      'track_activities',
      'view_analytics',
      'browse_commodities',
      'create_orders',
      'manage_trades',
      'view_market_analytics',
      'negotiate_prices',
      'track_deliveries',
      'manage_inventory',
      'create_observations',
      'view_sensors',
      'manage_seasons',
    ],
    marketplaceAccess: true,
    tradingAccess: true,
    farmManagement: true,
  },
};

// Helper function to get allowed modules for an organization type
export function getAllowedModules(orgType: OrganizationType): string[] {
  return ORGANIZATION_FEATURES[orgType].modules;
}

// Helper function to check if org type has access to a module
export function hasModuleAccess(
  orgType: OrganizationType,
  module: string,
): boolean {
  return ORGANIZATION_FEATURES[orgType].modules.includes(module);
}

// Helper function to check if org type has a capability
export function hasCapability(
  orgType: OrganizationType,
  capability: string,
): boolean {
  return ORGANIZATION_FEATURES[orgType].capabilities.includes(capability);
}

// Helper function to initialize organization features on creation
export function initializeOrganizationFeatures(
  orgType: OrganizationType,
  plan: string = 'basic',
): {
  allowedModules: string[];
  features: string[];
} {
  const config = ORGANIZATION_FEATURES[orgType];

  // Base features based on plan
  const planFeatures = getPlanFeatures(plan);

  // Filter modules based on plan
  const allowedModules = config.modules.filter((module) =>
    planFeatures.includes(module),
  );

  return {
    allowedModules,
    features: planFeatures,
  };
}

// Plan-based feature limits
function getPlanFeatures(plan: string): string[] {
  const planFeatureMap: Record<string, string[]> = {
    basic: [
      'farm_management',
      'activities',
      'marketplace',
      'orders',
      'deliveries',
    ],
    professional: [
      'farm_management',
      'activities',
      'inventory',
      'analytics',
      'marketplace',
      'orders',
      'trading',
      'deliveries',
      'observations',
      'crop_cycles',
    ],
    enterprise: [
      'farm_management',
      'activities',
      'inventory',
      'analytics',
      'marketplace',
      'orders',
      'trading',
      'deliveries',
      'observations',
      'sensors',
      'crop_cycles',
      'areas',
      'seasons',
      'drivers',
      'tracking',
    ],
  };

  return planFeatureMap[plan] || planFeatureMap.basic;
}