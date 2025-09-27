import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { JsonApiErrorResponseSchema } from './common';

const c = initContract();

// Mobile task schemas
const MobileTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  progress: z.number().min(0).max(100),
  scheduledAt: z.string().datetime().optional(),
  estimatedDuration: z.number().optional(),
  farm: z.object({
    id: z.string(),
    name: z.string(),
    location: z.string().optional(),
  }),
  area: z.object({
    id: z.string(),
    name: z.string(),
    coordinates: z.any().optional(),
  }).optional(),
  cropCycle: z.object({
    id: z.string(),
    commodity: z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
    }),
  }).optional(),
  assignments: z.array(z.object({
    id: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
  notes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    content: z.string(),
    createdAt: z.string().datetime(),
    user: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
  metadata: z.any().optional(),
});

const MobileTaskDetailsSchema = MobileTaskSchema.extend({
  costs: z.array(z.object({
    id: z.string(),
    type: z.string(),
    amount: z.number(),
    description: z.string(),
    createdAt: z.string().datetime(),
    user: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
  allNotes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    content: z.string(),
    createdAt: z.string().datetime(),
    user: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
});

const MobileTaskListSchema = z.object({
  data: z.array(MobileTaskSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

const MobileTaskDetailsResponseSchema = z.object({
  data: MobileTaskDetailsSchema,
});

const MobileTaskResponseSchema = z.object({
  data: MobileTaskSchema,
});

const MobileNoteSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  user: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const MobilePhotoSchema = z.object({
  mediaId: z.string(),
  url: z.string(),
  caption: z.string().optional(),
  gpsCoordinates: z.any().optional(),
  addedAt: z.string().datetime(),
});

const OfflineDataSchema = z.object({
  tasks: z.array(MobileTaskSchema),
  farms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    location: z.string().optional(),
    totalArea: z.number().optional(),
  })),
  areas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    coordinates: z.any().optional(),
    farmId: z.string(),
  })),
  lastSync: z.string().datetime(),
});

const FieldConditionsSchema = z.object({
  weather: z.object({
    temperature: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    conditions: z.string(),
    forecast: z.string(),
  }),
  soil: z.object({
    moisture: z.number(),
    ph: z.number(),
    temperature: z.number(),
    conditions: z.string(),
  }),
  recommendations: z.array(z.string()),
  lastUpdated: z.string().datetime(),
});

const IssueSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  category: z.string(),
  createdAt: z.string().datetime(),
});

export const mobileFieldContract = c.router({
  // Get user's assigned tasks
  getMyTasks: {
    method: 'GET',
    path: '/mobile/tasks',
    query: z.object({
      status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
      farmId: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
    }),
    responses: {
      200: MobileTaskListSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get mobile tasks for field worker',
    description: 'Get paginated list of tasks assigned to the authenticated user, optimized for mobile field operations',
  },

  // Get detailed task information
  getTaskDetails: {
    method: 'GET',
    path: '/mobile/tasks/:taskId',
    pathParams: z.object({
      taskId: z.string(),
    }),
    responses: {
      200: MobileTaskDetailsResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get detailed task information',
    description: 'Get comprehensive task details including notes, costs, and history for mobile field operations',
  },

  // Start a task
  startTask: {
    method: 'POST',
    path: '/mobile/tasks/:taskId/start',
    pathParams: z.object({
      taskId: z.string(),
    }),
    body: z.object({
      location: z.string().optional(),
      gpsCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
      }).optional(),
      notes: z.string().optional(),
    }),
    responses: {
      200: MobileTaskResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Start a task',
    description: 'Start a planned task and update status to IN_PROGRESS with location tracking',
  },

  // Update task progress
  updateTaskProgress: {
    method: 'PUT',
    path: '/mobile/tasks/:taskId/progress',
    pathParams: z.object({
      taskId: z.string(),
    }),
    body: z.object({
      progress: z.number().min(0).max(100),
      notes: z.string().optional(),
      gpsCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
      }).optional(),
    }),
    responses: {
      200: MobileTaskResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update task progress',
    description: 'Update the progress percentage and add progress notes for a task in progress',
  },

  // Complete a task
  completeTask: {
    method: 'POST',
    path: '/mobile/tasks/:taskId/complete',
    pathParams: z.object({
      taskId: z.string(),
    }),
    body: z.object({
      completedAt: z.string().datetime().optional(),
      actualCost: z.number().optional(),
      notes: z.string().optional(),
      results: z.string().optional(),
      issues: z.string().optional(),
      recommendations: z.string().optional(),
      gpsCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
      }).optional(),
    }),
    responses: {
      200: MobileTaskResponseSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Complete a task',
    description: 'Mark a task as completed with final results, issues, and recommendations',
  },

  // Add note to task
  addTaskNote: {
    method: 'POST',
    path: '/mobile/tasks/:taskId/notes',
    pathParams: z.object({
      taskId: z.string().cuid('Invalid task ID format'),
    }),
    body: z.object({
      type: z.enum(['OBSERVATION', 'ISSUE', 'RECOMMENDATION', 'GENERAL']).optional().default('GENERAL'),
      content: z.string().min(1, 'Content cannot be empty').max(2000, 'Content too long'),
      gpsCoordinates: z.object({
        latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
        longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
        accuracy: z.number().positive('Accuracy must be positive').max(10000, 'Accuracy too high').optional(),
      }).optional(),
      photos: z.array(z.string().cuid('Invalid photo ID format')).max(10, 'Too many photos').optional(),
    }),
    responses: {
      201: z.object({
        data: MobileNoteSchema,
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Add note to task',
    description: 'Add a note, observation, or issue report to a task with optional GPS coordinates and photos',
  },

  // Add photo reference to task
  addTaskPhoto: {
    method: 'POST',
    path: '/mobile/tasks/:taskId/photos',
    pathParams: z.object({
      taskId: z.string().cuid('Invalid task ID format'),
    }),
    body: z.object({
      mediaId: z.string().cuid('Invalid media ID format'),
      url: z.string().url('Invalid URL format'),
      caption: z.string().max(500, 'Caption too long').optional(),
      gpsCoordinates: z.object({
        latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
        longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
        accuracy: z.number().positive('Accuracy must be positive').max(10000, 'Accuracy too high').optional(),
      }).optional(),
    }),
    responses: {
      201: z.object({
        data: MobilePhotoSchema,
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Add photo reference to task',
    description: 'Add a photo reference to a task using media ID and URL from MediaController',
  },

  // Get offline data
  getOfflineData: {
    method: 'GET',
    path: '/mobile/offline-data',
    query: z.object({
      lastSync: z.string().datetime().optional(),
    }),
    responses: {
      200: z.object({
        data: OfflineDataSchema,
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get offline data',
    description: 'Get data needed for offline field operations including tasks, farms, and areas',
  },

  // Sync offline data
  syncOfflineData: {
    method: 'POST',
    path: '/mobile/sync',
    body: z.object({
      taskUpdates: z.array(z.object({
        taskId: z.string(),
        progress: z.number().optional(),
        status: z.string().optional(),
        metadata: z.any().optional(),
      })).optional(),
      notes: z.array(z.object({
        taskId: z.string(),
        type: z.string(),
        content: z.string(),
        metadata: z.any().optional(),
      })).optional(),
      photos: z.array(z.object({
        taskId: z.string(),
        url: z.string(),
        caption: z.string().optional(),
        gpsCoordinates: z.any().optional(),
      })).optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          tasksUpdated: z.number(),
          notesAdded: z.number(),
          photosUploaded: z.number(),
          errors: z.array(z.string()),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Sync offline data',
    description: 'Sync data collected while offline back to the server',
  },

  // Get field conditions
  getFieldConditions: {
    method: 'GET',
    path: '/mobile/field-conditions',
    query: z.object({
      farmId: z.string().optional(),
      areaId: z.string().optional(),
      latitude: z.string().transform(Number).optional(),
      longitude: z.string().transform(Number).optional(),
    }),
    responses: {
      200: z.object({
        data: FieldConditionsSchema,
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get field conditions',
    description: 'Get current weather, soil conditions, and recommendations for field operations',
  },

  // Report issue
  reportIssue: {
    method: 'POST',
    path: '/mobile/issues',
    body: z.object({
      taskId: z.string(),
      description: z.string(),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
      category: z.string().optional().default('GENERAL'),
      gpsCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
      }).optional(),
      photos: z.array(z.string()).optional(),
    }),
    responses: {
      201: z.object({
        data: IssueSchema,
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Report issue',
    description: 'Report an issue or problem encountered during field operations',
  },
});
