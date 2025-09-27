import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  BulkScheduleRequestSchema,
  BulkCreateRequestSchema,
  BulkUpdateRequestSchema,
  BulkDeleteRequestSchema,
  BulkAssignRequestSchema,
  BulkStatusUpdateRequestSchema,
  BulkScheduleResourceSchema,
  BulkCreateResourceSchema,
  BulkUpdateResourceSchema,
  BulkDeleteResourceSchema,
  BulkAssignResourceSchema,
  BulkStatusUpdateResourceSchema,
  CalendarCollectionSchema,
  ConflictCollectionSchema,
  WorkloadCollectionSchema,
  CalendarQueryParams,
  ConflictCheckQueryParams,
  WorkloadQueryParams,
} from './activities.schemas';
import { JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Activities Scheduling Contract
// =============================================================================

export const activitiesSchedulingContract = c.router({
  // Get calendar
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

  // Check conflicts
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

  // Bulk schedule
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

  // Bulk create
  bulkCreate: {
    method: 'POST',
    path: '/activities/bulk-create',
    body: BulkCreateRequestSchema,
    responses: {
      201: BulkCreateResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Create multiple activities',
  },

  // Bulk update
  bulkUpdate: {
    method: 'PATCH',
    path: '/activities/bulk-update',
    body: BulkUpdateRequestSchema,
    responses: {
      200: BulkUpdateResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update multiple activities',
  },

  // Bulk delete
  bulkDelete: {
    method: 'DELETE',
    path: '/activities/bulk-delete',
    body: BulkDeleteRequestSchema,
    responses: {
      200: BulkDeleteResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete multiple activities',
  },

  // Bulk assign
  bulkAssign: {
    method: 'POST',
    path: '/activities/bulk-assign',
    body: BulkAssignRequestSchema,
    responses: {
      200: BulkAssignResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Assign multiple activities',
  },

  // Bulk status update
  bulkStatusUpdate: {
    method: 'PATCH',
    path: '/activities/bulk-status-update',
    body: BulkStatusUpdateRequestSchema,
    responses: {
      200: BulkStatusUpdateResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update status of multiple activities',
  },

  // Get workload
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
});

export type ActivitiesSchedulingContract = typeof activitiesSchedulingContract;
