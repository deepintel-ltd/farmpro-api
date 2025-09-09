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
});

export type InventoryContract = typeof inventoryContract;
