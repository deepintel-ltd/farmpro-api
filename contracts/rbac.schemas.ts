import { z } from 'zod';
import { JsonApiResourceSchema, JsonApiCollectionSchema } from './schemas';

// =============================================================================
// Base Schemas
// =============================================================================

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.string().nullable(),
  level: z.number(),
  isActive: z.boolean(),
  isSystemRole: z.boolean(),
  metadata: z.any().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userCount: z.number().optional(),
});

export const PermissionSchema = z.object({
  id: z.string(),
  resource: z.string(),
  action: z.string(),
  conditions: z.any().nullable(),
  description: z.string().nullable(),
  isSystemPermission: z.boolean(),
  createdAt: z.string(),
});

export const RolePermissionSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  permissionId: z.string(),
  granted: z.boolean(),
  conditions: z.any().nullable(),
  createdAt: z.string(),
  permission: PermissionSchema.optional(),
});

export const UserRoleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  roleId: z.string(),
  farmId: z.string().nullable(),
  isActive: z.boolean(),
  expiresAt: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.string(),
  role: RoleSchema.optional(),
});

// =============================================================================
// Request Schemas
// =============================================================================

// Role Management
export const CreateRoleRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  level: z.number().min(0).max(1000),
  permissions: z.array(z.object({
    permissionId: z.string(),
    granted: z.boolean(),
    conditions: z.any().nullable().optional(),
  })).optional(),
  metadata: z.any().nullable().optional(),
});

export const UpdateRoleRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  level: z.number().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().nullable().optional(),
});

// Permission Management
export const CreatePermissionRequestSchema = z.object({
  resource: z.string().min(1).max(255),
  action: z.string().min(1).max(255),
  conditions: z.any().nullable().optional(),
  description: z.string().optional(),
});

// Role Permission Assignment
export const AssignPermissionRequestSchema = z.object({
  permissionId: z.string(),
  granted: z.boolean(),
  conditions: z.any().nullable().optional(),
});

export const UpdateRolePermissionRequestSchema = z.object({
  granted: z.boolean(),
  conditions: z.any().nullable().optional(),
});

// User Role Assignment
export const AssignUserRoleRequestSchema = z.object({
  farmId: z.string().optional(),
  expiresAt: z.iso.datetime().optional(),
  metadata: z.any().nullable().optional(),
});

export const UpdateUserRoleRequestSchema = z.object({
  farmId: z.string().optional(),
  expiresAt: z.iso.datetime().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().nullable().optional(),
});

// Permission Checking
export const CheckPermissionRequestSchema = z.object({
  resource: z.string(),
  action: z.string(),
  resourceId: z.string().optional(),
  conditions: z.any().nullable().optional(),
});

export const CheckPermissionsRequestSchema = z.object({
  permissions: z.array(CheckPermissionRequestSchema),
});

// Role Templates
export const ApplyRoleTemplateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  customizations: z.object({
    permissions: z.array(z.object({
      permissionId: z.string(),
      granted: z.boolean(),
      conditions: z.any().nullable().optional(),
    })).optional(),
    metadata: z.any().nullable().optional(),
  }).optional(),
});

// Bulk Operations
export const BulkAssignRolesRequestSchema = z.object({
  userIds: z.array(z.string()).min(1),
  roleId: z.string(),
  farmId: z.string().optional(),
  expiresAt: z.iso.datetime().optional(),
});

export const BulkRemoveRolesRequestSchema = z.object({
  userIds: z.array(z.string()).min(1),
  roleId: z.string(),
  farmId: z.string().optional(),
});

export const BulkUpdatePermissionsRequestSchema = z.object({
  roleId: z.string(),
  permissions: z.array(z.object({
    permissionId: z.string(),
    granted: z.boolean(),
    conditions: z.any().nullable().optional(),
  })),
});

// =============================================================================
// Response Schemas
// =============================================================================

export const PermissionCheckResultSchema = z.object({
  resource: z.string(),
  action: z.string(),
  resourceId: z.string().nullable(),
  granted: z.boolean(),
  reason: z.string().optional(),
  matchedRole: z.string().optional(),
});

export const RoleTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  organizationType: z.string(),
  permissions: z.array(z.string()),
  level: z.number(),
});

export const RoleHierarchyNodeSchema: z.ZodType<any> = z.object({
  role: RoleSchema,
  children: z.array(z.lazy(() => RoleHierarchyNodeSchema)).optional(),
  parent: z.string().nullable(),
});

export const AccessAnalyticsSchema = z.object({
  period: z.string(),
  totalRequests: z.number(),
  successfulRequests: z.number(),
  deniedRequests: z.number(),
  topResources: z.array(z.object({
    resource: z.string(),
    count: z.number(),
  })),
  topActions: z.array(z.object({
    action: z.string(),
    count: z.number(),
  })),
});

export const BulkOperationResultSchema = z.object({
  successCount: z.number(),
  failureCount: z.number(),
  results: z.array(z.object({
    id: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

// =============================================================================
// JSON:API Resource Schemas
// =============================================================================

export const RoleResourceSchema = JsonApiResourceSchema(RoleSchema);

export const PermissionResourceSchema = JsonApiResourceSchema(PermissionSchema);

export const RolePermissionResourceSchema = JsonApiResourceSchema(RolePermissionSchema);

export const UserRoleResourceSchema = JsonApiResourceSchema(UserRoleSchema);

export const PermissionCheckResourceSchema = JsonApiResourceSchema(PermissionCheckResultSchema);

export const RoleTemplateResourceSchema = JsonApiResourceSchema(RoleTemplateSchema);

export const AccessAnalyticsResourceSchema = JsonApiResourceSchema(AccessAnalyticsSchema);

export const BulkOperationResourceSchema = JsonApiResourceSchema(BulkOperationResultSchema);

// =============================================================================
// Collection Schemas
// =============================================================================

export const RoleCollectionSchema = JsonApiCollectionSchema(RoleResourceSchema);
export const PermissionCollectionSchema = JsonApiCollectionSchema(PermissionResourceSchema);
export const RolePermissionCollectionSchema = JsonApiCollectionSchema(RolePermissionResourceSchema);
export const UserRoleCollectionSchema = JsonApiCollectionSchema(UserRoleResourceSchema);
export const PermissionCheckCollectionSchema = JsonApiCollectionSchema(PermissionCheckResourceSchema);
export const RoleTemplateCollectionSchema = JsonApiCollectionSchema(RoleTemplateResourceSchema);

// =============================================================================
// Query Parameter Schemas
// =============================================================================

export const RoleQueryParams = z.object({
  includeSystem: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  level: z.coerce.number().optional(),
  include: z.string().optional(),
  sort: z.string().optional(),
  'page[number]': z.coerce.number().int().positive().optional(),
  'page[size]': z.coerce.number().int().positive().max(100).optional(),
});

export const PermissionQueryParams = z.object({
  resource: z.string().optional(),
  action: z.string().optional(),
  isSystem: z.coerce.boolean().optional(),
  include: z.string().optional(),
  sort: z.string().optional(),
  'page[number]': z.coerce.number().int().positive().optional(),
  'page[size]': z.coerce.number().int().positive().max(100).optional(),
});

export const UserPermissionQueryParams = z.object({
  resource: z.string().optional(),
  farmId: z.string().optional(),
});

export const AnalyticsQueryParams = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  userId: z.string().optional(),
  resource: z.string().optional(),
  roleId: z.string().optional(),
});

export const RoleTemplateQueryParams = z.object({
  organizationType: z.string().optional(),
});
