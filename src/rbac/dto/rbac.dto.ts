import { z } from 'zod';
import {
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
} from '../../../contracts/rbac.schemas';

// Export DTOs based on contract schemas
export type CreateRoleDto = z.infer<typeof CreateRoleRequestSchema>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleRequestSchema>;
export type CreatePermissionDto = z.infer<typeof CreatePermissionRequestSchema>;
export type AssignPermissionDto = z.infer<typeof AssignPermissionRequestSchema>;
export type UpdateRolePermissionDto = z.infer<typeof UpdateRolePermissionRequestSchema>;
export type AssignUserRoleDto = z.infer<typeof AssignUserRoleRequestSchema>;
export type UpdateUserRoleDto = z.infer<typeof UpdateUserRoleRequestSchema>;
export type CheckPermissionDto = z.infer<typeof CheckPermissionRequestSchema>;
export type CheckPermissionsDto = z.infer<typeof CheckPermissionsRequestSchema>;
export type ApplyRoleTemplateDto = z.infer<typeof ApplyRoleTemplateRequestSchema>;
export type BulkAssignRolesDto = z.infer<typeof BulkAssignRolesRequestSchema>;
export type BulkRemoveRolesDto = z.infer<typeof BulkRemoveRolesRequestSchema>;
export type BulkUpdatePermissionsDto = z.infer<typeof BulkUpdatePermissionsRequestSchema>;

// Additional internal DTOs
export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  level: number;
  isActive: boolean;
  isSystemRole: boolean;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Array<{
    id: string;
    roleId: string;
    permissionId: string;
    granted: boolean;
    conditions: any;
    permission: {
      id: string;
      resource: string;
      action: string;
      description: string | null;
    };
  }>;
  userCount?: number;
}

export interface PermissionCheckResult {
  resource: string;
  action: string;
  resourceId: string | null;
  granted: boolean;
  reason?: string;
  matchedRole?: string;
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  organizationType: string;
  permissions: string[];
  level: number;
}

export interface UserEffectivePermissions {
  userId: string;
  permissions: Array<{
    resource: string;
    action: string;
    granted: boolean;
    source: 'role' | 'direct';
    roleId?: string;
    conditions?: any;
  }>;
}