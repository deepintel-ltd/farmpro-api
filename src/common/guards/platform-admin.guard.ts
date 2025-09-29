import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Platform Admin Guard
 *
 * Restricts access to platform administrators only.
 * Used for platform-level operations like managing organizations,
 * system settings, and viewing cross-organization data.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  private readonly logger = new Logger(PlatformAdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    if (!user.isPlatformAdmin) {
      this.logger.warn(
        `User ${user.email} attempted to access platform admin resource`,
      );
      throw new ForbiddenException(
        'This resource requires platform administrator privileges',
      );
    }

    this.logger.debug(
      `Platform admin ${user.email} accessing platform resource`,
    );

    return true;
  }
}