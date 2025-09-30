import { Controller, Logger, Request, Body, Query } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import { rbacContract } from '../../contracts/rbac.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { RbacService } from './rbac.service';
import {
  RequirePermission,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CheckPermissionDto,
  CheckPermissionsDto,
  BulkAssignRolesDto,
} from './dto/rbac.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@Secured(FEATURES.RBAC)
export class RbacController {
  private readonly logger = new Logger(RbacController.name);

  constructor(
    private readonly rbacService: RbacService,
  ) {}

  // =============================================================================
  // Role Management
  // =============================================================================

  @TsRestHandler(rbacContract.getRoles)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public getRoles(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.getRoles, async ({ query }) => {
      try {
        const result = await this.rbacService.getRoles(req.user, query);

        this.logger.log(`Retrieved roles for organization: ${req.user.organizationId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get roles failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          forbiddenMessage: 'Insufficient permissions to view roles',
          forbiddenCode: 'ROLE_READ_FORBIDDEN',
        });
      }
    });
  }

  @TsRestHandler(rbacContract.getRole)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public getRole(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.getRole, async ({ params }) => {
      try {
        const { roleId } = params;
        const result = await this.rbacService.getRole(roleId, req.user);

        this.logger.log(`Retrieved role: ${roleId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get role failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Role not found',
          notFoundCode: 'ROLE_NOT_FOUND',
          forbiddenMessage: 'Insufficient permissions to view role',
          forbiddenCode: 'ROLE_READ_FORBIDDEN',
        });
      }
    });
  }

  @TsRestHandler(rbacContract.createRole)
  @RequirePermission(...PERMISSIONS.RBAC.CREATE)
  @RequireRoleLevel(50)
  public createRole(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateRoleDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.createRole, async () => {
      try {
        const result = await this.rbacService.createRole(req.user, body);

        this.logger.log(`Created role: ${body.name} for organization: ${req.user.organizationId}`);
        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Create role failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          conflictMessage: 'Role name already exists',
          conflictCode: 'ROLE_NAME_EXISTS',
          forbiddenMessage: 'Insufficient permissions to create role',
          forbiddenCode: 'ROLE_CREATE_FORBIDDEN',
          badRequestMessage: 'Invalid role data',
          badRequestCode: 'INVALID_ROLE_DATA',
        });
      }
    });
  }

  @TsRestHandler(rbacContract.updateRole)
  @RequirePermission(...PERMISSIONS.RBAC.UPDATE)
  @RequireRoleLevel(50)
  public updateRole(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateRoleDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.updateRole, async ({ params }) => {
      try {
        const { roleId } = params;
        const result = await this.rbacService.updateRole(roleId, req.user, body);

        this.logger.log(`Updated role: ${roleId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update role failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Role not found',
          notFoundCode: 'ROLE_NOT_FOUND',
          forbiddenMessage: 'Cannot update system role or insufficient permissions',
          forbiddenCode: 'ROLE_UPDATE_FORBIDDEN',
          badRequestMessage: 'Invalid role data',
          badRequestCode: 'INVALID_ROLE_DATA',
        });
      }
    });
  }

  @TsRestHandler(rbacContract.deleteRole)
  @RequirePermission(...PERMISSIONS.RBAC.DELETE)
  @RequireRoleLevel(50)
  public deleteRole(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.deleteRole, async ({ params }) => {
      try {
        const { roleId } = params;
        const result = await this.rbacService.deleteRole(roleId, req.user);

        this.logger.log(`Deleted role: ${roleId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Delete role failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Role not found',
          notFoundCode: 'ROLE_NOT_FOUND',
          forbiddenMessage: 'Cannot delete system role or role in use',
          forbiddenCode: 'ROLE_DELETE_FORBIDDEN',
          badRequestMessage: 'Role cannot be deleted - users are assigned',
          badRequestCode: 'ROLE_IN_USE',
        });
      }
    });
  }

  // =============================================================================
  // Permission Management
  // =============================================================================

  @TsRestHandler(rbacContract.getPermissions)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public getPermissions(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.getPermissions, async () => {
      try {
        const result = await this.rbacService.getPermissions(req.user, query);

        this.logger.log(`Retrieved permissions`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get permissions failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          forbiddenMessage: 'Insufficient permissions to view permissions',
          forbiddenCode: 'PERMISSION_READ_FORBIDDEN',
        });
      }
    });
  }

  // =============================================================================
  // Permission Checking & Authorization
  // =============================================================================

  @TsRestHandler(rbacContract.checkPermission)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public checkPermission(
    @Request() req: AuthenticatedRequest,
    @Body() body: CheckPermissionDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.checkPermission, async () => {
      try {
        const result = await this.rbacService.checkPermission(req.user, body);

        this.logger.log(`Permission check: ${body.resource}:${body.action} for user: ${req.user.userId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Permission check failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid permission check request',
          badRequestCode: 'INVALID_PERMISSION_CHECK',
        });
      }
    });
  }

  @TsRestHandler(rbacContract.checkPermissions)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public checkPermissions(
    @Request() req: AuthenticatedRequest,
    @Body() body: CheckPermissionsDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.checkPermissions, async () => {
      try {
        const result = await this.rbacService.checkPermissions(req.user, body);

        this.logger.log(`Batch permission check for ${body.permissions.length} permissions`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Batch permission check failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid permissions check request',
          badRequestCode: 'INVALID_PERMISSIONS_CHECK',
        });
      }
    });
  }

  @TsRestHandler(rbacContract.getCurrentUserPermissions)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public getCurrentUserPermissions(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.getCurrentUserPermissions, async () => {
      try {
        const result = await this.rbacService.getCurrentUserPermissions(req.user, query);

        this.logger.log(`Retrieved permissions for user: ${req.user.userId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get user permissions failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve user permissions',
          badRequestCode: 'USER_PERMISSIONS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // User Role Management
  // =============================================================================

  @TsRestHandler(rbacContract.getUserRoles)
  @RequirePermission(...PERMISSIONS.RBAC.READ)
  public getUserRoles(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.getUserRoles, async ({ params }) => {
      try {
        const { userId } = params;
        const result = await this.rbacService.getUserRoles(userId, req.user);

        this.logger.log(`Retrieved roles for user: ${userId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get user roles failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'User not found',
          notFoundCode: 'USER_NOT_FOUND',
          forbiddenMessage: 'Insufficient permissions to view user roles',
          forbiddenCode: 'USER_ROLES_READ_FORBIDDEN',
        });
      }
    });
  }

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  @TsRestHandler(rbacContract.bulkAssignRoles)
  @RequirePermission(...PERMISSIONS.RBAC.UPDATE)
  @RequireRoleLevel(50)
  public bulkAssignRoles(
    @Request() req: AuthenticatedRequest,
    @Body() body: BulkAssignRolesDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(rbacContract.bulkAssignRoles, async () => {
      try {
        const result = await this.rbacService.bulkAssignRoles(req.user, body);

        this.logger.log(`Bulk assigned role ${body.roleId} to ${body.userIds.length} users`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Bulk assign roles failed:`, error);
        return ErrorResponseUtil.handleCommonError(error, {
          forbiddenMessage: 'Insufficient permissions to assign roles',
          forbiddenCode: 'ROLE_ASSIGN_FORBIDDEN',
          badRequestMessage: 'Invalid bulk assignment data',
          badRequestCode: 'INVALID_BULK_ASSIGNMENT',
        });
      }
    });
  }
}
