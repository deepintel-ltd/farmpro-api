import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
// Permission utils removed - using plan-based permissions now

/**
 * Farm Access Guard
 *
 * Verifies that the current user's organization owns the farm.
 * Used for operations that require farm ownership:
 * - View farm details
 * - Update farm information
 * - Create activities on farm
 * - Manage farm resources
 */
@Injectable()
export class FarmAccessGuard implements CanActivate {
  private readonly logger = new Logger(FarmAccessGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    const farmId = request.params.farmId || request.params.id;

    if (!farmId) {
      // No farm ID in params, skip check
      return true;
    }

    // Check if farm is already attached to request
    let farm = request.farm;

    if (!farm) {
      farm = await this.prisma.farm.findUnique({
        where: { id: farmId },
        select: {
          id: true,
          name: true,
          organizationId: true,
          isActive: true,
        },
      });

      if (!farm) {
        this.logger.warn(`Farm ${farmId} not found`);
        throw new ForbiddenException('Farm not found');
      }
    }

    // Platform admins can access any farm
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing farm ${farmId}`);
      request.farm = farm;
      return true;
    }

    // Check if farm belongs to user's organization
    if (farm.organizationId !== user.organizationId) {
      this.logger.warn(
        `User ${user.userId} from org ${user.organizationId} attempted to access farm ${farmId} (org: ${farm.organizationId})`,
      );
      throw new ForbiddenException('Access denied to this farm');
    }

    // Farm access is now determined by organization membership
    // No additional role-based checks needed with plan-based permissions

    // Check if farm is active (optional check)
    if (!farm.isActive) {
      this.logger.warn(`User ${user.userId} attempted to access inactive farm ${farmId}`);
      throw new ForbiddenException('This farm is inactive');
    }

    // Attach farm to request
    request.farm = farm;

    this.logger.debug(`User ${user.email} verified for farm ${farmId}`);
    return true;
  }
}
