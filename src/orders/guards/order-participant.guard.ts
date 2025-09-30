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
 * Order Participant Guard
 *
 * Verifies that the current user's organization is either the buyer or supplier of the order.
 * Used for operations that require order participation:
 * - View order details
 * - Accept order
 * - Reject order
 * - Send messages
 * - Create disputes
 */
@Injectable()
export class OrderParticipantGuard implements CanActivate {
  private readonly logger = new Logger(OrderParticipantGuard.name);

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

    // Check if user's organization is a participant (buyer or supplier)
    const isParticipant =
      order.buyerOrgId === user.organizationId ||
      order.supplierOrgId === user.organizationId;

    if (!isParticipant) {
      this.logger.warn(
        `User ${user.userId} from org ${user.organizationId} attempted to access order ${orderId} they are not participating in`,
      );
      throw new ForbiddenException('Access denied to this order');
    }

    // Attach order to request to avoid re-querying
    request.order = order;

    this.logger.debug(
      `User ${user.email} verified as participant in order ${orderId} (buyer: ${order.buyerOrgId === user.organizationId}, supplier: ${order.supplierOrgId === user.organizationId})`,
    );
    return true;
  }
}
