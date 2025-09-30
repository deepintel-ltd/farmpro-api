import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Order Supplier Guard
 *
 * Verifies that the current user's organization is the supplier of the order.
 * Used for operations that require supplier access:
 * - Start fulfillment
 * - Complete order
 * - Update fulfillment status
 * - Add fulfillment notes
 */
@Injectable()
export class OrderSupplierGuard implements CanActivate {
  private readonly logger = new Logger(OrderSupplierGuard.name);

  constructor(private readonly ordersService: OrdersService) {}

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
      order = await this.ordersService.findOrderById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        throw new NotFoundException('Order not found');
      }
    }

    // Platform admins can access any order
    if (user.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} accessing order ${orderId}`);
      request.order = order;
      return true;
    }

    // Check if user's organization is the supplier
    if (order.supplierOrgId !== user.organizationId) {
      this.logger.warn(
        `User ${user.userId} from org ${user.organizationId} attempted to access order ${orderId} as supplier (supplier org: ${order.supplierOrgId})`,
      );
      throw new ForbiddenException('Only supplier can perform this action');
    }

    // Attach order to request to avoid re-querying
    request.order = order;

    this.logger.debug(`User ${user.email} verified as supplier for order ${orderId}`);
    return true;
  }
}
