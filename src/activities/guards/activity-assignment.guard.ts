import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Activity Assignment Guard
 *
 * Verifies that the current user is assigned to the activity.
 * Used for operations that require assignment:
 * - Start activity
 * - Complete activity
 * - Log progress
 * - Add notes
 * - Upload photos
 */
@Injectable()
export class ActivityAssignmentGuard implements CanActivate {
  private readonly logger = new Logger(ActivityAssignmentGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    const activityId = request.params.id || request.params.activityId;

    if (!activityId) {
      this.logger.warn('Activity ID not found in request params');
      throw new ForbiddenException('Activity ID is required');
    }

    // Fetch activity with assignment info
    const activity = await this.prisma.farmActivity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        farmId: true,
        createdById: true,
        status: true,
        farm: {
          select: {
            organizationId: true,
          },
        },
        assignments: {
          where: {
            userId: user.userId,
            isActive: true,
          },
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!activity) {
      this.logger.warn(`Activity ${activityId} not found`);
      throw new ForbiddenException('Activity not found');
    }

    // Platform admins can access any activity
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing activity ${activityId}`);
      request.activity = activity;
      return true;
    }

    // Check if activity belongs to user's organization
    if (activity.farm.organizationId !== user.organizationId) {
      this.logger.warn(
        `User ${user.userId} attempted to access activity ${activityId} from different org`,
      );
      throw new ForbiddenException('Access denied to this activity');
    }

    // Check if user is assigned to this activity
    const isAssigned = activity.assignments.length > 0;
    const isCreator = activity.createdById === user.userId;

    // Check if user has manager role (can access any activity in their org)
    const hasManagerRole = user.roles.some(role => role.level >= 50);

    if (!isAssigned && !isCreator && !hasManagerRole) {
      this.logger.warn(
        `User ${user.userId} attempted to access activity ${activityId} they are not assigned to`,
      );
      throw new ForbiddenException('Not assigned to this activity');
    }

    // Attach activity to request
    request.activity = activity;

    this.logger.debug(
      `User ${user.email} verified for activity ${activityId} (assigned: ${isAssigned}, creator: ${isCreator}, manager: ${hasManagerRole})`,
    );
    return true;
  }
}