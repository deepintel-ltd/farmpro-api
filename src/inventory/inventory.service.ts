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

    try {
      // Verify inventory exists and user has access
      const inventory = await this.findOne(user, inventoryId);

      // Get all activities related to this inventory
      const activities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { metadata: { path: ['inventoryId'], equals: inventoryId } },
            { metadata: { path: ['sourceInventoryId'], equals: inventoryId } },
            { metadata: { path: ['targetInventoryId'], equals: inventoryId } },
          ],
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Transform activities into movement records
      const movements = activities.map(activity => {
        const metadata = activity.metadata as any || {};
        
        // Determine movement type and direction
        let movementType = 'UNKNOWN';
        let quantity = 0;
        let direction = 'NONE';
        
        switch (activity.action) {
          case 'INVENTORY_CREATE':
            movementType = 'INBOUND';
            quantity = metadata.quantity || 0;
            direction = 'IN';
            break;
          case 'INVENTORY_ADJUSTMENT':
            movementType = 'ADJUSTMENT';
            quantity = Math.abs(metadata.adjustment || 0);
            direction = (metadata.adjustment || 0) > 0 ? 'IN' : 'OUT';
            break;
          case 'INVENTORY_RESERVE':
            movementType = 'RESERVE';
            quantity = metadata.quantity || 0;
            direction = 'RESERVED';
            break;
          case 'INVENTORY_TRANSFER':
            movementType = 'TRANSFER';
            quantity = metadata.quantity || 0;
            direction = metadata.fromInventoryId === inventoryId ? 'OUT' : 'IN';
            break;
          case 'INVENTORY_MERGE':
            movementType = 'MERGE';
            quantity = metadata.mergedQuantity || 0;
            direction = metadata.sourceBatchId === inventoryId ? 'OUT' : 'IN';
            break;
          case 'INVENTORY_SPLIT':
            movementType = 'SPLIT';
            quantity = metadata.splitQuantities?.find((q: number, i: number) => 
              metadata.newBatchIds?.[i] === inventoryId
            ) || 0;
            direction = metadata.sourceBatchId === inventoryId ? 'OUT' : 'IN';
            break;
          case 'INVENTORY_QUALITY_TEST':
            movementType = 'QUALITY_TEST';
            quantity = 0;
            direction = 'NONE';
            break;
          default:
            movementType = 'OTHER';
            quantity = 0;
            direction = 'NONE';
        }

        return {
          id: activity.id,
          type: 'inventory-movement',
          attributes: {
            movementType,
            quantity,
            direction,
            reason: metadata.reason || activity.action,
            notes: metadata.notes || '',
            timestamp: activity.timestamp,
            user: activity.user ? {
              id: activity.user.id,
              name: activity.user.name,
              email: activity.user.email,
            } : null,
            metadata: {
              activityType: activity.action,
              originalMetadata: metadata,
            },
          },
        };
      });

      // Calculate movement summary
      const summary = {
        totalMovements: movements.length,
        inboundMovements: movements.filter(m => m.attributes.direction === 'IN').length,
        outboundMovements: movements.filter(m => m.attributes.direction === 'OUT').length,
        reservedMovements: movements.filter(m => m.attributes.direction === 'RESERVED').length,
        totalInboundQuantity: movements
          .filter(m => m.attributes.direction === 'IN')
          .reduce((sum, m) => sum + m.attributes.quantity, 0),
        totalOutboundQuantity: movements
          .filter(m => m.attributes.direction === 'OUT')
          .reduce((sum, m) => sum + m.attributes.quantity, 0),
        firstMovement: movements[movements.length - 1]?.attributes.timestamp,
        lastMovement: movements[0]?.attributes.timestamp,
      };

      return {
        data: movements,
        meta: {
          inventoryId,
          currentQuantity: inventory.data.attributes.quantity,
          summary,
        },
      };
    } catch (error) {
      this.logger.error('Get movements failed:', error);
      throw error;
    }
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

    try {
      // Verify inventory exists and user has access
      const inventory = await this.findOne(user, inventoryId);

      // Get all quality test activities for this inventory
      const activities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          action: 'INVENTORY_QUALITY_TEST',
          metadata: {
            path: ['inventoryId'],
            equals: inventoryId,
          },
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Transform activities into quality test records
      const qualityTests = activities.map(activity => {
        const metadata = activity.metadata as any || {};
        
        return {
          id: activity.id,
          type: 'quality-test',
          attributes: {
            testType: metadata.testType || 'custom',
            testDate: metadata.testDate || activity.timestamp.toISOString(),
            testedBy: metadata.testedBy || (activity.user ? activity.user.name : 'Unknown'),
            results: metadata.results || {},
            certificate: metadata.certificate || null,
            nextTestDue: metadata.nextTestDue || null,
            passed: metadata.results?.passed || false,
            grade: metadata.results?.grade || null,
            notes: metadata.results?.notes || '',
            timestamp: activity.timestamp,
            user: activity.user ? {
              id: activity.user.id,
              name: activity.user.name,
              email: activity.user.email,
            } : null,
          },
        };
      });

      // Calculate quality test summary
      const summary = {
        totalTests: qualityTests.length,
        passedTests: qualityTests.filter(test => test.attributes.passed).length,
        failedTests: qualityTests.filter(test => !test.attributes.passed).length,
        latestTest: qualityTests[0]?.attributes.testDate,
        oldestTest: qualityTests[qualityTests.length - 1]?.attributes.testDate,
        averageGrade: qualityTests.length > 0 
          ? qualityTests
              .filter(test => test.attributes.grade)
              .reduce((sum, test) => {
                const grade = test.attributes.grade;
                // Convert grade to numeric value for average calculation
                const gradeValue = grade === 'A' ? 4 : grade === 'B' ? 3 : grade === 'C' ? 2 : grade === 'D' ? 1 : 0;
                return sum + gradeValue;
              }, 0) / qualityTests.filter(test => test.attributes.grade).length
          : null,
      };

      return {
        data: qualityTests,
        meta: {
          inventoryId,
          currentQuality: inventory.data.attributes.quality,
          summary,
        },
      };
    } catch (error) {
      this.logger.error('Get quality tests failed:', error);
      throw error;
    }
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

  // =============================================================================
  // Batch & Lot Management
  // =============================================================================

  async getBatchInventory(user: CurrentUser, batchNumber: string) {
    this.logger.log(`Getting batch inventory for batch: ${batchNumber}`);

    // Since batchNumber doesn't exist in the schema, we'll search in metadata
    const items = await this.prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        metadata: {
          path: ['batchNumber'],
          equals: batchNumber,
        },
      },
      include: {
        farm: true,
        commodity: true,
        harvest: true,
      },
    });

    return {
      data: items.map((item) => this.formatInventoryItem(item)),
    };
  }

  async mergeBatches(user: CurrentUser, batchNumber: string, mergeData: any) {
    this.logger.log(`Merging batches for user: ${user.userId}`);

    try {
      // Find source batch (the one being merged)
      const sourceBatch = await this.prisma.inventory.findFirst({
        where: {
          organizationId: user.organizationId,
          metadata: {
            path: ['batchNumber'],
            equals: batchNumber,
          },
        },
      });

      if (!sourceBatch) {
        throw new NotFoundException('Source batch not found');
      }

      // Find target batch (the one receiving the merge)
      const targetBatch = await this.prisma.inventory.findFirst({
        where: {
          organizationId: user.organizationId,
          metadata: {
            path: ['batchNumber'],
            equals: mergeData.targetBatchNumber,
          },
        },
      });

      if (!targetBatch) {
        throw new NotFoundException('Target batch not found');
      }

      // Validate merge conditions
      if (sourceBatch.commodityId !== targetBatch.commodityId) {
        throw new BadRequestException('Cannot merge batches of different commodities');
      }

      if (sourceBatch.unit !== targetBatch.unit) {
        throw new BadRequestException('Cannot merge batches with different units');
      }

      // Perform the merge
      const mergedQuantity = sourceBatch.quantity + targetBatch.quantity;
      
      const updatedTargetBatch = await this.prisma.inventory.update({
        where: { id: targetBatch.id },
        data: {
          quantity: mergedQuantity,
          metadata: {
            ...(targetBatch.metadata as any || {}),
            batchNumber: mergeData.targetBatchNumber,
            mergedFrom: batchNumber,
            mergedAt: new Date().toISOString(),
            mergeNotes: mergeData.notes || '',
          },
        },
      });

      // Delete the source batch
      await this.prisma.inventory.delete({
        where: { id: sourceBatch.id },
      });

      // Log the merge operation
      await this.prisma.activity.create({
        data: {
          action: 'INVENTORY_MERGE',
          organizationId: user.organizationId,
          entity: 'Inventory',
          entityId: sourceBatch.id,
          metadata: {
            description: `Merged batch ${batchNumber} into ${mergeData.targetBatchNumber}`,
            sourceBatchId: sourceBatch.id,
            targetBatchId: targetBatch.id,
            mergedQuantity: sourceBatch.quantity,
            finalQuantity: mergedQuantity,
          },
        },
      });

      return {
        data: this.formatInventoryItem(updatedTargetBatch),
      };
    } catch (error) {
      this.logger.error('Batch merge failed:', error);
      throw error;
    }
  }

  async splitBatch(user: CurrentUser, batchNumber: string, splitData: any) {
    this.logger.log(`Splitting batch for user: ${user.userId}`);

    try {
      // Find the source batch
      const sourceBatch = await this.prisma.inventory.findFirst({
        where: {
          organizationId: user.organizationId,
          metadata: {
            path: ['batchNumber'],
            equals: batchNumber,
          },
        },
      });

      if (!sourceBatch) {
        throw new NotFoundException('Source batch not found');
      }

      // Validate split quantities
      const totalSplitQuantity = splitData.splits.reduce((sum: number, split: any) => sum + split.quantity, 0);
      if (totalSplitQuantity > sourceBatch.quantity) {
        throw new BadRequestException('Total split quantity cannot exceed source batch quantity');
      }

      // Create new batches from splits
      const newBatches = [];
      for (const split of splitData.splits) {
        const newBatch = await this.prisma.inventory.create({
          data: {
            organizationId: user.organizationId,
            farmId: sourceBatch.farmId,
            commodityId: sourceBatch.commodityId,
            harvestId: sourceBatch.harvestId,
            quantity: split.quantity,
            unit: sourceBatch.unit,
            quality: sourceBatch.quality,
            location: split.location || sourceBatch.location,
            status: sourceBatch.status,
            metadata: {
              ...(sourceBatch.metadata as any || {}),
              batchNumber: split.batchNumber,
              splitFrom: batchNumber,
              splitAt: new Date().toISOString(),
              splitNotes: split.notes || '',
            },
          },
        });
        newBatches.push(newBatch);
      }

      // Update the source batch with remaining quantity
      const remainingQuantity = sourceBatch.quantity - totalSplitQuantity;
      const updatedSourceBatch = await this.prisma.inventory.update({
        where: { id: sourceBatch.id },
        data: {
          quantity: remainingQuantity,
          metadata: {
            ...(sourceBatch.metadata as any || {}),
            splitAt: new Date().toISOString(),
            splitInto: splitData.splits.map((s: any) => s.batchNumber),
            splitNotes: splitData.notes || '',
          },
        },
      });

      // Log the split operation
      await this.prisma.activity.create({
        data: {
          action: 'INVENTORY_SPLIT',
          organizationId: user.organizationId,
          entity: 'Inventory',
          entityId: sourceBatch.id,
          metadata: {
            description: `Split batch ${batchNumber} into ${splitData.splits.length} new batches`,
            sourceBatchId: sourceBatch.id,
            newBatchIds: newBatches.map(b => b.id),
            splitQuantities: splitData.splits.map((s: any) => s.quantity),
            remainingQuantity,
          },
        },
      });

      return {
        data: {
          source: this.formatInventoryItem(updatedSourceBatch),
          splits: newBatches.map(batch => this.formatInventoryItem(batch)),
        },
      };
    } catch (error) {
      this.logger.error('Batch split failed:', error);
      throw error;
    }
  }

  async getTraceability(user: CurrentUser, inventoryId: string) {
    this.logger.log(`Getting traceability for inventory: ${inventoryId}`);

    try {
      // Verify inventory exists and user has access
      const inventory = await this.findOne(user, inventoryId);

      // Get all activities related to this inventory
      const activities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { metadata: { path: ['inventoryId'], equals: inventoryId } },
            { metadata: { path: ['sourceBatchId'], equals: inventoryId } },
            { metadata: { path: ['targetBatchId'], equals: inventoryId } },
            { metadata: { path: ['newBatchIds'], array_contains: inventoryId } },
          ],
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Get harvest information if available
      let harvestInfo = null;
      if (inventory.data.attributes.harvestId) {
        harvestInfo = await this.prisma.harvest.findUnique({
          where: { id: inventory.data.attributes.harvestId },
          select: {
            id: true,
          },
        });
      }

      // Get farm information
      const farmInfo = inventory.data.attributes.farmId ? await this.prisma.farm.findUnique({
        where: { id: inventory.data.attributes.farmId },
        select: { id: true, name: true, location: true },
      }) : null;

      // Get commodity information
      const commodityInfo = await this.prisma.commodity.findUnique({
        where: { id: inventory.data.attributes.commodityId },
        select: { id: true, name: true, category: true },
      });

      // Build traceability chain
      const traceabilityChain = activities.map(activity => ({
        id: activity.id,
        type: activity.action,
        description: activity.action,
        timestamp: activity.timestamp,
        user: activity.user ? {
          id: activity.user.id,
          name: activity.user.name,
          email: activity.user.email,
        } : null,
        metadata: activity.metadata,
      }));

      return {
        data: {
          id: inventoryId,
          type: 'traceability' as const,
          attributes: {
            inventory: {
              id: inventory.data.id,
              quantity: inventory.data.attributes.quantity,
              unit: inventory.data.attributes.unit,
              quality: inventory.data.attributes.quality,
              location: inventory.data.attributes.location,
              status: inventory.data.attributes.status,
              batchNumber: (inventory.data.attributes.metadata as any)?.batchNumber,
              createdAt: inventory.data.attributes.createdAt,
            },
            farm: farmInfo,
            commodity: commodityInfo,
            harvest: harvestInfo,
            traceabilityChain,
            summary: {
              totalActivities: activities.length,
              firstActivity: activities[activities.length - 1]?.timestamp,
              lastActivity: activities[0]?.timestamp,
              batchOperations: activities.filter(a => 
                ['INVENTORY_MERGE', 'INVENTORY_SPLIT'].includes(a.action)
              ).length,
              qualityTests: activities.filter(a => 
                a.action === 'INVENTORY_QUALITY_TEST'
              ).length,
            },
          },
        },
      };
    } catch (error) {
      this.logger.error('Get traceability failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // Storage & Facility Management
  // =============================================================================

  async getFacilities(user: CurrentUser, queryParams: any) {
    this.logger.log(`Getting facilities for user: ${user.userId}`);

    try {
      // Get all unique facilities from inventory locations
      const facilities = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
          location: { not: null },
        },
        select: {
          location: true,
          metadata: true,
        },
        distinct: ['location'],
      });

      // Process facilities and extract facility information from metadata
      const facilityList = facilities
        .filter(item => item.location)
        .map(item => {
          const metadata = item.metadata as any || {};
          return {
            id: `facility_${item.location}`,
            type: 'facility' as const,
            attributes: {
              name: metadata.facilityName || item.location,
              location: item.location,
              type: metadata.facilityType || 'storage',
              capacity: metadata.capacity || null,
              temperature: metadata.temperature || null,
              humidity: metadata.humidity || null,
              conditions: metadata.conditions || {},
              lastUpdated: metadata.lastUpdated || new Date().toISOString(),
            },
          };
        });

      // Get facility statistics
      const facilityStats = await Promise.all(
        facilityList.map(async (facility) => {
          const inventoryCount = await this.prisma.inventory.count({
            where: {
              organizationId: user.organizationId,
              location: facility.attributes.location,
            },
          });

          const totalQuantity = await this.prisma.inventory.aggregate({
            where: {
              organizationId: user.organizationId,
              location: facility.attributes.location,
            },
            _sum: { quantity: true },
          });

          return {
            ...facility,
            attributes: {
              ...facility.attributes,
              inventoryCount,
              totalQuantity: totalQuantity._sum.quantity || 0,
            },
          };
        })
      );

      return {
        data: facilityStats,
        meta: {
          total: facilityStats.length,
          page: queryParams.page || 1,
          limit: queryParams.limit || 50,
        },
      };
    } catch (error) {
      this.logger.error('Get facilities failed:', error);
      throw error;
    }
  }

  async getFacility(user: CurrentUser, facilityId: string) {
    this.logger.log(`Getting facility: ${facilityId}`);

    try {
      // Extract location from facilityId (format: facility_location)
      const location = facilityId.replace('facility_', '');
      
      // Get all inventory items in this facility
      const inventoryItems = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
          location: location,
        },
        include: {
          commodity: {
            select: { id: true, name: true, category: true },
          },
          farm: {
            select: { id: true, name: true },
          },
        },
      });

      if (inventoryItems.length === 0) {
        throw new NotFoundException('Facility not found');
      }

      // Get facility metadata from the first item
      const facilityMetadata = inventoryItems[0].metadata as any || {};
      
      // Calculate facility statistics
      const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const commodityCount = new Set(inventoryItems.map(item => item.commodityId)).size;
      const farmCount = new Set(inventoryItems.map(item => item.farmId).filter(Boolean)).size;

      // Get recent activities for this facility
      const recentActivities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          metadata: {
            path: ['facilityLocation'],
            equals: location,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return {
        data: {
          id: facilityId,
          type: 'facility' as const,
          attributes: {
            name: facilityMetadata.facilityName || location,
            location: location,
            type: facilityMetadata.facilityType || 'storage',
            capacity: facilityMetadata.capacity || null,
            temperature: facilityMetadata.temperature || null,
            humidity: facilityMetadata.humidity || null,
            conditions: facilityMetadata.conditions || {},
            lastUpdated: facilityMetadata.lastUpdated || new Date().toISOString(),
            statistics: {
              totalItems: inventoryItems.length,
              totalQuantity,
              commodityCount,
              farmCount,
              averageQuantity: inventoryItems.length > 0 ? totalQuantity / inventoryItems.length : 0,
            },
            inventory: inventoryItems.map(item => ({
              id: item.id,
              commodity: item.commodity,
              farm: item.farm,
              quantity: item.quantity,
              unit: item.unit,
              quality: item.quality,
              status: item.status,
              batchNumber: (item.metadata as any)?.batchNumber,
              createdAt: item.createdAt,
            })),
            recentActivities: recentActivities.map(activity => ({
              id: activity.id,
              type: activity.action,
              description: activity.action,
              timestamp: activity.timestamp,
              user: activity.user ? {
                id: activity.user.id,
                name: activity.user.name,
                email: activity.user.email,
              } : null,
            })),
          },
        },
      };
    } catch (error) {
      this.logger.error('Get facility failed:', error);
      throw error;
    }
  }

  async logFacilityConditions(user: CurrentUser, facilityId: string, conditionsData: any) {
    this.logger.log(`Logging facility conditions for facility: ${facilityId}`);

    try {
      const location = facilityId.replace('facility_', '');
      
      // Verify facility exists
      const facilityExists = await this.prisma.inventory.findFirst({
        where: {
          organizationId: user.organizationId,
          location: location,
        },
      });

      if (!facilityExists) {
        throw new NotFoundException('Facility not found');
      }

      // Update facility conditions in metadata for all items in this facility
      const updatedItems = await this.prisma.inventory.updateMany({
        where: {
          organizationId: user.organizationId,
          location: location,
        },
        data: {
          metadata: {
            ...(facilityExists.metadata as any || {}),
            facilityConditions: {
              temperature: conditionsData.temperature,
              humidity: conditionsData.humidity,
              airQuality: conditionsData.airQuality,
              lightLevel: conditionsData.lightLevel,
              pestActivity: conditionsData.pestActivity,
              cleanliness: conditionsData.cleanliness,
              equipmentStatus: conditionsData.equipmentStatus,
              notes: conditionsData.notes,
              loggedAt: new Date().toISOString(),
              loggedBy: user.userId,
            },
            lastUpdated: new Date().toISOString(),
          },
        },
      });

      // Log the condition update activity
      await this.prisma.activity.create({
        data: {
          action: 'FACILITY_CONDITIONS_UPDATE',
          organizationId: user.organizationId,
          entity: 'Facility',
          entityId: location,
          metadata: {
            description: `Updated facility conditions for ${location}`,
            facilityLocation: location,
            conditions: conditionsData,
            itemsUpdated: updatedItems.count,
          },
        },
      });

      return {
        data: {
          id: facilityId,
          type: 'facility-conditions' as const,
          attributes: {
            facilityId,
            location,
            conditions: conditionsData,
            loggedAt: new Date().toISOString(),
            loggedBy: user.userId,
            itemsUpdated: updatedItems.count,
          },
        },
      };
    } catch (error) {
      this.logger.error('Log facility conditions failed:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getStorageOptimization(user: CurrentUser, _queryParams: any) {
    this.logger.log(`Getting storage optimization for user: ${user.userId}`);

    try {
      // Get all inventory items
      const inventoryItems = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
        },
        include: {
          commodity: {
            select: { id: true, name: true, category: true },
          },
          farm: {
            select: { id: true, name: true },
          },
        },
      });

      // Group by location
      const locationGroups = inventoryItems.reduce((groups, item) => {
        const location = item.location || 'Unknown';
        if (!groups[location]) {
          groups[location] = [];
        }
        groups[location].push(item);
        return groups;
      }, {} as Record<string, any[]>);

      // Calculate optimization recommendations
      const recommendations = [];
      const utilizationStats = [];

      for (const [location, items] of Object.entries(locationGroups)) {
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const commodityCount = new Set(items.map(item => item.commodityId)).size;
        const farmCount = new Set(items.map(item => item.farmId).filter(Boolean)).size;
        
        // Calculate utilization (simplified - assumes each location has a capacity)
        const capacity = 1000; // This would come from facility metadata
        const utilization = (totalQuantity / capacity) * 100;

        utilizationStats.push({
          location,
          totalQuantity,
          commodityCount,
          farmCount,
          utilization,
          itemCount: items.length,
        });

        // Generate recommendations based on utilization and other factors
        if (utilization > 90) {
          recommendations.push({
            type: 'HIGH_UTILIZATION',
            priority: 'HIGH',
            location,
            message: `Location ${location} is at ${utilization.toFixed(1)}% capacity`,
            suggestion: 'Consider redistributing inventory or expanding storage',
          });
        } else if (utilization < 20) {
          recommendations.push({
            type: 'LOW_UTILIZATION',
            priority: 'MEDIUM',
            location,
            message: `Location ${location} is only ${utilization.toFixed(1)}% utilized`,
            suggestion: 'Consider consolidating inventory to free up space',
          });
        }

        // Check for commodity mixing (different commodities in same location)
        if (commodityCount > 1) {
          recommendations.push({
            type: 'COMMODITY_MIXING',
            priority: 'LOW',
            location,
            message: `Location ${location} contains ${commodityCount} different commodities`,
            suggestion: 'Consider separating commodities for better organization',
          });
        }

        // Check for old inventory
        const oldItems = items.filter(item => {
          const ageInDays = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return ageInDays > 90;
        });

        if (oldItems.length > 0) {
          recommendations.push({
            type: 'AGING_INVENTORY',
            priority: 'HIGH',
            location,
            message: `${oldItems.length} items in ${location} are over 90 days old`,
            suggestion: 'Review and potentially move or dispose of aging inventory',
          });
        }
      }

      // Calculate overall statistics
      const totalItems = inventoryItems.length;
      const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const averageUtilization = utilizationStats.reduce((sum, stat) => sum + stat.utilization, 0) / utilizationStats.length;

      return {
        data: {
          id: 'storage_optimization',
          type: 'optimization' as const,
          attributes: {
            summary: {
              totalLocations: Object.keys(locationGroups).length,
              totalItems,
              totalQuantity,
              averageUtilization: Math.round(averageUtilization * 10) / 10,
              recommendationsCount: recommendations.length,
            },
            utilizationStats,
            recommendations: recommendations.sort((a, b) => {
              const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            }),
            generatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Get storage optimization failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // Inventory Valuation & Costing
  // =============================================================================

  async getInventoryValuation(user: CurrentUser, _queryParams: any) {
    this.logger.log(`Getting inventory valuation for user: ${user.userId}`);

    const method = _queryParams.method || 'fifo';
    const asOfDate = _queryParams.asOfDate ? new Date(_queryParams.asOfDate) : new Date();

    // Calculate total value based on method
    const items = await this.prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
      },
      include: {
        commodity: true,
      },
    });

    let totalValue = 0;
    const commodityBreakdown = [];

    for (const item of items) {
      // Use a default cost basis since it's not in the schema
      const costBasis = 0; // This would need to be calculated from other sources
      const itemValue = item.quantity * costBasis;
      totalValue += itemValue;

      const existingCommodity = commodityBreakdown.find(c => c.commodityId === item.commodityId);
      if (existingCommodity) {
        existingCommodity.quantity += item.quantity;
        existingCommodity.totalValue += itemValue;
      } else {
        commodityBreakdown.push({
          commodityId: item.commodityId,
          commodityName: item.commodity.name,
          quantity: item.quantity,
          unitValue: costBasis,
          totalValue: itemValue,
        });
      }
    }

    return {
      data: {
        id: 'valuation',
        type: 'valuation' as const,
        attributes: {
          method,
          totalValue,
          commodityBreakdown,
          asOfDate: asOfDate.toISOString(),
        },
      },
    };
  }

  async getCostBasis(user: CurrentUser, inventoryId: string) {
    this.logger.log(`Getting cost basis for inventory: ${inventoryId}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _item = await this.findOne(user, inventoryId);
    // Since costBasis doesn't exist in the schema, use a default value
    const costBasis = 0; // This would need to be calculated from other sources

    return {
      data: {
        id: inventoryId,
        type: 'cost-basis' as const,
        attributes: {
          inventoryId,
          productionCosts: costBasis * 0.7, // 70% production costs
          storageCosts: costBasis * 0.2, // 20% storage costs
          handlingCosts: costBasis * 0.1, // 10% handling costs
          adjustments: [],
          totalCostBasis: costBasis,
          effectiveDate: new Date().toISOString(),
        },
      },
    };
  }

  async updateCostBasis(user: CurrentUser, inventoryId: string, costBasisData: any) {
    this.logger.log(`Updating cost basis for inventory: ${inventoryId}`);

    const item = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        organizationId: user.organizationId,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    // Since costBasis doesn't exist in the schema, store it in metadata
    const updatedItem = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        metadata: {
          ...((item.metadata as object) || {}),
          costBasis: costBasisData.newCostBasis,
          costBasisUpdate: {
            previousCostBasis: (item.metadata as any)?.costBasis || 0,
            newCostBasis: costBasisData.newCostBasis,
            reason: costBasisData.reason,
            notes: costBasisData.notes,
            effectiveDate: costBasisData.effectiveDate,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAgingReport(user: CurrentUser, _queryParams: any) {
    this.logger.log(`Getting aging report for user: ${user.userId}`);

    const items = await this.prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
      },
      include: {
        commodity: true,
      },
    });

    const now = new Date();
    const ageBuckets = [
      { ageRange: '0-30 days', quantity: 0, value: 0, percentage: 0 },
      { ageRange: '31-60 days', quantity: 0, value: 0, percentage: 0 },
      { ageRange: '61-90 days', quantity: 0, value: 0, percentage: 0 },
      { ageRange: '90+ days', quantity: 0, value: 0, percentage: 0 },
    ];

    let totalQuantity = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _totalValue = 0;

    for (const item of items) {
      const ageInDays = Math.floor((now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      // Since costBasis doesn't exist in the schema, use a default value
      const costBasis = (item.metadata as any)?.costBasis || 0;
      const itemValue = item.quantity * costBasis;
      
      totalQuantity += item.quantity;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _totalValue += itemValue;

      if (ageInDays <= 30) {
        ageBuckets[0].quantity += item.quantity;
        ageBuckets[0].value += itemValue;
      } else if (ageInDays <= 60) {
        ageBuckets[1].quantity += item.quantity;
        ageBuckets[1].value += itemValue;
      } else if (ageInDays <= 90) {
        ageBuckets[2].quantity += item.quantity;
        ageBuckets[2].value += itemValue;
      } else {
        ageBuckets[3].quantity += item.quantity;
        ageBuckets[3].value += itemValue;
      }
    }

    // Calculate percentages
    ageBuckets.forEach(bucket => {
      bucket.percentage = totalQuantity > 0 ? (bucket.quantity / totalQuantity) * 100 : 0;
    });

    // Calculate real turnover analysis
    const weightedAge = ageBuckets.reduce((sum, bucket) => {
      const midAge = bucket.ageRange === '0-30 days' ? 15 : 
                    bucket.ageRange === '31-60 days' ? 45 :
                    bucket.ageRange === '61-90 days' ? 75 : 120;
      return sum + (bucket.quantity * midAge);
    }, 0);
    const averageAge = totalQuantity > 0 ? Math.round(weightedAge / totalQuantity) : 0;

    // Calculate turnover rate (simplified - would need historical consumption data)
    const turnoverRate = averageAge > 0 ? Math.round((365 / averageAge) * 100) / 100 : 0;

    // Identify slow moving items (older than 90 days)
    const slowMovingItems = items
      .filter(item => {
        const ageInDays = Math.floor((now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return ageInDays > 90;
      })
      .map(item => ({
        id: item.id,
        commodity: item.commodity?.name || 'Unknown',
        quantity: item.quantity,
        ageInDays: Math.floor((now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        value: item.quantity * ((item.metadata as any)?.costBasis || 0),
      }))
      .sort((a, b) => b.ageInDays - a.ageInDays);

    // Generate recommendations based on actual data
    const recommendations = [];
    if (ageBuckets[3].percentage > 30) {
      recommendations.push('High percentage of inventory over 90 days old - consider promotional pricing');
    }
    if (averageAge > 60) {
      recommendations.push('Average inventory age is high - implement FIFO rotation system');
    }
    if (slowMovingItems.length > 0) {
      recommendations.push(`${slowMovingItems.length} slow-moving items identified - review for disposal or discounting`);
    }
    if (turnoverRate < 6) {
      recommendations.push('Low turnover rate - consider reducing order quantities or improving demand forecasting');
    }

    return {
      data: {
        id: 'aging-report',
        type: 'aging-report' as const,
        attributes: {
          period: 'current',
          ageBuckets,
          turnoverAnalysis: {
            averageAge,
            turnoverRate,
            slowMovingItems,
          },
          recommendations,
          generatedAt: new Date().toISOString(),
        },
      },
    };
  }

  // =============================================================================
  // Forecasting & Planning
  // =============================================================================

  async getDemandForecast(user: CurrentUser, queryParams: any) {
    this.logger.log(`Getting demand forecast for user: ${user.userId}`);

    try {
      const forecastPeriod = queryParams.period || 30; // days
      const commodityId = queryParams.commodityId;
      
      // Get historical inventory movements from activities
      const activities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          action: { in: ['INVENTORY_ADJUSTMENT', 'INVENTORY_TRANSFER', 'INVENTORY_RESERVE'] },
        timestamp: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Get current inventory levels
      const currentInventory = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
          ...(commodityId && { commodityId }),
        },
        include: {
          commodity: {
            select: { id: true, name: true, category: true },
          },
        },
      });

      // Group by commodity
      const commodityGroups = currentInventory.reduce((groups, item) => {
        if (!groups[item.commodityId]) {
          groups[item.commodityId] = {
            commodity: item.commodity,
            items: [],
            totalQuantity: 0,
          };
        }
        groups[item.commodityId].items.push(item);
        groups[item.commodityId].totalQuantity += item.quantity;
        return groups;
      }, {} as Record<string, any>);

      const forecasts = [];

      for (const [commodityId, group] of Object.entries(commodityGroups)) {
        // Calculate historical consumption rate
        const relevantActivities = activities.filter(activity => {
          const metadata = activity.metadata as any;
          return metadata?.commodityId === commodityId || 
                 metadata?.inventoryId && group.items.some((item: any) => item.id === metadata.inventoryId);
        });

        // Calculate average daily consumption
        const consumptionEvents = relevantActivities.filter(activity => 
          activity.action === 'INVENTORY_ADJUSTMENT' && 
          (activity.metadata as any)?.adjustment < 0
        );

        const totalConsumption = consumptionEvents.reduce((sum, activity) => 
          sum + Math.abs((activity.metadata as any)?.adjustment || 0), 0
        );

        const daysOfData = Math.max(1, (Date.now() - new Date(activities[0]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        const averageDailyConsumption = totalConsumption / daysOfData;

        // Calculate forecast
        const forecastedConsumption = averageDailyConsumption * forecastPeriod;
        const currentStock = group.totalQuantity;
        const daysOfStockRemaining = averageDailyConsumption > 0 ? currentStock / averageDailyConsumption : 0;
        const reorderNeeded = daysOfStockRemaining < forecastPeriod;

        // Calculate confidence based on data quality
        const confidence = Math.min(100, Math.max(20, (consumptionEvents.length / 7) * 100));

        forecasts.push({
          commodity: group.commodity,
          currentStock,
          averageDailyConsumption: Math.round(averageDailyConsumption * 100) / 100,
          forecastedConsumption: Math.round(forecastedConsumption * 100) / 100,
          daysOfStockRemaining: Math.round(daysOfStockRemaining * 10) / 10,
          reorderNeeded,
          confidence: Math.round(confidence),
          dataPoints: consumptionEvents.length,
        });
      }

      // Sort by urgency (lowest days of stock remaining first)
      forecasts.sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining);

      return {
        data: {
          id: 'demand_forecast',
          type: 'demand-forecast' as const,
          attributes: {
            forecastPeriod,
            generatedAt: new Date().toISOString(),
            summary: {
              totalCommodities: forecasts.length,
              reorderNeeded: forecasts.filter(f => f.reorderNeeded).length,
              averageConfidence: Math.round(forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length),
            },
            forecasts,
          },
        },
      };
    } catch (error) {
      this.logger.error('Get demand forecast failed:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getReorderPoints(user: CurrentUser, _queryParams: any) {
    this.logger.log(`Getting reorder points for user: ${user.userId}`);

    try {
      const items = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
          status: 'AVAILABLE',
        },
        include: {
          commodity: {
            select: { id: true, name: true, category: true },
          },
        },
      });

      // Get historical consumption data from activities
      const activities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          action: 'INVENTORY_ADJUSTMENT',
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
        },
        orderBy: { timestamp: 'asc' },
      });

      const reorderPoints = [];

      for (const item of items) {
        // Calculate historical consumption for this item
        const itemActivities = activities.filter(activity => {
          const metadata = activity.metadata as any;
          return metadata?.inventoryId === item.id && metadata?.adjustment < 0;
        });

        const totalConsumption = itemActivities.reduce((sum, activity) => 
          sum + Math.abs((activity.metadata as any)?.adjustment || 0), 0
        );

        // Calculate average daily consumption
        const daysOfData = Math.max(1, (Date.now() - new Date(activities[0]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        const averageDailyConsumption = totalConsumption / daysOfData;

        // Calculate lead time (simplified - could be based on supplier data)
        const leadTime = 7; // days
        const safetyStock = Math.max(5, averageDailyConsumption * 2); // 2 days safety stock
        const reorderPoint = Math.max(10, (averageDailyConsumption * leadTime) + safetyStock);
        const reorderQuantity = Math.max(50, averageDailyConsumption * 14); // 2 weeks supply

        // Determine status
        let status = 'OK';
        if (item.quantity <= reorderPoint) {
          status = 'REORDER_NEEDED';
        } else if (item.quantity <= reorderPoint * 1.2) {
          status = 'LOW_STOCK';
        }

        reorderPoints.push({
          commodityId: item.commodityId,
          commodityName: item.commodity.name,
          currentStock: item.quantity,
          reorderPoint: Math.round(reorderPoint * 100) / 100,
          reorderQuantity: Math.round(reorderQuantity * 100) / 100,
          safetyStock: Math.round(safetyStock * 100) / 100,
          leadTime,
          averageDailyConsumption: Math.round(averageDailyConsumption * 100) / 100,
          status,
          daysOfStockRemaining: averageDailyConsumption > 0 ? Math.round((item.quantity / averageDailyConsumption) * 10) / 10 : 0,
          urgency: item.quantity < 10 ? 'critical' : item.quantity < 25 ? 'high' : 'medium',
        });
      }

      // Sort by urgency
      reorderPoints.sort((a, b) => {
        const urgencyOrder = { 'critical': 3, 'high': 2, 'medium': 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

      return {
        data: {
          id: 'reorder-points',
          type: 'reorder-points' as const,
          attributes: {
            reorderPoints,
            summary: {
              total: reorderPoints.length,
              reorderNeeded: reorderPoints.filter(rp => rp.status === 'REORDER_NEEDED').length,
              lowStock: reorderPoints.filter(rp => rp.status === 'LOW_STOCK').length,
            },
            generatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Get reorder points failed:', error);
      throw error;
    }
  }

  async generateReplenishmentPlan(user: CurrentUser, planData: any) {
    this.logger.log(`Generating replenishment plan for user: ${user.userId}`);

    try {
      const planPeriod = planData.period || 30; // days
      const priority = planData.priority || 'ALL'; // ALL, HIGH, MEDIUM, LOW
      
      // Get current inventory levels
      const items = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
          status: 'AVAILABLE',
        },
        include: {
          commodity: {
            select: { id: true, name: true, category: true },
          },
        },
      });

      // Get reorder points data
      const reorderPoints = await this.getReorderPoints(user, {});
      const reorderData = reorderPoints.data.attributes.reorderPoints;

      // Generate replenishment recommendations
      const replenishmentItems = [];
      let totalEstimatedCost = 0;

      for (const item of items) {
        const reorderInfo = reorderData.find(rp => rp.commodityId === item.commodityId);
        
        if (!reorderInfo || reorderInfo.status === 'OK') {
          continue;
        }

        // Calculate replenishment quantity
        const currentStock = item.quantity;
        const reorderPoint = reorderInfo.reorderPoint;
        const reorderQuantity = reorderInfo.reorderQuantity;
        const safetyStock = reorderInfo.safetyStock;
        
        // Calculate how much to order
        let orderQuantity = 0;
        if (currentStock <= reorderPoint) {
          // Order enough to reach safety stock + reorder quantity
          orderQuantity = Math.max(reorderQuantity, (safetyStock + reorderQuantity) - currentStock);
        }

        if (orderQuantity > 0) {
          // Estimate cost (simplified - would use actual supplier pricing)
          const estimatedUnitCost = (item.metadata as any)?.costBasis || 10; // Default cost
          const estimatedCost = orderQuantity * estimatedUnitCost;
          totalEstimatedCost += estimatedCost;

          // Determine priority
          let itemPriority = 'MEDIUM';
          if (reorderInfo.urgency === 'critical') {
            itemPriority = 'HIGH';
          } else if (reorderInfo.daysOfStockRemaining < 3) {
            itemPriority = 'HIGH';
          } else if (reorderInfo.daysOfStockRemaining < 7) {
            itemPriority = 'MEDIUM';
          } else {
            itemPriority = 'LOW';
          }

          // Filter by priority if specified
          if (priority !== 'ALL' && itemPriority !== priority) {
            continue;
          }

          replenishmentItems.push({
            inventoryId: item.id,
            commodity: item.commodity,
            currentStock,
            reorderPoint,
            orderQuantity: Math.round(orderQuantity * 100) / 100,
            estimatedUnitCost: Math.round(estimatedUnitCost * 100) / 100,
            estimatedTotalCost: Math.round(estimatedCost * 100) / 100,
            priority: itemPriority,
            urgency: reorderInfo.urgency,
            daysOfStockRemaining: reorderInfo.daysOfStockRemaining,
            leadTime: reorderInfo.leadTime,
            suggestedOrderDate: new Date(Date.now() + (reorderInfo.leadTime - reorderInfo.daysOfStockRemaining) * 24 * 60 * 60 * 1000),
          });
        }
      }

      // Sort by priority and urgency
      replenishmentItems.sort((a, b) => {
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const urgencyOrder = { 'critical': 3, 'high': 2, 'medium': 1 };
        
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

      // Generate plan summary
      const summary = {
        totalItems: replenishmentItems.length,
        highPriorityItems: replenishmentItems.filter(item => item.priority === 'HIGH').length,
        totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
        averageOrderValue: replenishmentItems.length > 0 ? Math.round((totalEstimatedCost / replenishmentItems.length) * 100) / 100 : 0,
        planPeriod,
        generatedAt: new Date().toISOString(),
      };

      return {
        data: {
          id: 'replenishment_plan',
          type: 'replenishment-plan' as const,
          attributes: {
            summary,
            items: replenishmentItems,
            recommendations: {
              immediateOrders: replenishmentItems.filter(item => item.priority === 'HIGH').length,
              plannedOrders: replenishmentItems.filter(item => item.priority === 'MEDIUM').length,
              futureOrders: replenishmentItems.filter(item => item.priority === 'LOW').length,
            },
          },
        },
      };
    } catch (error) {
      this.logger.error('Generate replenishment plan failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // Additional Analytics & Reporting
  // =============================================================================

  async configureAlerts(user: CurrentUser, alertConfig: any) {
    this.logger.log(`Configuring alerts for user: ${user.userId}`);

    try {
      // Store alert configuration in organization metadata
      const organization = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Update organization metadata with alert configuration
      const updatedOrganization = await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          metadata: {
            ...(organization.metadata as any || {}),
            alertConfiguration: {
              lowStockThreshold: alertConfig.lowStockThreshold || 10,
              expiryWarningDays: alertConfig.expiryWarningDays || 7,
              qualityTestReminderDays: alertConfig.qualityTestReminderDays || 30,
              emailNotifications: alertConfig.emailNotifications || true,
              smsNotifications: alertConfig.smsNotifications || false,
              alertRecipients: alertConfig.alertRecipients || [user.userId],
              enabledAlerts: alertConfig.enabledAlerts || [
                'LOW_STOCK',
                'EXPIRY_WARNING',
                'QUALITY_TEST_DUE',
                'REORDER_REQUIRED'
              ],
              configuredAt: new Date().toISOString(),
              configuredBy: user.userId,
            },
          },
        },
      });

      // Log the alert configuration activity
      await this.prisma.activity.create({
        data: {
          action: 'ALERT_CONFIGURATION_UPDATE',
          organizationId: user.organizationId,
          entity: 'Organization',
          entityId: user.organizationId,
          metadata: {
            description: 'Updated inventory alert configuration',
            alertConfiguration: alertConfig,
          },
        },
      });

      return {
        data: {
          id: 'alert_configuration',
          type: 'alert-configuration' as const,
          attributes: {
            configuration: (updatedOrganization.metadata as any)?.alertConfiguration,
            configuredAt: new Date().toISOString(),
            configuredBy: user.userId,
          },
        },
      };
    } catch (error) {
      this.logger.error('Configure alerts failed:', error);
      throw error;
    }
  }

  async getWasteAnalysis(user: CurrentUser, queryParams: any) {
    this.logger.log(`Getting waste analysis for user: ${user.userId}`);

    try {
      const period = queryParams.period || 30; // days
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      // Get waste-related activities
      const wasteActivities = await this.prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          action: { in: ['INVENTORY_ADJUSTMENT', 'INVENTORY_DISPOSE'] },
          timestamp: { gte: startDate },
          OR: [
            { action: { contains: 'waste', mode: 'insensitive' } },
            { action: { contains: 'dispose', mode: 'insensitive' } },
            { action: { contains: 'spoiled', mode: 'insensitive' } },
            { action: { contains: 'damaged', mode: 'insensitive' } },
          ],
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Get inventory items that might be waste (old, low quality, etc.)
      const oldItems = await this.prisma.inventory.findMany({
        where: {
          organizationId: user.organizationId,
          createdAt: { lte: startDate },
          status: { in: ['AVAILABLE', 'RESERVED'] },
        },
        include: {
          commodity: {
            select: { id: true, name: true, category: true },
          },
        },
      });

      // Calculate waste metrics
      const wasteByCommodity = {};
      const wasteByReason = {};
      let totalWasteQuantity = 0;
      let totalWasteValue = 0;

      for (const activity of wasteActivities) {
        const metadata = activity.metadata as any || {};
        const quantity = Math.abs(metadata.adjustment || 0);
        const commodityId = metadata.commodityId;
        const reason = metadata.reason || 'Unknown';

        totalWasteQuantity += quantity;
        totalWasteValue += quantity * (metadata.costBasis || 0);

        // Group by commodity
        if (!wasteByCommodity[commodityId]) {
          wasteByCommodity[commodityId] = {
            commodityId,
            quantity: 0,
            value: 0,
            activities: 0,
          };
        }
        wasteByCommodity[commodityId].quantity += quantity;
        wasteByCommodity[commodityId].value += quantity * (metadata.costBasis || 0);
        wasteByCommodity[commodityId].activities += 1;

        // Group by reason
        if (!wasteByReason[reason]) {
          wasteByReason[reason] = {
            reason,
            quantity: 0,
            value: 0,
            activities: 0,
          };
        }
        wasteByReason[reason].quantity += quantity;
        wasteByReason[reason].value += quantity * (metadata.costBasis || 0);
        wasteByReason[reason].activities += 1;
      }

      // Identify potential waste items (old inventory)
      const potentialWaste = oldItems
        .filter(item => {
          const ageInDays = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return ageInDays > 90 || (item.quality && item.quality.toLowerCase().includes('poor'));
        })
        .map(item => ({
          id: item.id,
          commodity: item.commodity,
          quantity: item.quantity,
          ageInDays: Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          quality: item.quality,
          value: item.quantity * ((item.metadata as any)?.costBasis || 0),
        }));

      // Calculate waste rate
      const totalInventoryValue = await this.prisma.inventory.aggregate({
        where: {
          organizationId: user.organizationId,
          status: { in: ['AVAILABLE', 'RESERVED'] },
        },
        _sum: { quantity: true },
      });

      const wasteRate = totalInventoryValue._sum.quantity > 0 
        ? (totalWasteQuantity / totalInventoryValue._sum.quantity) * 100 
        : 0;

      return {
        data: {
          id: 'waste-analysis',
          type: 'waste-analysis' as const,
          attributes: {
            period,
            summary: {
              totalWasteQuantity: Math.round(totalWasteQuantity * 100) / 100,
              totalWasteValue: Math.round(totalWasteValue * 100) / 100,
              wasteRate: Math.round(wasteRate * 100) / 100,
              wasteActivities: wasteActivities.length,
              potentialWasteItems: potentialWaste.length,
            },
            wasteByCommodity: Object.values(wasteByCommodity),
            wasteByReason: Object.values(wasteByReason),
            potentialWaste,
            recentWasteActivities: wasteActivities.slice(0, 10).map(activity => ({
              id: activity.id,
              type: activity.action,
              description: activity.action,
              quantity: Math.abs((activity.metadata as any)?.adjustment || 0),
              reason: (activity.metadata as any)?.reason || 'Unknown',
              timestamp: activity.timestamp,
              user: activity.user ? {
                id: activity.user.id,
                name: activity.user.name,
                email: activity.user.email,
              } : null,
            })),
            generatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Get waste analysis failed:', error);
      throw error;
    }
  }

  async generateReports(user: CurrentUser, reportData: any) {
    this.logger.log(`Generating reports for user: ${user.userId}`);

    try {
      const reportType = reportData.type || 'inventory_summary';
      const format = reportData.format || 'json';
      const period = reportData.period || 30; // days
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      let report = {};

      switch (reportType) {
        case 'inventory_summary':
          report = await this.generateInventorySummaryReport(user, startDate);
          break;
        case 'movement_analysis':
          report = await this.generateMovementAnalysisReport(user, startDate);
          break;
        case 'valuation_report':
          report = await this.generateValuationReport(user, startDate);
          break;
        case 'quality_report':
          report = await this.generateQualityReport(user, startDate);
          break;
        case 'waste_report':
          report = await this.generateWasteReport(user, startDate);
          break;
        default:
          throw new BadRequestException(`Unknown report type: ${reportType}`);
      }

      // Log report generation activity
      await this.prisma.activity.create({
        data: {
          action: 'REPORT_GENERATED',
          organizationId: user.organizationId,
          entity: 'Report',
          entityId: 'inventory-report',
          metadata: {
            description: `Generated ${reportType} report`,
            reportType,
            format,
            period,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      return {
        data: {
          id: `report_${Date.now()}`,
          type: 'report' as const,
          attributes: {
            reportType,
            format,
            period,
            generatedAt: new Date().toISOString(),
            generatedBy: user.userId,
            data: report,
          },
        },
      };
    } catch (error) {
      this.logger.error('Generate reports failed:', error);
      throw error;
    }
  }

  private async generateInventorySummaryReport(user: CurrentUser, startDate: Date) {
    const items = await this.prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: startDate },
      },
      include: {
        commodity: { select: { id: true, name: true, category: true } },
        farm: { select: { id: true, name: true } },
      },
    });

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => 
      sum + (item.quantity * ((item.metadata as any)?.costBasis || 0)), 0
    );

    return {
      summary: {
        totalItems: items.length,
        totalQuantity,
        totalValue,
        averageValue: items.length > 0 ? totalValue / items.length : 0,
      },
      byCommodity: this.groupByCommodity(items),
      byFarm: this.groupByFarm(items),
      byStatus: this.groupByStatus(items),
    };
  }

  private async generateMovementAnalysisReport(user: CurrentUser, startDate: Date) {
    const activities = await this.prisma.activity.findMany({
      where: {
        organizationId: user.organizationId,
        action: { in: ['INVENTORY_CREATE', 'INVENTORY_ADJUSTMENT', 'INVENTORY_TRANSFER'] },
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    const movements = activities.map(activity => ({
      type: activity.action,
        description: activity.action,
      timestamp: activity.timestamp,
      metadata: activity.metadata,
    }));

    return {
      totalMovements: movements.length,
      movements,
      dailyMovements: this.groupByDay(movements),
    };
  }

  private async generateValuationReport(user: CurrentUser, startDate: Date) {
    const items = await this.prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: startDate },
      },
      include: {
        commodity: { select: { id: true, name: true, category: true } },
      },
    });

    const valuations = items.map(item => ({
      id: item.id,
      commodity: item.commodity.name,
      quantity: item.quantity,
      unit: item.unit,
      costBasis: (item.metadata as any)?.costBasis || 0,
      totalValue: item.quantity * ((item.metadata as any)?.costBasis || 0),
    }));

    const totalValue = valuations.reduce((sum, v) => sum + v.totalValue, 0);

    return {
      totalValue,
      valuations,
      byCommodity: this.groupValuationsByCommodity(valuations),
    };
  }

  private async generateQualityReport(user: CurrentUser, startDate: Date) {
    const qualityTests = await this.prisma.activity.findMany({
      where: {
        organizationId: user.organizationId,
        action: 'INVENTORY_QUALITY_TEST',
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    return {
      totalTests: qualityTests.length,
      passedTests: qualityTests.filter(test => 
        (test.metadata as any)?.results?.passed
      ).length,
      failedTests: qualityTests.filter(test => 
        !(test.metadata as any)?.results?.passed
      ).length,
      tests: qualityTests.map(test => ({
        id: test.id,
        description: test.action,
        results: (test.metadata as any)?.results || {},
        timestamp: test.timestamp,
      })),
    };
  }

  private async generateWasteReport(user: CurrentUser, startDate: Date) {
    const wasteActivities = await this.prisma.activity.findMany({
      where: {
        organizationId: user.organizationId,
        action: 'INVENTORY_ADJUSTMENT',
        timestamp: { gte: startDate },
        OR: [
          { action: { contains: 'waste', mode: 'insensitive' } },
          { action: { contains: 'dispose', mode: 'insensitive' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
    });

    const totalWaste = wasteActivities.reduce((sum, activity) => 
      sum + Math.abs((activity.metadata as any)?.adjustment || 0), 0
    );

    return {
      totalWaste,
      wasteActivities: wasteActivities.length,
      activities: wasteActivities.map(activity => ({
        id: activity.id,
        description: activity.action,
        quantity: Math.abs((activity.metadata as any)?.adjustment || 0),
        reason: (activity.metadata as any)?.reason || 'Unknown',
        timestamp: activity.timestamp,
      })),
    };
  }

  private groupByCommodity(items: any[]) {
    const groups = {};
    items.forEach(item => {
      const commodityId = item.commodityId;
      if (!groups[commodityId]) {
        groups[commodityId] = {
          commodity: item.commodity,
          quantity: 0,
          value: 0,
          count: 0,
        };
      }
      groups[commodityId].quantity += item.quantity;
      groups[commodityId].value += item.quantity * ((item.metadata as any)?.costBasis || 0);
      groups[commodityId].count += 1;
    });
    return Object.values(groups);
  }

  private groupByFarm(items: any[]) {
    const groups = {};
    items.forEach(item => {
      const farmId = item.farmId || 'unknown';
      if (!groups[farmId]) {
        groups[farmId] = {
          farm: item.farm || { id: 'unknown', name: 'Unknown' },
          quantity: 0,
          value: 0,
          count: 0,
        };
      }
      groups[farmId].quantity += item.quantity;
      groups[farmId].value += item.quantity * ((item.metadata as any)?.costBasis || 0);
      groups[farmId].count += 1;
    });
    return Object.values(groups);
  }

  private groupByStatus(items: any[]) {
    const groups = {};
    items.forEach(item => {
      const status = item.status;
      if (!groups[status]) {
        groups[status] = { status, quantity: 0, value: 0, count: 0 };
      }
      groups[status].quantity += item.quantity;
      groups[status].value += item.quantity * ((item.metadata as any)?.costBasis || 0);
      groups[status].count += 1;
    });
    return Object.values(groups);
  }

  private groupByDay(movements: any[]) {
    const groups = {};
    movements.forEach(movement => {
      const day = movement.timestamp.toISOString().split('T')[0];
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(movement);
    });
    return groups;
  }

  private groupValuationsByCommodity(valuations: any[]) {
    const groups = {};
    valuations.forEach(valuation => {
      const commodity = valuation.commodity;
      if (!groups[commodity]) {
        groups[commodity] = { commodity, totalValue: 0, quantity: 0, count: 0 };
      }
      groups[commodity].totalValue += valuation.totalValue;
      groups[commodity].quantity += valuation.quantity;
      groups[commodity].count += 1;
    });
    return Object.values(groups);
  }
}
