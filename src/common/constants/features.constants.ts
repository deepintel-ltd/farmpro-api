/**
 * Type-safe Feature Definitions
 *
 * Centralized feature constants for organization-level feature access control.
 *
 * Usage:
 * @RequireFeature(FEATURES.ORDERS)
 * @Secured(FEATURES.MARKETPLACE)
 *
 * Benefits:
 * - Type safety: IDE autocomplete prevents typos
 * - Consistency: Same feature names across codebase
 * - Documentation: Self-documenting feature list
 */

export const FEATURES = {
  ORDERS: 'orders',
  FARMS: 'basic_farm_management',
  ACTIVITIES: 'basic_farm_management',
  INVENTORY: 'inventory',
  MARKETPLACE: 'marketplace',
  ANALYTICS: 'analytics',
  INTELLIGENCE: 'intelligence',
  MEDIA: 'media',
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  RBAC: 'rbac',
  WEATHER: 'weather_data',
} as const;

/**
 * Type helper for feature values
 */
export type Feature = typeof FEATURES[keyof typeof FEATURES];