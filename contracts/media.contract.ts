import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// Base schemas
const MediaFileResourceSchema = z.object({
  id: z.string(),
  type: z.literal('media-file'),
  attributes: z.object({
    id: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    url: z.string().optional(),
    context: z.string(),
    contextId: z.string(),
    uploadedAt: z.string(),
    uploadedBy: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional(),
    }).optional(),
  }),
});

const MediaAuditResourceSchema = z.object({
  id: z.string(),
  type: z.literal('media-audit'),
  attributes: z.object({
    mediaId: z.string(),
    filename: z.string(),
    auditTrail: z.array(z.object({
      action: z.string(),
      userId: z.string().optional(),
      timestamp: z.string(),
      details: z.string(),
      changes: z.any().optional(),
    })),
    createdAt: z.string(),
    uploadedBy: z.string(),
  }),
});

const DownloadUrlResourceSchema = z.object({
  id: z.string(),
  type: z.literal('download-url'),
  attributes: z.object({
    downloadUrl: z.string(),
    expiresIn: z.number(),
    mediaId: z.string(),
  }),
});

// Request schemas
const UploadFileRequestSchema = z.object({
  context: z.string().min(1, "Context is required"),
  contextId: z.string().min(1, "Context ID is required"),
  description: z.string().optional(),
  tags: z.string().optional(), // JSON string of array
  location: z.string().optional(), // JSON string of location object
  // Note: file is handled by multipart/form-data
});

const UpdateFileMetadataRequestSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

const DeleteFileRequestSchema = z.object({
  reason: z.string().optional(),
});

const GetMyFilesQuerySchema = z.object({
  context: z.string().optional(),
  contextId: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

// Success response schemas
const MediaFileResponseSchema = z.object({
  data: MediaFileResourceSchema,
});

const MediaCollectionResponseSchema = z.object({
  data: z.array(MediaFileResourceSchema),
  meta: z.object({
    totalFiles: z.number(),
    totalSize: z.number(),
    filters: z.any().optional(),
  }).optional(),
});

const DownloadUrlResponseSchema = z.object({
  data: DownloadUrlResourceSchema,
});

const MediaAuditResponseSchema = z.object({
  data: MediaAuditResourceSchema,
});

const DeleteFileResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
    message: z.string(),
    auditTrail: z.any().optional(),
  }),
});

export const mediaContract = c.router({
  uploadFile: {
    method: 'POST',
    path: '/media/upload',
    summary: 'Upload a file with context metadata',
    body: UploadFileRequestSchema,
    responses: {
      200: MediaFileResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
    },
  },

  getMyFiles: {
    method: 'GET',
    path: '/media/my-files',
    summary: 'Get current user\'s uploaded files with filtering',
    query: GetMyFilesQuerySchema,
    responses: {
      200: MediaCollectionResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
    },
  },

  getContextFiles: {
    method: 'GET',
    path: '/media/context/:context/:contextId',
    pathParams: z.object({
      context: z.string(),
      contextId: z.string(),
    }),
    summary: 'Get files for a specific context',
    responses: {
      200: MediaCollectionResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
  },

  getFile: {
    method: 'GET',
    path: '/media/:mediaId',
    pathParams: z.object({
      mediaId: z.string(),
    }),
    summary: 'Get file details by ID',
    responses: {
      200: MediaFileResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
  },

  getFileDownloadUrl: {
    method: 'GET',
    path: '/media/:mediaId/download',
    pathParams: z.object({
      mediaId: z.string(),
    }),
    summary: 'Get secure download URL for file',
    responses: {
      200: DownloadUrlResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
  },

  deleteFile: {
    method: 'DELETE',
    path: '/media/:mediaId',
    pathParams: z.object({
      mediaId: z.string(),
    }),
    body: DeleteFileRequestSchema,
    summary: 'Delete a file (only if user created it)',
    responses: {
      200: DeleteFileResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
  },

  getFileAudit: {
    method: 'GET',
    path: '/media/:mediaId/audit',
    pathParams: z.object({
      mediaId: z.string(),
    }),
    summary: 'Get file audit trail',
    responses: {
      200: MediaAuditResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
  },

  updateFileMetadata: {
    method: 'POST',
    path: '/media/:mediaId/update',
    pathParams: z.object({
      mediaId: z.string(),
    }),
    body: UpdateFileMetadataRequestSchema,
    summary: 'Update file metadata (only if user created it)',
    responses: {
      200: MediaFileResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
  },
});
