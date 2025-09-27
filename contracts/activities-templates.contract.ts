import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CreateActivityTemplateRequestSchema,
  CreateFromTemplateRequestSchema,
  ActivityTemplateResourceSchema,
  ActivityTemplateCollectionSchema,
  ActivityResourceSchema,
  TemplateQueryParams,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Templates Contract
// =============================================================================

export const activitiesTemplatesContract = c.router({
  // Get all templates
  getActivityTemplates: {
    method: 'GET',
    path: '/activities/templates',
    query: TemplateQueryParams,
    responses: {
      200: ActivityTemplateCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'List activity templates',
  },

  // Get single template
  getActivityTemplate: {
    method: 'GET',
    path: '/activities/templates/:templateId',
    pathParams: z.object({
      templateId: z.string(),
    }),
    responses: {
      200: ActivityTemplateResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity template details',
  },

  // Create template
  createActivityTemplate: {
    method: 'POST',
    path: '/activities/templates',
    body: CreateActivityTemplateRequestSchema,
    responses: {
      201: ActivityTemplateResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create custom activity template',
  },

  // Create from template
  createFromTemplate: {
    method: 'POST',
    path: '/activities/from-template/:templateId',
    pathParams: z.object({
      templateId: z.string(),
    }),
    body: CreateFromTemplateRequestSchema,
    responses: {
      201: ActivityResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create activity from template',
  },
});

export type ActivitiesTemplatesContract = typeof activitiesTemplatesContract;
