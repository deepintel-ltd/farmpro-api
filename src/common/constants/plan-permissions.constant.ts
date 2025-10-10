import { SubscriptionTier } from '@prisma/client';

export const PLAN_PERMISSIONS: Record<SubscriptionTier, string[]> = {
  FREE: [
    // Farm Management (limited)
    'farms:read',
    'farms:create', // Max 1 farm enforced by feature limit

    // Activities (basic)
    'activities:read',
    'activities:create',

    // Inventory (read-only)
    'inventory:read',

    // Marketplace (browse only)
    'marketplace:browse',

    // Media (limited)
    'media:read',
    'media:create', // Limited by storage quota
  ],

  BASIC: [
    // Farm Management (expanded)
    'farms:read',
    'farms:create', // Max 2 farms
    'farms:update',

    // Activities (full CRUD)
    'activities:read',
    'activities:create',
    'activities:update',
    'activities:delete',

    // Inventory (full CRUD)
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:delete',

    // Marketplace (read + browse)
    'marketplace:browse',
    'marketplace:read',

    // Orders (create only)
    'orders:read',
    'orders:create',

    // Analytics (basic)
    'analytics:read',

    // Media
    'media:read',
    'media:create',
    'media:update',
    'media:delete',
  ],

  PRO: [
    // All BASIC permissions plus:
    'farms:*', // Up to 5 farms
    'activities:*',
    'activities:assign',
    'activities:bulk_schedule',
    'inventory:*',
    'marketplace:*',
    'marketplace:create_listing',
    'marketplace:generate_contract',
    'orders:*',
    'analytics:*',
    'analytics:export',
    'intelligence:read',
    'intelligence:create',
    'api:access',
    'media:*',
    'users:read',
    'users:update',
    'organizations:read',
    'organizations:update',
  ],

  ENTERPRISE: [
    // Full access to everything
    '*:*',

    // Additional enterprise-only permissions
    'rbac:read',
    'rbac:create',
    'rbac:update',
    'rbac:delete',
    'organizations:export',
    'organizations:backup',
    'organizations:delete',
  ],
};

/**
 * Check if a permission matches a permission pattern
 * Supports wildcards: 'farms:*', '*:read', '*:*'
 */
export function matchesPermission(
  required: string,
  granted: string,
): boolean {
  if (granted === '*:*') return true;

  const [requiredResource, requiredAction] = required.split(':');
  const [grantedResource, grantedAction] = granted.split(':');

  if (grantedResource === '*') return true;
  if (requiredResource !== grantedResource) return false;

  if (grantedAction === '*') return true;
  return requiredAction === grantedAction;
}

/**
 * Get all permissions for a plan tier
 */
export function getPlanPermissions(tier: SubscriptionTier): string[] {
  return PLAN_PERMISSIONS[tier] || PLAN_PERMISSIONS.FREE;
}

/**
 * Check if a plan tier has a specific permission
 */
export function planHasPermission(
  tier: SubscriptionTier,
  resource: string,
  action: string,
): boolean {
  const permissions = getPlanPermissions(tier);
  const required = `${resource}:${action}`;

  return permissions.some(granted => matchesPermission(required, granted));
}
