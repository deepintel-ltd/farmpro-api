import { z } from 'zod';
import { JsonApiResourceSchema, JsonApiCollectionSchema } from './schemas';

// =============================================================================
// Enums and Base Types
// =============================================================================

export const ActivityTypeEnum = z.enum([
  'LAND_PREP',
  'PLANTING',
  'FERTILIZING',
  'IRRIGATION',
  'PEST_CONTROL',
  'HARVESTING',
  'MAINTENANCE',
  'MONITORING',
  'OTHER'
]);

export const ActivityStatusEnum = z.enum([
  'PLANNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
]);

export const ActivityPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const ResourceTypeEnum = z.enum(['equipment', 'labor', 'material']);

export const QualityEnum = z.enum(['excellent', 'good', 'fair', 'poor']);

export const PauseReasonEnum = z.enum(['weather', 'equipment', 'break', 'other']);

export const NoteTypeEnum = z.enum(['OBSERVATION', 'ISSUE', 'RECOMMENDATION', 'GENERAL']);

export const CostTypeEnum = z.enum(['LABOR', 'EQUIPMENT', 'MATERIAL', 'OTHER', 'FUEL']);

// =============================================================================
// Base Schemas
// =============================================================================

export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const ResourceSchema = z.object({
  type: ResourceTypeEnum,
  resourceId: z.string(),
  quantity: z.number(),
  unit: z.string(),
});

export const ResourceUsageSchema = z.object({
  resourceId: z.string(),
  quantityUsed: z.number(),
});

export const ActivityResultsSchema = z.object({
  quality: QualityEnum,
  quantityAchieved: z.number(),
  notes: z.string(),
});

export const CostEntrySchema = z.object({
  id: z.string(),
  type: CostTypeEnum,
  description: z.string(),
  amount: z.number(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  receipt: z.string().optional(),
  vendor: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

export const ActivityNoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  type: NoteTypeEnum,
  isPrivate: z.boolean(),
  attachments: z.array(z.string()),
  createdAt: z.string(),
  createdBy: z.string(),
});

export const ActivitySchema = z.object({
  id: z.string(),
  farmId: z.string(),
  areaId: z.string().nullable(),
  cropCycleId: z.string().nullable(),
  type: ActivityTypeEnum,
  name: z.string(),
  description: z.string(),
  status: ActivityStatusEnum,
  priority: ActivityPriorityEnum,
  scheduledAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  estimatedDuration: z.number(), // hours
  actualDuration: z.number().nullable(),
  percentComplete: z.number(),
  assignedTo: z.array(z.string()),
  resources: z.array(ResourceSchema),
  actualResources: z.array(ResourceSchema).optional(),
  instructions: z.string(),
  safetyNotes: z.string(),
  estimatedCost: z.number(),
  actualCost: z.number().nullable(),
  location: LocationSchema.nullable(),
  results: ActivityResultsSchema.nullable(),
  issues: z.string().nullable(),
  recommendations: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

export const ActivityTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ActivityTypeEnum,
  description: z.string(),
  defaultDuration: z.number(),
  instructions: z.string(),
  safetyNotes: z.string(),
  applicableCrops: z.array(z.string()),
  isSystem: z.boolean(),
  organizationId: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// =============================================================================
// Request Schemas
// =============================================================================

// Activity CRUD
export const CreateActivityRequestSchema = z.object({
  farmId: z.string(),
  areaId: z.string().optional(),
  cropCycleId: z.string().optional(),
  type: ActivityTypeEnum,
  name: z.string().min(1).max(255),
  description: z.string(),
  scheduledAt: z.string().datetime(),
  estimatedDuration: z.number().positive(),
  priority: ActivityPriorityEnum.default('NORMAL'),
  assignedTo: z.array(z.string()).default([]),
  resources: z.array(ResourceSchema).default([]),
  instructions: z.string().default(''),
  safetyNotes: z.string().default(''),
  estimatedCost: z.number().nonnegative().default(0),
  metadata: z.any().nullable().optional(),
});

export const UpdateActivityRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  priority: ActivityPriorityEnum.optional(),
  estimatedDuration: z.number().positive().optional(),
  assignedTo: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  metadata: z.any().nullable().optional(),
});

// Activity Execution
export const StartActivityRequestSchema = z.object({
  location: LocationSchema.optional(),
  notes: z.string().optional(),
  actualResources: z.array(ResourceSchema).default([]),
});

export const UpdateProgressRequestSchema = z.object({
  percentComplete: z.number().min(0).max(100),
  notes: z.string().optional(),
  issues: z.string().optional(),
  resourceUsage: z.array(ResourceUsageSchema).default([]),
});

export const CompleteActivityRequestSchema = z.object({
  completedAt: z.string().datetime().optional(),
  actualDuration: z.number().positive().optional(),
  results: ActivityResultsSchema.optional(),
  actualCost: z.number().nonnegative().optional(),
  resourcesUsed: z.array(ResourceUsageSchema).default([]),
  issues: z.string().optional(),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
});

export const PauseActivityRequestSchema = z.object({
  reason: PauseReasonEnum,
  notes: z.string().optional(),
  estimatedResumeTime: z.string().datetime().optional(),
});

// Activity Templates
export const CreateActivityTemplateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  type: ActivityTypeEnum,
  description: z.string(),
  defaultDuration: z.number().positive(),
  defaultResources: z.array(ResourceSchema).default([]),
  instructions: z.string().default(''),
  safetyNotes: z.string().default(''),
  applicableCrops: z.array(z.string()).default([]),
  metadata: z.any().nullable().optional(),
});

export const CreateFromTemplateRequestSchema = z.object({
  farmId: z.string(),
  areaId: z.string().optional(),
  cropCycleId: z.string().optional(),
  scheduledAt: z.string().datetime(),
  customizations: z.object({
    name: z.string().optional(),
    assignedTo: z.array(z.string()).optional(),
    resources: z.array(ResourceSchema).optional(),
  }).optional(),
});

// Activity Assignment & Management
export const AssignActivityRequestSchema = z.object({
  assignedTo: z.array(z.string()),
  reassignReason: z.string().optional(),
  notifyUsers: z.boolean().default(true),
});

export const RequestHelpRequestSchema = z.object({
  message: z.string(),
  skillsNeeded: z.array(z.string()).default([]),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
});

// Bulk Operations
export const BulkScheduleRequestSchema = z.object({
  activities: z.array(z.object({
    templateId: z.string(),
    scheduledAt: z.string().datetime(),
    farmId: z.string(),
    areaId: z.string().optional(),
    customizations: z.any().optional(),
  })),
  resolveConflicts: z.enum(['auto', 'manual']).default('manual'),
});

export const BulkCreateRequestSchema = z.object({
  activities: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    type: ActivityTypeEnum,
    priority: ActivityPriorityEnum,
    scheduledAt: z.string().datetime(),
    estimatedDuration: z.number().positive().optional(),
    farmId: z.string(),
    areaId: z.string().optional(),
    assignedTo: z.string().optional(),
    metadata: z.any().optional(),
  })),
});

export const BulkUpdateRequestSchema = z.object({
  activities: z.array(z.object({
    id: z.string(),
    updates: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      priority: ActivityPriorityEnum.optional(),
      scheduledAt: z.string().datetime().optional(),
      estimatedDuration: z.number().positive().optional(),
      status: ActivityStatusEnum.optional(),
      metadata: z.any().optional(),
    }),
  })),
});

export const BulkDeleteRequestSchema = z.object({
  activityIds: z.array(z.string()),
  reason: z.string().optional(),
});

export const BulkAssignRequestSchema = z.object({
  assignments: z.array(z.object({
    activityId: z.string(),
    userId: z.string(),
    role: z.enum(['PRIMARY', 'SUPPORT']).optional(),
  })),
});

export const BulkStatusUpdateRequestSchema = z.object({
  updates: z.array(z.object({
    activityId: z.string(),
    status: ActivityStatusEnum,
    reason: z.string().optional(),
    notes: z.string().optional(),
  })),
});

// Cost Tracking
export const AddCostEntryRequestSchema = z.object({
  type: CostTypeEnum,
  description: z.string(),
  amount: z.number().positive(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  receipt: z.string().optional(),
  vendor: z.string().optional(),
});

export const UpdateCostEntryRequestSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  receipt: z.string().optional(),
});

// Notes & Documentation
export const AddNoteRequestSchema = z.object({
  content: z.string().min(1),
  type: NoteTypeEnum.default('GENERAL'),
  isPrivate: z.boolean().default(false),
  attachments: z.array(z.string()).default([]),
});

// Reports
export const GenerateReportRequestSchema = z.object({
  reportType: z.enum(['efficiency', 'cost', 'completion', 'custom']),
  filters: z.object({
    farmId: z.string(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    activityTypes: z.array(ActivityTypeEnum).optional(),
    userId: z.string().optional(),
  }),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
  includeCharts: z.boolean().default(true),
});

// =============================================================================
// Query Parameter Schemas
// =============================================================================

export const ActivityQueryParams = z.object({
  farmId: z.string().optional(),
  areaId: z.string().optional(),
  cropCycleId: z.string().optional(),
  type: ActivityTypeEnum.optional(),
  status: ActivityStatusEnum.optional(),
  assignedTo: z.string().optional(),
  priority: ActivityPriorityEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  include: z.string().optional(),
  sort: z.string().optional(),
  'page[number]': z.coerce.number().int().positive().optional(),
  'page[size]': z.coerce.number().int().positive().max(100).optional(),
});

export const CalendarQueryParams = z.object({
  farmId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  userId: z.string().optional(),
  view: z.enum(['day', 'week', 'month']).default('week'),
});

export const ConflictCheckQueryParams = z.object({
  farmId: z.string(),
  resourceId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export const WorkloadQueryParams = z.object({
  farmId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  userId: z.string().optional(),
});

export const MyTasksQueryParams = z.object({
  status: ActivityStatusEnum.optional(),
  farmId: z.string().optional(),
  priority: ActivityPriorityEnum.optional(),
  dueDate: z.string().datetime().optional(),
});

export const TemplateQueryParams = z.object({
  type: ActivityTypeEnum.optional(),
  cropType: z.string().optional(),
  farmType: z.string().optional(),
  search: z.string().optional(),
});

export const AnalyticsQueryParams = z.object({
  farmId: z.string(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  type: ActivityTypeEnum.optional(),
  metric: z.enum(['efficiency', 'completion', 'cost', 'duration']).optional(),
});

// =============================================================================
// JSON:API Resource Schemas
// =============================================================================

export const ActivityResourceSchema = JsonApiResourceSchema(ActivitySchema);

export const ActivityTemplateResourceSchema = JsonApiResourceSchema(ActivityTemplateSchema);

export const CostEntryResourceSchema = JsonApiResourceSchema(CostEntrySchema);

export const ActivityNoteResourceSchema = JsonApiResourceSchema(ActivityNoteSchema);

// =============================================================================
// Collection Schemas
// =============================================================================

export const ActivityCollectionSchema = JsonApiCollectionSchema(ActivitySchema);
export const ActivityTemplateCollectionSchema = JsonApiCollectionSchema(ActivityTemplateSchema);
export const CostEntryCollectionSchema = JsonApiCollectionSchema(CostEntrySchema);
export const ActivityNoteCollectionSchema = JsonApiCollectionSchema(ActivityNoteSchema);

// =============================================================================
// Response-specific Schemas
// =============================================================================

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean(),
  color: z.string(),
  activity: ActivitySchema,
});

export const ConflictSchema = z.object({
  resourceId: z.string(),
  conflictingActivities: z.array(ActivitySchema),
  suggestions: z.array(z.object({
    action: z.enum(['reschedule', 'reassign', 'split']),
    description: z.string(),
    newTime: z.string().datetime().optional(),
  })),
});

export const WorkloadAnalysisSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  totalHours: z.number(),
  capacity: z.number(),
  utilization: z.number(), // percentage
  activities: z.array(ActivitySchema),
});

export const TeamPerformanceSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  completedActivities: z.number(),
  averageCompletionTime: z.number(),
  onTimeCompletion: z.number(), // percentage
  qualityScore: z.number(),
});

export const ActivityAnalyticsSchema = z.object({
  period: z.string(),
  totalActivities: z.number(),
  completionRate: z.number(),
  averageDuration: z.number(),
  costEfficiency: z.number(),
  typeBreakdown: z.array(z.object({
    type: ActivityTypeEnum,
    count: z.number(),
    avgDuration: z.number(),
    avgCost: z.number(),
  })),
});

export const BulkScheduleResultSchema = z.object({
  scheduled: z.number(),
  conflicts: z.number(),
  failed: z.number(),
  activities: z.array(ActivityResourceSchema),
  conflictDetails: z.array(ConflictSchema),
});

export const BulkCreateResultSchema = z.object({
  created: z.number(),
  failed: z.number(),
  activities: z.array(ActivityResourceSchema),
  errors: z.array(z.object({
    index: z.number(),
    error: z.string(),
  })),
});

export const BulkUpdateResultSchema = z.object({
  updated: z.number(),
  failed: z.number(),
  activities: z.array(ActivityResourceSchema),
  errors: z.array(z.object({
    activityId: z.string(),
    error: z.string(),
  })),
});

export const BulkDeleteResultSchema = z.object({
  deleted: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    activityId: z.string(),
    error: z.string(),
  })),
});

export const BulkAssignResultSchema = z.object({
  assigned: z.number(),
  failed: z.number(),
  assignments: z.array(z.object({
    activityId: z.string(),
    userId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

export const BulkStatusUpdateResultSchema = z.object({
  updated: z.number(),
  failed: z.number(),
  activities: z.array(ActivityResourceSchema),
  errors: z.array(z.object({
    activityId: z.string(),
    error: z.string(),
  })),
});

// Collection response schemas for special endpoints
export const CalendarCollectionSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.literal('calendar-events'),
    attributes: CalendarEventSchema,
  })),
  meta: z.object({
    period: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    totalCount: z.number(),
  }).optional(),
});

export const ConflictCollectionSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.literal('conflicts'),
    attributes: ConflictSchema,
  })),
});

export const WorkloadCollectionSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.literal('workload-analysis'),
    attributes: WorkloadAnalysisSchema,
  })),
});

export const TeamPerformanceCollectionSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.literal('team-performance'),
    attributes: TeamPerformanceSchema,
  })),
});

export const AnalyticsResourceSchema = JsonApiResourceSchema(ActivityAnalyticsSchema);

export const BulkScheduleResourceSchema = JsonApiResourceSchema(BulkScheduleResultSchema);
export const BulkCreateResourceSchema = JsonApiResourceSchema(BulkCreateResultSchema);
export const BulkUpdateResourceSchema = JsonApiResourceSchema(BulkUpdateResultSchema);
export const BulkDeleteResourceSchema = JsonApiResourceSchema(BulkDeleteResultSchema);
export const BulkAssignResourceSchema = JsonApiResourceSchema(BulkAssignResultSchema);
export const BulkStatusUpdateResourceSchema = JsonApiResourceSchema(BulkStatusUpdateResultSchema);
