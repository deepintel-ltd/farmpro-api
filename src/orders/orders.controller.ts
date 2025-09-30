import { Controller, Logger, Request, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ordersCrudContract } from '../../contracts/orders-crud.contract';
import { ordersMarketplaceContract } from '../../contracts/orders-marketplace.contract';
import { ordersMessagingContract } from '../../contracts/orders-messaging.contract';
import { ordersAnalyticsContract } from '../../contracts/orders-analytics.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { Request as ExpressRequest } from 'express';
import { OrderType, OrderStatus } from '@prisma/client';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES } from '../common/constants';
import {
  RequirePermission,
  RequireCapability,
  MarketplaceAccess,
} from '../common/decorators/authorization.decorators';
import {
  OrderView,
  OrderCreate,
  OrderUpdate,
  OrderDelete,
  SupplierAction,
  OrderMessage,
  OrderMessageView,
} from './decorators/order-auth.decorators';
import { OrderMarketplaceGuard } from './guards';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

// Path parameter types based on contract schemas
interface OrderPathParams {
  id: string;
}

interface OrderItemPathParams {
  id: string;
  itemId: string;
}

interface OrderMessagePathParams {
  id: string;
  messageId: string;
}

@Controller()
@Secured(FEATURES.ORDERS)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  // =============================================================================
  // Order CRUD Operations
  // =============================================================================

  @TsRestHandler(ordersCrudContract.getOrders)
  @RequirePermission('orders', 'read')
  public getOrders(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.getOrders, async ({ query }) => {
      try {
        const result = await this.ordersService.getOrders(req.user, {
          page: query['page[number]'] ? parseInt(query['page[number]'].toString()) : undefined,
          limit: query['page[size]'] ? parseInt(query['page[size]'].toString()) : undefined,
          type: query.type as OrderType | undefined,
          status: query.status as OrderStatus | undefined,
          buyerOrgId: query.buyerOrgId,
          supplierOrgId: query.supplierOrgId,
          commodityId: query.commodityId,
          dateRange: query.dateRange,
        });

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

  // =============================================================================
  // Order Search & Discovery
  // =============================================================================

  @TsRestHandler(ordersMarketplaceContract.getMarketplaceOrders)
  @MarketplaceAccess()
  @RequirePermission('orders', 'read')
  public getMarketplaceOrders(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMarketplaceContract.getMarketplaceOrders, async ({ query }) => {
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

  @TsRestHandler(ordersMarketplaceContract.getMarketplaceOrder)
  @MarketplaceAccess()
  @RequirePermission('orders', 'read')
  public getMarketplaceOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMarketplaceContract.getMarketplaceOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.getMarketplaceOrder(req.user, (params as OrderPathParams).id);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get marketplace order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Marketplace order not found',
          notFoundCode: 'MARKETPLACE_ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve marketplace order',
          internalErrorCode: 'GET_MARKETPLACE_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersMarketplaceContract.searchOrders)
  @MarketplaceAccess()
  @RequirePermission('orders', 'read')
  public searchOrders(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMarketplaceContract.searchOrders, async ({ body }) => {
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

  @TsRestHandler(ordersMarketplaceContract.getOrderRecommendations)
  @MarketplaceAccess()
  @RequirePermission('orders', 'read')
  public getOrderRecommendations(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMarketplaceContract.getOrderRecommendations, async ({ query }) => {
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
  // Order Analytics & Reporting
  // =============================================================================

  @TsRestHandler(ordersAnalyticsContract.getOrderAnalytics)
  @RequirePermission('orders', 'read')
  public getOrderAnalytics(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersAnalyticsContract.getOrderAnalytics, async ({ query }) => {
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

  @TsRestHandler(ordersAnalyticsContract.getOrderFinancialSummary)
  @RequirePermission('orders', 'read')
  public getOrderFinancialSummary(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersAnalyticsContract.getOrderFinancialSummary, async ({ query }) => {
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

  @TsRestHandler(ordersAnalyticsContract.getOrderPerformanceMetrics)
  @RequirePermission('orders', 'read')
  public getOrderPerformanceMetrics(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersAnalyticsContract.getOrderPerformanceMetrics, async ({ query }) => {
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

  @TsRestHandler(ordersAnalyticsContract.generateOrderReport)
  @RequirePermission('orders', 'read')
  public generateOrderReport(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersAnalyticsContract.generateOrderReport, async ({ body }) => {
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

  @TsRestHandler(ordersCrudContract.getOrder)
  @OrderView()
  public getOrder(@Request() req: AuthenticatedRequest): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.getOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.getOrder(req.user, (params as OrderPathParams).id);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve order',
          internalErrorCode: 'GET_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersCrudContract.createOrder)
  @OrderCreate()
  @RequireCapability('create_orders')
  public createOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.createOrder, async ({ body }) => {
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

  @TsRestHandler(ordersCrudContract.updateOrder)
  @OrderUpdate()
  public updateOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.updateOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.updateOrder(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Order ${(params as OrderPathParams).id} updated by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.deleteOrder)
  @OrderDelete()
  public deleteOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.deleteOrder, async ({ params }) => {
      try {
        await this.ordersService.deleteOrder(req.user, (params as OrderPathParams).id);

        this.logger.log(`Order ${(params as OrderPathParams).id} deleted by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: { message: 'Order deleted successfully' },
        };
      } catch (error: unknown) {
        this.logger.error(`Delete order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.publishOrder)
  @OrderUpdate()
  @MarketplaceAccess()
  public publishOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.publishOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.publishOrder(req.user, (params as OrderPathParams).id);

        this.logger.log(`Order ${(params as OrderPathParams).id} published by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Publish order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.acceptOrder)
  @UseGuards(OrderMarketplaceGuard)
  @MarketplaceAccess()
  @RequirePermission('orders', 'update')
  public acceptOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.acceptOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.acceptOrder(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Order ${(params as OrderPathParams).id} accepted by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Accept order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.rejectOrder)
  @OrderView()
  public rejectOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.rejectOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.rejectOrder(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Order ${(params as OrderPathParams).id} rejected by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Reject order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to reject order',
          internalErrorCode: 'REJECT_ORDER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersCrudContract.counterOffer)
  @SupplierAction()
  @MarketplaceAccess()
  public counterOffer(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.counterOffer, async ({ params, body }) => {
      try {
        const result = await this.ordersService.counterOffer(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Counter offer made for order ${(params as OrderPathParams).id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Counter offer for order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to make counter offer',
          internalErrorCode: 'COUNTER_OFFER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersCrudContract.confirmOrder)
  @OrderUpdate()
  public confirmOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.confirmOrder, async ({ params }) => {
      try {
        const result = await this.ordersService.confirmOrder(req.user, (params as OrderPathParams).id);

        this.logger.log(`Order ${(params as OrderPathParams).id} confirmed by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Confirm order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.startFulfillment)
  @SupplierAction()
  public startFulfillment(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.startFulfillment, async ({ params, body }) => {
      try {
        const result = await this.ordersService.startFulfillment(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Fulfillment started for order ${(params as OrderPathParams).id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Start fulfillment for order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.completeOrder)
  @SupplierAction()
  public completeOrder(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.completeOrder, async ({ params, body }) => {
      try {
        const result = await this.ordersService.completeOrder(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Order ${(params as OrderPathParams).id} completed by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Complete order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersCrudContract.getOrderItems)
  @OrderView()
  public getOrderItems(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.getOrderItems, async ({ params }) => {
      try {
        const result = await this.ordersService.getOrderItems(req.user, (params as OrderPathParams).id);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get order items for order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve order items',
          internalErrorCode: 'GET_ORDER_ITEMS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersCrudContract.addOrderItem)
  @OrderUpdate()
  public addOrderItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.addOrderItem, async ({ params, body }) => {
      try {
        const result = await this.ordersService.addOrderItem(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Item added to order ${(params as OrderPathParams).id} by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Add item to order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          badRequestMessage: 'Invalid item data',
          badRequestCode: 'INVALID_ITEM_DATA',
          forbiddenMessage: 'Access denied to add items to this order',
          forbiddenCode: 'ADD_ORDER_ITEM_FORBIDDEN',
          internalErrorMessage: 'Failed to add item to order',
          internalErrorCode: 'ADD_ORDER_ITEM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersCrudContract.updateOrderItem)
  @OrderUpdate()
  public updateOrderItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.updateOrderItem, async ({ params, body }) => {
      try {
        const result = await this.ordersService.updateOrderItem(
          req.user, 
          (params as OrderItemPathParams).id, 
          (params as OrderItemPathParams).itemId, 
          body
        );

        this.logger.log(`Item ${(params as OrderItemPathParams).itemId} updated in order ${(params as OrderItemPathParams).id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Update item ${(params as OrderItemPathParams).itemId} in order ${(params as OrderItemPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order or item not found',
          notFoundCode: 'ORDER_OR_ITEM_NOT_FOUND',
          badRequestMessage: 'Invalid item data',
          badRequestCode: 'INVALID_ITEM_DATA',
          forbiddenMessage: 'Access denied to update this order item',
          forbiddenCode: 'UPDATE_ORDER_ITEM_FORBIDDEN',
          internalErrorMessage: 'Failed to update order item',
          internalErrorCode: 'UPDATE_ORDER_ITEM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersCrudContract.deleteOrderItem)
  @OrderDelete()
  public deleteOrderItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersCrudContract.deleteOrderItem, async ({ params }) => {
      try {
        await this.ordersService.deleteOrderItem(req.user, (params as OrderItemPathParams).id, (params as OrderItemPathParams).itemId);

        this.logger.log(`Item ${(params as OrderItemPathParams).itemId} deleted from order ${(params as OrderItemPathParams).id} by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: { message: 'Item deleted successfully' },
        };
      } catch (error: unknown) {
        this.logger.error(`Delete item ${(params as OrderItemPathParams).itemId} from order ${(params as OrderItemPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order or item not found',
          notFoundCode: 'ORDER_OR_ITEM_NOT_FOUND',
          forbiddenMessage: 'Access denied to delete this order item',
          forbiddenCode: 'DELETE_ORDER_ITEM_FORBIDDEN',
          internalErrorMessage: 'Failed to delete order item',
          internalErrorCode: 'DELETE_ORDER_ITEM_FAILED',
        });
      }
    });
  }


  // =============================================================================
  // Order Communication
  // =============================================================================

  @TsRestHandler(ordersMessagingContract.getOrderMessages)
  @OrderMessageView()
  public getOrderMessages(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMessagingContract.getOrderMessages, async ({ params, query }) => {
      try {
        const result = await this.ordersService.getOrderMessages(req.user, (params as OrderPathParams).id, {
          page: query['page[number]'] ? parseInt(query['page[number]'].toString()) : undefined,
          limit: query['page[size]'] ? parseInt(query['page[size]'].toString()) : undefined,
        });

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get messages for order ${(params as OrderPathParams).id} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order not found',
          notFoundCode: 'ORDER_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve order messages',
          internalErrorCode: 'GET_ORDER_MESSAGES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(ordersMessagingContract.sendOrderMessage)
  @OrderMessage()
  public sendOrderMessage(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMessagingContract.sendOrderMessage, async ({ params, body }) => {
      try {
        const result = await this.ordersService.sendOrderMessage(req.user, (params as OrderPathParams).id, body);

        this.logger.log(`Message sent for order ${(params as OrderPathParams).id} by user ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Send message for order ${(params as OrderPathParams).id} failed:`, error);

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

  @TsRestHandler(ordersMessagingContract.markMessageAsRead)
  @OrderMessage()
  public markMessageAsRead(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(ordersMessagingContract.markMessageAsRead, async ({ params }) => {
      try {
        const result = await this.ordersService.markMessageAsRead(
          req.user, 
          (params as OrderMessagePathParams).id, 
          (params as OrderMessagePathParams).messageId
        );

        this.logger.log(`Message ${(params as OrderMessagePathParams).messageId} marked as read by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Mark message ${(params as OrderMessagePathParams).messageId} as read failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Order or message not found',
          notFoundCode: 'ORDER_OR_MESSAGE_NOT_FOUND',
          internalErrorMessage: 'Failed to mark message as read',
          internalErrorCode: 'MARK_MESSAGE_AS_READ_FAILED',
        });
      }
    });
  }

}
