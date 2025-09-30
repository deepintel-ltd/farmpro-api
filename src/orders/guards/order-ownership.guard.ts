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
 * Order Ownership Guard
 *
 * Verifies that the current user is the creator of the order.
 * Used for operations that require order ownership:
 * - Update order
 * - Delete order
 * - Publish order
 * - Cancel order
 */
@Injectable()
export class OrderOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OrderOwnershipGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    const orderId = request.params.id;

    if (!orderId) {
      this.logger.warn('Order ID not found in request params');
      throw new ForbiddenException('Order ID is required');
    }

    // Check if order is already attached to request
    let order = request.order;

    if (!order) {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerOrgId: true,
          supplierOrgId: true,
          createdById: true,
          status: true,
        },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        throw new ForbiddenException('Order not found');
      }
    }

    // Platform admins can access any order
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing order ${orderId}`);
      request.order = order;
      return true;
    }

    // Check if user is the creator of the order
    if (order.createdById !== user.userId) {
      this.logger.warn(
        `User ${user.userId} attempted to access order ${orderId} they did not create`,
      );
      throw new ForbiddenException('Only order creator can perform this action');
    }

    // Attach order to request to avoid re-querying
    request.order = order;

    this.logger.debug(`User ${user.email} verified as owner of order ${orderId}`);
    return true;
  }
}
