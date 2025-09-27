import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AddNoteRequestSchema,
  ActivityNoteResourceSchema,
  ActivityNoteCollectionSchema,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Media & Documentation Contract
// =============================================================================

export const activitiesMediaContract = c.router({
  // Get activity media
  getActivityMedia: {
    method: 'GET',
    path: '/activities/:activityId/media',
    pathParams: z.object({
      activityId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('media'),
          attributes: z.object({
            fileName: z.string(),
            fileUrl: z.string(),
            fileSize: z.number(),
            mimeType: z.string(),
            uploadedAt: z.string(),
            uploadedBy: z.string(),
          }),
        })),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity photos and documents',
  },

  // Upload media
  uploadMedia: {
    method: 'POST',
    path: '/activities/:activityId/media',
    pathParams: z.object({
      activityId: z.string().cuid('Invalid activity ID format'),
    }),
    body: z.object({
      file: z.any(), // File upload - validated by multer middleware
      caption: z.string().max(500, 'Caption too long').optional(),
      type: z.enum(['PHOTO', 'DOCUMENT', 'VIDEO']).optional().default('PHOTO'),
      location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().positive().optional(),
      }).optional(),
    }), // multipart/form-data
    responses: {
      201: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('media'),
          attributes: z.object({
            fileName: z.string(),
            fileUrl: z.string(),
            message: z.string(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Upload activity media',
  },

  // Get activity notes
  getActivityNotes: {
    method: 'GET',
    path: '/activities/:activityId/notes',
    pathParams: z.object({
      activityId: z.string(),
    }),
    responses: {
      200: ActivityNoteCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity notes and observations',
  },

  // Add note
  addNote: {
    method: 'POST',
    path: '/activities/:activityId/notes',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: AddNoteRequestSchema,
    responses: {
      201: ActivityNoteResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Add note to activity',
  },
});

export type ActivitiesMediaContract = typeof activitiesMediaContract;
