import { z } from 'zod';
import {
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
  StartActivityRequestSchema,
  UpdateProgressRequestSchema,
  CompleteActivityRequestSchema,
  PauseActivityRequestSchema,
} from '../../../contracts/activities.schemas';

// Core DTOs
export type CreateActivityDto = z.infer<typeof CreateActivityRequestSchema>;
export type UpdateActivityDto = z.infer<typeof UpdateActivityRequestSchema>;
export type StartActivityDto = z.infer<typeof StartActivityRequestSchema>;
export type UpdateProgressDto = z.infer<typeof UpdateProgressRequestSchema>;
export type CompleteActivityDto = z.infer<typeof CompleteActivityRequestSchema>;
export type PauseActivityDto = z.infer<typeof PauseActivityRequestSchema>;

// Query interfaces
export interface ActivityQueryOptions {
  farmId?: string;
  areaId?: string;
  cropCycleId?: string;
  type?: string;
  status?: string;
  assignedTo?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface CalendarQueryOptions {
  farmId: string;
  startDate: string;
  endDate: string;
  userId?: string;
  view?: string;
}

export interface MyTasksQueryOptions {
  status?: string;
  farmId?: string;
  priority?: string;
}

export interface AnalyticsQueryOptions {
  farmId: string;
  period?: string;
  type?: 'LAND_PREP' | 'PLANTING' | 'FERTILIZING' | 'IRRIGATION' | 'PEST_CONTROL' | 'HARVESTING' | 'MAINTENANCE' | 'MONITORING' | 'OTHER';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  activity: any;
}

export interface ActivityAnalytics {
  period: string;
  totalActivities: number;
  completionRate: number;
  averageDuration: number;
  costEfficiency: number;
  typeBreakdown: Array<{
    type: "LAND_PREP" | "PLANTING" | "FERTILIZING" | "IRRIGATION" | "PEST_CONTROL" | "HARVESTING" | "MAINTENANCE" | "MONITORING" | "OTHER";
    count: number;
    avgDuration: number;
    avgCost: number;
  }>;
}

export interface ConflictCheckQueryOptions {
  farmId: string;
  resourceId?: string;
  startTime: string;
  endTime: string;
}

export interface BulkScheduleRequestOptions {
  activities: Array<{
    templateId: string;
    scheduledAt: string;
    farmId: string;
    areaId?: string;
    customizations?: any;
  }>;
  resolveConflicts?: 'auto' | 'manual';
}

export interface WorkloadQueryOptions {
  farmId: string;
  startDate: string;
  endDate: string;
  userId?: string;
}

// Bulk operation DTOs
export interface BulkCreateActivityDto {
  activities: Array<{
    name: string;
    description?: string;
    farmId: string;
    type: string;
    scheduledAt?: string;
    assignedTo?: string[];
  }>;
}

export interface BulkUpdateActivityDto {
  activities: Array<{
    id: string;
    updates: {
      name?: string;
      description?: string;
      status?: string;
      priority?: string;
    };
  }>;
}

export interface BulkDeleteActivityDto {
  activityIds: string[];
  reason?: string;
}

export interface BulkStatusUpdateDto {
  updates: Array<{
    activityId: string;
    status: string;
    reason?: string;
  }>;
}

export interface BulkAssignActivityDto {
  assignments: Array<{
    activityId: string;
    assignedTo: string[];
    reassignReason?: string;
  }>;
}
