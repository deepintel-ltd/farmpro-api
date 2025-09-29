import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  OrderType, 
  OrderStatus,
  Prisma 
} from '@prisma/client';
import { z } from 'zod';
import {
  CreateOrderRequestSchema,
  UpdateOrderRequestSchema,
  OrderSearchRequestSchema,
  CreateOrderItemRequestSchema,
  UpdateOrderItemRequestSchema,
  CreateOrderMessageRequestSchema,
  CreateOrderDocumentRequestSchema,
  CreateOrderDisputeRequestSchema,
  DisputeResponseRequestSchema,
  DisputeResolutionRequestSchema,
  AcceptOrderRequestSchema,
  RejectOrderRequestSchema,
  CounterOfferRequestSchema,
  StartFulfillmentRequestSchema,
  CompleteOrderRequestSchema,
  OrderAnalyticsQuerySchema,
  OrderFinancialSummaryQuerySchema,
  OrderPerformanceMetricsQuerySchema,
  OrderReportRequestSchema,
  OrderStatusUpdateRequestSchema,
  ContractSignatureRequestSchema,
} from '../../contracts/orders.schemas';

// Extract types from schemas
type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;
type OrderSearchRequest = z.infer<typeof OrderSearchRequestSchema>;
type CreateOrderItemRequest = z.infer<typeof CreateOrderItemRequestSchema>;
type UpdateOrderItemRequest = z.infer<typeof UpdateOrderItemRequestSchema>;
type CreateOrderMessageRequest = z.infer<typeof CreateOrderMessageRequestSchema>;
type CreateOrderDocumentRequest = z.infer<typeof CreateOrderDocumentRequestSchema>;
type CreateOrderDisputeRequest = z.infer<typeof CreateOrderDisputeRequestSchema>;
type DisputeResponseRequest = z.infer<typeof DisputeResponseRequestSchema>;
type DisputeResolutionRequest = z.infer<typeof DisputeResolutionRequestSchema>;
type AcceptOrderRequest = z.infer<typeof AcceptOrderRequestSchema>;
type RejectOrderRequest = z.infer<typeof RejectOrderRequestSchema>;
type CounterOfferRequest = z.infer<typeof CounterOfferRequestSchema>;
type StartFulfillmentRequest = z.infer<typeof StartFulfillmentRequestSchema>;
type CompleteOrderRequest = z.infer<typeof CompleteOrderRequestSchema>;
type OrderAnalyticsQuery = z.infer<typeof OrderAnalyticsQuerySchema>;
type OrderFinancialSummaryQuery = z.infer<typeof OrderFinancialSummaryQuerySchema>;
type OrderPerformanceMetricsQuery = z.infer<typeof OrderPerformanceMetricsQuerySchema>;
type OrderReportRequest = z.infer<typeof OrderReportRequestSchema>;
type OrderStatusUpdateRequest = z.infer<typeof OrderStatusUpdateRequestSchema>;
type ContractSignatureRequest = z.infer<typeof ContractSignatureRequestSchema>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Order CRUD Operations
  // =============================================================================

  async getOrders(user: CurrentUser, query: {
    page?: number;
    limit?: number;
    type?: OrderType;
    status?: OrderStatus;
    buyerOrgId?: string;
    supplierOrgId?: string;
    commodityId?: string;
    dateRange?: string;
  }) {
    this.logger.log(`Getting orders for user: ${user.userId}`);
    
    const { page = 1, limit = 10, type, status, buyerOrgId, supplierOrgId, commodityId, dateRange } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      OR: [
        { buyerOrgId: user.organizationId },
        { supplierOrgId: user.organizationId },
      ],
      ...(type && { type: type as OrderType }),
      ...(status && { status: status as OrderStatus }),
      ...(buyerOrgId && { buyerOrgId }),
      ...(supplierOrgId && { supplierOrgId }),
      ...(commodityId && { items: { some: { commodityId } } }),
      ...(dateRange && {
        createdAt: {
          gte: new Date(dateRange.split(',')[0]),
          lte: new Date(dateRange.split(',')[1]),
        },
      }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          buyerOrg: { select: { id: true, name: true } },
          supplierOrg: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              commodity: { select: { id: true, name: true, category: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    this.logger.log(`Found ${orders.length} orders for user: ${user.userId}`);

    return {
      data: orders.map(order => this.mapOrderToResource(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting order ${orderId} for user: ${user.userId}`);
    
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
            inventory: { select: { id: true, quantity: true, unit: true } },
          },
        },
        messages: {
        include: {
          // Note: sender relation would need to be defined in Prisma schema
        },
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user has access to this order
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    this.logger.log(`Successfully retrieved order ${orderId}`);
    return { data: this.mapOrderToResource(order) };
  }

  async createOrder(user: CurrentUser, data: CreateOrderRequest) {
    this.logger.log(`Creating order for user: ${user.userId}`);
    
    const { data: orderData } = data;
    const { type, title, deliveryDate, deliveryAddress, items, paymentTerms, specialInstructions, metadata } = orderData.attributes;

    // Validate items
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Calculate total price and get primary commodity info
    const totalPrice = items.reduce((sum, item) => {
      return sum + (item.quantity * (item.unitPrice || 0));
    }, 0);
    
    // Use the first item as the primary commodity for the order
    const primaryItem = items[0];
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const averagePricePerUnit = totalPrice / totalQuantity;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: await this.generateOrderNumber(),
        title,
        type: type as OrderType,
        status: OrderStatus.PENDING,
        commodityId: primaryItem.commodityId,
        quantity: totalQuantity,
        pricePerUnit: averagePricePerUnit,
        deliveryDate: new Date(deliveryDate),
        deliveryLocation: deliveryAddress.street,
        deliveryAddress: deliveryAddress as any,
        totalPrice,
        buyerOrgId: user.organizationId,
        createdById: user.userId,
        terms: { paymentTerms, specialInstructions },
        metadata: metadata as any,
      } as any,
      include: {
        buyerOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully created order ${order.id}`);
    return { data: this.mapOrderToResource(order) };
  }

  async updateOrder(user: CurrentUser, orderId: string, data: UpdateOrderRequest) {
    this.logger.log(`Updating order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can update this order
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can update the order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be updated');
    }

    const { data: orderData } = data;
    const { title, description, deliveryDate, deliveryAddress, deliveryLocation, terms, paymentTerms, specialInstructions, isPublic } = orderData.attributes;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
        ...(deliveryAddress && { 
          deliveryAddress: deliveryAddress as any,
        }),
        ...(deliveryLocation && { deliveryLocation }),
        ...(deliveryAddress && !deliveryLocation && { 
          deliveryLocation: deliveryAddress.street,
        }),
        ...(terms && { terms: terms as any }),
        ...(!terms && paymentTerms && { 
          terms: { 
            ...(order.terms as any), 
            paymentTerms 
          } 
        }),
        ...(!terms && specialInstructions && { 
          terms: { 
            ...(order.terms as any), 
            specialInstructions 
          } 
        }),
        ...(isPublic !== undefined && { metadata: { 
          ...(order.metadata as any), 
          isPublic 
        } }),
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully updated order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  async deleteOrder(user: CurrentUser, orderId: string) {
    this.logger.log(`Deleting order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can delete this order
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can delete the order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be deleted');
    }

    await this.prisma.order.delete({
      where: { id: orderId },
    });

    this.logger.log(`Successfully deleted order ${orderId}`);
    return { message: 'Order deleted successfully' };
  }

  // =============================================================================
  // Order Lifecycle Management
  // =============================================================================

  async publishOrder(user: CurrentUser, orderId: string) {
    this.logger.log(`Publishing order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can publish the order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be published');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        metadata: {
          ...(order.metadata as any),
          publishedAt: new Date().toISOString(),
          isPublic: true,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully published order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  async acceptOrder(user: CurrentUser, orderId: string, data: AcceptOrderRequest) {
    this.logger.log(`Accepting order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can accept this order (not the creator)
    if (order.createdById === user.userId) {
      throw new ForbiddenException('Order creator cannot accept their own order');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed orders can be accepted');
    }

    const { message, proposedChanges, requiresNegotiation } = data;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: requiresNegotiation ? OrderStatus.PENDING : OrderStatus.CONFIRMED,
        supplierOrgId: user.organizationId,
        metadata: {
          ...(order.metadata as any),
          acceptedAt: new Date().toISOString(),
          acceptanceMessage: message,
          proposedChanges: proposedChanges as any,
          requiresNegotiation,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully accepted order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  async rejectOrder(user: CurrentUser, orderId: string, data: RejectOrderRequest) {
    this.logger.log(`Rejecting order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can reject this order
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { reason, message } = data;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        metadata: {
          ...(order.metadata as any),
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
          rejectionMessage: message,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully rejected order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  // =============================================================================
  // Order Item Management
  // =============================================================================

  async getOrderItems(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting items for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        commodity: { select: { id: true, name: true, category: true } },
        inventory: { select: { id: true, quantity: true, unit: true } },
      },
    });

    this.logger.log(`Found ${items.length} items for order ${orderId}`);
    return {
      data: items.map(item => this.mapOrderItemToResource(item)),
    };
  }

  async addOrderItem(user: CurrentUser, orderId: string, data: CreateOrderItemRequest) {
    this.logger.log(`Adding item to order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can add items (only creator and only if draft)
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can add items');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Items can only be added to pending orders');
    }

    const { commodityId, inventoryId, quantity, qualityRequirements, unitPrice } = data;

    const item = await this.prisma.orderItem.create({
      data: {
        orderId,
        commodityId,
        inventoryId,
        quantity,
        unitPrice,
        metadata: { qualityRequirements } as any,
      },
      include: {
        commodity: { select: { id: true, name: true, category: true } },
        inventory: { select: { id: true, quantity: true, unit: true } },
      },
    });

    this.logger.log(`Successfully added item ${item.id} to order ${orderId}`);
    return { data: this.mapOrderItemToResource(item) };
  }

  async updateOrderItem(user: CurrentUser, orderId: string, itemId: string, data: UpdateOrderItemRequest) {
    this.logger.log(`Updating item ${itemId} in order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can update items
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can update items');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Items can only be updated in pending orders');
    }

    const { quantity, qualityRequirements, unitPrice, notes } = data;

    const existingItem = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    const item = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        ...(quantity && { quantity }),
        ...(unitPrice && { unitPrice }),
        ...(qualityRequirements || notes) && {
          metadata: {
            ...(existingItem?.metadata as any),
            ...(qualityRequirements && { qualityRequirements }),
            ...(notes && { notes }),
          }
        },
      },
      include: {
        commodity: { select: { id: true, name: true, category: true } },
        inventory: { select: { id: true, quantity: true, unit: true } },
      },
    });

    this.logger.log(`Successfully updated item ${itemId} in order ${orderId}`);
    return { data: this.mapOrderItemToResource(item) };
  }

  async deleteOrderItem(user: CurrentUser, orderId: string, itemId: string) {
    this.logger.log(`Deleting item ${itemId} from order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check if user can delete items
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can delete items');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Items can only be deleted from pending orders');
    }

    await this.prisma.orderItem.delete({
      where: { id: itemId },
    });

    this.logger.log(`Successfully deleted item ${itemId} from order ${orderId}`);
    return { message: 'Item deleted successfully' };
  }

  // =============================================================================
  // Order Search & Discovery
  // =============================================================================

  async getMarketplaceOrders(user: CurrentUser, query: {
    page?: number;
    limit?: number;
    type?: OrderType;
    commodityId?: string;
  }) {
    this.logger.log(`Getting marketplace orders for user: ${user.userId}`);
    
    const { page = 1, limit = 10, type, commodityId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.CONFIRMED,
      metadata: {
        path: ['isPublic'],
        equals: true,
      },
      ...(type && { type: type as OrderType }),
      ...(commodityId && { items: { some: { commodityId } } }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          buyerOrg: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              commodity: { select: { id: true, name: true, category: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    this.logger.log(`Found ${orders.length} marketplace orders`);
    return {
      data: orders.map(order => this.mapOrderToResource(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMarketplaceOrder(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting marketplace order ${orderId} for user: ${user.userId}`);
    
    const order = await this.prisma.order.findUnique({
      where: { 
        id: orderId,
        status: OrderStatus.CONFIRMED,
        metadata: {
          path: ['isPublic'],
          equals: true,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Marketplace order not found');
    }

    this.logger.log(`Successfully retrieved marketplace order ${orderId}`);
    return { data: this.mapOrderToResource(order) };
  }

  async searchOrders(user: CurrentUser, data: OrderSearchRequest) {
    this.logger.log(`Searching orders for user: ${user.userId}`);
    
    const { filters, sort } = data;
    const { commodities, priceRange, deliveryWindow } = filters || {};

    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.CONFIRMED,
      metadata: {
        path: ['isPublic'],
        equals: true,
      },
      ...(commodities && { items: { some: { commodityId: { in: commodities } } } }),
      ...(priceRange && {
        totalPrice: {
          gte: priceRange.min,
          lte: priceRange.max,
        },
      }),
      ...(deliveryWindow && {
        deliveryDate: {
          gte: new Date(deliveryWindow.start),
          lte: new Date(deliveryWindow.end),
        },
      }),
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput = {};
    if (sort) {
      switch (sort.field) {
        case 'price':
          orderBy.totalPrice = sort.direction;
          break;
        case 'deliveryDate':
          orderBy.deliveryDate = sort.direction;
          break;
        case 'rating':
          orderBy.createdAt = 'desc'; // Default to newest for rating
          break;
        default:
          orderBy.createdAt = 'desc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        buyerOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy,
      take: 50, // Limit search results
    });

    this.logger.log(`Found ${orders.length} orders matching search criteria`);
    return {
      data: orders.map(order => this.mapOrderToResource(order)),
    };
  }

  async getOrderRecommendations(user: CurrentUser, query: {
    type?: OrderType;
    limit?: number;
  }) {
    this.logger.log(`Getting order recommendations for user: ${user.userId}`);
    
    const { type, limit = 10 } = query;

    // Get user's order history to make recommendations
    const userOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { buyerOrgId: user.organizationId },
          { supplierOrgId: user.organizationId },
        ],
      },
      include: {
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Extract commodity preferences
    const commodityIds = userOrders.flatMap(order => 
      order.items.map(item => item.commodityId)
    );

    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.CONFIRMED,
      metadata: {
        path: ['isPublic'],
        equals: true,
      },
      ...(type && { type: type as OrderType }),
      ...(commodityIds.length > 0 && { 
        items: { 
          some: { 
            commodityId: { 
              in: commodityIds 
            } 
          } 
        } 
      }),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        buyerOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    this.logger.log(`Found ${orders.length} recommended orders`);
    return {
      data: orders.map(order => this.mapOrderToResource(order)),
    };
  }

  // =============================================================================
  // Order Communication
  // =============================================================================

  async getOrderMessages(user: CurrentUser, orderId: string, query: {
    page?: number;
    limit?: number;
  }) {
    this.logger.log(`Getting messages for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { orderId },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where: { orderId } }),
    ]);

    this.logger.log(`Found ${messages.length} messages for order ${orderId}`);
    return {
      data: messages.map(this.mapMessageToResource),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendOrderMessage(user: CurrentUser, orderId: string, data: CreateOrderMessageRequest) {
    this.logger.log(`Sending message for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { content, type, attachments, isUrgent } = data;

    const message = await this.prisma.message.create({
      data: {
        orderId,
        content,
        type: type as any,
        userId: user.userId,
        metadata: {
          attachments: attachments || [],
          isUrgent: isUrgent || false,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Successfully sent message ${message.id} for order ${orderId}`);
    return { data: this.mapMessageToResource(message) };
  }

  async markMessageAsRead(user: CurrentUser, orderId: string, messageId: string) {
    this.logger.log(`Marking message ${messageId} as read for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });

    this.logger.log(`Successfully marked message ${messageId} as read`);
    return { message: 'Message marked as read' };
  }

  // =============================================================================
  // Order Analytics & Reporting
  // =============================================================================

  async getOrderAnalytics(user: CurrentUser, query: OrderAnalyticsQuery) {
    this.logger.log(`Getting order analytics for user: ${user.userId}`);
    
    const { period = 'month', type, status, commodityId } = query;
    
    const dateFilter = this.getDateFilter(period);
    const where: Prisma.OrderWhereInput = {
      OR: [
        { buyerOrgId: user.organizationId },
        { supplierOrgId: user.organizationId },
      ],
      ...(dateFilter && { createdAt: dateFilter }),
      ...(type && { type: type as OrderType }),
      ...(status && { status: status as OrderStatus }),
      ...(commodityId && { items: { some: { commodityId } } }),
    };

    const [totalOrders, completedOrders, totalValue, topCommodities] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ 
        where: { ...where, status: OrderStatus.DELIVERED } 
      }),
      this.prisma.order.aggregate({
        where,
        _sum: { totalPrice: true },
      }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              commodity: { select: { id: true, name: true } },
            },
          },
        },
        take: 5,
      }),
    ]);

    const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const averageValue = totalOrders > 0 ? (totalValue._sum.totalPrice || 0) / totalOrders : 0;

    this.logger.log(`Retrieved analytics for ${totalOrders} orders`);
    return {
      data: {
        type: 'analytics',
        id: 'order-analytics',
        attributes: {
          volume: totalOrders,
          successRate: Math.round(successRate * 100) / 100,
          averageValue: Math.round(averageValue * 100) / 100,
          topCommodities: topCommodities.map(order => ({
            commodityId: order.items[0]?.commodityId,
            name: order.items[0]?.commodity?.name,
            count: order.items.length,
          })),
          period,
        },
      },
    };
  }

  async getOrderFinancialSummary(user: CurrentUser, query: OrderFinancialSummaryQuery) {
    this.logger.log(`Getting financial summary for user: ${user.userId}`);
    
    const { period = 'month', type, status } = query;
    
    const dateFilter = this.getDateFilter(period);
    const where: Prisma.OrderWhereInput = {
      OR: [
        { buyerOrgId: user.organizationId },
        { supplierOrgId: user.organizationId },
      ],
      ...(dateFilter && { createdAt: dateFilter }),
      ...(type && { type: type as OrderType }),
      ...(status && { status: status as OrderStatus }),
    };

    const [totalRevenue, totalCosts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...where, type: OrderType.SELL },
        _sum: { totalPrice: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where, type: OrderType.BUY },
        _sum: { totalPrice: true },
      }),
    ]);

    const revenue = totalRevenue._sum.totalPrice || 0;
    const costs = totalCosts._sum.totalPrice || 0;
    const netMargin = revenue - costs;
    const averageOrderValue = revenue / Math.max(1, await this.prisma.order.count({ where: { ...where, type: OrderType.SELL } }));

    this.logger.log(`Retrieved financial summary for period: ${period}`);
    return {
      data: {
        type: 'financial-summary',
        id: 'financial-summary',
        attributes: {
          totalRevenue: Number(revenue),
          totalCosts: Number(costs),
          netMargin: Number(netMargin),
          averageOrderValue: Number(averageOrderValue),
          period,
        },
      },
    };
  }

  async getOrderPerformanceMetrics(user: CurrentUser, query: OrderPerformanceMetricsQuery) {
    this.logger.log(`Getting performance metrics for user: ${user.userId}`);
    
    const { period = 'month' } = query;
    
    const dateFilter = this.getDateFilter(period);
    const where: Prisma.OrderWhereInput = {
      OR: [
        { buyerOrgId: user.organizationId },
        { supplierOrgId: user.organizationId },
      ],
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [totalOrders, completedOrders, deliveredOrders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.DELIVERED } }),
    ]);

    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const onTimeDeliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    this.logger.log(`Retrieved performance metrics for period: ${period}`);
    return {
      data: {
        type: 'performance-metrics',
        id: 'performance-metrics',
        attributes: {
          completionRate: Math.round(completionRate * 100) / 100,
          averageCycleTime: 0, // Would be calculated based on actual data
          customerSatisfaction: 0, // Would be calculated from ratings
          onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
          period,
        },
      },
    };
  }

  async generateOrderReport(user: CurrentUser, data: OrderReportRequest) {
    this.logger.log(`Generating order report for user: ${user.userId}` , data);
    
    // This would be implemented by a proper report generation service
    const reportJob = {
      id: Date.now().toString(),
      status: 'pending' as const,
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    };

    this.logger.log(`Started report generation job ${reportJob.id}`);
    return {
      data: {
        type: 'report-jobs',
        id: reportJob.id,
        attributes: {
          status: reportJob.status,
          estimatedCompletion: reportJob.estimatedCompletion,
          downloadUrl: null,
        },
      },
      links: {
        self: `/api/orders/reports/${reportJob.id}`,
        status: `/api/orders/reports/${reportJob.id}/status`,
      },
    };
  }

  // =============================================================================
  // Additional Order Lifecycle Methods
  // =============================================================================

  async counterOffer(user: CurrentUser, orderId: string, data: CounterOfferRequest) {
    this.logger.log(`Making counter offer for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { message, changes, expiresAt } = data;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PENDING,
        metadata: {
          ...(order.metadata as any),
          counterOfferAt: new Date().toISOString(),
          counterOfferMessage: message,
          counterOfferChanges: changes as any,
          counterOfferExpiresAt: expiresAt,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully created counter offer for order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  async confirmOrder(user: CurrentUser, orderId: string) {
    this.logger.log(`Confirming order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    if (order.createdById !== user.userId) {
      throw new ForbiddenException('Only order creator can confirm the order');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed orders can be finalized');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        metadata: {
          ...(order.metadata as any),
          confirmedAt: new Date().toISOString(),
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully confirmed order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  async startFulfillment(user: CurrentUser, orderId: string, data: StartFulfillmentRequest) {
    this.logger.log(`Starting fulfillment for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    if (order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Only supplier can start fulfillment');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed orders can start fulfillment');
    }

    const { estimatedCompletionDate, notes, trackingInfo } = data;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.IN_TRANSIT,
        metadata: {
          ...(order.metadata as any),
          fulfillmentStartedAt: new Date().toISOString(),
          estimatedCompletionDate,
          fulfillmentNotes: notes,
          trackingInfo: trackingInfo as any,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully started fulfillment for order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  async completeOrder(user: CurrentUser, orderId: string, data: CompleteOrderRequest) {
    this.logger.log(`Completing order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    if (order.status !== OrderStatus.IN_TRANSIT) {
      throw new BadRequestException('Only orders in transit can be completed');
    }

    const { deliveryConfirmation, qualityAssessment } = data;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        metadata: {
          ...(order.metadata as any),
          completedAt: new Date().toISOString(),
          deliveryConfirmation: deliveryConfirmation as any,
          qualityAssessment: qualityAssessment as any,
        },
      },
      include: {
        buyerOrg: { select: { id: true, name: true } },
        supplierOrg: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    this.logger.log(`Successfully completed order ${orderId}`);
    return { data: this.mapOrderToResource(updatedOrder) };
  }

  // =============================================================================
  // Order Documents & Contracts
  // =============================================================================

  async getOrderDocuments(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting documents for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const documents = await this.prisma.document.findMany({
      where: { orderId },
      include: {
        // Note: uploadedBy relation would need to be defined in Prisma schema
      },
    });

    this.logger.log(`Found ${documents.length} documents for order ${orderId}`);
    return {
      data: documents.map(this.mapDocumentToResource),
    };
  }

  async uploadOrderDocument(user: CurrentUser, orderId: string, data: CreateOrderDocumentRequest) {
    this.logger.log(`Uploading document for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { type, name } = data;

    const document = await this.prisma.document.create({
      data: {
        orderId,
        type: type as any,
        name,
        // description, // Note: description field would need to be defined in Prisma schema
        url: '', // This would be set by file upload service
        // isRequired, // Note: isRequired field would need to be defined in Prisma schema
        uploadedBy: user.userId,
      } as any,
      include: {
        // Note: uploadedBy relation would need to be defined in Prisma schema
      },
    });

    this.logger.log(`Successfully uploaded document ${document.id} for order ${orderId}`);
    return { data: this.mapDocumentToResource(document) };
  }

  async getOrderContract(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting contract for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    // Generate contract URL (this would be implemented by a contract service)
    const contractUrl = `/api/orders/${orderId}/contract/download`;
    const contractTerms = this.generateContractTerms(order);

    return {
      data: {
        type: 'contracts',
        id: orderId,
        attributes: {
          url: contractUrl,
          terms: contractTerms,
          generatedAt: new Date().toISOString(),
        },
      },
      links: {
        self: `/api/orders/${orderId}/contract`,
        download: contractUrl,
      },
    };
  }

  async signOrderContract(user: CurrentUser, orderId: string, data: ContractSignatureRequest) {
    this.logger.log(`Signing contract for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { signature, signedAt, ipAddress } = data;

    // Update order with signature
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: {
          ...(order.metadata as any),
          contractSignedAt: signedAt,
          contractSignature: signature,
          contractSignedBy: user.userId,
          contractSignedFromIP: ipAddress,
        },
      },
    });

    this.logger.log(`Successfully signed contract for order ${orderId}`);
    return { message: 'Contract signed successfully' };
  }

  // =============================================================================
  // Order Tracking & Status
  // =============================================================================

  async getOrderTimeline(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting timeline for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    // Get timeline events from order metadata and related records
    const timelineEvents = [
      {
        id: '1',
        orderId,
        status: 'created',
        message: 'Order created',
        createdAt: order.createdAt.toISOString(),
      },
      ...(order.metadata as any)?.publishedAt ? [{
        id: '2',
        orderId,
        status: 'published',
        message: 'Order published to marketplace',
        createdAt: (order.metadata as any).publishedAt,
      }] : [],
      ...(order.metadata as any)?.acceptedAt ? [{
        id: '3',
        orderId,
        status: 'accepted',
        message: 'Order accepted by supplier',
        createdAt: (order.metadata as any).acceptedAt,
      }] : [],
      ...(order.metadata as any)?.fulfillmentStartedAt ? [{
        id: '4',
        orderId,
        status: 'fulfillment_started',
        message: 'Fulfillment started',
        createdAt: (order.metadata as any).fulfillmentStartedAt,
      }] : [],
      ...(order.metadata as any)?.completedAt ? [{
        id: '5',
        orderId,
        status: 'completed',
        message: 'Order completed',
        createdAt: (order.metadata as any).completedAt,
      }] : [],
    ];

    this.logger.log(`Found ${timelineEvents.length} timeline events for order ${orderId}`);
    return {
      data: timelineEvents,
      links: {
        self: `/api/orders/${orderId}/timeline`,
      },
    };
  }

  async getOrderTracking(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting tracking info for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const trackingInfo = {
      orderId,
      currentStatus: order.status,
      location: (order.metadata as any)?.trackingInfo?.currentLocation || null,
      estimatedDelivery: (order.metadata as any)?.estimatedCompletionDate || null,
      trackingNumber: (order.metadata as any)?.trackingInfo?.trackingNumber || null,
      carrier: (order.metadata as any)?.trackingInfo?.carrier || null,
      lastUpdated: order.updatedAt.toISOString(),
    };

    this.logger.log(`Retrieved tracking info for order ${orderId}`);
    return {
      data: trackingInfo,
      links: {
        self: `/api/orders/${orderId}/tracking`,
      },
    };
  }

  async addStatusUpdate(user: CurrentUser, orderId: string, data: OrderStatusUpdateRequest) {
    this.logger.log(`Adding status update for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { status, message, location, estimatedCompletion, attachments } = data;

    // Update order with status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as OrderStatus,
        metadata: {
          ...(order.metadata as any),
          lastStatusUpdate: {
            status,
            message,
            location,
            estimatedCompletion,
            attachments,
            updatedAt: new Date().toISOString(),
            updatedBy: user.userId,
          },
        },
      },
    });

    const timelineEvent = {
      id: Date.now().toString(),
      orderId,
      status,
      message,
      location,
      estimatedCompletion,
      attachments,
      createdAt: new Date().toISOString(),
    };

    this.logger.log(`Successfully added status update for order ${orderId}`);
    return timelineEvent;
  }

  // =============================================================================
  // Order Disputes & Resolution
  // =============================================================================

  async createOrderDispute(user: CurrentUser, orderId: string, data: CreateOrderDisputeRequest) {
    this.logger.log(`Creating dispute for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { type, description, evidence, requestedResolution, severity } = data;

    // Note: Dispute model would need to be defined in Prisma schema
    const dispute = {
      id: Date.now().toString(),
      orderId,
      type: type as any,
      description,
      evidence: evidence as any,
      requestedResolution: requestedResolution as any,
      severity: severity as any,
      status: 'open',
      createdBy: user.userId,
      createdAt: new Date(),
    };

    this.logger.log(`Successfully created dispute ${dispute.id} for order ${orderId}`);
    return { data: this.mapDisputeToResource(dispute) };
  }

  async getOrderDisputes(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting disputes for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    // Note: Dispute model would need to be defined in Prisma schema
    const disputes: any[] = [];

    this.logger.log(`Found ${disputes.length} disputes for order ${orderId}`);
    return {
      data: disputes.map(this.mapDisputeToResource),
    };
  }

  async respondToDispute(user: CurrentUser, orderId: string, disputeId: string, data: DisputeResponseRequest) {
    this.logger.log(`Responding to dispute ${disputeId} for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { response, evidence, proposedResolution } = data;

    // Note: Dispute model would need to be defined in Prisma schema
    const dispute = {
      id: disputeId,
      orderId,
      status: 'in_review',
      metadata: {
        response,
        evidence: evidence as any,
        proposedResolution,
        respondedAt: new Date().toISOString(),
        respondedBy: user.userId,
      },
    };

    this.logger.log(`Successfully responded to dispute ${disputeId}`);
    return { data: this.mapDisputeToResource(dispute) };
  }

  async resolveDispute(user: CurrentUser, orderId: string, disputeId: string, data: DisputeResolutionRequest) {
    this.logger.log(`Resolving dispute ${disputeId} for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const { resolution, compensation, terms } = data;

    // Note: Dispute model would need to be defined in Prisma schema
    const dispute = {
      id: disputeId,
      orderId,
      status: 'resolved',
      metadata: {
        resolution,
        compensation,
        terms,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.userId,
      },
    };

    this.logger.log(`Successfully resolved dispute ${disputeId}`);
    return { data: this.mapDisputeToResource(dispute) };
  }

  // =============================================================================
  // Order Relationships
  // =============================================================================

  async getOrderBuyer(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting buyer for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const buyer = await this.prisma.user.findFirst({
      where: { 
        organizationId: order.buyerOrgId,
        userRoles: {
          some: { isActive: true }
        }
      },
      select: { id: true, name: true, email: true },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    return { data: this.mapUserToResource(buyer) };
  }

  async getOrderSeller(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting seller for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    if (!order.supplierOrgId) {
      return { data: null };
    }

    const seller = await this.prisma.user.findFirst({
      where: { 
        organizationId: order.supplierOrgId,
        userRoles: {
          some: { isActive: true }
        }
      },
      select: { id: true, name: true, email: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return { data: this.mapUserToResource(seller) };
  }

  async getOrderBuyerRelationship(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting buyer relationship for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    return {
      data: {
        type: 'organizations',
        id: order.buyerOrgId,
      },
      links: {
        self: `/api/orders/${orderId}/relationships/buyer`,
        related: `/api/orders/${orderId}/buyer`,
      },
    };
  }

  async getOrderSellerRelationship(user: CurrentUser, orderId: string) {
    this.logger.log(`Getting seller relationship for order ${orderId} for user: ${user.userId}`);
    
    const order = await this.getOrderById(orderId);
    
    // Check access
    if (order.buyerOrgId !== user.organizationId && order.supplierOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this order');
    }

    return {
      data: order.supplierOrgId ? {
        type: 'organizations',
        id: order.supplierOrgId,
      } : null,
      links: {
        self: `/api/orders/${orderId}/relationships/seller`,
        related: `/api/orders/${orderId}/seller`,
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }

  private mapOrderToResource(order: any) {
    return {
      type: 'orders',
      id: order.id,
      attributes: {
        orderNumber: order.orderNumber,
        title: order.title,
        type: order.type,
        status: order.status,
        deliveryDate: order.deliveryDate.toISOString(),
        deliveryLocation: order.deliveryLocation,
        deliveryAddress: order.deliveryAddress,
        totalPrice: order.totalPrice,
        terms: order.terms,
        metadata: order.metadata,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items?.map(item => this.mapOrderItemToResource(item)) || [],
        buyerOrg: order.buyerOrg,
        supplierOrg: order.supplierOrg,
        createdBy: order.createdBy,
      },
      relationships: {
        buyer: {
          data: order.buyerOrg ? { type: 'organizations', id: order.buyerOrg.id } : null,
        },
        supplier: {
          data: order.supplierOrg ? { type: 'organizations', id: order.supplierOrg.id } : null,
        },
        creator: {
          data: order.createdBy ? { type: 'users', id: order.createdBy.id } : null,
        },
      },
    };
  }

  private mapOrderItemToResource(item: any) {
    return {
      type: 'order-items',
      id: item.id,
      attributes: {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        metadata: item.metadata,
        createdAt: item.createdAt.toISOString(),
        commodity: item.commodity,
        inventory: item.inventory,
      },
      relationships: {
        commodity: {
          data: { type: 'commodities', id: item.commodityId },
        },
        inventory: {
          data: item.inventoryId ? { type: 'inventory', id: item.inventoryId } : null,
        },
      },
    };
  }

  private mapMessageToResource(message: any) {
    return {
      type: 'messages',
      id: message.id,
      attributes: {
        content: message.content,
        type: message.type,
        attachments: message.metadata?.attachments || [],
        isUrgent: message.metadata?.isUrgent || false,
        isRead: message.isRead,
        readAt: message.readAt?.toISOString() || null,
        createdAt: message.createdAt.toISOString(),
        sender: message.user,
      },
      relationships: {
        sender: {
          data: { type: 'users', id: message.user.id },
        },
      },
    };
  }

  private getDateFilter(period: string): Prisma.DateTimeFilter | null {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return null;
    }

    return {
      gte: startDate,
      lte: now,
    };
  }

  private mapDocumentToResource(document: any) {
    return {
      type: 'documents',
      id: document.id,
      attributes: {
        type: document.type,
        name: document.name,
        description: document.description,
        url: document.url,
        isRequired: document.isRequired,
        uploadedAt: document.uploadedAt?.toISOString() || document.createdAt.toISOString(),
        uploadedBy: document.uploadedBy,
      },
      relationships: {
        uploader: {
          data: { type: 'users', id: document.uploadedBy },
        },
      },
    };
  }

  private mapDisputeToResource(dispute: any) {
    return {
      type: 'disputes',
      id: dispute.id,
      attributes: {
        type: dispute.type,
        description: dispute.description,
        evidence: dispute.evidence,
        requestedResolution: dispute.requestedResolution,
        severity: dispute.severity,
        status: dispute.status,
        createdAt: dispute.createdAt.toISOString(),
        resolvedAt: dispute.resolvedAt?.toISOString() || null,
        metadata: dispute.metadata,
      },
      relationships: {
        createdBy: {
          data: { type: 'users', id: dispute.createdBy },
        },
      },
    };
  }

  private mapUserToResource(user: any) {
    return {
      type: 'users',
      id: user.id,
      attributes: {
        name: user.name,
        email: user.email,
      },
    };
  }

  private generateContractTerms(order: any): string {
    // This would be implemented by a proper contract generation service
    return `Contract for Order ${order.orderNumber}
    
Buyer: ${order.buyerOrg?.name || 'N/A'}
Supplier: ${order.supplierOrg?.name || 'TBD'}
Total Value: $${order.totalPrice}
Delivery Date: ${order.deliveryDate.toISOString().split('T')[0]}

Terms and conditions apply as per standard agricultural trading agreement.
    `.trim();
  }
}
