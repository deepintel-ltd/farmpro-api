import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { orderContract } from '../../contracts/orders.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  // =============================================================================
  // Order CRUD Operations
  // =============================================================================

  @TsRestHandler(orderContract.getOrders)
  public getOrders(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrders, async ({ query }) => {
      try {
        const result = await this.ordersService.getOrders(req.user, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get orders failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve orders',
          'GET_ORDERS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(orderContract.getOrder)
  public getOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.getOrder(req.user, params.id);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve order',
          internalErrorCode: 'GET_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.createOrder)
  public createOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.createOrder, async ({ body }) => {
      try {
        const result = await this.ordersService.createOrder(req.user, body);

        this.logger.log(`Order created by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create order failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid order data',
          badRequestCode: 'INVALID_ORDER_DATA',
          internalErrorMessage: 'Failed to create order',
          internalErrorCode: 'CREATE_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.updateOrder)
  public updateOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.updateOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.updateOrder(req.user, params.id, body);

        this.logger.log(`Order ${params.id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Invalid order data',
          badRequestCode: 'INVALID_ORDER_DATA',
          internalErrorMessage: 'Failed to update order',
          internalErrorCode: 'UPDATE_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.deleteOrder)
  public deleteOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.deleteOrder, async ({ params }) => {
      try {
        await this.ordersService.deleteOrder(req.user, params.id);

        this.logger.log(`Order ${params.id} deleted by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: { message: 'Order deleted successfully' },
        };
      } catch (error: unknown) {
        this.logger.error(`Delete order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to delete order',
          internalErrorCode: 'DELETE_ORDER_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Order Lifecycle Management
  // =============================================================================

  @TsRestHandler(orderContract.publishOrder)
  public publishOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.publishOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.publishOrder(req.user, params.id);

        this.logger.log(`Order ${params.id} published by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Publish order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Order cannot be published',
          badRequestCode: 'ORDER_CANNOT_BE_PUBLISHED',
          internalErrorMessage: 'Failed to publish order',
          internalErrorCode: 'PUBLISH_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.acceptOrder)
  public acceptOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.acceptOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.acceptOrder(req.user, params.id, body);

        this.logger.log(`Order ${params.id} accepted by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Accept order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Order cannot be accepted',
          badRequestCode: 'ORDER_CANNOT_BE_ACCEPTED',
          internalErrorMessage: 'Failed to accept order',
          internalErrorCode: 'ACCEPT_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.rejectOrder)
  public rejectOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.rejectOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.rejectOrder(req.user, params.id, body);

        this.logger.log(`Order ${params.id} rejected by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Reject order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to reject order',
          internalErrorCode: 'REJECT_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.counterOffer)
  public counterOffer(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.counterOffer, async ({ params, body }) => {
      try {
        const result = await this.ordersService.counterOffer(req.user, params.id, body);

        this.logger.log(`Counter offer made for order ${params.id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Counter offer for order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to make counter offer',
          internalErrorCode: 'COUNTER_OFFER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.confirmOrder)
  public confirmOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.confirmOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.confirmOrder(req.user, params.id);

        this.logger.log(`Order ${params.id} confirmed by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Confirm order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Order cannot be confirmed',
          badRequestCode: 'ORDER_CANNOT_BE_CONFIRMED',
          internalErrorMessage: 'Failed to confirm order',
          internalErrorCode: 'CONFIRM_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.startFulfillment)
  public startFulfillment(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.startFulfillment, async ({ params, body }) => {
      try {
        const result = await this.ordersService.startFulfillment(req.user, params.id, body);

        this.logger.log(`Fulfillment started for order ${params.id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Start fulfillment for order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Fulfillment cannot be started',
          badRequestCode: 'FULFILLMENT_CANNOT_BE_STARTED',
          internalErrorMessage: 'Failed to start fulfillment',
          internalErrorCode: 'START_FULFILLMENT_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.completeOrder)
  public completeOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.completeOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.completeOrder(req.user, params.id, body);

        this.logger.log(`Order ${params.id} completed by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Complete order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Order cannot be completed',
          badRequestCode: 'ORDER_CANNOT_BE_COMPLETED',
          internalErrorMessage: 'Failed to complete order',
          internalErrorCode: 'COMPLETE_ORDER_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Order Item Management
  // =============================================================================

  @TsRestHandler(orderContract.getOrderItems)
  public getOrderItems(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrderItems, async ({ params }) => {
      try {
        const result = await this.ordersService.getOrderItems(req.user, params.id);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get order items for order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve order items',
          internalErrorCode: 'GET_ORDER_ITEMS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.addOrderItem)
  public addOrderItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.addOrderItem, async ({ params, body }) => {
      try {
        const result = await this.ordersService.addOrderItem(req.user, params.id, body);

        this.logger.log(`Item added to order ${params.id} by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Add item to order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Invalid item data',
          badRequestCode: 'INVALID_ITEM_DATA',
          internalErrorMessage: 'Failed to add item to order',
          internalErrorCode: 'ADD_ORDER_ITEM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.updateOrderItem)
  public updateOrderItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.updateOrderItem, async ({ params, body }) => {
      try {
        const result = await this.ordersService.updateOrderItem(
          req.user, 
          params.id, 
          params.itemId, 
          body
        );

        this.logger.log(`Item ${params.itemId} updated in order ${params.id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update item ${params.itemId} in order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order or item not found',
          notFoundCode: 'ORDER_OR_ITEM_NOT_FOUND',
          badRequestMessage: 'Invalid item data',
          badRequestCode: 'INVALID_ITEM_DATA',
          internalErrorMessage: 'Failed to update order item',
          internalErrorCode: 'UPDATE_ORDER_ITEM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.deleteOrderItem)
  public deleteOrderItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.deleteOrderItem, async ({ params }) => {
      try {
        await this.ordersService.deleteOrderItem(req.user, params.id, params.itemId);

        this.logger.log(`Item ${params.itemId} deleted from order ${params.id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: { message: 'Item deleted successfully' },
        };
      } catch (error: unknown) {
        this.logger.error(`Delete item ${params.itemId} from order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order or item not found',
          notFoundCode: 'ORDER_OR_ITEM_NOT_FOUND',
          internalErrorMessage: 'Failed to delete order item',
          internalErrorCode: 'DELETE_ORDER_ITEM_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Order Search & Discovery
  // =============================================================================

  @TsRestHandler(orderContract.getMarketplaceOrders)
  public getMarketplaceOrders(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getMarketplaceOrders, async ({ query }) => {
      try {
        const result = await this.ordersService.getMarketplaceOrders(req.user, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get marketplace orders failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve marketplace orders',
          'GET_MARKETPLACE_ORDERS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(orderContract.getMarketplaceOrder)
  public getMarketplaceOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getMarketplaceOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.getMarketplaceOrder(req.user, params.id);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get marketplace order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Marketplace order not found',
          notFoundCode: 'MARKETPLACE_ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve marketplace order',
          internalErrorCode: 'GET_MARKETPLACE_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.searchOrders)
  public searchOrders(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.searchOrders, async ({ body }) => {
      try {
        const result = await this.ordersService.searchOrders(req.user, body);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Search orders failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to search orders',
          'SEARCH_ORDERS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(orderContract.getOrderRecommendations)
  public getOrderRecommendations(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrderRecommendations, async ({ query }) => {
      try {
        const result = await this.ordersService.getOrderRecommendations(req.user, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get order recommendations failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve order recommendations',
          'GET_ORDER_RECOMMENDATIONS_FAILED',
        );
      }
    });
  }

  // =============================================================================
  // Order Communication
  // =============================================================================

  @TsRestHandler(orderContract.getOrderMessages)
  public getOrderMessages(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrderMessages, async ({ params, query }) => {
      try {
        const result = await this.ordersService.getOrderMessages(req.user, params.id, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get messages for order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve order messages',
          internalErrorCode: 'GET_ORDER_MESSAGES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.sendOrderMessage)
  public sendOrderMessage(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.sendOrderMessage, async ({ params, body }) => {
      try {
        const result = await this.ordersService.sendOrderMessage(req.user, params.id, body);

        this.logger.log(`Message sent for order ${params.id} by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Send message for order ${params.id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Invalid message data',
          badRequestCode: 'INVALID_MESSAGE_DATA',
          internalErrorMessage: 'Failed to send order message',
          internalErrorCode: 'SEND_ORDER_MESSAGE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(orderContract.markMessageAsRead)
  public markMessageAsRead(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.markMessageAsRead, async ({ params }) => {
      try {
        const result = await this.ordersService.markMessageAsRead(
          req.user, 
          params.id, 
          params.messageId
        );

        this.logger.log(`Message ${params.messageId} marked as read by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Mark message ${params.messageId} as read failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order or message not found',
          notFoundCode: 'ORDER_OR_MESSAGE_NOT_FOUND',
          internalErrorMessage: 'Failed to mark message as read',
          internalErrorCode: 'MARK_MESSAGE_AS_READ_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Order Analytics & Reporting
  // =============================================================================

  @TsRestHandler(orderContract.getOrderAnalytics)
  public getOrderAnalytics(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrderAnalytics, async ({ query }) => {
      try {
        const result = await this.ordersService.getOrderAnalytics(req.user, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get order analytics failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve order analytics',
          'GET_ORDER_ANALYTICS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(orderContract.getOrderFinancialSummary)
  public getOrderFinancialSummary(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrderFinancialSummary, async ({ query }) => {
      try {
        const result = await this.ordersService.getOrderFinancialSummary(req.user, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get order financial summary failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve order financial summary',
          'GET_ORDER_FINANCIAL_SUMMARY_FAILED',
        );
      }
    });
  }

  @TsRestHandler(orderContract.getOrderPerformanceMetrics)
  public getOrderPerformanceMetrics(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.getOrderPerformanceMetrics, async ({ query }) => {
      try {
        const result = await this.ordersService.getOrderPerformanceMetrics(req.user, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get order performance metrics failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve order performance metrics',
          'GET_ORDER_PERFORMANCE_METRICS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(orderContract.generateOrderReport)
  public generateOrderReport(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(orderContract.generateOrderReport, async ({ body }) => {
      try {
        const result = await this.ordersService.generateOrderReport(req.user, body);

        this.logger.log(`Order report generated by user ${req.user.userId}`);

        return {
          status: 202 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Generate order report failed:', error);

        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to generate order report',
          'GENERATE_ORDER_REPORT_FAILED',
        );
      }
    });
  }
}
