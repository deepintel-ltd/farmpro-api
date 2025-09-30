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
 * Order Supplier Guard
 *
 * Verifies that the current user's organization is the supplier.
 * Used for operations that only the supplier can perform:
 * - Start fulfillment
 * - Update fulfillment status
 * - Complete order
 * - Add delivery information
 */
@Injectable()
export class OrderSupplierGuard implements CanActivate {
  private readonly logger = new Logger(OrderSupplierGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    const orderId = request.params.id || request.params.orderId;

    if (!orderId) {
      this.logger.warn('Order ID not found in request params');
      throw new ForbiddenException('Order ID is required');
    }

    // Check if order is already attached to request by previous guard
    let order = request.order;

    if (!order) {
      order = await this.prisma.order.findUnique({
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
    }

    // Platform admins can access any order
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing order ${orderId}`);
      request.order = order;
      return true;
    }

    // Check if supplier org ID is set
    if (!order.supplierOrgId) {
      this.logger.warn(`Order ${orderId} has no supplier assigned yet`);
      throw new ForbiddenException('Order has no supplier assigned');
    }

    // Check if user's organization is the supplier
    if (order.supplierOrgId !== user.organizationId) {
      this.logger.warn(
        `User ${user.userId} from org ${user.organizationId} attempted supplier action on order ${orderId} (supplier: ${order.supplierOrgId})`,
      );
      throw new ForbiddenException('Only the supplier can perform this action');
    }

    // Attach order to request
    request.order = order;

    this.logger.debug(
      `User ${user.email} verified as supplier for order ${orderId}`,
    );
    return true;
  }
}