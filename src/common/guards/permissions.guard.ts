import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { hasPermission } from '@/common/utils/permission.utils';

// Metadata keys for permission requirements
export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const REQUIRE_ROLE_KEY = 'requireRole';
export const REQUIRE_ROLE_LEVEL_KEY = 'requireRoleLevel';

export interface PermissionRequirement {
  resource: string;
  action: string;
}

export interface RoleRequirement {
  roleName: string;
  allowPlatformAdmin?: boolean;
}

/**
 * Permissions Guard
 *
 * Checks if user has required permissions based on their roles.
 * Supports both explicit permission checks and role-based checks.
 *
 * Platform admins can optionally bypass role checks.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Create context for scope validation
    const scopeContext = {
      organizationId: user.organizationId || undefined,
      farmId: request.params?.farmId || request.params?.id || undefined,
    };

    // Check required permission
    const requiredPermission = this.reflector.getAllAndOverride<
      PermissionRequirement
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (requiredPermission) {
      await this.checkPermission(user, requiredPermission, scopeContext);
    }

    // Check required role
    const requiredRole = this.reflector.getAllAndOverride<RoleRequirement>(
      REQUIRE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRole) {
      this.checkRole(user, requiredRole);
    }

    // Check required role level
    const requiredRoleLevel = this.reflector.getAllAndOverride<number>(
      REQUIRE_ROLE_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoleLevel !== undefined) {
      this.checkRoleLevel(user, requiredRoleLevel);
    }

    return true;
  }

  private async checkPermission(
    user: CurrentUser,
    requirement: PermissionRequirement,
    context?: { organizationId?: string; farmId?: string },
  ): Promise<void> {
    const permissionString = `${requirement.resource}:${requirement.action}`;

    // Platform admins have all permissions
    if (user.isPlatformAdmin) {
      this.logger.debug('Platform admin has all permissions');
      return;
    }

    // Use utility function with scope enforcement
    const hasRequiredPermission = await hasPermission({
      prisma: this.prisma,
      userId: user.userId,
      resource: requirement.resource,
      action: requirement.action,
      context,
    });

    if (!hasRequiredPermission) {
      this.logger.warn(
        `User ${user.email} missing permission '${permissionString}' or lacks proper scope`,
      );
      throw new ForbiddenException(
        `You do not have permission to ${requirement.action} ${requirement.resource}`,
      );
    }

    this.logger.debug(
      `User ${user.email} has permission '${permissionString}' with proper scope`,
    );
  }

  private checkRole(user: CurrentUser, requirement: RoleRequirement): void {
    // Platform admins bypass if allowed
    if (user.isPlatformAdmin && requirement.allowPlatformAdmin !== false) {
      this.logger.debug('Platform admin bypassing role check');
      return;
    }

    const hasRole = user.roles.some(
      (role) =>
        role.name.toLowerCase() === requirement.roleName.toLowerCase(),
    );

    if (!hasRole) {
      this.logger.warn(
        `User ${user.email} missing required role '${requirement.roleName}'`,
      );
      throw new ForbiddenException(
        `You must have the '${requirement.roleName}' role to access this resource`,
      );
    }

    this.logger.debug(
      `User ${user.email} has required role '${requirement.roleName}'`,
    );
  }

  private checkRoleLevel(user: CurrentUser, minimumLevel: number): void {
    // Platform admins have maximum level
    if (user.isPlatformAdmin) {
      this.logger.debug('Platform admin has maximum role level');
      return;
    }

    const maxUserLevel = Math.max(...user.roles.map((r) => r.level));

    if (maxUserLevel < minimumLevel) {
      this.logger.warn(
        `User ${user.email} role level ${maxUserLevel} below required ${minimumLevel}`,
      );
      throw new ForbiddenException(
        'Your role level is insufficient to access this resource',
      );
    }

    this.logger.debug(
      `User ${user.email} role level ${maxUserLevel} meets requirement ${minimumLevel}`,
    );
  }
}
