import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  ActivityResourceSchema,
  UpdateActivityStatusRequestSchema,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Execution Contract
// =============================================================================

export const activitiesExecutionContract = c.router({
  updateActivityStatus: {
    method: 'PATCH',
    path: '/activities/:activityId/status',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: UpdateActivityStatusRequestSchema,
    responses: {
      200: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update activity status/execution (start/pause/resume/complete) - JSON:API compliant',
  },
});

export type ActivitiesExecutionContract = typeof activitiesExecutionContract;
