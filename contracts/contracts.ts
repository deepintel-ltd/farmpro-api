// Import domain-specific contracts
import { farmContract, type FarmContract } from './farms.contract';
import {
  commodityContract,
  type CommodityContract,
} from './commodities.contract';
import { orderContract, type OrderContract } from './orders.contract';
import { userContract, type UserContract } from './users.contract';
import { authContract, type AuthContract } from './auth.contract';
import { healthContract, type HealthContract } from './health.contract';
import { inventoryContract, type InventoryContract } from './inventory.contract';
import { organizationContract, type OrganizationContract } from './organizations.contract';
import { analyticsContract, type AnalyticsContract } from './analytics.contract';
import { marketContract, type MarketContract } from './market.contract';
import { intelligenceContract, type IntelligenceContract } from './intelligence.contract';
import { activitiesCrudContract } from './activities-crud.contract';
import { activitiesExecutionContract } from './activities-execution.contract';
import { activitiesTemplatesContract } from './activities-templates.contract';
import { activitiesSchedulingContract } from './activities-scheduling.contract';
import { activitiesTeamContract } from './activities-team.contract';
import { activitiesCostsContract } from './activities-costs.contract';
import { activitiesMediaContract } from './activities-media.contract';
import { activitiesAnalyticsContract } from './activities-analytics.contract';
import { mobileFieldContract } from './mobile-field.contract';

// Import common utilities
import { initContract } from '@ts-rest/core';
import {
  validateRequestBody,
  validateQueryParams,
  validatePathParams,
  validateResponse,
  ContractValidator,
} from './common';

const c = initContract();

// =============================================================================
// Main API Contract
// =============================================================================

export interface ApiContractDefinition {
  farms: typeof farmContract;
  commodities: typeof commodityContract;
  orders: typeof orderContract;
  users: typeof userContract;
  auth: typeof authContract;
  inventory: typeof inventoryContract;
  organizations: typeof organizationContract;
  analytics: typeof analyticsContract;
  market: typeof marketContract;
  intelligence: typeof intelligenceContract;
  activitiesCrud: typeof activitiesCrudContract;
  activitiesExecution: typeof activitiesExecutionContract;
  activitiesTemplates: typeof activitiesTemplatesContract;
  activitiesScheduling: typeof activitiesSchedulingContract;
  activitiesTeam: typeof activitiesTeamContract;
  activitiesCosts: typeof activitiesCostsContract;
  activitiesMedia: typeof activitiesMediaContract;
  activitiesAnalytics: typeof activitiesAnalyticsContract;
  mobile: typeof mobileFieldContract;
  health: typeof healthContract.health;
}

// Create the contract with explicit typing
export const apiContract: ApiContractDefinition = c.router({
  farms: farmContract,
  commodities: commodityContract,
  orders: orderContract,
  users: userContract,
  auth: authContract,
  inventory: inventoryContract,
  organizations: organizationContract,
  analytics: analyticsContract,
  market: marketContract,
  intelligence: intelligenceContract,
  activitiesCrud: activitiesCrudContract,
  activitiesExecution: activitiesExecutionContract,
  activitiesTemplates: activitiesTemplatesContract,
  activitiesScheduling: activitiesSchedulingContract,
  activitiesTeam: activitiesTeamContract,
  activitiesCosts: activitiesCostsContract,
  activitiesMedia: activitiesMediaContract,
  activitiesAnalytics: activitiesAnalyticsContract,
  mobile: mobileFieldContract,
  ...healthContract,
});

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Type-safe contract endpoint extractor
 */
export type ApiContractType = typeof apiContract;

/**
 * Extract endpoint types from contract
 */
export type FarmEndpoints = ApiContractType['farms'];
export type CommodityEndpoints = ApiContractType['commodities'];
export type OrderEndpoints = ApiContractType['orders'];
export type UserEndpoints = ApiContractType['users'];
export type AuthEndpoints = ApiContractType['auth'];
export type InventoryEndpoints = ApiContractType['inventory'];
export type OrganizationEndpoints = ApiContractType['organizations'];
export type AnalyticsEndpoints = ApiContractType['analytics'];
export type MarketEndpoints = ApiContractType['market'];
export type IntelligenceEndpoints = ApiContractType['intelligence'];
export type MobileEndpoints = ApiContractType['mobile'];

// Export contract type for use in NestJS controllers
export type { ApiContractType as ApiContract };

// =============================================================================
// Utility Exports
// =============================================================================

export {
  validateRequestBody,
  validateQueryParams,
  validatePathParams,
  validateResponse,
  ContractValidator,
};

// =============================================================================
// Contract Metadata
// =============================================================================

/**
 * Utility to extract contract metadata for documentation
 */
export function getContractMetadata() {
  return {
    version: '1.0.0',
    title: 'FarmPro API',
    description: 'JSON API compliant agricultural platform API',
    endpoints: {
      farms: Object.keys(farmContract),
      commodities: Object.keys(commodityContract),
      orders: Object.keys(orderContract),
      users: Object.keys(userContract),
      auth: Object.keys(authContract),
      inventory: Object.keys(inventoryContract),
      organizations: Object.keys(organizationContract),
      analytics: Object.keys(analyticsContract),
      market: Object.keys(marketContract),
      intelligence: Object.keys(intelligenceContract),
      mobile: Object.keys(mobileFieldContract),
    },
  };
}

// =============================================================================
// Re-export Domain Contracts
// =============================================================================

export {
  farmContract,
  commodityContract,
  orderContract,
  userContract,
  authContract,
  healthContract,
  inventoryContract,
  organizationContract,
  analyticsContract,
  marketContract,
  intelligenceContract,
  mobileFieldContract,
};
export type {
  FarmContract,
  CommodityContract,
  OrderContract,
  UserContract,
  AuthContract,
  HealthContract,
  InventoryContract,
  OrganizationContract,
  AnalyticsContract,
  MarketContract,
  IntelligenceContract,
};
