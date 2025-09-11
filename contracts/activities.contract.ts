import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  // Request Schemas
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
  StartActivityRequestSchema,
  UpdateProgressRequestSchema,
  CompleteActivityRequestSchema,
  PauseActivityRequestSchema,
  CreateActivityTemplateRequestSchema,
  CreateFromTemplateRequestSchema,
  AssignActivityRequestSchema,
  RequestHelpRequestSchema,
  BulkScheduleRequestSchema,
  AddCostEntryRequestSchema,
  UpdateCostEntryRequestSchema,
  AddNoteRequestSchema,
  GenerateReportRequestSchema,
  
  // Resource Schemas
  ActivityResourceSchema,
  ActivityTemplateResourceSchema,
  CostEntryResourceSchema,
  ActivityNoteResourceSchema,
  AnalyticsResourceSchema,
  BulkScheduleResourceSchema,
  
  // Collection Schemas
  ActivityCollectionSchema,
  ActivityTemplateCollectionSchema,
  CostEntryCollectionSchema,
  ActivityNoteCollectionSchema,
  CalendarCollectionSchema,
  ConflictCollectionSchema,
  WorkloadCollectionSchema,
  TeamPerformanceCollectionSchema,
  
  // Query Schemas
  ActivityQueryParams,
  CalendarQueryParams,
  ConflictCheckQueryParams,
  WorkloadQueryParams,
  MyTasksQueryParams,
  TemplateQueryParams,
  AnalyticsQueryParams,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Contract
// =============================================================================

export const activitiesContract = c.router({
  // =============================================================================
  // Activity CRUD Operations
  // =============================================================================
  
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

  updateActivity: {
    method: 'PUT',
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

  // =============================================================================
  // Activity Execution & Progress
  // =============================================================================

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

  // =============================================================================
  // Activity Templates & Planning
  // =============================================================================

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

  // =============================================================================
  // Activity Scheduling & Calendar
  // =============================================================================

  getCalendar: {
    method: 'GET',
    path: '/activities/calendar',
    query: CalendarQueryParams,
    responses: {
      200: CalendarCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activities in calendar format',
  },

  checkConflicts: {
    method: 'GET',
    path: '/activities/schedule/conflicts',
    query: ConflictCheckQueryParams,
    responses: {
      200: ConflictCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Check for scheduling conflicts',
  },

  bulkSchedule: {
    method: 'POST',
    path: '/activities/bulk-schedule',
    body: BulkScheduleRequestSchema,
    responses: {
      201: BulkScheduleResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Schedule multiple activities',
  },

  getWorkload: {
    method: 'GET',
    path: '/activities/workload',
    query: WorkloadQueryParams,
    responses: {
      200: WorkloadCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get team workload analysis',
  },

  // =============================================================================
  // Activity Assignments & Team Management
  // =============================================================================

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

  // =============================================================================
  // Activity Cost Tracking
  // =============================================================================

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

  // =============================================================================
  // Activity Documentation & Media
  // =============================================================================

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

  uploadMedia: {
    method: 'POST',
    path: '/activities/:activityId/media',
    pathParams: z.object({
      activityId: z.string(),
    }),
    body: z.any(), // multipart/form-data
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

  // =============================================================================
  // Activity Analytics & Reporting
  // =============================================================================

  getAnalytics: {
    method: 'GET',
    path: '/activities/analytics',
    query: AnalyticsQueryParams,
    responses: {
      200: AnalyticsResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity performance analytics',
  },

  getCompletionRates: {
    method: 'GET',
    path: '/activities/completion-rates',
    query: AnalyticsQueryParams,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('completion-rates'),
          attributes: z.object({
            period: z.string(),
            overallRate: z.number(),
            onTimeRate: z.number(),
            byType: z.array(z.object({
              type: z.string(),
              completionRate: z.number(),
              onTimeRate: z.number(),
            })),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity completion statistics',
  },

  getCostAnalysis: {
    method: 'GET',
    path: '/activities/cost-analysis',
    query: AnalyticsQueryParams,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('cost-analysis'),
          attributes: z.object({
            period: z.string(),
            totalCost: z.number(),
            averageCost: z.number(),
            costVariance: z.number(),
            trends: z.array(z.object({
              period: z.string(),
              cost: z.number(),
            })),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get activity cost analysis',
  },

  generateReport: {
    method: 'POST',
    path: '/activities/reports',
    body: GenerateReportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('reports'),
          attributes: z.object({
            status: z.string(),
            message: z.string(),
            downloadUrl: z.string().optional(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Generate custom activity report',
  },
});
