import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AddCostEntryRequestSchema,
  UpdateCostEntryRequestSchema,
  CostEntryResourceSchema,
  CostEntryCollectionSchema,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Cost Tracking Contract
// =============================================================================

export const activitiesCostsContract = c.router({
  // Get activity costs
  getActivityCosts: {
    method: 'GET',
    path: '/activities/:activityId/costs',
    pathParams: z.object({
      activityId: z.string(),
    }),
    responses: {
      200: CostEntryCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity cost breakdown',
  },

  // Add cost
  addCost: {
    method: 'POST',
    path: '/activities/:activityId/costs',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: AddCostEntryRequestSchema,
    responses: {
      201: CostEntryResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Add cost entry to activity',
  },

  // Update cost
  updateCost: {
    method: 'PUT',
    path: '/activities/:activityId/costs/:costId',
    pathParams: z.object({
      activityId: z.string(),
      costId: z.string(),
    }),
    body: UpdateCostEntryRequestSchema,
    responses: {
      200: CostEntryResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update cost entry',
  },
});

export type ActivitiesCostsContract = typeof activitiesCostsContract;
