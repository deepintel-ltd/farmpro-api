import { Injectable } from '@nestjs/common';
import { BaseOrderGuard } from './base-order.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Order Supplier Guard
 *
 * Verifies that the user's organization is the supplier of the order.
 *
 * Used for operations that require supplier access:
 * - Start fulfillment
 * - Complete order
 * - Update fulfillment status
 * - Add fulfillment notes
 * - Make counter offers
 */
@Injectable()
export class OrderSupplierGuard extends BaseOrderGuard {
  protected checkAccess(user: CurrentUser, order: any): boolean {
    return order.supplierOrgId === user.organizationId;
  }

  protected getErrorMessage(): string {
    return 'Only supplier can perform this action';
  }
}