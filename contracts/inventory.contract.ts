import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  InventoryResourceSchema,
  InventoryCollectionSchema,
  CreateInventoryRequestSchema,
  UpdateInventoryRequestSchema,
  InventoryMovementCollectionSchema,
  InventoryTransferRequestSchema,
  InventoryQualityTestRequestSchema,
  InventoryQualityTestCollectionSchema,
  JsonApiErrorResponseSchema,
} from './schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  AllQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  UuidPathParam,
  CuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Inventory Contracts
// =============================================================================

export const inventoryContract = c.router({
  // =============================================================================
  // Basic CRUD Operations
  // =============================================================================

  // Get all inventory items
  getInventory: {
    method: 'GET',
    path: '/inventory',
    query: AllQueryParams.extend({
      farmId: z.string().cuid().optional(),
      commodityId: z.string().cuid().optional(),
      status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'CONSUMED', 'EXPIRED']).optional(),
      location: z.string().optional(),
      qualityGrade: z.enum(['premium', 'grade_a', 'grade_b', 'standard']).optional(),
      lowStock: z.boolean().optional(),
      expiryAlert: z.boolean().optional(),
    }),
    responses: {
      200: InventoryCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get inventory items with filtering options',
  },

  // Get single inventory item
  getInventoryItem: {
    method: 'GET',
    path: '/inventory/:id',
    pathParams: UuidPathParam('Inventory'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get detailed inventory item information',
  },

  // Create inventory item
  createInventory: {
    method: 'POST',
    path: '/inventory',
    body: CreateInventoryRequestSchema,
    responses: {
      201: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Add new inventory item',
  },

  // Update inventory item
  updateInventory: {
    method: 'PATCH',
    path: '/inventory/:id',
    pathParams: UuidPathParam('Inventory'),
    body: UpdateInventoryRequestSchema,
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update inventory details',
  },

  // Delete inventory item
  deleteInventory: {
    method: 'DELETE',
    path: '/inventory/:id',
    pathParams: UuidPathParam('Inventory'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Remove inventory item',
  },

  // =============================================================================
  // Inventory Tracking & Movements
  // =============================================================================

  // Get inventory movements
  getInventoryMovements: {
    method: 'GET',
    path: '/inventory/:id/movements',
    pathParams: UuidPathParam('Inventory'),
    query: AllQueryParams,
    responses: {
      200: InventoryMovementCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get inventory movement history',
  },


  // Quantity operations
  updateInventoryQuantity: {
    method: 'PATCH',
    path: '/inventory/:id/quantity',
    pathParams: UuidPathParam('Inventory'),
    body: z.object({
      data: z.object({
        type: z.literal('inventory-adjustments'),
        attributes: z.object({
          adjustmentType: z.enum(['adjust', 'reserve', 'release']),
          quantity: z.number().positive(),
          reason: z.string().optional(),
          orderId: z.string().cuid().optional(),
        }),
      }),
    }),
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update inventory quantity (adjust/reserve/release)',
  },

  // Transfer inventory
  transferInventory: {
    method: 'POST',
    path: '/inventory/transfer',
    body: InventoryTransferRequestSchema,
    responses: {
      201: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Transfer inventory between locations',
  },

  // =============================================================================
  // Quality Management
  // =============================================================================

  // Get quality tests
  getQualityTests: {
    method: 'GET',
    path: '/inventory/:id/quality-tests',
    pathParams: UuidPathParam('Inventory'),
    query: AllQueryParams,
    responses: {
      200: InventoryQualityTestCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get quality test results',
  },

  // Add quality test
  addQualityTest: {
    method: 'POST',
    path: '/inventory/:id/quality-tests',
    pathParams: UuidPathParam('Inventory'),
    body: InventoryQualityTestRequestSchema,
    responses: {
      201: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Add quality test result',
  },

  // Update quality grade
  updateQualityGrade: {
    method: 'PUT',
    path: '/inventory/:id/quality-grade',
    pathParams: UuidPathParam('Inventory'),
    body: z.object({
      newGrade: z.string(),
      reason: z.enum(['retest', 'deterioration', 'upgrade', 'market_demand']),
      evidence: z.array(z.string()).optional(),
      assessedBy: z.string(),
    }),
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update quality grade based on assessment',
  },

  // =============================================================================
  // Analytics & Reporting
  // =============================================================================

  // Get inventory analytics
  getInventoryAnalytics: {
    method: 'GET',
    path: '/inventory/analytics',
    query: z.object({
      period: z.string().optional(),
      metric: z.string().optional(),
      farmId: z.string().cuid().optional(),
      commodityId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('analytics'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get inventory analytics dashboard',
  },

  // Get stock alerts
  getStockAlerts: {
    method: 'GET',
    path: '/inventory/stock-alerts',
    query: z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      type: z.enum(['low_stock', 'expiry', 'quality']).optional(),
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('alerts'),
          attributes: z.record(z.string(), z.any()),
        })),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get current stock alerts',
  },

  // =============================================================================
  // Batch & Lot Management
  // =============================================================================

  // Get batch inventory
  getBatchInventory: {
    method: 'GET',
    path: '/inventory/batches/:batchNumber',
    pathParams: z.object({
      batchNumber: z.string(),
    }),
    responses: {
      200: InventoryCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all inventory items in a batch',
  },


  // Batch operations
  updateBatch: {
    method: 'PATCH',
    path: '/inventory/batches/:batchNumber',
    pathParams: z.object({
      batchNumber: z.string(),
    }),
    body: z.object({
      data: z.object({
        type: z.literal('batch-operations'),
        attributes: z.object({
          operation: z.enum(['merge', 'split']),
          // For merge operations
          sourceBatches: z.array(z.string()).optional(),
          newBatchNumber: z.string().optional(),
          reason: z.string().optional(),
          // For split operations
          splits: z.array(z.object({
            quantity: z.number().positive(),
            newBatchNumber: z.string(),
            location: z.object({
              facility: z.string(),
              section: z.string().optional(),
            }),
            notes: z.string().optional(),
          })).optional(),
        }),
      }),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('batch-operations'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
            operation: z.string(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Update batch (merge/split)',
  },

  // Get traceability
  getTraceability: {
    method: 'GET',
    path: '/inventory/traceability/:id',
    pathParams: UuidPathParam('Inventory'),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('traceability'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get complete traceability chain',
  },

  // =============================================================================
  // Storage & Facility Management
  // =============================================================================

  // Get facilities
  getFacilities: {
    method: 'GET',
    path: '/inventory/facilities',
    query: z.object({
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('facilities'),
          attributes: z.record(z.string(), z.any()),
        })),
      }),
      ...CommonErrorResponses,
    },
    summary: 'List storage facilities and capacity',
  },

  // Get facility details
  getFacility: {
    method: 'GET',
    path: '/inventory/facilities/:facilityId',
    pathParams: z.object({
      facilityId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('facility'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get facility details and contents',
  },

  // Log facility conditions
  logFacilityConditions: {
    method: 'POST',
    path: '/inventory/facilities/:facilityId/conditions',
    pathParams: z.object({
      facilityId: z.string(),
    }),
    body: z.object({
      temperature: z.number(),
      humidity: z.number(),
      condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
      issues: z.string().optional(),
      recordedBy: z.string(),
      recordedAt: z.string().datetime(),
    }),
    responses: {
      201: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Log facility conditions',
  },

  // Get storage optimization
  getStorageOptimization: {
    method: 'GET',
    path: '/inventory/storage-optimization',
    query: z.object({
      farmId: z.string().cuid().optional(),
      commodityId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('optimization'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get storage optimization recommendations',
  },

  // =============================================================================
  // Inventory Valuation & Costing
  // =============================================================================

  // Get inventory valuation
  getInventoryValuation: {
    method: 'GET',
    path: '/inventory/valuation',
    query: z.object({
      method: z.enum(['fifo', 'lifo', 'average', 'current_market']).optional(),
      asOfDate: z.string().datetime().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('valuation'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get inventory valuation summary',
  },

  // Get cost basis
  getCostBasis: {
    method: 'GET',
    path: '/inventory/:id/cost-basis',
    pathParams: UuidPathParam('Inventory'),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('cost-basis'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get detailed cost breakdown',
  },

  // Update cost basis
  updateCostBasis: {
    method: 'PUT',
    path: '/inventory/:id/cost-basis',
    pathParams: UuidPathParam('Inventory'),
    body: z.object({
      newCostBasis: z.number().positive(),
      reason: z.enum(['market_adjustment', 'revaluation', 'error_correction']),
      notes: z.string(),
      effectiveDate: z.string().datetime(),
    }),
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update cost basis',
  },

  // Get aging report
  getAgingReport: {
    method: 'GET',
    path: '/inventory/aging-report',
    query: z.object({
      farmId: z.string().cuid().optional(),
      commodityId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('aging-report'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get inventory aging analysis',
  },

  // =============================================================================
  // Forecasting & Planning
  // =============================================================================

  // Get demand forecast
  getDemandForecast: {
    method: 'GET',
    path: '/inventory/demand-forecast',
    query: z.object({
      commodityId: z.string().cuid().optional(),
      period: z.string().optional(),
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('demand-forecast'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get demand forecasting for inventory planning',
  },

  // Get reorder points
  getReorderPoints: {
    method: 'GET',
    path: '/inventory/reorder-points',
    query: z.object({
      commodityId: z.string().cuid().optional(),
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('reorder-points'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get reorder point recommendations',
  },

  // Generate replenishment plan
  generateReplenishmentPlan: {
    method: 'POST',
    path: '/inventory/replenishment-plan',
    body: z.object({
      commodityId: z.string().cuid().optional(),
      farmId: z.string().cuid().optional(),
      timeHorizon: z.enum(['30', '60', '90', '180']),
      considerSeasonality: z.boolean().optional(),
      includeGrowthPlanning: z.boolean().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('replenishment-plan'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Generate replenishment plan',
  },

  // =============================================================================
  // Additional Analytics & Reporting
  // =============================================================================

  // Configure alerts
  configureAlerts: {
    method: 'POST',
    path: '/inventory/alerts/configure',
    body: z.object({
      lowStockThreshold: z.number().positive(),
      expiryWarningDays: z.number().positive(),
      qualityCheckReminder: z.number().positive(),
      notifications: z.object({
        email: z.boolean(),
        sms: z.boolean(),
        dashboard: z.boolean(),
      }),
      recipients: z.array(z.string()),
    }),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Configure inventory alerts',
  },

  // Get waste analysis
  getWasteAnalysis: {
    method: 'GET',
    path: '/inventory/waste-analysis',
    query: z.object({
      period: z.string().optional(),
      farmId: z.string().cuid().optional(),
      reason: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('waste-analysis'),
          attributes: z.record(z.string(), z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get waste and loss analysis',
  },

  // Generate reports
  generateReports: {
    method: 'POST',
    path: '/inventory/reports',
    body: z.object({
      reportType: z.enum(['stock_levels', 'movements', 'valuation', 'waste', 'custom']),
      filters: z.object({
        dateRange: z.object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        }).optional(),
        commodities: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        status: z.array(z.string()).optional(),
      }),
      format: z.enum(['pdf', 'excel', 'csv']),
      includeCharts: z.boolean().optional(),
    }),
    responses: {
      202: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Generate inventory reports',
  },
});

export type InventoryContract = typeof inventoryContract;
