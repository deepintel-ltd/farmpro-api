import { applyDecorators, UseGuards } from '@nestjs/common';
import { RequirePermission } from '@/common/decorators/authorization.decorators';
import { PERMISSIONS } from '@/common/constants';
import {
  OrderOwnershipGuard,
  OrderParticipantGuard,
  OrderSupplierGuard,
} from '../guards';

/**
 * Smart Authorization Decorators for Orders
 *
 * These decorators combine guards and permissions into single,
 * semantic decorators that make authorization intent clear.
 *
 * Benefits:
 * - Readability: Intent clear from decorator name
 * - Consistency: Same pattern for similar operations
 * - Maintainability: Changes in one place
 * - Less verbosity: 1 decorator instead of 2-3
 */

/**
 * Allows viewing order details
 * Requires: User's org is buyer OR supplier
 */
export const OrderView = () => {
  return applyDecorators(
    UseGuards(OrderParticipantGuard),
    RequirePermission(...PERMISSIONS.ORDERS.READ),
  );
};

/**
 * Allows creating new orders
 * No resource guard needed (no existing order)
 */
export const OrderCreate = () => {
  return applyDecorators(
    RequirePermission(...PERMISSIONS.ORDERS.CREATE),
  );
};

/**
 * Allows updating order details
 * Requires: User is the order creator
 */
export const OrderUpdate = () => {
  return applyDecorators(
    UseGuards(OrderOwnershipGuard),
    RequirePermission(...PERMISSIONS.ORDERS.UPDATE),
  );
};

/**
 * Allows deleting orders
 * Requires: User is the order creator
 */
export const OrderDelete = () => {
  return applyDecorators(
    UseGuards(OrderOwnershipGuard),
    RequirePermission(...PERMISSIONS.ORDERS.DELETE),
  );
};

/**
 * Allows supplier-only actions (fulfillment, completion, counter-offers)
 * Requires: User's org is the supplier
 */
export const SupplierAction = () => {
  return applyDecorators(
    UseGuards(OrderSupplierGuard),
    RequirePermission(...PERMISSIONS.ORDERS.UPDATE),
  );
};

/**
 * Allows order messaging
 * Requires: User's org is buyer OR supplier
 */
export const OrderMessage = () => {
  return applyDecorators(
    UseGuards(OrderParticipantGuard),
    RequirePermission(...PERMISSIONS.ORDERS.CREATE),
  );
};

/**
 * Allows viewing order messages
 * Requires: User's org is buyer OR supplier
 */
export const OrderMessageView = () => {
  return applyDecorators(
    UseGuards(OrderParticipantGuard),
    RequirePermission(...PERMISSIONS.ORDERS.READ),
  );
};