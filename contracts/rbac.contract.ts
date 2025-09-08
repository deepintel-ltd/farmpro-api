import { initContract } from '@ts-rest/core';
import {
  // Request Schemas
  CreateRoleRequestSchema,
  UpdateRoleRequestSchema,
  CreatePermissionRequestSchema,
  AssignPermissionRequestSchema,
  UpdateRolePermissionRequestSchema,
  AssignUserRoleRequestSchema,
  UpdateUserRoleRequestSchema,
  CheckPermissionRequestSchema,
  CheckPermissionsRequestSchema,
  ApplyRoleTemplateRequestSchema,
  BulkAssignRolesRequestSchema,
  BulkRemoveRolesRequestSchema,
  BulkUpdatePermissionsRequestSchema,
  
  // Response Schemas
  RoleResourceSchema,
  PermissionResourceSchema,
  RolePermissionResourceSchema,
  UserRoleResourceSchema,
  PermissionCheckResourceSchema,
  RoleTemplateResourceSchema,
  AccessAnalyticsResourceSchema,
  BulkOperationResourceSchema,
  
  // Collection Schemas
  RoleCollectionSchema,
  PermissionCollectionSchema,
  RolePermissionCollectionSchema,
  UserRoleCollectionSchema,
  PermissionCheckCollectionSchema,
  RoleTemplateCollectionSchema,
  
  // Query Schemas
  RoleQueryParams,
  PermissionQueryParams,
  UserPermissionQueryParams,
  AnalyticsQueryParams,
  RoleTemplateQueryParams,
} from './rbac.schemas';
import { JsonApiErrorResponseSchema } from './schemas';
import { UuidPathParam } from './common';
import { z } from 'zod';

const c = initContract();

// =============================================================================
// RBAC Contract
// =============================================================================

export const rbacContract = c.router({
  // =============================================================================
  // Role Management
  // =============================================================================
  
  getRoles: {
    method: 'GET',
    path: '/rbac/roles',
    query: RoleQueryParams,
    responses: {
      200: RoleCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'List available roles for organization',
  },

  getRole: {
    method: 'GET',
    path: '/rbac/roles/:roleId',
    pathParams: z.object({
      roleId: z.string(),
    }),
    responses: {
      200: RoleResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get specific role details',
  },

  createRole: {
    method: 'POST',
    path: '/rbac/roles',
    body: CreateRoleRequestSchema,
    responses: {
      201: RoleResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create custom role',
  },

  updateRole: {
    method: 'PUT',
    path: '/rbac/roles/:roleId',
    pathParams: z.object({
      roleId: z.string(),
    }),
    body: UpdateRoleRequestSchema,
    responses: {
      200: RoleResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update role details',
  },

  deleteRole: {
    method: 'DELETE',
    path: '/rbac/roles/:roleId',
    pathParams: z.object({
      roleId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('roles'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete custom role',
  },

  // =============================================================================
  // Permission Management
  // =============================================================================

  getPermissions: {
    method: 'GET',
    path: '/rbac/permissions',
    query: PermissionQueryParams,
    responses: {
      200: PermissionCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'List all available permissions',
  },

  getPermissionResources: {
    method: 'GET',
    path: '/rbac/permissions/resources',
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('resources'),
          attributes: z.object({
            name: z.string(),
            description: z.string().optional(),
            actions: z.array(z.string()),
          }),
        })),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get all resources that can have permissions',
  },

  createPermission: {
    method: 'POST',
    path: '/rbac/permissions',
    body: CreatePermissionRequestSchema,
    responses: {
      201: PermissionResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create custom permission (system admin only)',
  },

  // =============================================================================
  // Role Permission Assignment
  // =============================================================================

  getRolePermissions: {
    method: 'GET',
    path: '/rbac/roles/:roleId/permissions',
    pathParams: z.object({
      roleId: z.string(),
    }),
    responses: {
      200: RolePermissionCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get role permissions',
  },

  assignRolePermission: {
    method: 'POST',
    path: '/rbac/roles/:roleId/permissions',
    pathParams: z.object({
      roleId: z.string(),
    }),
    body: AssignPermissionRequestSchema,
    responses: {
      200: RolePermissionResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Assign permission to role',
  },

  updateRolePermission: {
    method: 'PUT',
    path: '/rbac/roles/:roleId/permissions/:permissionId',
    pathParams: z.object({
      roleId: z.string(),
      permissionId: z.string(),
    }),
    body: UpdateRolePermissionRequestSchema,
    responses: {
      200: RolePermissionResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update role permission',
  },

  removeRolePermission: {
    method: 'DELETE',
    path: '/rbac/roles/:roleId/permissions/:permissionId',
    pathParams: z.object({
      roleId: z.string(),
      permissionId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('role-permissions'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Remove permission from role',
  },

  // =============================================================================
  // User Role Management
  // =============================================================================

  getUserRoles: {
    method: 'GET',
    path: '/rbac/users/:userId/roles',
    pathParams: z.object({
      userId: z.string(),
    }),
    responses: {
      200: UserRoleCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get user roles with details',
  },

  assignUserRole: {
    method: 'POST',
    path: '/rbac/users/:userId/roles/:roleId',
    pathParams: z.object({
      userId: z.string(),
      roleId: z.string(),
    }),
    body: AssignUserRoleRequestSchema,
    responses: {
      200: UserRoleResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Assign role to user',
  },

  updateUserRole: {
    method: 'PUT',
    path: '/rbac/users/:userId/roles/:roleId',
    pathParams: z.object({
      userId: z.string(),
      roleId: z.string(),
    }),
    body: UpdateUserRoleRequestSchema,
    responses: {
      200: UserRoleResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update user role assignment',
  },

  removeUserRole: {
    method: 'DELETE',
    path: '/rbac/users/:userId/roles/:roleId',
    pathParams: z.object({
      userId: z.string(),
      roleId: z.string(),
    }),
    query: z.object({
      farmId: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('user-roles'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Remove role from user',
  },

  // =============================================================================
  // Permission Checking & Authorization
  // =============================================================================

  checkPermission: {
    method: 'POST',
    path: '/rbac/check-permission',
    body: CheckPermissionRequestSchema,
    responses: {
      200: PermissionCheckResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Check if user has specific permission',
  },

  checkPermissions: {
    method: 'POST',
    path: '/rbac/check-permissions',
    body: CheckPermissionsRequestSchema,
    responses: {
      200: PermissionCheckCollectionSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Batch check multiple permissions',
  },

  getCurrentUserPermissions: {
    method: 'GET',
    path: '/rbac/user-permissions',
    query: UserPermissionQueryParams,
    responses: {
      200: PermissionCollectionSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get all effective permissions for current user',
  },

  getUserPermissions: {
    method: 'GET',
    path: '/rbac/users/:userId/permissions',
    pathParams: z.object({
      userId: z.string(),
    }),
    query: UserPermissionQueryParams,
    responses: {
      200: PermissionCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get user effective permissions',
  },

  // =============================================================================
  // Role Templates & Presets
  // =============================================================================

  getRoleTemplates: {
    method: 'GET',
    path: '/rbac/role-templates',
    query: RoleTemplateQueryParams,
    responses: {
      200: RoleTemplateCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get role templates for quick setup',
  },

  applyRoleTemplate: {
    method: 'POST',
    path: '/rbac/role-templates/:templateId/apply',
    pathParams: z.object({
      templateId: z.string(),
    }),
    body: ApplyRoleTemplateRequestSchema,
    responses: {
      201: RoleResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create role from template',
  },

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  bulkAssignRoles: {
    method: 'POST',
    path: '/rbac/bulk/assign-roles',
    body: BulkAssignRolesRequestSchema,
    responses: {
      200: BulkOperationResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Assign roles to multiple users',
  },

  bulkRemoveRoles: {
    method: 'POST',
    path: '/rbac/bulk/remove-roles',
    body: BulkRemoveRolesRequestSchema,
    responses: {
      200: BulkOperationResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Remove roles from multiple users',
  },

  bulkUpdatePermissions: {
    method: 'POST',
    path: '/rbac/bulk/update-permissions',
    body: BulkUpdatePermissionsRequestSchema,
    responses: {
      200: BulkOperationResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update permissions for role',
  },
});