import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  StartActivityRequestSchema,
  UpdateProgressRequestSchema,
  CompleteActivityRequestSchema,
  PauseActivityRequestSchema,
  ActivityResourceSchema,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Execution Contract
// =============================================================================

export const activitiesExecutionContract = c.router({
  // Start activity
  startActivity: {
    method: 'POST',
    path: '/activities/:activityId/start',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: StartActivityRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Start activity execution',
  },

  // Update progress
  updateProgress: {
    method: 'PUT',
    path: '/activities/:activityId/progress',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: UpdateProgressRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update activity progress',
  },

  // Complete activity
  completeActivity: {
    method: 'POST',
    path: '/activities/:activityId/complete',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: CompleteActivityRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Mark activity as completed',
  },

  // Complete harvest activity
  completeHarvestActivity: {
    method: 'POST',
    path: '/activities/:activityId/complete-harvest',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: z.object({
      quantityHarvested: z.number().positive(),
      qualityGrade: z.string(),
      unit: z.string().optional().default('kg'),
      harvestMethod: z.string().optional(),
      storageLocation: z.string().optional(),
      batchNumber: z.string().optional(),
      completedAt: z.string().datetime().optional(),
      actualCost: z.number().optional(),
      results: z.string().optional(),
      issues: z.string().optional(),
      recommendations: z.string().optional(),
      notes: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          activity: ActivityResourceSchema,
          harvest: z.object({
            id: z.string(),
            quantity: z.number(),
            quality: z.string(),
            harvestDate: z.string().datetime(),
          }),
          inventory: z.object({
            id: z.string(),
            quantity: z.number(),
            unit: z.string(),
            quality: z.string(),
            location: z.string().optional(),
            status: z.string(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Complete harvest activity with inventory integration',
  },

  // Pause activity
  pauseActivity: {
    method: 'POST',
    path: '/activities/:activityId/pause',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: PauseActivityRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Pause activity execution',
  },

  // Resume activity
  resumeActivity: {
    method: 'POST',
    path: '/activities/:activityId/resume',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: z.object({
      notes: z.string().optional(),
    }),
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Resume paused activity',
  },
});

export type ActivitiesExecutionContract = typeof activitiesExecutionContract;
