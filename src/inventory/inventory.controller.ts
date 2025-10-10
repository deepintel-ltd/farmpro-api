// import { Controller, UseGuards, Logger, Request, BadRequestException } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import { inventoryContract } from '../../contracts/inventory.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
// import { FarmAccessGuard } from '../farms/guards/farm-access.guard';import {
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
  @RequirePermission("inventory", "read")
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
  @RequirePermission("inventory", "read")
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
  @RequirePermission("inventory", "create")
  
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
  @RequirePermission("inventory", "update")
  
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
  @RequirePermission("inventory", "delete")
  
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
  @RequirePermission("inventory", "read")
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




  @TsRestHandler(inventoryContract.updateInventoryQuantity)
  @RequirePermission("inventory", "update")
  public updateInventoryQuantity(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.updateInventoryQuantity,
      async ({ params, body }) => {
        try {
          const { adjustmentType, quantity, reason, orderId } = body.data.attributes;
          
          if (!adjustmentType) {
            throw new BadRequestException('adjustmentType is required');
          }
          
          if (quantity === undefined || quantity === null) {
            throw new BadRequestException('quantity is required');
          }

          const result = await this.inventoryService.updateInventoryQuantity(
            req.user,
            params.id,
            {
              adjustmentType,
              quantity,
              reason,
              orderId,
            },
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(`Quantity operation failed for user ${req.user.userId}:`, error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Inventory item not found',
            notFoundCode: 'INVENTORY_ITEM_NOT_FOUND',
            badRequestMessage: 'Failed to perform quantity operation',
            badRequestCode: 'QUANTITY_OPERATION_FAILED',
          });
        }
      },
    );
  }
  @TsRestHandler(inventoryContract.transferInventory)
  @RequirePermission("inventory", "update")
  // @RequireRoleLevel(...) - replaced with permission check
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
  @RequirePermission("inventory", "read")
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
  @RequirePermission("inventory", "update")
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
  @RequirePermission("inventory", "update")
  // @RequireRoleLevel(...) - replaced with permission check
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
  @RequirePermission("inventory", "read")
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
  @RequirePermission("inventory", "read")
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
  @RequirePermission("inventory", "read")
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



  @TsRestHandler(inventoryContract.updateBatch)
  @RequirePermission("inventory", "update")
  // @RequireRoleLevel(...) - replaced with permission check
  public updateBatch(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.updateBatch,
      async ({ params, body }) => {
        try {
          const { operation, sourceBatches, newBatchNumber, reason, splits } = body.data.attributes;
          
          if (!operation) {
            throw new BadRequestException('operation is required');
          }

          const result = await this.inventoryService.updateBatch(
            req.user,
            params.batchNumber,
            {
              operation: operation as 'merge' | 'split',
              sourceBatches,
              newBatchNumber,
              reason,
              splits,
            },
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(`Batch operation failed for user ${req.user.userId}:`, error);

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to perform batch operation',
            badRequestCode: 'BATCH_OPERATION_FAILED',
          });
        }
      },
    );
  }
  // =============================================================================
  // Traceability & Compliance
  // =============================================================================

  @TsRestHandler(inventoryContract.getTraceability)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.getFacilities)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.getFacility)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.logFacilityConditions)
  @RequirePermission("inventory", "update")
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

  @TsRestHandler(inventoryContract.getStorageOptimization)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.getInventoryValuation)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.getCostBasis)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.updateCostBasis)
  @RequirePermission("inventory", "update")
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

  @TsRestHandler(inventoryContract.getAgingReport)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.getDemandForecast)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.getReorderPoints)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.generateReplenishmentPlan)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.configureAlerts)
  @RequirePermission("inventory", "update")
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

  @TsRestHandler(inventoryContract.getWasteAnalysis)
  @RequirePermission("inventory", "read")
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

  @TsRestHandler(inventoryContract.generateReports)
  @RequirePermission("inventory", "read")
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

  // =============================================================================
  // Farm-to-Market Integration - Commodities Value
  // =============================================================================

  @TsRestHandler(inventoryContract.getCommoditiesValue)
  @RequirePermission("inventory", "read")
  public getCommoditiesValue(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      inventoryContract.getCommoditiesValue,
      async ({ query }) => {
        try {
          const result = await this.inventoryService.getCommoditiesValue(
            req.user,
            query,
          );
          this.logger.log(
            `Retrieved commodities value for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get commodities value failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Failed to retrieve commodities value',
            badRequestCode: 'GET_COMMODITIES_VALUE_FAILED',
          });
        }
      },
    );
  }
}
