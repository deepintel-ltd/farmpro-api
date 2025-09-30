import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Order Marketplace Guard
 *
 * Verifies that the order exists and is published (available for marketplace operations).
 * Used for marketplace operations that don't require existing participation:
 * - Accept order (any organization can accept published orders)
 * - Make counter offers
 * - Browse marketplace orders
 */
@Injectable()
export class OrderMarketplaceGuard implements CanActivate {
  private readonly logger = new Logger(OrderMarketplaceGuard.name);

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
          metadata: true,
        },
      });

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

    // For marketplace operations, the order must be published (status CONFIRMED and isPublic in metadata)
    const metadata = order.metadata as any;
    const isPublished = order.status === 'CONFIRMED' && metadata?.isPublic === true;
    
    if (!isPublished) {
      this.logger.warn(
        `User ${user.userId} attempted to access unpublished order ${orderId} for marketplace operation`,
      );
      throw new ForbiddenException('Order is not published and not available for marketplace operations');
    }

    // Attach order to request to avoid re-querying
    request.order = order;

    this.logger.debug(`User ${user.email} verified marketplace access to order ${orderId}`);
    return true;
  }
}
