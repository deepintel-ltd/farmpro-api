import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserContextService } from '@/common/services/user-context.service';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(
    private reflector: Reflector,
    private userContextService: UserContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user context (cached)
    const userContext = await this.userContextService.getUserContext(
      user.userId,
    );

    // Platform admins bypass all checks
    if (userContext.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} bypassing auth checks`);
      request.userContext = userContext;
      return true;
    }

    // Check permission requirement
    const requiredPermission = this.reflector.get<{
      resource: string;
      action: string;
    }>('permission', context.getHandler());

    if (requiredPermission) {
      const { resource, action } = requiredPermission;
      if (!userContext.can(resource, action)) {
        this.logger.warn(
          `User ${user.email} denied ${resource}:${action} (plan: ${userContext.planTier})`,
        );
        throw new ForbiddenException(
          `Your plan (${userContext.planTier}) does not include permission to ${action} ${resource}`,
        );
      }
    }

    // Check feature requirement
    const requiredFeature = this.reflector.get<string>(
      'feature',
      context.getHandler(),
    );

    if (requiredFeature && !userContext.hasFeature(requiredFeature)) {
      this.logger.warn(
        `User ${user.email} denied feature '${requiredFeature}' (plan: ${userContext.planTier})`,
      );
      throw new ForbiddenException(
        `Your plan does not include the '${requiredFeature}' feature. Please upgrade to access this functionality.`,
      );
    }

    // Check module requirement
    const requiredModule = this.reflector.get<string>(
      'module',
      context.getHandler(),
    );

    if (requiredModule && !userContext.hasModule(requiredModule)) {
      this.logger.warn(
        `User ${user.email} denied module '${requiredModule}' (plan: ${userContext.planTier})`,
      );
      throw new ForbiddenException(
        `Your plan does not include the '${requiredModule}' module`,
      );
    }

    // Attach context to request for controllers to use
    request.userContext = userContext;

    return true;
  }
}
