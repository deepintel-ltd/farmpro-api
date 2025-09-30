import { Injectable } from '@nestjs/common';
import { BaseOrderGuard } from './base-order.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Order Ownership Guard
 *
 * Verifies that the current user is the creator of the order.
 *
 * Used for operations that require order ownership:
 * - Update order
 * - Delete order
 * - Publish order
 * - Confirm order
 * - Cancel order
 * - Add/update/delete order items
 */
@Injectable()
export class OrderOwnershipGuard extends BaseOrderGuard {
  protected checkAccess(user: CurrentUser, order: any): boolean {
    return order.createdById === user.userId;
  }

  protected getErrorMessage(): string {
    return 'Only order creator can perform this action';
  }
}