import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AssignActivityRequestSchema,
  RequestHelpRequestSchema,
  ActivityResourceSchema,
  ActivityCollectionSchema,
  TeamPerformanceCollectionSchema,
  MyTasksQueryParams,
  AnalyticsQueryParams,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Team Management Contract
// =============================================================================

export const activitiesTeamContract = c.router({
  // Get my tasks
  getMyTasks: {
    method: 'GET',
    path: '/activities/my-tasks',
    query: MyTasksQueryParams,
    responses: {
      200: ActivityCollectionSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get current user assigned activities',
  },

  // Assign activity
  assignActivity: {
    method: 'PUT',
    path: '/activities/:activityId/assign',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: AssignActivityRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Assign activity to users',
  },

  // Request help
  requestHelp: {
    method: 'POST',
    path: '/activities/:activityId/request-help',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: RequestHelpRequestSchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('help-requests'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Request additional help for activity',
  },

  // Get team performance
  getTeamPerformance: {
    method: 'GET',
    path: '/activities/team-performance',
    query: AnalyticsQueryParams,
    responses: {
      200: TeamPerformanceCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get team performance metrics',
  },
});

export type ActivitiesTeamContract = typeof activitiesTeamContract;
