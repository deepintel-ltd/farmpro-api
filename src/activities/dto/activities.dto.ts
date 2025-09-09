import { z } from 'zod';
import {
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
export type CreateActivityTemplateDto = z.infer<typeof CreateActivityTemplateRequestSchema>;
export type CreateFromTemplateDto = z.infer<typeof CreateFromTemplateRequestSchema>;
export type AssignActivityDto = z.infer<typeof AssignActivityRequestSchema>;
export type RequestHelpDto = z.infer<typeof RequestHelpRequestSchema>;
export type BulkScheduleDto = z.infer<typeof BulkScheduleRequestSchema>;
export type AddCostEntryDto = z.infer<typeof AddCostEntryRequestSchema>;
export type UpdateCostEntryDto = z.infer<typeof UpdateCostEntryRequestSchema>;
export type AddNoteDto = z.infer<typeof AddNoteRequestSchema>;
export type GenerateReportDto = z.infer<typeof GenerateReportRequestSchema>;

// Export enum types for use in service
export type ActivityType = z.infer<typeof ActivityTypeEnum>;
export type ActivityStatus = z.infer<typeof ActivityStatusEnum>;
export type ActivityPriority = z.infer<typeof ActivityPriorityEnum>;
export type ResourceType = z.infer<typeof ResourceTypeEnum>;
export type Quality = z.infer<typeof QualityEnum>;
export type PauseReason = z.infer<typeof PauseReasonEnum>;
export type NoteType = z.infer<typeof NoteTypeEnum>;
export type CostType = z.infer<typeof CostTypeEnum>;

// Internal DTOs for service layer
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

export interface ActivityWithDetails {
  id: string;
  farmId: string;
  areaId: string | null;
  cropCycleId: string | null;
  type: ActivityType;
  name: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedDuration: number;
  actualDuration: number | null;
  percentComplete: number;
  assignedTo: string[];
  resources: Resource[];
  actualResources?: Resource[];
  instructions: string;
  safetyNotes: string;
  estimatedCost: number;
  actualCost: number | null;
  location: Location | null;
  results: ActivityResults | null;
  issues: string | null;
  recommendations: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  farm?: {
    id: string;
    name: string;
  };
  area?: {
    id: string;
    name: string;
  };
  cropCycle?: {
    id: string;
    name: string;
  };
  assignedUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  costs?: CostEntry[];
  notes?: ActivityNote[];
}

export interface ActivityTemplate {
  id: string;
  name: string;
  type: ActivityType;
  description: string;
  defaultDuration: number;
  defaultResources: Resource[];
  instructions: string;
  safetyNotes: string;
  applicableCrops: string[];
  isSystem: boolean;
  organizationId: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostEntry {
  id: string;
  type: CostType;
  description: string;
  amount: number;
  quantity?: number;
  unit?: string;
  receipt?: string;
  vendor?: string;
  createdAt: Date;
  createdBy: string;
  createdByUser?: {
    id: string;
    name: string;
  };
}

export interface ActivityNote {
  id: string;
  content: string;
  type: NoteType;
  isPrivate: boolean;
  attachments: string[];
  createdAt: Date;
  createdBy: string;
  createdByUser?: {
    id: string;
    name: string;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  activity: ActivityWithDetails;
}

export interface ConflictInfo {
  resourceId: string;
  conflictingActivities: ActivityWithDetails[];
  suggestions: Array<{
    action: 'reschedule' | 'reassign' | 'split';
    description: string;
    newTime?: Date;
  }>;
}

export interface WorkloadAnalysis {
  userId: string;
  userName: string;
  totalHours: number;
  capacity: number;
  utilization: number; // percentage
  activities: ActivityWithDetails[];
}

export interface TeamPerformance {
  userId: string;
  userName: string;
  completedActivities: number;
  averageCompletionTime: number;
  onTimeCompletion: number; // percentage
  qualityScore: number;
}

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

export interface BulkScheduleResult {
  scheduled: number;
  conflicts: number;
  failed: number;
  activities: ActivityWithDetails[];
  conflictDetails: ConflictInfo[];
}

export interface CompletionRates {
  period: string;
  overallRate: number;
  onTimeRate: number;
  byType: Array<{
    type: string;
    completionRate: number;
    onTimeRate: number;
  }>;
}

export interface CostAnalysis {
  period: string;
  totalCost: number;
  averageCost: number;
  costVariance: number;
  trends: Array<{
    period: string;
    cost: number;
  }>;
}

export interface ReportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message: string;
  downloadUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Query interface types for better typing in controller
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

export interface ConflictCheckOptions {
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

export interface MyTasksQueryOptions {
  status?: ActivityStatus;
  farmId?: string;
  priority?: ActivityPriority;
  dueDate?: string;
}

export interface TemplateQueryOptions {
  type?: ActivityType;
  cropType?: string;
  farmType?: string;
}

export interface AnalyticsQueryOptions {
  farmId: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  type?: ActivityType;
  metric?: 'efficiency' | 'completion' | 'cost' | 'duration';
}