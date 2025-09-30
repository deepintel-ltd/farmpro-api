/**
 * Type-safe Permission Definitions
 *
 * Centralized permission constants to prevent typos and improve maintainability.
 *
 * Usage:
 * @RequirePermission(...PERMISSIONS.ORDERS.READ)
 *
 * Benefits:
 * - Type safety: IDE autocomplete and error checking
 * - Consistency: Same permissions across codebase
 * - Refactoring: Easy to rename permissions
 * - Documentation: Self-documenting permission structure
 */

export const PERMISSIONS = {
  ORDERS: {
    READ: ['orders', 'read'] as const,
    CREATE: ['orders', 'create'] as const,
    UPDATE: ['orders', 'update'] as const,
    DELETE: ['orders', 'delete'] as const,
  },

  FARMS: {
    READ: ['farms', 'read'] as const,
    CREATE: ['farms', 'create'] as const,
    UPDATE: ['farms', 'update'] as const,
    DELETE: ['farms', 'delete'] as const,
  },

  ACTIVITIES: {
    READ: ['activities', 'read'] as const,
    CREATE: ['activities', 'create'] as const,
    UPDATE: ['activities', 'update'] as const,
    DELETE: ['activities', 'delete'] as const,
    EXECUTE: ['activities', 'execute'] as const,
    ASSIGN: ['activities', 'assign'] as const,
    BULK_SCHEDULE: ['activities', 'bulk_schedule'] as const,
  },

  INVENTORY: {
    READ: ['inventory', 'read'] as const,
    CREATE: ['inventory', 'create'] as const,
    UPDATE: ['inventory', 'update'] as const,
    DELETE: ['inventory', 'delete'] as const,
  },

  MARKETPLACE: {
    BROWSE: ['marketplace', 'browse'] as const,
    READ: ['marketplace', 'read'] as const,
    CREATE: ['marketplace', 'create'] as const,
    UPDATE: ['marketplace', 'update'] as const,
    DELETE: ['marketplace', 'delete'] as const,
    CREATE_LISTING: ['marketplace', 'create_listing'] as const,
    GENERATE_CONTRACT: ['marketplace', 'generate_contract'] as const,
  },

  ANALYTICS: {
    READ: ['analytics', 'read'] as const,
    EXPORT: ['analytics', 'export'] as const,
  },

  INTELLIGENCE: {
    READ: ['intelligence', 'read'] as const,
    CREATE: ['intelligence', 'create'] as const,
  },

  MEDIA: {
    READ: ['media', 'read'] as const,
    CREATE: ['media', 'create'] as const,
    UPDATE: ['media', 'update'] as const,
    DELETE: ['media', 'delete'] as const,
  },

  USERS: {
    READ: ['users', 'read'] as const,
    UPDATE: ['users', 'update'] as const,
  },

  ORGANIZATIONS: {
    READ: ['organizations', 'read'] as const,
    CREATE: ['organizations', 'create'] as const,
    UPDATE: ['organizations', 'update'] as const,
    DELETE: ['organizations', 'delete'] as const,
    EXPORT: ['organizations', 'export'] as const,
    BACKUP: ['organizations', 'backup'] as const,
  },

  RBAC: {
    READ: ['rbac', 'read'] as const,
    CREATE: ['rbac', 'create'] as const,
    UPDATE: ['rbac', 'update'] as const,
    DELETE: ['rbac', 'delete'] as const,
  },
} as const;

/**
 * Type helper for permission tuples
 */
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];