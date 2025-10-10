import { SetMetadata } from '@nestjs/common';

/**
 * Require a specific permission to access the route
 * @param resource - The resource name (e.g., 'farms', 'activities')
 * @param action - The action (e.g., 'read', 'create', 'update', 'delete')
 *
 * @example
 * @RequirePermission('farms', 'read')
 * async getFarms() { ... }
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata('permission', { resource, action });

/**
 * Require a specific feature to access the route
 * @param feature - The feature name (e.g., 'advanced_analytics', 'ai_insights')
 *
 * @example
 * @RequireFeature('advanced_analytics')
 * async getAdvancedAnalytics() { ... }
 */
export const RequireFeature = (feature: string) =>
  SetMetadata('feature', feature);

/**
 * Require a specific module to access the route
 * @param module - The module name (e.g., 'intelligence', 'api')
 *
 * @example
 * @RequireModule('intelligence')
 * async useIntelligence() { ... }
 */
export const RequireModule = (module: string) =>
  SetMetadata('module', module);
