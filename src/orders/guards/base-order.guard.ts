import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Base Order Guard
 *
 * Abstract base class for all order-related guards.
 * Handles common logic: fetching order, platform admin bypass, caching.
 * Subclasses only need to implement the specific access check.
 *
 * Benefits:
 * - DRY: Common code in one place
 * - Consistency: All order guards behave the same
 * - Maintainability: Bug fixes in one location
 * - Extensibility: Easy to add new order guards
 */
@Injectable()
export abstract class BaseOrderGuard implements CanActivate {
  constructor(protected readonly ordersService: OrdersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;
    const orderId = request.params.id;

    if (!orderId) {
      throw new ForbiddenException('Order ID is required');
    }

    // Fetch order with caching - reuse if already loaded by another guard
    let order = request.order;
    if (!order) {
      order = await this.ordersService.findOrderById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }
    }

    // Platform admins bypass all authorization checks
    if (user.isPlatformAdmin) {
      request.order = order;
      return true;
    }

    // Delegate to specific access check implemented by subclass
    if (!this.checkAccess(user, order)) {
      throw new ForbiddenException(this.getErrorMessage());
    }

    // Cache order for subsequent guards/handlers to avoid re-querying
    request.order = order;
    return true;
  }

  /**
   * Implement specific access check logic in subclass
   *
   * @param user - Current authenticated user
   * @param order - Order entity
   * @returns true if user has access, false otherwise
   */
  protected abstract checkAccess(user: CurrentUser, order: any): boolean;

  /**
   * Provide specific error message for this guard
   *
   * @returns Error message shown when access is denied
   */
  protected abstract getErrorMessage(): string;
}