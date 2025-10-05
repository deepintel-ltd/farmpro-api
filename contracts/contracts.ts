// Import domain-specific contracts
import { farmContract, type FarmContract } from './farms.contract';
import {
  commodityContract,
  type CommodityContract,
} from './commodities.contract';
import { ordersCrudContract, type OrdersCrudContract } from './orders-crud.contract';
import { ordersMarketplaceContract, type OrdersMarketplaceContract } from './orders-marketplace.contract';
import { ordersMessagingContract, type OrdersMessagingContract } from './orders-messaging.contract';
import { ordersAnalyticsContract, type OrdersAnalyticsContract } from './orders-analytics.contract';
import { ordersDisputesContract, type OrdersDisputesContract } from './orders-disputes.contract';
import { ordersRelationshipsContract, type OrdersRelationshipsContract } from './orders-relationships.contract';
import { userContract, type UserContract } from './users.contract';
import { authContract, type AuthContract } from './auth.contract';
import { healthContract, type HealthContract } from './health.contract';
import { inventoryContract, type InventoryContract } from './inventory.contract';
import { organizationContract, type OrganizationContract } from './organizations.contract';
import { analyticsContract, type AnalyticsContract } from './analytics.contract';
import { marketContract, type MarketContract } from './market.contract';
import { intelligenceContract, type IntelligenceContract } from './intelligence.contract';
import { billingContract, type BillingContract } from './billing.contract';
import { platformAdminContract, type PlatformAdminContract } from './platform-admin.contract';
import { activitiesCrudContract } from './activities-crud.contract';
import { activitiesExecutionContract } from './activities-execution.contract';
import { activitiesTemplatesContract } from './activities-templates.contract';
import { activitiesSchedulingContract } from './activities-scheduling.contract';
import { activitiesTeamContract } from './activities-team.contract';
import { activitiesCostsContract } from './activities-costs.contract';
import { activitiesMediaContract } from './activities-media.contract';
import { activitiesAnalyticsContract } from './activities-analytics.contract';
import { mobileFieldContract } from './mobile-field.contract';
import { weatherContract, type WeatherContract } from './weather.contract';
import { transactionsContract, type TransactionsContract } from './transactions.contract';

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
  ordersCrud: typeof ordersCrudContract;
  ordersMarketplace: typeof ordersMarketplaceContract;
  ordersMessaging: typeof ordersMessagingContract;
  ordersAnalytics: typeof ordersAnalyticsContract;
  ordersDisputes: typeof ordersDisputesContract;
  ordersRelationships: typeof ordersRelationshipsContract;
  users: typeof userContract;
  auth: typeof authContract;
  inventory: typeof inventoryContract;
  organizations: typeof organizationContract;
  analytics: typeof analyticsContract;
  market: typeof marketContract;
  intelligence: typeof intelligenceContract;
  billing: typeof billingContract;
  platformAdmin: typeof platformAdminContract;
  activitiesCrud: typeof activitiesCrudContract;
  activitiesExecution: typeof activitiesExecutionContract;
  activitiesTemplates: typeof activitiesTemplatesContract;
  activitiesScheduling: typeof activitiesSchedulingContract;
  activitiesTeam: typeof activitiesTeamContract;
  activitiesCosts: typeof activitiesCostsContract;
  activitiesMedia: typeof activitiesMediaContract;
  activitiesAnalytics: typeof activitiesAnalyticsContract;
  mobile: typeof mobileFieldContract;
  weather: typeof weatherContract;
  transactions: typeof transactionsContract;
  health: typeof healthContract;
}

// Create the contract with explicit typing
export const apiContract: ApiContractDefinition = c.router({
  farms: farmContract,
  commodities: commodityContract,
  ordersCrud: ordersCrudContract,
  ordersMarketplace: ordersMarketplaceContract,
  ordersMessaging: ordersMessagingContract,
  ordersAnalytics: ordersAnalyticsContract,
  ordersDisputes: ordersDisputesContract,
  ordersRelationships: ordersRelationshipsContract,
  users: userContract,
  auth: authContract,
  inventory: inventoryContract,
  organizations: organizationContract,
  analytics: analyticsContract,
  market: marketContract,
  intelligence: intelligenceContract,
  billing: billingContract,
  platformAdmin: platformAdminContract,
  activitiesCrud: activitiesCrudContract,
  activitiesExecution: activitiesExecutionContract,
  activitiesTemplates: activitiesTemplatesContract,
  activitiesScheduling: activitiesSchedulingContract,
  activitiesTeam: activitiesTeamContract,
  activitiesCosts: activitiesCostsContract,
  activitiesMedia: activitiesMediaContract,
  activitiesAnalytics: activitiesAnalyticsContract,
  mobile: mobileFieldContract,
  weather: weatherContract,
  transactions: transactionsContract,
  health: healthContract,
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
export type OrdersCrudEndpoints = ApiContractType['ordersCrud'];
export type OrdersMarketplaceEndpoints = ApiContractType['ordersMarketplace'];
export type OrdersMessagingEndpoints = ApiContractType['ordersMessaging'];
export type OrdersAnalyticsEndpoints = ApiContractType['ordersAnalytics'];
export type OrdersDisputesEndpoints = ApiContractType['ordersDisputes'];
export type OrdersRelationshipsEndpoints = ApiContractType['ordersRelationships'];
export type UserEndpoints = ApiContractType['users'];
export type AuthEndpoints = ApiContractType['auth'];
export type InventoryEndpoints = ApiContractType['inventory'];
export type OrganizationEndpoints = ApiContractType['organizations'];
export type AnalyticsEndpoints = ApiContractType['analytics'];
export type MarketEndpoints = ApiContractType['market'];
export type IntelligenceEndpoints = ApiContractType['intelligence'];
export type BillingEndpoints = ApiContractType['billing'];
export type PlatformAdminEndpoints = ApiContractType['platformAdmin'];
export type MobileEndpoints = ApiContractType['mobile'];
export type WeatherEndpoints = ApiContractType['weather'];
export type TransactionsEndpoints = ApiContractType['transactions'];

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
      ordersCrud: Object.keys(ordersCrudContract),
      ordersMarketplace: Object.keys(ordersMarketplaceContract),
      ordersMessaging: Object.keys(ordersMessagingContract),
      ordersAnalytics: Object.keys(ordersAnalyticsContract),
      ordersDisputes: Object.keys(ordersDisputesContract),
      ordersRelationships: Object.keys(ordersRelationshipsContract),
      users: Object.keys(userContract),
      auth: Object.keys(authContract),
      inventory: Object.keys(inventoryContract),
      organizations: Object.keys(organizationContract),
      analytics: Object.keys(analyticsContract),
      market: Object.keys(marketContract),
      intelligence: Object.keys(intelligenceContract),
      billing: Object.keys(billingContract),
      platformAdmin: Object.keys(platformAdminContract),
      mobile: Object.keys(mobileFieldContract),
      weather: Object.keys(weatherContract),
      transactions: Object.keys(transactionsContract),
    },
  };
}

// =============================================================================
// Re-export Domain Contracts
// =============================================================================

export {
  farmContract,
  commodityContract,
  ordersCrudContract,
  ordersMarketplaceContract,
  ordersMessagingContract,
  ordersAnalyticsContract,
  ordersDisputesContract,
  ordersRelationshipsContract,
  userContract,
  authContract,
  healthContract,
  inventoryContract,
  organizationContract,
  analyticsContract,
  marketContract,
  intelligenceContract,
  billingContract,
  platformAdminContract,
  mobileFieldContract,
  weatherContract,
  transactionsContract,
};
export type {
  FarmContract,
  CommodityContract,
  OrdersCrudContract,
  OrdersMarketplaceContract,
  OrdersMessagingContract,
  OrdersAnalyticsContract,
  OrdersDisputesContract,
  OrdersRelationshipsContract,
  UserContract,
  AuthContract,
  HealthContract,
  InventoryContract,
  OrganizationContract,
  AnalyticsContract,
  MarketContract,
  IntelligenceContract,
  BillingContract,
  PlatformAdminContract,
  WeatherContract,
  TransactionsContract,
};
