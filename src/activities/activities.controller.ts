import { Controller, UseGuards, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants';
import { FarmAccessGuard } from '../farms/guards/farm-access.guard';
import { ActivityAssignmentGuard } from './guards/activity-assignment.guard';
import {
  RequirePermission,
  RequireCapability,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';
import { activitiesCrudContract } from '../../contracts/activities-crud.contract';
import { activitiesExecutionContract } from '../../contracts/activities-execution.contract';
import { activitiesTemplatesContract } from '../../contracts/activities-templates.contract';
import { activitiesSchedulingContract } from '../../contracts/activities-scheduling.contract';
import { activitiesTeamContract } from '../../contracts/activities-team.contract';
import { activitiesCostsContract } from '../../contracts/activities-costs.contract';
import { activitiesMediaContract } from '../../contracts/activities-media.contract';
import { activitiesAnalyticsContract } from '../../contracts/activities-analytics.contract';
import { ActivitiesService } from './activities.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityTemplateService, CreateFromTemplateDto } from './activity-template.service';
import { ActivitySchedulingService } from './activity-scheduling.service';
import { ActivityNotesService } from './activity-notes.service';
import { CalendarQueryOptions, AnalyticsQueryOptions, ConflictCheckQueryOptions, WorkloadQueryOptions } from './dto/activities.dto';


interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

// Activity type based on the schema
interface Activity {
  id: string;
  farmId: string;
  areaId: string | null;
  cropCycleId: string | null;
  type: 'LAND_PREP' | 'PLANTING' | 'FERTILIZING' | 'IRRIGATION' | 'PEST_CONTROL' | 'HARVESTING' | 'MAINTENANCE' | 'MONITORING' | 'OTHER';
  name: string;
  description: string;
  status: 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedDuration: number;
  actualDuration: number | null;
  percentComplete: number;
  assignedTo: string[];
  resources: Array<{
    type: 'equipment' | 'labor' | 'material';
    resourceId: string;
    quantity: number;
    unit: string;
  }>;
  actualResources?: Array<{
    type: 'equipment' | 'labor' | 'material';
    resourceId: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string;
  safetyNotes: string;
  estimatedCost: number;
  actualCost: number | null;
  location: {
    lat: number;
    lng: number;
  } | null;
  results: {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    quantityAchieved: number;
    notes: string;
  } | null;
  issues: string | null;
  recommendations: string | null;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Helper function to format activity responses in JSON API format
function formatActivityResponse(activity: Activity) {
  return {
    data: {
      id: activity.id,
      type: 'activities',
      attributes: activity
    }
  };
}

@Controller()
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly assignmentService: ActivityAssignmentService,
    private readonly templateService: ActivityTemplateService,
    private readonly schedulingService: ActivitySchedulingService,
    private readonly notesService: ActivityNotesService,
  ) {}

  @TsRestHandler(activitiesCrudContract.getActivities)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getActivities(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.getActivities, async ({ query }) => {
      const result = await this.activitiesService.getActivities(query, req);
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.getCalendar)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getCalendar(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.getCalendar, async ({ query }) => {
      const calendarQuery: CalendarQueryOptions = {
        farmId: query.farmId!,
        startDate: query.startDate!,
        endDate: query.endDate!,
        userId: query.userId,
        view: query.view,
      };
      const events = await this.activitiesService.getCalendarEvents(calendarQuery, req);
      return {
        status: 200 as const,
        body: {
          data: events.map(event => ({
            id: event.id,
            type: 'calendar-events' as const,
            attributes: event,
          })),
          meta: {
            period: { start: query.startDate, end: query.endDate },
            totalCount: events.length,
          },
        },
      };
    });
  }

  @TsRestHandler(activitiesTeamContract.getMyTasks)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getMyTasks(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.getMyTasks, async ({ query }) => {
      const result = await this.activitiesService.getMyTasks(req.user.userId, query, req);
      return { status: 200 as const, body: result };
    });
  }

  // Team Performance Analytics - MUST come before getActivity to avoid route conflicts
  @TsRestHandler(activitiesTeamContract.getTeamPerformance)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getTeamPerformance(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.getTeamPerformance, async ({ query }) => {
      const analyticsQuery = {
        farmId: query.farmId!,
        period: query.period,
        type: query.type,
        metric: query.metric,
      };
      const result = await this.activitiesService.getTeamPerformance(analyticsQuery, req);
      
      // Transform to match expected contract format
      return { 
        status: 200 as const, 
        body: { 
          data: result.included.map(item => ({
            id: item.id,
            type: 'team-performance' as const,
            attributes: {
              userId: item.attributes.user.id,
              userName: item.attributes.user.name,
              completedActivities: item.attributes.completed,
              averageCompletionTime: 0, // Not available in current data
              onTimeCompletion: item.attributes.completionRate,
              qualityScore: item.attributes.efficiency,
            }
          }))
        } 
      };
    });
  }

  // Analytics - MUST come before getActivity to avoid route conflicts
  @TsRestHandler(activitiesAnalyticsContract.getAnalytics)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getAnalytics() {
    return tsRestHandler(activitiesAnalyticsContract.getAnalytics, async ({ query }) => {
      const analyticsQuery: AnalyticsQueryOptions = {
        farmId: query.farmId,
        period: query.period,
        type: query.type,
      };
      const analytics = await this.activitiesService.getAnalytics(analyticsQuery);
      return {
        status: 200 as const,
        body: {
          data: {
            id: 'analytics',
            type: 'activity-analytics' as const,
            attributes: analytics,
          },
        },
      };
    });
  }

  @TsRestHandler(activitiesAnalyticsContract.getCompletionRates)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getCompletionRates(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesAnalyticsContract.getCompletionRates, async ({ query }) => {
      const analyticsQuery: AnalyticsQueryOptions = {
        farmId: query.farmId,
        period: query.period,
        type: query.type,
      };
      const result = await this.activitiesService.getCompletionRates(analyticsQuery, req);
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(activitiesAnalyticsContract.getCostAnalysis)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getCostAnalysis(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesAnalyticsContract.getCostAnalysis, async ({ query }) => {
      const analyticsQuery: AnalyticsQueryOptions = {
        farmId: query.farmId,
        period: query.period,
        type: query.type,
      };
      const result = await this.activitiesService.getCostAnalysis(analyticsQuery, req);
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(activitiesAnalyticsContract.generateReport)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  @RequireCapability('data_export')
  public generateReport(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesAnalyticsContract.generateReport, async ({ body }) => {
      const result = await this.activitiesService.generateReport({
        reportType: body.reportType,
        filters: body.filters,
        format: body.format,
        includeCharts: body.includeCharts
      }, req.user.organizationId);
      return { status: 202 as const, body: result };
    });
  }

  // Templates - MUST come before getActivity to avoid route conflicts
  @TsRestHandler(activitiesTemplatesContract.getActivityTemplates)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getActivityTemplates(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTemplatesContract.getActivityTemplates, async ({ query }) => {
      const result = await this.templateService.getTemplates(req.user.organizationId, {
        type: query.type,
        cropType: query.cropType,
        farmType: query.farmType,
        search: query.search,
      });
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.bulkCreate)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.CREATE)
  @RequireRoleLevel(50)
  public bulkCreate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.bulkCreate, async ({ body }) => {
      const result = await this.activitiesService.bulkCreateActivities(
        body.activities as Array<{
          name: string;
          description?: string;
          type: string;
          priority: string;
          scheduledAt: string;
          estimatedDuration?: number;
          farmId: string;
          areaId?: string;
          assignedTo?: string;
          metadata?: any;
        }>,
        req.user.organizationId,
        req.user.userId
      );
      return { 
        status: 201 as const, 
        body: { 
          data: {
            id: 'bulk-create',
            type: 'bulk-create',
            attributes: result
          }
        } 
      };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.bulkUpdate)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.UPDATE)
  @RequireRoleLevel(50)
  public bulkUpdate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.bulkUpdate, async ({ body }) => {
      const result = await this.activitiesService.bulkUpdateActivities(
        body.activities as Array<{
          id: string;
          updates: {
            name?: string;
            description?: string;
            priority?: string;
            scheduledAt?: string;
            estimatedDuration?: number;
            status?: string;
            metadata?: any;
          };
        }>,
        req.user.organizationId,
        req.user.userId
      );
      return { 
        status: 200 as const, 
        body: { 
          data: {
            id: 'bulk-update',
            type: 'bulk-update',
            attributes: result
          }
        } 
      };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.bulkDelete)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.DELETE)
  @RequireRoleLevel(50)
  public bulkDelete(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.bulkDelete, async ({ body }) => {
      const result = await this.activitiesService.bulkDeleteActivities(
        body.activityIds as string[],
        body.reason || 'Bulk deletion',
        req.user.organizationId,
        req.user.userId
      );
      return { 
        status: 200 as const, 
        body: { 
          data: {
            id: 'bulk-delete',
            type: 'bulk-delete',
            attributes: result
          }
        } 
      };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.bulkAssign)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.ASSIGN)
  @RequireRoleLevel(40)
  public bulkAssign(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.bulkAssign, async ({ body }) => {
      const result = await this.activitiesService.bulkAssignActivities(
        body.assignments as Array<{
          activityId: string;
          userId: string;
          role?: 'PRIMARY' | 'SUPPORT';
        }>,
        req.user.organizationId,
        req.user.userId
      );
      return { 
        status: 200 as const, 
        body: { 
          data: {
            id: 'bulk-assign',
            type: 'bulk-assign',
            attributes: result
          }
        } 
      };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.bulkStatusUpdate)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.UPDATE)
  @RequireRoleLevel(50)
  public bulkStatusUpdate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.bulkStatusUpdate, async ({ body }) => {
      const result = await this.activitiesService.bulkUpdateActivityStatus(
        body.updates as Array<{
          activityId: string;
          status: string;
          reason?: string;
          notes?: string;
        }>,
        req.user.organizationId,
        req.user.userId
      );
      return { 
        status: 200 as const, 
        body: { 
          data: {
            id: 'bulk-status-update',
            type: 'bulk-status-update',
            attributes: result
          }
        } 
      };
    });
  }

  @TsRestHandler(activitiesCrudContract.getActivity)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.getActivity, async ({ params }) => {
      const activity = await this.activitiesService.getActivity(params.activityId, req);
      return { 
        status: 200 as const, 
        body: formatActivityResponse(activity as Activity)
      };
    });
  }

  @TsRestHandler(activitiesCrudContract.createActivity)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.CREATE)
  @RequireCapability('track_activities')
  public createActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.createActivity, async ({ body }) => {
      const result = await this.activitiesService.createActivity(body, req.user.userId, req);
      return { 
        status: 201 as const, 
        body: formatActivityResponse(result as Activity)
      };
    });
  }

  @TsRestHandler(activitiesCrudContract.updateActivity)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.UPDATE)
  @UseGuards(FarmAccessGuard)
  public updateActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.updateActivity, async ({ params, body }) => {
      const result = await this.activitiesService.updateActivity(params.activityId, body, req.user.userId, req);
      return { 
        status: 200 as const, 
        body: formatActivityResponse(result as Activity)
      };
    });
  }

  @TsRestHandler(activitiesCrudContract.deleteActivity)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.DELETE)
  @UseGuards(FarmAccessGuard)
  public deleteActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.deleteActivity, async ({ params }) => {
      await this.activitiesService.deleteActivity(params.activityId, req.user.userId, req);
      return {
        status: 200 as const,
        body: {
          data: {
            id: params.activityId,
            type: 'activities' as const,
            attributes: { message: 'Activity cancelled successfully', success: true },
          },
        },
      };
    });
  }

  @TsRestHandler(activitiesExecutionContract.updateActivityStatus)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.EXECUTE)
  @UseGuards(ActivityAssignmentGuard)
  public updateActivityStatus(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.updateActivityStatus, async ({ params, body }) => {
      const result = await this.activitiesService.updateActivityStatus(
        params.activityId,
        body.data.attributes,
        req.user.userId,
        req
      );
      return {
        status: 200 as const,
        body: formatActivityResponse(result as Activity)
      };
    });
  }

  // Cost Management
  @TsRestHandler(activitiesCostsContract.getActivityCosts)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getActivityCosts(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCostsContract.getActivityCosts, async ({ params }) => {
      const result = await this.activitiesService.getActivityCosts(params.activityId, req);
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(activitiesCostsContract.addCost)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.UPDATE)
  @RequireRoleLevel(50)
  public addCost(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCostsContract.addCost, async ({ params, body }) => {
      const costData = {
        type: body.type,
        description: body.description!,
        amount: body.amount!,
        quantity: body.quantity,
        unit: body.unit,
        receipt: body.receipt,
        vendor: body.vendor,
      };
      const result = await this.activitiesService.addCost(params.activityId, costData, req.user.userId, req);
      return { status: 201 as const, body: result };
    });
  }

  @TsRestHandler(activitiesCostsContract.updateCost)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.UPDATE)
  @RequireRoleLevel(50)
  public updateCost(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCostsContract.updateCost, async ({ params, body }) => {
      const result = await this.activitiesService.updateCost(params.activityId, params.costId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Assignment Management
  @TsRestHandler(activitiesTeamContract.assignActivity)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.ASSIGN)
  @RequireRoleLevel(40)
  public assignActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.assignActivity, async ({ params, body }) => {
      const assignments = body.assignedTo.map(userId => ({ userId, role: 'ASSIGNED' as const }));
      await this.assignmentService.assignUsers(params.activityId!, assignments, req.user.userId, req.user.organizationId, {
        reassignReason: body.reassignReason,
        notifyUsers: body.notifyUsers
      });
      // Return the updated activity instead of assignment results
      const activity = await this.activitiesService.getActivity(params.activityId!, req);
      return { status: 200 as const, body: formatActivityResponse(activity as Activity) };
    });
  }

  @TsRestHandler(activitiesTeamContract.requestHelp)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.EXECUTE)
  @UseGuards(ActivityAssignmentGuard)
  public requestHelp(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.requestHelp, async ({ params, body }) => {
      const helpData = {
        message: body.message!,
        skillsNeeded: body.skillsNeeded,
        urgency: body.urgency,
      };
      await this.assignmentService.requestHelp(params.activityId!, helpData, req.user.userId, req.user.organizationId);
      return { 
        status: 200 as const, 
        body: {
          data: {
            id: params.activityId!,
            type: 'help-requests' as const,
            attributes: {
              message: 'Help request sent successfully',
              success: true,
            },
          },
        },
      };
    });
  }


  // Template Management
  

  @TsRestHandler(activitiesTemplatesContract.getActivityTemplate)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getActivityTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTemplatesContract.getActivityTemplate, async ({ params }) => {
      const result = await this.templateService.getTemplate(params.templateId!, req.user.organizationId);
      return { status: 200 as const, body: {data: result} };
    });
  }

  @TsRestHandler(activitiesTemplatesContract.createActivityTemplate)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.CREATE)
  @RequireRoleLevel(50)
  public createActivityTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTemplatesContract.createActivityTemplate, async ({ body }) => {
      const templateData = {
        name: body.name!,
        type: body.type!,
        description: body.description!,
        defaultDuration: body.defaultDuration!,
        defaultResources: body.defaultResources,
        instructions: body.instructions,
        safetyNotes: body.safetyNotes,
        applicableCrops: body.applicableCrops,
        metadata: body.metadata,
      };
      const result = await this.templateService.createTemplate(templateData, req.user.organizationId);
      return { status: 201 as const, body: {data: result} };
    });
  }

  @TsRestHandler(activitiesTemplatesContract.createFromTemplate)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.CREATE)
  @RequireCapability('track_activities')
  public createFromTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTemplatesContract.createFromTemplate, async ({ params, body }) => {
      const result = await this.templateService.createFromTemplate(
        params.templateId,
        body as CreateFromTemplateDto,
        req.user.userId,
        req.user.organizationId
      );
      return { status: 201 as const, body: { data: result } };
    });
  }

  // Scheduling & Planning
  @TsRestHandler(activitiesSchedulingContract.checkConflicts)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public checkConflicts(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.checkConflicts, async ({ query }) => {
      const result = await this.schedulingService.checkConflicts(query as ConflictCheckQueryOptions, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.bulkSchedule)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.BULK_SCHEDULE)
  @RequireRoleLevel(50)
  public bulkSchedule(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.bulkSchedule, async ({ body }) => {
      const result = await this.schedulingService.bulkSchedule(body as any, req.user.userId, req.user.organizationId);
      return {
        status: 201 as const,
        body: {
          data: {
            id: 'bulk-schedule-results',
            type: 'bulk-schedule-results',
            attributes: {
              scheduled: result.attributes.scheduled,
              conflicts: result.attributes.conflicts,
              failed: result.attributes.failed,
              activities: result.attributes.activities,
              conflictDetails: result.attributes.conflictDetails
            }
          }
        }
      };
    });
  }

  @TsRestHandler(activitiesSchedulingContract.getWorkload)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getWorkload(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.getWorkload, async ({ query }) => {
      const result = await this.schedulingService.getWorkloadAnalysis(query as WorkloadQueryOptions, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Activity Notes
  @TsRestHandler(activitiesMediaContract.getActivityNotes)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.READ)
  public getActivityNotes(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesMediaContract.getActivityNotes, async ({ params }) => {
      const result = await this.notesService.getActivityNotes(params.activityId, req.user.userId, req.user.organizationId, {});
      return { 
        status: 200 as const, 
        body: {
          data: result.data.map((note) => ({
            id: note.id,
            type: 'activity-notes' as const,
            attributes: {
              id: note.id,
              content: note.attributes.content,
              type: note.attributes.type as 'OBSERVATION' | 'ISSUE' | 'RECOMMENDATION' | 'GENERAL',
              isPrivate: note.attributes.isPrivate,
              attachments: note.attributes.attachments || [],
              createdAt: note.attributes.createdAt,
              createdBy: note.attributes.author.id,
            },
          })),
          meta: result.meta
        }
      };
    });
  }

  @TsRestHandler(activitiesMediaContract.addNote)
  @RequirePermission(...PERMISSIONS.ACTIVITIES.EXECUTE)
  @UseGuards(ActivityAssignmentGuard)
  public addNote(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesMediaContract.addNote, async ({ params, body }) => {
      const result = await this.notesService.createNote(params.activityId, body as any, req.user.userId, req.user.organizationId);
      return {
        status: 201 as const,
        body: {
          data: {
            id: result.id,
            type: 'activity-notes' as const,
            attributes: {
              id: result.id,
              content: result.attributes.content,
              type: result.attributes.type as 'OBSERVATION' | 'ISSUE' | 'RECOMMENDATION' | 'GENERAL',
              isPrivate: result.attributes.isPrivate,
              attachments: result.attributes.attachments || [],
              createdAt: result.attributes.createdAt,
              createdBy: result.attributes.author.id,
            }
          }
        }
      };
    });
  }

}
