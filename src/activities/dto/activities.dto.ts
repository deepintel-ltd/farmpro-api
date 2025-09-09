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
}

export interface MyTasksQueryOptions {
  status?: string;
  farmId?: string;
  priority?: string;
}

export interface AnalyticsQueryOptions {
  farmId: string;
  period?: string;
  type?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
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
    type: string;
    count: number;
    avgDuration: number;
    avgCost: number;
  }>;
}
