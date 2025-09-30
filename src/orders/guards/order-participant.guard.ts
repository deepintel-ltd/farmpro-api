import { Injectable } from '@nestjs/common';
import { BaseOrderGuard } from './base-order.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

/**
 * Order Participant Guard
 *
 * Verifies that the user's organization is either the buyer or supplier of the order.
 *
 * Used for operations that require order participation:
 * - View order details
 * - Accept order
 * - Reject order
 * - Send messages
 * - View messages
 * - Create disputes
 * - View documents
 */
@Injectable()
export class OrderParticipantGuard extends BaseOrderGuard {
  protected checkAccess(user: CurrentUser, order: any): boolean {
    return (
      order.buyerOrgId === user.organizationId ||
      order.supplierOrgId === user.organizationId
    );
  }

  protected getErrorMessage(): string {
    return 'Access denied to this order';
  }
}