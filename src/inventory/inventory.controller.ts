import { Controller, UseGuards, Logger, Request, Body } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { inventoryContract } from '../../contracts/inventory.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  InventoryAdjustmentDto,
  InventoryReservationDto,
  InventoryTransferDto,
  InventoryQualityTestDto,
} from './dto/inventory.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  // =============================================================================
  // Basic CRUD Operations
  // =============================================================================

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.getInventory)
  public getInventory(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(inventoryContract.getInventory, async ({ query }) => {
      try {
        const result = await this.inventoryService.findAll(req.user, query);
        this.logger.log(
          `Retrieved inventory items for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get inventory failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve inventory',
          badRequestCode: 'GET_INVENTORY_FAILED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.getInventoryItem)
  public getInventoryItem(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.getInventoryItem,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.findOne(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get inventory item ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.createInventory)
  public createInventory(
    @Body() body: CreateInventoryDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(inventoryContract.createInventory, async () => {
      try {
        const result = await this.inventoryService.create(req.user, body);
        this.logger.log(`Created inventory item for user: ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Create inventory failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to create inventory item',
          badRequestCode: 'CREATE_INVENTORY_FAILED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.updateInventory)
  public updateInventory(
    @Body() body: UpdateInventoryDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.updateInventory,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.update(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Updated inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update inventory ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
            badRequestMessage: 'Failed to update inventory item',
            badRequestCode: 'UPDATE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.deleteInventory)
  public deleteInventory(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.deleteInventory,
      async ({ params }) => {
        try {
          await this.inventoryService.remove(req.user, params.id);
          this.logger.log(
            `Deleted inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 204 as const,
            body: undefined,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Delete inventory ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
          });
        }
      },
    );
  }

  // =============================================================================
  // Inventory Tracking & Movements
  // =============================================================================

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.getInventoryMovements)
  public getInventoryMovements(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.getInventoryMovements,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getMovements(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved movements for inventory ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get inventory movements ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.adjustInventory)
  public adjustInventory(
    @Body() body: InventoryAdjustmentDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.adjustInventory,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.adjustQuantity(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Adjusted inventory ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Adjust inventory ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
            badRequestMessage: 'Failed to adjust inventory',
            badRequestCode: 'ADJUST_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.reserveInventory)
  public reserveInventory(
    @Body() body: InventoryReservationDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.reserveInventory,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.reserveQuantity(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Reserved inventory ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Reserve inventory ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
            badRequestMessage: 'Failed to reserve inventory',
            badRequestCode: 'RESERVE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.releaseInventory)
  public releaseInventory(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.releaseInventory,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.releaseReservation(
            req.user,
            params.id,
            {
              quantity: body.quantity,
              orderId: body.orderId,
              reason: body.reason,
            },
          );
          this.logger.log(
            `Released inventory reservation ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Release inventory ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
            badRequestMessage: 'Failed to release inventory reservation',
            badRequestCode: 'RELEASE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.transferInventory)
  public transferInventory(
    @Body() body: InventoryTransferDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(inventoryContract.transferInventory, async () => {
      try {
        const result = await this.inventoryService.transferInventory(
          req.user,
          body,
        );
        this.logger.log(`Transferred inventory for user: ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Transfer inventory failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to transfer inventory',
          badRequestCode: 'TRANSFER_INVENTORY_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Quality Management
  // =============================================================================

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.getQualityTests)
  public getQualityTests(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.getQualityTests,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getQualityTests(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved quality tests for inventory ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get quality tests ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.addQualityTest)
  public addQualityTest(
    @Body() body: InventoryQualityTestDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.addQualityTest,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.addQualityTest(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Added quality test for inventory ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 201 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Add quality test ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
            badRequestMessage: 'Failed to add quality test',
            badRequestCode: 'ADD_QUALITY_TEST_FAILED',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.updateQualityGrade)
  public updateQualityGrade(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.updateQualityGrade,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.updateQualityGrade(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Updated quality grade for inventory ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update quality grade ${params.id} failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_NOT_FOUND',
            badRequestMessage: 'Failed to update quality grade',
            badRequestCode: 'UPDATE_QUALITY_GRADE_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Analytics & Reporting
  // =============================================================================

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.getInventoryAnalytics)
  public getInventoryAnalytics(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.getInventoryAnalytics,
      async () => {
        try {
          const result = await this.inventoryService.getAnalytics(
            req.user,
          );
          this.logger.log(
            `Retrieved inventory analytics for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get inventory analytics failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve analytics',
            badRequestCode: 'GET_ANALYTICS_FAILED',
          });
        }
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(inventoryContract.getStockAlerts)
  public getStockAlerts(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      inventoryContract.getStockAlerts,
      async ({query}) => {
        try {
          const result = await this.inventoryService.getStockAlerts(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved stock alerts for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get stock alerts failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve stock alerts',
            badRequestCode: 'GET_STOCK_ALERTS_FAILED',
          });
        }
      },
    );
  }
}
