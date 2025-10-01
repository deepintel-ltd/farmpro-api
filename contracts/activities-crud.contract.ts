import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
  ActivityResourceSchema,
  ActivityCollectionSchema,
  ActivityQueryParams,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities CRUD Contract
// =============================================================================

export const activitiesCrudContract = c.router({
  // Get all activities
  getActivities: {
    method: 'GET',
    path: '/activities',
    query: ActivityQueryParams,
    responses: {
      200: ActivityCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'List farm activities with filtering',
  },

  // Get single activity
  getActivity: {
    method: 'GET',
    path: '/activities/:activityId',
    pathParams: z.object({
      activityId: z.string(),
    }),
    responses: {
      200: ActivityResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get detailed activity information',
  },

  // Create activity
  createActivity: {
    method: 'POST',
    path: '/activities',
    body: CreateActivityRequestSchema,
    responses: {
      201: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create new farm activity',
  },

  // Update activity
  updateActivity: {
    method: 'PATCH',
    path: '/activities/:activityId',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: UpdateActivityRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update activity details',
  },

  // Delete activity
  deleteActivity: {
    method: 'DELETE',
    path: '/activities/:activityId',
    pathParams: z.object({
      activityId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('activities'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Cancel/delete activity',
  },
});

export type ActivitiesCrudContract = typeof activitiesCrudContract;
