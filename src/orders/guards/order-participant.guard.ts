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
 * Order Participant Guard
 *
 * Verifies that the current user's organization is either the buyer or supplier.
 * Used for operations that both parties can perform:
 * - View order details
 * - Send messages
 * - View documents
 * - Accept/reject order
 * - Create disputes
 */
@Injectable()
export class OrderParticipantGuard implements CanActivate {
  private readonly logger = new Logger(OrderParticipantGuard.name);

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

    // Check if user's organization is buyer or supplier
    const isParticipant =
      order.buyerOrgId === user.organizationId ||
      order.supplierOrgId === user.organizationId;

    if (!isParticipant) {
      this.logger.warn(
        `User ${user.userId} from org ${user.organizationId} attempted to access order ${orderId} they are not part of`,
      );
      throw new ForbiddenException('Access denied to this order');
    }

    // Attach order to request
    request.order = order;

    this.logger.debug(
      `User ${user.email} verified as participant in order ${orderId}`,
    );
    return true;
  }
}