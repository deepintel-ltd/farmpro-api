/**
 * Type-safe Capability Definitions
 *
 * Capabilities are organization-type specific features that grant access
 * to certain operations based on the organization's business model.
 *
 * Usage:
 * @RequireCapability(CAPABILITIES.CREATE_ORDERS)
 *
 * Benefits:
 * - Type safety: Prevents capability name typos
 * - Documentation: Clear list of all system capabilities
 * - Consistency: Same capability names everywhere
 */

export const CAPABILITIES = {
  // Farm Management Capabilities
  CREATE_FARMS: 'create_farms',
  MANAGE_CROPS: 'manage_crops',
  TRACK_ACTIVITIES: 'track_activities',
  MANAGE_EQUIPMENT: 'manage_equipment',

  // Orders & Trading Capabilities
  CREATE_ORDERS: 'create_orders',
  ACCEPT_ORDERS: 'accept_orders',
  FULFILL_ORDERS: 'fulfill_orders',

  // Analytics Capabilities
  DATA_EXPORT: 'data_export',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CUSTOM_REPORTS: 'custom_reports',

  // Integration Capabilities
  API_ACCESS: 'api_access',
  WEBHOOK_ACCESS: 'webhook_access',

  // Marketplace Capabilities
  LIST_PRODUCTS: 'list_products',
  BROWSE_MARKETPLACE: 'browse_marketplace',
} as const;

/**
 * Type helper for capability values
 */
export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES];