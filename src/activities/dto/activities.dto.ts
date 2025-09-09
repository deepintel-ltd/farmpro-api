import { z } from 'zod';
import {
  CreateActivityRequestSchema,
  UpdateActivityRequestSchema,
  StartActivityRequestSchema,
  UpdateProgressRequestSchema,
  CompleteActivityRequestSchema,
  PauseActivityRequestSchema,
  ActivityTypeEnum,
  ActivityStatusEnum,
  ActivityPriorityEnum,
  ResourceTypeEnum,
  QualityEnum,
  PauseReasonEnum,
  NoteTypeEnum,
  CostTypeEnum,
} from '../../../contracts/activities.schemas';

// Export DTOs based on contract schemas
export type CreateActivityDto = z.infer<typeof CreateActivityRequestSchema>;
export type UpdateActivityDto = z.infer<typeof UpdateActivityRequestSchema>;
export type StartActivityDto = z.infer<typeof StartActivityRequestSchema>;
export type UpdateProgressDto = z.infer<typeof UpdateProgressRequestSchema>;
export type CompleteActivityDto = z.infer<typeof CompleteActivityRequestSchema>;
export type PauseActivityDto = z.infer<typeof PauseActivityRequestSchema>;

// Export enum types for use in service
export type ActivityType = z.infer<typeof ActivityTypeEnum>;
export type ActivityStatus = z.infer<typeof ActivityStatusEnum>;
export type ActivityPriority = z.infer<typeof ActivityPriorityEnum>;
export type ResourceType = z.infer<typeof ResourceTypeEnum>;
export type Quality = z.infer<typeof QualityEnum>;
export type PauseReason = z.infer<typeof PauseReasonEnum>;
export type NoteType = z.infer<typeof NoteTypeEnum>;
export type CostType = z.infer<typeof CostTypeEnum>;

// Simple interfaces for implemented features only
export interface Location {
  lat: number;
  lng: number;
}

export interface Resource {
  type: ResourceType;
  resourceId: string;
  quantity: number;
  unit: string;
}

export interface ResourceUsage {
  resourceId: string;
  quantityUsed: number;
}

export interface ActivityResults {
  quality: Quality;
  quantityAchieved: number;
  notes: string;
}

// Query interface types for controller
export interface ActivityQueryOptions {
  farmId?: string;
  areaId?: string;
  cropCycleId?: string;
  type?: ActivityType;
  status?: ActivityStatus;
  assignedTo?: string;
  priority?: ActivityPriority;
  startDate?: string;
  endDate?: string;
  include?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface CalendarQueryOptions {
  farmId: string;
  startDate: string;
  endDate: string;
  userId?: string;
  view?: 'day' | 'week' | 'month';
}

export interface MyTasksQueryOptions {
  status?: ActivityStatus;
  farmId?: string;
  priority?: ActivityPriority;
  dueDate?: string;
}

export interface AnalyticsQueryOptions {
  farmId: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  type?: ActivityType;
  metric?: 'efficiency' | 'completion' | 'cost' | 'duration';
}

// Simple calendar event interface
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  activity: any; // Simplified for now
}

// Simple analytics interface
export interface ActivityAnalytics {
  period: string;
  totalActivities: number;
  completionRate: number;
  averageDuration: number;
  costEfficiency: number;
  typeBreakdown: Array<{
    type: ActivityType;
    count: number;
    avgDuration: number;
    avgCost: number;
  }>;
}
