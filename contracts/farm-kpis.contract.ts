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
// Farm KPIs Schemas
// =============================================================================

export const KPIMetricEnum = z.enum([
  'PEST_DAMAGE',
  'DISEASE_DAMAGE',
  'IRRIGATION_UPTIME',
  'WEED_COVERAGE',
  'PLANT_STAND_SUCCESS',
  'BUDGET_VARIANCE',
  'CASH_POSITION',
  'LABOR_AVAILABILITY',
  'EQUIPMENT_UPTIME',
  'YIELD_ACHIEVEMENT',
  'REVENUE_TARGET',
  'COST_EFFICIENCY',
  'ACTIVITY_COMPLETION',
  'CUSTOM',
]);

export const KPIAttributesSchema = z.object({
  farmId: CuidQueryParam('farmId'),
  name: z.string().min(1).max(255),
  metric: KPIMetricEnum,
  description: z.string().optional(),
  targetValue: z.number(),
  targetOperator: z.enum(['less_than', 'less_than_equal', 'greater_than', 'greater_than_equal', 'equal']),
  unit: z.string(),
  currentValue: z.number().nullable().optional(),
  status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL', 'UNKNOWN']).default('UNKNOWN'),
  threshold: z.object({
    warning: z.number().optional(), // Value at which to show warning
    critical: z.number().optional(), // Value at which to show critical alert
  }).optional(),
  category: z.enum(['PRODUCTION', 'FINANCIAL', 'OPERATIONAL']),
  isActive: z.boolean().default(true),
  alertsEnabled: z.boolean().default(true),
  lastMeasured: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const KPIResourceSchema = z.object({
  data: z.object({
    type: z.literal('kpis'),
    id: CuidQueryParam('id'),
    attributes: KPIAttributesSchema,
  }),
});

export const KPICollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('kpis'),
      id: CuidQueryParam('id'),
      attributes: KPIAttributesSchema,
    })
  ),
  meta: z.object({
    totalCount: z.number(),
    onTarget: z.number().optional(),
    warning: z.number().optional(),
    critical: z.number().optional(),
  }).optional(),
});

export const CreateKPIRequestSchema = z.object({
  data: z.object({
    type: z.literal('kpis'),
    attributes: z.object({
      farmId: CuidQueryParam('farmId'),
      name: z.string().min(1).max(255),
      metric: KPIMetricEnum,
      description: z.string().optional(),
      targetValue: z.number(),
      targetOperator: z.enum(['less_than', 'less_than_equal', 'greater_than', 'greater_than_equal', 'equal']),
      unit: z.string(),
      threshold: z.object({
        warning: z.number().optional(),
        critical: z.number().optional(),
      }).optional(),
      category: z.enum(['PRODUCTION', 'FINANCIAL', 'OPERATIONAL']),
      alertsEnabled: z.coerce.boolean().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const UpdateKPIRequestSchema = z.object({
  data: z.object({
    type: z.literal('kpis'),
    id: CuidQueryParam('id'),
    attributes: z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      targetValue: z.number().optional(),
      targetOperator: z.enum(['less_than', 'less_than_equal', 'greater_than', 'greater_than_equal', 'equal']).optional(),
      unit: z.string().optional(),
      threshold: z.object({
        warning: z.number().optional(),
        critical: z.number().optional(),
      }).optional(),
      isActive: z.coerce.boolean().optional(),
      alertsEnabled: z.coerce.boolean().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

export const RecordKPIMeasurementRequestSchema = z.object({
  data: z.object({
    type: z.literal('kpi-measurements'),
    attributes: z.object({
      value: z.number(),
      measuredAt: z.string().datetime().optional(),
      notes: z.string().optional(),
      source: z.enum(['manual', 'automated', 'calculated']).optional().default('manual'),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  }),
});

// =============================================================================
// Farm KPIs Contract
// =============================================================================

export const farmKPIsContract = c.router({
  // Get all KPIs
  getKPIs: {
    method: 'GET',
    path: '/kpis',
    query: CommonQueryParams.extend({
      farmId: CuidQueryParam('farmId').optional(),
      metric: KPIMetricEnum.optional(),
      category: z.enum(['PRODUCTION', 'FINANCIAL', 'OPERATIONAL']).optional(),
      status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL', 'UNKNOWN']).optional(),
      activeOnly: z.coerce.boolean().optional(),
    }),
    responses: {
      200: KPICollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all KPIs with filtering',
  },

  // Get single KPI
  getKPI: {
    method: 'GET',
    path: '/kpis/:id',
    pathParams: CuidPathParam('KPI'),
    query: CommonQueryParams,
    responses: {
      200: KPIResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single KPI by ID',
  },

  // Create KPI
  createKPI: {
    method: 'POST',
    path: '/kpis',
    body: CreateKPIRequestSchema,
    responses: {
      201: KPIResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new KPI',
  },

  // Update KPI
  updateKPI: {
    method: 'PATCH',
    path: '/kpis/:id',
    pathParams: CuidPathParam('KPI'),
    body: UpdateKPIRequestSchema,
    responses: {
      200: KPIResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing KPI',
  },

  // Delete KPI
  deleteKPI: {
    method: 'DELETE',
    path: '/kpis/:id',
    pathParams: CuidPathParam('KPI'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete a KPI',
  },

  // Record KPI measurement
  recordMeasurement: {
    method: 'POST',
    path: '/kpis/:id/measurements',
    pathParams: CuidPathParam('KPI'),
    body: RecordKPIMeasurementRequestSchema,
    responses: {
      200: KPIResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Record a new measurement for a KPI',
  },

  // Get KPI dashboard
  getKPIDashboard: {
    method: 'GET',
    path: '/kpis/dashboard',
    query: z.object({
      farmId: CuidQueryParam('farmId'),
      period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('kpi-dashboard'),
          id: z.string(),
          attributes: z.object({
            farmId: CuidQueryParam('farmId'),
            period: z.string(),
            summary: z.object({
              totalKPIs: z.number(),
              onTarget: z.number(),
              warning: z.number(),
              critical: z.number(),
              overallHealth: z.enum(['excellent', 'good', 'warning', 'critical']),
            }),
            production: z.object({
              pestDamage: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
              irrigationUptime: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
              weedCoverage: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
              plantStandSuccess: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
            }),
            financial: z.object({
              cashPosition: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
              budgetVariance: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
            }),
            operational: z.object({
              laborAvailability: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
              equipmentUptime: z.object({
                current: z.number(),
                target: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
                unit: z.string(),
              }).optional(),
            }),
            alerts: z.array(
              z.object({
                kpiId: CuidQueryParam('id'),
                kpiName: z.string(),
                severity: z.enum(['warning', 'critical']),
                message: z.string(),
                currentValue: z.number(),
                targetValue: z.number(),
                timestamp: z.string().datetime(),
              })
            ),
            lastUpdated: z.string().datetime(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get comprehensive KPI dashboard for a farm',
  },

  // Get KPI trend
  getKPITrend: {
    method: 'GET',
    path: '/kpis/:id/trend',
    pathParams: CuidPathParam('KPI'),
    query: z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
      dataPoints: z.coerce.number().optional().default(30),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('kpi-trend'),
          id: CuidQueryParam('id'),
          attributes: z.object({
            kpiName: z.string(),
            metric: z.string(),
            targetValue: z.number(),
            measurements: z.array(
              z.object({
                timestamp: z.string().datetime(),
                value: z.number(),
                status: z.enum(['ON_TARGET', 'WARNING', 'CRITICAL']),
              })
            ),
            trend: z.enum(['improving', 'stable', 'deteriorating']),
            averageValue: z.number(),
            minValue: z.number(),
            maxValue: z.number(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get trend data for a specific KPI',
  },
});

export type FarmKPIsContract = typeof farmKPIsContract;
