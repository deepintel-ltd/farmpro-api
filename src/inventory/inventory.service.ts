import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Prisma, InventoryStatus } from '@prisma/client';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  InventoryAdjustmentDto,
  InventoryReservationDto,
  InventoryTransferDto,
  InventoryQualityTestDto,
} from './dto/inventory.dto';

interface InventoryFilters {
  farmId?: string;
  commodityId?: string;
  status?: InventoryStatus;
  location?: string;
  qualityGrade?: string;
  lowStock?: boolean;
  expiryAlert?: boolean;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private formatInventoryItem(item: any) {
    return {
      id: item.id,
      type: 'inventory',
      attributes: {
        farmId: item.farmId,
        commodityId: item.commodityId,
        harvestId: item.harvestId,
        quantity: item.quantity,
        unit: item.unit,
        status: item.status,
        location: item.location ? { facility: item.location } : undefined,
        quality: item.quality ? { grade: item.quality } : undefined,
        metadata: item.metadata,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    };
  }

  private buildWhereClause(
    user: CurrentUser,
    filters: InventoryFilters = {},
  ): Prisma.InventoryWhereInput {
    const where: Prisma.InventoryWhereInput = {
      organizationId: user.organizationId,
    };

    if (filters.farmId) {
      where.farmId = filters.farmId;
    }

    if (filters.commodityId) {
      where.commodityId = filters.commodityId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.qualityGrade) {
      where.quality = { contains: filters.qualityGrade, mode: 'insensitive' };
    }

    if (filters.lowStock) {
      // Assuming low stock is quantity < 10 (this could be configurable)
      where.quantity = { lt: 10 };
    }

    return where;
  }

  private async validateFarmAccess(
    user: CurrentUser,
    farmId: string,
  ): Promise<void> {
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: farmId,
        organizationId: user.organizationId,
      },
    });

    if (!farm) {
      throw new ForbiddenException('Access denied to this farm');
    }
  }

  private async validateCommodityExists(commodityId: string): Promise<void> {
    const commodity = await this.prisma.commodity.findUnique({
      where: { id: commodityId },
    });

    if (!commodity) {
      throw new BadRequestException('Commodity not found');
    }
  }

  async findAll(user: CurrentUser, queryParams: any) {
    this.logger.log(`Finding inventory items for user: ${user.userId}`);

    const filters: InventoryFilters = {
      farmId: queryParams.farmId,
      commodityId: queryParams.commodityId,
      status: queryParams.status,
      location: queryParams.location,
      qualityGrade: queryParams.qualityGrade,
      lowStock: queryParams.lowStock === 'true',
      expiryAlert: queryParams.expiryAlert === 'true',
    };

    const pagination: PaginationOptions = {
      page: queryParams['page[number]']
        ? parseInt(queryParams['page[number]'], 10)
        : 1,
      limit: queryParams['page[size]']
        ? parseInt(queryParams['page[size]'], 10)
        : 20,
    };

    const where = this.buildWhereClause(user, filters);
    const skip = (pagination.page! - 1) * pagination.limit!;

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          farm: true,
          commodity: true,
          harvest: true,
        },
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data: items.map((item) => this.formatInventoryItem(item)),
      meta: {
        totalCount: total,
        currentPage: pagination.page,
        perPage: pagination.limit,
        pageCount: Math.ceil(total / pagination.limit!),
      },
    };
  }

  async findOne(user: CurrentUser, id: string) {
    this.logger.log(`Finding inventory item ${id} for user: ${user.userId}`);

    const item = await this.prisma.inventory.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return {
      data: this.formatInventoryItem(item),
    };
  }

  async create(user: CurrentUser, createDto: CreateInventoryDto) {
    this.logger.log(`Creating inventory item for user: ${user.userId}`);

    // Validate farm access and commodity existence
    if (createDto.farmId) {
      await this.validateFarmAccess(user, createDto.farmId);
    }
    await this.validateCommodityExists(createDto.commodityId);

    const item = await this.prisma.inventory.create({
      data: {
        organizationId: user.organizationId,
        farmId: createDto.farmId,
        commodityId: createDto.commodityId,
        harvestId: createDto.harvestId,
        quantity: createDto.quantity,
        unit: createDto.unit,
        quality:
          typeof createDto.quality === 'object'
            ? createDto.quality.grade
            : createDto.quality,
        location:
          typeof createDto.location === 'object'
            ? createDto.location.facility
            : createDto.location,
        status: (createDto.status as InventoryStatus) || 'AVAILABLE',
        metadata: createDto.metadata,
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    return {
      data: this.formatInventoryItem(item),
    };
  }

  async update(user: CurrentUser, id: string, updateDto: UpdateInventoryDto) {
    this.logger.log(`Updating inventory item ${id} for user: ${user.userId}`);

    const existingItem = await this.prisma.inventory.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Inventory item not found');
    }

    const updateData: Prisma.InventoryUpdateInput = {};

    if (updateDto.quantity !== undefined)
      updateData.quantity = updateDto.quantity;
    if (updateDto.unit !== undefined) updateData.unit = updateDto.unit;
    if (updateDto.status !== undefined)
      updateData.status = updateDto.status as InventoryStatus;
    if (updateDto.quality !== undefined) {
      updateData.quality =
        typeof updateDto.quality === 'object'
          ? updateDto.quality.grade
          : updateDto.quality;
    }
    if (updateDto.location !== undefined) {
      updateData.location =
        typeof updateDto.location === 'object'
          ? updateDto.location.facility
          : updateDto.location;
    }
    if (updateDto.metadata !== undefined)
      updateData.metadata = updateDto.metadata;

    const item = await this.prisma.inventory.update({
      where: { id },
      data: updateData,
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    return {
      data: this.formatInventoryItem(item),
    };
  }

  async remove(user: CurrentUser, id: string): Promise<void> {
    this.logger.log(`Removing inventory item ${id} for user: ${user.userId}`);

    const existingItem = await this.prisma.inventory.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Inventory item not found');
    }

    // Check if item is reserved or has pending orders
    const hasOrders = await this.prisma.orderItem.findFirst({
      where: { inventoryId: id },
    });

    if (hasOrders) {
      throw new BadRequestException(
        'Cannot delete inventory item with pending orders',
      );
    }

    await this.prisma.inventory.delete({
      where: { id },
    });
  }

  async getMovements(user: CurrentUser, inventoryId: string) {
    this.logger.log(
      `Getting movements for inventory ${inventoryId} for user: ${user.userId}`,
    );

    // Verify inventory exists and user has access
    await this.findOne(user, inventoryId);

    // For now, return empty array as movements tracking would require additional schema
    // In a real implementation, you'd have an InventoryMovement table
    return {
      data: [],
      meta: {
        message: 'Movement tracking not yet implemented',
      },
    };
  }

  async adjustQuantity(
    user: CurrentUser,
    inventoryId: string,
    adjustmentDto: InventoryAdjustmentDto,
  ) {
    this.logger.log(
      `Adjusting inventory ${inventoryId} for user: ${user.userId}`,
    );

    const item = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        organizationId: user.organizationId,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const newQuantity = item.quantity + adjustmentDto.adjustment;
    if (newQuantity < 0) {
      throw new BadRequestException(
        'Adjustment would result in negative quantity',
      );
    }

    const updatedItem = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        quantity: newQuantity,
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    // Log the adjustment (in a real app, you'd create a movement record)
    this.logger.log(
      `Inventory ${inventoryId} adjusted by ${adjustmentDto.adjustment} (${adjustmentDto.reason})`,
    );

    return {
      data: this.formatInventoryItem(updatedItem),
    };
  }

  async reserveQuantity(
    user: CurrentUser,
    inventoryId: string,
    reservationDto: InventoryReservationDto,
  ) {
    this.logger.log(
      `Reserving inventory ${inventoryId} for user: ${user.userId}`,
    );

    const item = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        organizationId: user.organizationId,
        status: 'AVAILABLE',
      },
    });

    if (!item) {
      throw new NotFoundException('Available inventory item not found');
    }

    if (item.quantity < reservationDto.quantity) {
      throw new BadRequestException('Insufficient quantity available');
    }

    // Update status to reserved
    const updatedItem = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        status: 'RESERVED',
        metadata: {
          ...((item.metadata as object) ?? {}),
          reservation: {
            orderId: reservationDto.orderId,
            quantity: reservationDto.quantity,
            reservedUntil: reservationDto.reservedUntil,
            notes: reservationDto.notes,
          },
        },
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    return {
      data: this.formatInventoryItem(updatedItem),
    };
  }

  async releaseReservation(
    user: CurrentUser,
    inventoryId: string,
    releaseData: {
      quantity: number;
      orderId: string;
      reason: 'order_cancelled' | 'order_changed' | 'expired';
    },
  ) {
    this.logger.log(
      `Releasing reservation for inventory ${inventoryId} for user: ${user.userId}`,
    );

    const item = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        organizationId: user.organizationId,
        status: 'RESERVED',
      },
    });

    if (!item) {
      throw new NotFoundException('Reserved inventory item not found');
    }

    // Validate that the release data matches the reservation
    const currentMetadata = (item.metadata as any) || {};
    const reservation = currentMetadata.reservation;

    if (reservation && reservation.orderId !== releaseData.orderId) {
      throw new BadRequestException('Order ID does not match reservation');
    }

    // Update status back to available and log the release
    const updatedItem = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        status: 'AVAILABLE',
        metadata: {
          ...((item.metadata as object) ?? {}),
          reservation: null,
          lastRelease: {
            orderId: releaseData.orderId,
            quantity: releaseData.quantity,
            reason: releaseData.reason,
            releasedAt: new Date().toISOString(),
          },
        },
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    this.logger.log(
      `Inventory ${inventoryId} reservation released for order ${releaseData.orderId} (${releaseData.reason})`,
    );

    return {
      data: this.formatInventoryItem(updatedItem),
    };
  }

  async transferInventory(
    user: CurrentUser,
    transferDto: InventoryTransferDto,
  ) {
    this.logger.log(`Transferring inventory for user: ${user.userId}`);

    const sourceItem = await this.prisma.inventory.findFirst({
      where: {
        id: transferDto.fromInventoryId,
        organizationId: user.organizationId,
      },
    });

    if (!sourceItem) {
      throw new NotFoundException('Source inventory item not found');
    }

    if (sourceItem.quantity < transferDto.quantity) {
      throw new BadRequestException('Insufficient quantity for transfer');
    }

    // Validate destination farm access
    await this.validateFarmAccess(user, transferDto.toLocation.farmId);

    // Use transaction for atomic transfer
    const result = await this.prisma.$transaction(async (tx) => {
      // Reduce quantity from source
      await tx.inventory.update({
        where: { id: transferDto.fromInventoryId },
        data: {
          quantity: sourceItem.quantity - transferDto.quantity,
        },
      });

      // Create new inventory item at destination
      const newItem = await tx.inventory.create({
        data: {
          organizationId: user.organizationId,
          farmId: transferDto.toLocation.farmId,
          commodityId: sourceItem.commodityId,
          harvestId: sourceItem.harvestId,
          quantity: transferDto.quantity,
          unit: sourceItem.unit,
          quality: sourceItem.quality,
          location: transferDto.toLocation.facility,
          status: 'AVAILABLE',
          metadata: {
            transferredFrom: transferDto.fromInventoryId,
            transferDate: transferDto.transferDate,
            transportMethod: transferDto.transportMethod,
            notes: transferDto.notes,
          },
        },
        include: {
          farm: true,
          commodity: true,
          harvest: true,
        },
      });

      return newItem;
    });

    return {
      data: this.formatInventoryItem(result),
    };
  }

  async getQualityTests(user: CurrentUser, inventoryId: string) {
    this.logger.log(
      `Getting quality tests for inventory ${inventoryId} for user: ${user.userId}`,
    );

    // Verify inventory exists and user has access
    await this.findOne(user, inventoryId);

    // Quality tests would require additional schema
    return {
      data: [],
      meta: {
        message: 'Quality test tracking not yet implemented',
      },
    };
  }

  async addQualityTest(
    user: CurrentUser,
    inventoryId: string,
    testDto: InventoryQualityTestDto,
  ) {
    this.logger.log(
      `Adding quality test for inventory ${inventoryId} for user: ${user.userId}`,
    );

    const item = await this.findOne(user, inventoryId);

    // For now, just update the quality field based on test results
    if (testDto.results.passed && testDto.results.grade) {
      await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: {
          quality: testDto.results.grade,
          metadata: {
            ...((item.data.attributes.metadata as object) || {}),
            lastQualityTest: {
              testType: testDto.testType,
              testDate: testDto.testDate,
              testedBy: testDto.testedBy,
              results: testDto.results,
            },
          },
        },
      });
    }

    return this.findOne(user, inventoryId);
  }

  async updateQualityGrade(
    user: CurrentUser,
    inventoryId: string,
    gradeData: any,
  ) {
    this.logger.log(
      `Updating quality grade for inventory ${inventoryId} for user: ${user.userId}`,
    );

    const item = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        organizationId: user.organizationId,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const updatedItem = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        quality: gradeData.newGrade,
        metadata: {
          ...((item.metadata as object) || {}),
          gradeUpdate: {
            previousGrade: item.quality,
            newGrade: gradeData.newGrade,
            reason: gradeData.reason,
            assessedBy: gradeData.assessedBy,
            updatedAt: new Date().toISOString(),
          },
        },
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    return {
      data: this.formatInventoryItem(updatedItem),
    };
  }

  async getAnalytics(user: CurrentUser) {
    this.logger.log(`Getting inventory analytics for user: ${user.userId}`);

    const [totalItems, totalValue, lowStockItems, expiredItems] =
      await Promise.all([
        this.prisma.inventory.count({
          where: { organizationId: user.organizationId },
        }),
        this.prisma.inventory.aggregate({
          where: { organizationId: user.organizationId },
          _sum: { quantity: true },
        }),
        this.prisma.inventory.count({
          where: {
            organizationId: user.organizationId,
            quantity: { lt: 10 },
          },
        }),
        this.prisma.inventory.count({
          where: {
            organizationId: user.organizationId,
            status: 'EXPIRED',
          },
        }),
      ]);

    return {
      data: {
        id: 'analytics',
        type: 'analytics' as const,
        attributes: {
          totalItems,
          totalQuantity: totalValue._sum.quantity || 0,
          lowStockItems,
          expiredItems,
        },
      },
    };
  }

  async getStockAlerts(user: CurrentUser, queryParams: any) {
    this.logger.log(`Getting stock alerts for user: ${user.userId}`);

    const alerts = [];

    // Low stock alerts
    const lowStockItems = await this.prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        quantity: { lt: 10 },
        status: 'AVAILABLE',
      },
      include: {
        commodity: true,
        farm: true,
      },
    });

    lowStockItems.forEach((item) => {
      alerts.push({
        id: `low-stock-${item.id}`,
        type: 'alerts',
        attributes: {
          severity: item.quantity < 5 ? 'critical' : 'medium',
          alertType: 'low_stock',
          message: `Low stock: ${item.commodity.name} at ${item.farm?.name || 'Unknown location'}`,
          inventoryId: item.id,
          currentQuantity: item.quantity,
          createdAt: new Date().toISOString(),
        },
      });
    });

    // Filter by severity if requested
    const filteredAlerts = queryParams.severity
      ? alerts.filter(
          (alert) => alert.attributes.severity === queryParams.severity,
        )
      : alerts;

    return {
      data: filteredAlerts,
    };
  }
}
