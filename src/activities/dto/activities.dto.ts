import { z } from 'zod';
import {
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
} from '../../../contracts/activities.schemas';

// Core DTOs
export type CreateActivityDto = z.infer<typeof CreateActivityRequestSchema>;
export type UpdateActivityDto = z.infer<typeof UpdateActivityRequestSchema>;

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

export interface WorkloadQueryOptions {
  farmId: string;
  startDate: string;
  endDate: string;
  userId?: string;
}
