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
 * Used for operations that only the order creator can perform:
 * - Update order details
 * - Delete/cancel order
 * - Publish order
 */
@Injectable()
export class OrderOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OrderOwnershipGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    const orderId = request.params.id || request.params.orderId;

    if (!orderId) {
      this.logger.warn('Order ID not found in request params');
      throw new ForbiddenException('Order ID is required');
    }

    // Fetch order with minimal fields for performance
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        createdById: true,
        buyerOrgId: true,
        supplierOrgId: true,
        status: true,
      },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found`);
      throw new ForbiddenException('Order not found');
    }

    // Platform admins can access any order
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing order ${orderId}`);
      request.order = order;
      return true;
    }

    // Check if user is the creator
    if (order.createdById !== user.userId) {
      this.logger.warn(
        `User ${user.userId} attempted to access order ${orderId} they did not create`,
      );
      throw new ForbiddenException('Only the order creator can perform this action');
    }

    // Attach order to request to avoid re-querying in controller/service
    request.order = order;

    this.logger.debug(`User ${user.email} verified as creator of order ${orderId}`);
    return true;
  }
}