import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Health Check Contract
// =============================================================================

export const healthContract = c.router({
  // Health check endpoint
  health: {
    method: 'GET',
    path: '/health',
    responses: {
      200: z.object({
        status: z.literal('ok'),
        timestamp: z.iso.datetime(),
        service: z.literal('farmpro-api'),
        version: z.string(),
        database: z.object({
          status: z.enum(['connected', 'disconnected']),
          latency: z.number().optional(),
        }),
      }),
      503: JsonApiErrorResponseSchema,
    },
    summary: 'Health check endpoint',
  },
});

export type HealthContract = typeof healthContract;
