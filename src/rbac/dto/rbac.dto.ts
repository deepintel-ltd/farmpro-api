import { z } from 'zod';
import {
  CreateRoleRequestSchema,
  UpdateRoleRequestSchema,
  CheckPermissionRequestSchema,
  CheckPermissionsRequestSchema,
  BulkAssignRolesRequestSchema,
} from '../../../contracts/rbac.schemas';

// Export DTOs based on contract schemas
export type CreateRoleDto = z.infer<typeof CreateRoleRequestSchema>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleRequestSchema>;
export type CheckPermissionDto = z.infer<typeof CheckPermissionRequestSchema>;
export type CheckPermissionsDto = z.infer<typeof CheckPermissionsRequestSchema>;
export type BulkAssignRolesDto = z.infer<typeof BulkAssignRolesRequestSchema>;

// Additional internal DTOs
export interface PermissionCheckResult {
  resource: string;
  action: string;
  resourceId: string | null;
  granted: boolean;
  reason?: string;
  matchedRole?: string;
}