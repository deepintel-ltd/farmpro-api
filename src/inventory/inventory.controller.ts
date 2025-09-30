import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import { FarmAccessGuard } from '../farms/guards/farm-access.guard';
import { inventoryContract } from '../../contracts/inventory.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import {
  RequirePermission,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@Secured(FEATURES.INVENTORY)
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  // =============================================================================
  // Basic CRUD Operations
  // =============================================================================

  @TsRestHandler(inventoryContract.getInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getInventory(
    @Request() req: AuthenticatedRequest,
  ) {
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

  @TsRestHandler(inventoryContract.getInventoryItem)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getInventoryItem(
    @Request() req: AuthenticatedRequest,
  ) {
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
            `Get inventory item failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve inventory item',
            badRequestCode: 'GET_INVENTORY_ITEM_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.createInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.CREATE)
  @UseGuards(FarmAccessGuard)
  public createInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(inventoryContract.createInventory, async ({ body }) => {
      try {
        const result = await this.inventoryService.create(req.user, body.data.attributes);
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

  @TsRestHandler(inventoryContract.updateInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  @UseGuards(FarmAccessGuard)
  public updateInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.updateInventory,
      async ({ params, body }) => {
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
            `Update inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to update inventory item',
            badRequestCode: 'UPDATE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.deleteInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.DELETE)
  @UseGuards(FarmAccessGuard)
  public deleteInventory(
    @Request() req: AuthenticatedRequest,
  ) {
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
            `Delete inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to delete inventory item',
            badRequestCode: 'DELETE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Inventory Management Operations
  // =============================================================================

  @TsRestHandler(inventoryContract.getInventoryMovements)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getInventoryMovements(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getInventoryMovements,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getMovements(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved inventory movements for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get inventory movements failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve inventory movements',
            badRequestCode: 'GET_INVENTORY_MOVEMENTS_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.adjustInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  @RequireRoleLevel(50)
  public adjustInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.adjustInventory,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.adjustQuantity(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Adjusted inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Adjust inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to adjust inventory',
            badRequestCode: 'ADJUST_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.reserveInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  public reserveInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.reserveInventory,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.reserveQuantity(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Reserved inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Reserve inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to reserve inventory',
            badRequestCode: 'RESERVE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.releaseInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  public releaseInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.releaseInventory,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.releaseReservation(
            req.user,
            params.id,
            {
              quantity: body.quantity || 0,
              orderId: body.orderId || '',
              reason: body.reason || 'order_cancelled',
            },
          );
          this.logger.log(
            `Released inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Release inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to release inventory',
            badRequestCode: 'RELEASE_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.transferInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  @RequireRoleLevel(50)
  public transferInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.transferInventory,
      async ({ body }) => {
        try {
          const result = await this.inventoryService.transferInventory(
            req.user,
            body,
          );
          this.logger.log(
            `Transferred inventory for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Transfer inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to transfer inventory',
            badRequestCode: 'TRANSFER_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Quality Management
  // =============================================================================

  @TsRestHandler(inventoryContract.getQualityTests)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getQualityTests(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getQualityTests,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getQualityTests(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved quality tests for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get quality tests failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve quality tests',
            badRequestCode: 'GET_QUALITY_TESTS_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.addQualityTest)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  public addQualityTest(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.addQualityTest,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.addQualityTest(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Added quality test for inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 201 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Add quality test failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to add quality test',
            badRequestCode: 'ADD_QUALITY_TEST_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.updateQualityGrade)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  @RequireRoleLevel(50)
  public updateQualityGrade(
    @Request() req: AuthenticatedRequest,
  ) {
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
            `Updated quality grade for inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update quality grade failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
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

  @TsRestHandler(inventoryContract.getInventoryAnalytics)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getInventoryAnalytics(
    @Request() req: AuthenticatedRequest,
  ) {
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
            badRequestMessage: 'Failed to retrieve inventory analytics',
            badRequestCode: 'GET_INVENTORY_ANALYTICS_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.getStockAlerts)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getStockAlerts(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getStockAlerts,
      async ({ query }) => {
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

  // =============================================================================
  // Batch Management
  // =============================================================================

  @TsRestHandler(inventoryContract.getBatchInventory)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getBatchInventory(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getBatchInventory,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getBatchInventory(
            req.user,
            params.batchNumber,
          );
          this.logger.log(
            `Retrieved batch inventory ${params.batchNumber} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get batch inventory failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Batch not found',
            notFoundCode: 'BATCH_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve batch inventory',
            badRequestCode: 'GET_BATCH_INVENTORY_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.mergeBatches)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  @RequireRoleLevel(50)
  public mergeBatches(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.mergeBatches,
      async ({ params, body }) => {
        try {
          await this.inventoryService.mergeBatches(
            req.user,
            params.batchNumber,
            body,
          );
          this.logger.log(
            `Merged batches for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: { message: 'Batches merged successfully' },
          };
        } catch (error: unknown) {
          this.logger.error(
            `Merge batches failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to merge batches',
            badRequestCode: 'MERGE_BATCHES_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(inventoryContract.splitBatch)
  @RequirePermission(...PERMISSIONS.INVENTORY.UPDATE)
  @RequireRoleLevel(50)
  public splitBatch(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.splitBatch,
      async ({ params, body }) => {
        try {
          await this.inventoryService.splitBatch(
            req.user,
            params.batchNumber,
            body,
          );
          this.logger.log(
            `Split batch ${params.batchNumber} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: { message: 'Batch split successfully' },
          };
        } catch (error: unknown) {
          this.logger.error(
            `Split batch failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to split batch',
            badRequestCode: 'SPLIT_BATCH_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Traceability & Compliance
  // =============================================================================

  @TsRestHandler(inventoryContract.getTraceability)
  @RequirePermission(...PERMISSIONS.INVENTORY.READ)
  public getTraceability(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getTraceability,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getTraceability(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved traceability for inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get traceability failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve traceability',
            badRequestCode: 'GET_TRACEABILITY_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Facility Management
  // =============================================================================

  public getFacilities(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getFacilities,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getFacilities(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved facilities for user: ${req.user.userId}`,
          );

          // Transform the response to match contract expectations
          const transformedResult = {
            data: result.data.map((facility: any) => ({
              ...facility,
              type: 'facilities' as const,
            })),
          };

          return {
            status: 200 as const,
            body: transformedResult,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get facilities failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve facilities',
            badRequestCode: 'GET_FACILITIES_FAILED',
          });
        }
      },
    );
  }

  public getFacility(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getFacility,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getFacility(
            req.user,
            params.facilityId,
          );
          this.logger.log(
            `Retrieved facility ${params.facilityId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get facility failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Facility not found',
            notFoundCode: 'FACILITY_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve facility',
            badRequestCode: 'GET_FACILITY_FAILED',
          });
        }
      },
    );
  }

  public logFacilityConditions(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.logFacilityConditions,
      async ({ params, body }) => {
        try {
          await this.inventoryService.logFacilityConditions(
            req.user,
            params.facilityId,
            body,
          );
          this.logger.log(
            `Logged facility conditions for facility ${params.facilityId} for user: ${req.user.userId}`,
          );

          return {
            status: 201 as const,
            body: { message: 'Facility conditions logged successfully' },
          };
        } catch (error: unknown) {
          this.logger.error(
            `Log facility conditions failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Facility not found',
            notFoundCode: 'FACILITY_NOT_FOUND',
            badRequestMessage: 'Failed to log facility conditions',
            badRequestCode: 'LOG_FACILITY_CONDITIONS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Storage Optimization
  // =============================================================================

  public getStorageOptimization(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getStorageOptimization,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getStorageOptimization(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved storage optimization for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get storage optimization failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve storage optimization',
            badRequestCode: 'GET_STORAGE_OPTIMIZATION_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Valuation & Cost Management
  // =============================================================================

  public getInventoryValuation(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getInventoryValuation,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getInventoryValuation(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved inventory valuation for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get inventory valuation failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve inventory valuation',
            badRequestCode: 'GET_INVENTORY_VALUATION_FAILED',
          });
        }
      },
    );
  }

  public getCostBasis(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getCostBasis,
      async ({ params }) => {
        try {
          const result = await this.inventoryService.getCostBasis(
            req.user,
            params.id,
          );
          this.logger.log(
            `Retrieved cost basis for inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get cost basis failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve cost basis',
            badRequestCode: 'GET_COST_BASIS_FAILED',
          });
        }
      },
    );
  }

  public updateCostBasis(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.updateCostBasis,
      async ({ params, body }) => {
        try {
          const result = await this.inventoryService.updateCostBasis(
            req.user,
            params.id,
            body,
          );
          this.logger.log(
            `Updated cost basis for inventory item ${params.id} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update cost basis failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to update cost basis',
            badRequestCode: 'UPDATE_COST_BASIS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Reporting & Analytics
  // =============================================================================

  public getAgingReport(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getAgingReport,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getAgingReport(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved aging report for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get aging report failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve aging report',
            badRequestCode: 'GET_AGING_REPORT_FAILED',
          });
        }
      },
    );
  }

  public getDemandForecast(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getDemandForecast,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getDemandForecast(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved demand forecast for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get demand forecast failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve demand forecast',
            badRequestCode: 'GET_DEMAND_FORECAST_FAILED',
          });
        }
      },
    );
  }

  public getReorderPoints(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getReorderPoints,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getReorderPoints(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved reorder points for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get reorder points failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve reorder points',
            badRequestCode: 'GET_REORDER_POINTS_FAILED',
          });
        }
      },
    );
  }

  public generateReplenishmentPlan(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.generateReplenishmentPlan,
      async ({ body }) => {
        try {
          const result = await this.inventoryService.generateReplenishmentPlan(
            req.user,
            body,
          );
          this.logger.log(
            `Generated replenishment plan for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Generate replenishment plan failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to generate replenishment plan',
            badRequestCode: 'GENERATE_REPLENISHMENT_PLAN_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Alert Management
  // =============================================================================

  public configureAlerts(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.configureAlerts,
      async ({ body }) => {
        try {
          await this.inventoryService.configureAlerts(
            req.user,
            body,
          );
          this.logger.log(
            `Configured alerts for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: { message: 'Alerts configured successfully' },
          };
        } catch (error: unknown) {
          this.logger.error(
            `Configure alerts failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to configure alerts',
            badRequestCode: 'CONFIGURE_ALERTS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Waste Analysis
  // =============================================================================

  public getWasteAnalysis(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getWasteAnalysis,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getWasteAnalysis(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved waste analysis for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get waste analysis failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve waste analysis',
            badRequestCode: 'GET_WASTE_ANALYSIS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Report Generation
  // =============================================================================

  public generateReports(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.generateReports,
      async ({ body }) => {
        try {
          await this.inventoryService.generateReports(
            req.user,
            body,
          );
          this.logger.log(
            `Generated reports for user: ${req.user.userId}`,
          );

          return {
            status: 202 as const,
            body: { message: 'Report generation initiated successfully' },
          };
        } catch (error: unknown) {
          this.logger.error(
            `Generate reports failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to generate reports',
            badRequestCode: 'GENERATE_REPORTS_FAILED',
          });
        }
      },
    );
  }
}
