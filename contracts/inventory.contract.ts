import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  InventoryResourceSchema,
  InventoryCollectionSchema,
  CreateInventoryRequestSchema,
  UpdateInventoryRequestSchema,
  InventoryMovementCollectionSchema,
  InventoryAdjustmentRequestSchema,
  InventoryReservationRequestSchema,
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
    path: '/api/inventory',
    query: AllQueryParams.extend({
      farmId: z.string().uuid().optional(),
      commodityId: z.string().uuid().optional(),
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
    path: '/api/inventory/:id',
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
    path: '/api/inventory',
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
    path: '/api/inventory/:id',
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
    path: '/api/inventory/:id',
    pathParams: UuidPathParam('Inventory'),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Remove inventory item',
  },

  // =============================================================================
  // Inventory Tracking & Movements
  // =============================================================================

  // Get inventory movements
  getInventoryMovements: {
    method: 'GET',
    path: '/api/inventory/:id/movements',
    pathParams: UuidPathParam('Inventory'),
    query: AllQueryParams,
    responses: {
      200: InventoryMovementCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get inventory movement history',
  },

  // Adjust inventory quantity
  adjustInventory: {
    method: 'POST',
    path: '/api/inventory/:id/adjust',
    pathParams: UuidPathParam('Inventory'),
    body: InventoryAdjustmentRequestSchema,
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Adjust inventory quantity',
  },

  // Reserve inventory
  reserveInventory: {
    method: 'POST',
    path: '/api/inventory/:id/reserve',
    pathParams: UuidPathParam('Inventory'),
    body: InventoryReservationRequestSchema,
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Reserve inventory for order',
  },

  // Release inventory reservation
  releaseInventory: {
    method: 'POST',
    path: '/api/inventory/:id/release',
    pathParams: UuidPathParam('Inventory'),
    body: z.object({
      quantity: z.number().positive(),
      orderId: z.string().uuid(),
      reason: z.enum(['order_cancelled', 'order_changed', 'expired']),
    }),
    responses: {
      200: InventoryResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Release inventory reservation',
  },

  // Transfer inventory
  transferInventory: {
    method: 'POST',
    path: '/api/inventory/transfer',
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
    path: '/api/inventory/:id/quality-tests',
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
    path: '/api/inventory/:id/quality-tests',
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
    path: '/api/inventory/:id/quality-grade',
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
    path: '/api/inventory/analytics',
    query: z.object({
      period: z.string().optional(),
      metric: z.string().optional(),
      farmId: z.string().uuid().optional(),
      commodityId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('analytics'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get inventory analytics dashboard',
  },

  // Get stock alerts
  getStockAlerts: {
    method: 'GET',
    path: '/api/inventory/stock-alerts',
    query: z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      type: z.enum(['low_stock', 'expiry', 'quality']).optional(),
      farmId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('alerts'),
          attributes: z.record(z.any()),
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
    path: '/api/inventory/batches/:batchNumber',
    pathParams: z.object({
      batchNumber: z.string(),
    }),
    responses: {
      200: InventoryCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all inventory items in a batch',
  },

  // Merge batches
  mergeBatches: {
    method: 'POST',
    path: '/api/inventory/batches/:batchNumber/merge',
    pathParams: z.object({
      batchNumber: z.string(),
    }),
    body: z.object({
      sourceBatches: z.array(z.string()),
      newBatchNumber: z.string(),
      reason: z.string(),
    }),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Merge multiple batches',
  },

  // Split batch
  splitBatch: {
    method: 'POST',
    path: '/api/inventory/batches/:batchNumber/split',
    pathParams: z.object({
      batchNumber: z.string(),
    }),
    body: z.object({
      splits: z.array(z.object({
        quantity: z.number().positive(),
        newBatchNumber: z.string(),
        location: z.object({
          facility: z.string(),
          section: z.string().optional(),
        }),
        notes: z.string().optional(),
      })),
    }),
    responses: {
      200: z.object({ message: z.string() }),
      ...CommonErrorResponses,
    },
    summary: 'Split batch into smaller lots',
  },

  // Get traceability
  getTraceability: {
    method: 'GET',
    path: '/api/inventory/traceability/:id',
    pathParams: UuidPathParam('Inventory'),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('traceability'),
          attributes: z.record(z.any()),
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
    path: '/api/inventory/facilities',
    query: z.object({
      farmId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('facilities'),
          attributes: z.record(z.any()),
        })),
      }),
      ...CommonErrorResponses,
    },
    summary: 'List storage facilities and capacity',
  },

  // Get facility details
  getFacility: {
    method: 'GET',
    path: '/api/inventory/facilities/:facilityId',
    pathParams: z.object({
      facilityId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('facility'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get facility details and contents',
  },

  // Log facility conditions
  logFacilityConditions: {
    method: 'POST',
    path: '/api/inventory/facilities/:facilityId/conditions',
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
    path: '/api/inventory/storage-optimization',
    query: z.object({
      farmId: z.string().uuid().optional(),
      commodityId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('optimization'),
          attributes: z.record(z.any()),
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
    path: '/api/inventory/valuation',
    query: z.object({
      method: z.enum(['fifo', 'lifo', 'average', 'current_market']).optional(),
      asOfDate: z.string().datetime().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('valuation'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get inventory valuation summary',
  },

  // Get cost basis
  getCostBasis: {
    method: 'GET',
    path: '/api/inventory/:id/cost-basis',
    pathParams: UuidPathParam('Inventory'),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('cost-basis'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get detailed cost breakdown',
  },

  // Update cost basis
  updateCostBasis: {
    method: 'PUT',
    path: '/api/inventory/:id/cost-basis',
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
    path: '/api/inventory/aging-report',
    query: z.object({
      farmId: z.string().uuid().optional(),
      commodityId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('aging-report'),
          attributes: z.record(z.any()),
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
    path: '/api/inventory/demand-forecast',
    query: z.object({
      commodityId: z.string().uuid().optional(),
      period: z.string().optional(),
      farmId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('demand-forecast'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get demand forecasting for inventory planning',
  },

  // Get reorder points
  getReorderPoints: {
    method: 'GET',
    path: '/api/inventory/reorder-points',
    query: z.object({
      commodityId: z.string().uuid().optional(),
      farmId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('reorder-points'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get reorder point recommendations',
  },

  // Generate replenishment plan
  generateReplenishmentPlan: {
    method: 'POST',
    path: '/api/inventory/replenishment-plan',
    body: z.object({
      commodityId: z.string().uuid().optional(),
      farmId: z.string().uuid().optional(),
      timeHorizon: z.enum(['30', '60', '90', '180']),
      considerSeasonality: z.boolean().optional(),
      includeGrowthPlanning: z.boolean().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('replenishment-plan'),
          attributes: z.record(z.any()),
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
    path: '/api/inventory/alerts/configure',
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
    path: '/api/inventory/waste-analysis',
    query: z.object({
      period: z.string().optional(),
      farmId: z.string().uuid().optional(),
      reason: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('waste-analysis'),
          attributes: z.record(z.any()),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get waste and loss analysis',
  },

  // Generate reports
  generateReports: {
    method: 'POST',
    path: '/api/inventory/reports',
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
