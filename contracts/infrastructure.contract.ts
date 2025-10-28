import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CommonQueryParams,
  CommonErrorResponses,
  CuidPathParam,
  CuidQueryParam,
} from './common';

const c = initContract();

// =============================================================================
// Infrastructure Schemas
// =============================================================================

export const InfrastructureAttributesSchema = z.object({
  farmId: CuidQueryParam('farmId'),
  name: z.string().min(1).max(255),
  type: z.enum(['BOREHOLE', 'IRRIGATION_SYSTEM', 'STORAGE', 'PROCESSING', 'FENCE', 'BUILDING', 'EQUIPMENT', 'OTHER']),
  description: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED']).default('PLANNED'),
  timeline: z.object({
    startDate: z.string().datetime(),
    expectedEndDate: z.string().datetime(),
    actualEndDate: z.string().datetime().nullable().optional(),
  }),
  budget: z.object({
    estimated: z.number().nonnegative(),
    actual: z.number().nonnegative().optional(),
    currency: z.string().default('NGN'),
  }).optional(),
  progress: z.number().min(0).max(100).default(0),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  uptime: z.object({
    target: z.number().min(0).max(100).optional(), // Target uptime percentage
    actual: z.number().min(0).max(100).optional(), // Actual uptime percentage
    lastDowntime: z.string().datetime().nullable().optional(),
  }).optional(),
  maintenance: z.object({
    lastMaintenanceDate: z.string().datetime().nullable().optional(),
    nextMaintenanceDate: z.string().datetime().nullable().optional(),
    schedule: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
  }).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const InfrastructureResourceSchema = z.object({
  data: z.object({
    type: z.literal('infrastructure'),
    id: CuidQueryParam('id'),
    attributes: InfrastructureAttributesSchema,
  }),
});

export const InfrastructureCollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('infrastructure'),
      id: CuidQueryParam('id'),
      attributes: InfrastructureAttributesSchema,
    })
  ),
  meta: z.object({
    totalCount: z.number(),
  }).optional(),
});

export const CreateInfrastructureRequestSchema = z.object({
  data: z.object({
    type: z.literal('infrastructure'),
    attributes: z.object({
      farmId: CuidQueryParam('farmId'),
      name: z.string().min(1).max(255),
      type: z.enum(['BOREHOLE', 'IRRIGATION_SYSTEM', 'STORAGE', 'PROCESSING', 'FENCE', 'BUILDING', 'EQUIPMENT', 'OTHER']),
      description: z.string().optional(),
      timeline: z.object({
        startDate: z.string().datetime(),
        expectedEndDate: z.string().datetime(),
      }),
      budget: z.object({
        estimated: z.number().nonnegative(),
        currency: z.string().default('NGN'),
      }).optional(),
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
      specifications: z.record(z.string(), z.any()).optional(),
      uptime: z.object({
        target: z.number().min(0).max(100).optional(),
      }).optional(),
      maintenance: z.object({
        schedule: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
      }).optional(),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const UpdateInfrastructureRequestSchema = z.object({
  data: z.object({
    type: z.literal('infrastructure'),
    id: CuidQueryParam('id'),
    attributes: z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED']).optional(),
      timeline: z.object({
        startDate: z.string().datetime().optional(),
        expectedEndDate: z.string().datetime().optional(),
        actualEndDate: z.string().datetime().nullable().optional(),
      }).optional(),
      budget: z.object({
        estimated: z.number().nonnegative().optional(),
        actual: z.number().nonnegative().optional(),
      }).optional(),
      progress: z.number().min(0).max(100).optional(),
      specifications: z.record(z.string(), z.any()).optional(),
      uptime: z.object({
        target: z.number().min(0).max(100).optional(),
        actual: z.number().min(0).max(100).optional(),
        lastDowntime: z.string().datetime().nullable().optional(),
      }).optional(),
      maintenance: z.object({
        lastMaintenanceDate: z.string().datetime().nullable().optional(),
        nextMaintenanceDate: z.string().datetime().nullable().optional(),
        schedule: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
      }).optional(),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

// =============================================================================
// Infrastructure Contract
// =============================================================================

export const infrastructureContract = c.router({
  // Get all infrastructure
  getInfrastructure: {
    method: 'GET',
    path: '/infrastructure',
    query: CommonQueryParams.extend({
      farmId: CuidQueryParam('farmId').optional(),
      type: z.enum(['BOREHOLE', 'IRRIGATION_SYSTEM', 'STORAGE', 'PROCESSING', 'FENCE', 'BUILDING', 'EQUIPMENT', 'OTHER']).optional(),
      status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED']).optional(),
      operationalOnly: z.coerce.boolean().optional(),
    }),
    responses: {
      200: InfrastructureCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all infrastructure with filtering',
  },

  // Get single infrastructure
  getInfrastructureItem: {
    method: 'GET',
    path: '/infrastructure/:id',
    pathParams: CuidPathParam('Infrastructure'),
    query: CommonQueryParams,
    responses: {
      200: InfrastructureResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single infrastructure item by ID',
  },

  // Create infrastructure
  createInfrastructure: {
    method: 'POST',
    path: '/infrastructure',
    body: CreateInfrastructureRequestSchema,
    responses: {
      201: InfrastructureResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new infrastructure project',
  },

  // Update infrastructure
  updateInfrastructure: {
    method: 'PATCH',
    path: '/infrastructure/:id',
    pathParams: CuidPathParam('Infrastructure'),
    body: UpdateInfrastructureRequestSchema,
    responses: {
      200: InfrastructureResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing infrastructure item',
  },

  // Delete infrastructure
  deleteInfrastructure: {
    method: 'DELETE',
    path: '/infrastructure/:id',
    pathParams: CuidPathParam('Infrastructure'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete an infrastructure item',
  },

  // Log uptime/downtime
  logUptime: {
    method: 'POST',
    path: '/infrastructure/:id/uptime',
    pathParams: CuidPathParam('Infrastructure'),
    body: z.object({
      data: z.object({
        type: z.literal('uptime-log'),
        attributes: z.object({
          timestamp: z.string().datetime(),
          status: z.enum(['up', 'down']),
          reason: z.string().optional(),
          duration: z.number().optional(), // Duration in minutes if down
          notes: z.string().optional(),
        }),
      }),
    }),
    responses: {
      200: InfrastructureResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Log uptime or downtime event for infrastructure',
  },

  // Schedule maintenance
  scheduleMaintenance: {
    method: 'POST',
    path: '/infrastructure/:id/maintenance',
    pathParams: CuidPathParam('Infrastructure'),
    body: z.object({
      data: z.object({
        type: z.literal('maintenance-schedule'),
        attributes: z.object({
          scheduledDate: z.string().datetime(),
          description: z.string(),
          estimatedDuration: z.number().optional(), // hours
          assignedTo: z.array(CuidQueryParam('userId')).optional(),
          notes: z.string().optional(),
        }),
      }),
    }),
    responses: {
      200: InfrastructureResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Schedule maintenance for infrastructure',
  },

  // Get uptime analytics
  getUptimeAnalytics: {
    method: 'GET',
    path: '/infrastructure/:id/uptime-analytics',
    pathParams: CuidPathParam('Infrastructure'),
    query: z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('uptime-analytics'),
          id: CuidQueryParam('id'),
          attributes: z.object({
            infrastructureId: CuidQueryParam('id'),
            infrastructureName: z.string(),
            targetUptime: z.number(),
            actualUptime: z.number(),
            variance: z.number(),
            status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
            downtimeEvents: z.array(
              z.object({
                timestamp: z.string().datetime(),
                duration: z.number(),
                reason: z.string().optional(),
              })
            ),
            totalDowntime: z.number(),
            mtbf: z.number().optional(), // Mean Time Between Failures
            mttr: z.number().optional(), // Mean Time To Repair
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get uptime analytics for infrastructure',
  },
});

export type InfrastructureContract = typeof infrastructureContract;
