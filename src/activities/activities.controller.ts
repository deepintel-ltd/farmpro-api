import { Controller, UseGuards, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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

@ApiTags('activities')
@ApiBearerAuth('JWT-auth')
@Controller()
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly assignmentService: ActivityAssignmentService,
    private readonly templateService: ActivityTemplateService,
    private readonly schedulingService: ActivitySchedulingService,
    private readonly notesService: ActivityNotesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCrudContract.getActivities)
  public getActivities(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.getActivities, async ({ query }) => {
      const result = await this.activitiesService.getActivities(req.user.organizationId, query);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.getCalendar)
  public getCalendar(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.getCalendar, async ({ query }) => {
      const calendarQuery: CalendarQueryOptions = {
        farmId: query.farmId!,
        startDate: query.startDate!,
        endDate: query.endDate!,
        userId: query.userId,
        view: query.view,
      };
      const events = await this.activitiesService.getCalendarEvents(calendarQuery, req.user.organizationId);
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTeamContract.getMyTasks)
  public getMyTasks(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.getMyTasks, async ({ query }) => {
      const result = await this.activitiesService.getMyTasks(req.user.userId, query, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Team Performance Analytics - MUST come before getActivity to avoid route conflicts
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTeamContract.getTeamPerformance)
  public getTeamPerformance(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.getTeamPerformance, async ({ query }) => {
      const analyticsQuery = {
        farmId: query.farmId!,
        period: query.period,
        type: query.type,
        metric: query.metric,
      };
      const result = await this.activitiesService.getTeamPerformance(analyticsQuery, req.user.organizationId);
      
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
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesAnalyticsContract.getAnalytics)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesAnalyticsContract.getCompletionRates)
  public getCompletionRates(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesAnalyticsContract.getCompletionRates, async ({ query }) => {
      const analyticsQuery: AnalyticsQueryOptions = {
        farmId: query.farmId,
        period: query.period,
        type: query.type,
      };
      const result = await this.activitiesService.getCompletionRates(analyticsQuery, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesAnalyticsContract.getCostAnalysis)
  public getCostAnalysis(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesAnalyticsContract.getCostAnalysis, async ({ query }) => {
      const analyticsQuery: AnalyticsQueryOptions = {
        farmId: query.farmId,
        period: query.period,
        type: query.type,
      };
      const result = await this.activitiesService.getCostAnalysis(analyticsQuery, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesAnalyticsContract.generateReport)
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
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTemplatesContract.getActivityTemplates)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCrudContract.getActivity)
  public getActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.getActivity, async ({ params }) => {
      const activity = await this.activitiesService.getActivity(params.activityId, req.user.organizationId);
      return { 
        status: 200 as const, 
        body: formatActivityResponse(activity as Activity)
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCrudContract.createActivity)
  public createActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.createActivity, async ({ body }) => {
      const result = await this.activitiesService.createActivity(body, req.user.userId, req.user.organizationId);
      return { 
        status: 201 as const, 
        body: formatActivityResponse(result as Activity)
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCrudContract.updateActivity)
  public updateActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.updateActivity, async ({ params, body }) => {
      const result = await this.activitiesService.updateActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { 
        status: 200 as const, 
        body: formatActivityResponse(result as Activity)
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCrudContract.deleteActivity)
  public deleteActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCrudContract.deleteActivity, async ({ params }) => {
      await this.activitiesService.deleteActivity(params.activityId, req.user.userId, req.user.organizationId);
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

  // Activity Execution
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesExecutionContract.startActivity)
  public startActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.startActivity, async ({ params, body }) => {
      const result = await this.activitiesService.startActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { 
        status: 200 as const, 
        body: formatActivityResponse(result as Activity)
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesExecutionContract.updateProgress)
  public updateProgress(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.updateProgress, async ({ params, body }) => {
      const result = await this.activitiesService.updateProgress(params.activityId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: formatActivityResponse(result as Activity) };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesExecutionContract.completeActivity)
  public completeActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.completeActivity, async ({ params, body }) => {
      const result = await this.activitiesService.completeActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: formatActivityResponse(result as Activity) };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesExecutionContract.completeHarvestActivity)
  public completeHarvestActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.completeHarvestActivity, async ({ params, body }) => {
      const result = await this.activitiesService.completeHarvestActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { 
        status: 200 as const, 
        body: { 
          data: {
            activity: {
              data: {
                id: result.activity.id,
                type: 'activities',
                attributes: result.activity
              }
            },
            harvest: {
              ...result.harvest,
              harvestDate: result.harvest.harvestDate instanceof Date 
                ? result.harvest.harvestDate.toISOString() 
                : result.harvest.harvestDate
            },
            inventory: result.inventory
          }
        } 
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesExecutionContract.pauseActivity)
  public pauseActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.pauseActivity, async ({ params, body }) => {
      const result = await this.activitiesService.pauseActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: formatActivityResponse(result as Activity) };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesExecutionContract.resumeActivity)
  public resumeActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesExecutionContract.resumeActivity, async ({ params, body }) => {
      const result = await this.activitiesService.resumeActivity(params.activityId, req.user.userId, body, req.user.organizationId);
      return { status: 200 as const, body: formatActivityResponse(result as Activity) };
    });
  }



  // Cost Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCostsContract.getActivityCosts)
  public getActivityCosts(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCostsContract.getActivityCosts, async ({ params }) => {
      const result = await this.activitiesService.getActivityCosts(params.activityId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCostsContract.addCost)
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
      const result = await this.activitiesService.addCost(params.activityId, costData, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesCostsContract.updateCost)
  public updateCost(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesCostsContract.updateCost, async ({ params, body }) => {
      const result = await this.activitiesService.updateCost(params.activityId, params.costId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Assignment Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTeamContract.assignActivity)
  public assignActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTeamContract.assignActivity, async ({ params, body }) => {
      const assignments = body.assignedTo.map(userId => ({ userId, role: 'ASSIGNED' as const }));
      await this.assignmentService.assignUsers(params.activityId!, assignments, req.user.userId, req.user.organizationId, {
        reassignReason: body.reassignReason,
        notifyUsers: body.notifyUsers
      });
      // Return the updated activity instead of assignment results
      const activity = await this.activitiesService.getActivity(params.activityId!, req.user.organizationId);
      return { status: 200 as const, body: formatActivityResponse(activity as Activity) };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTeamContract.requestHelp)
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
  

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTemplatesContract.getActivityTemplate)
  public getActivityTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesTemplatesContract.getActivityTemplate, async ({ params }) => {
      const result = await this.templateService.getTemplate(params.templateId!, req.user.organizationId);
      return { status: 200 as const, body: {data: result} };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTemplatesContract.createActivityTemplate)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesTemplatesContract.createFromTemplate)
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
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.checkConflicts)
  public checkConflicts(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.checkConflicts, async ({ query }) => {
      const result = await this.schedulingService.checkConflicts(query as ConflictCheckQueryOptions, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.bulkSchedule)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.getWorkload)
  public getWorkload(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesSchedulingContract.getWorkload, async ({ query }) => {
      const result = await this.schedulingService.getWorkloadAnalysis(query as WorkloadQueryOptions, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Activity Notes
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesMediaContract.getActivityNotes)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesMediaContract.addNote)
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

  // Bulk Operations
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.bulkCreate)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.bulkUpdate)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.bulkDelete)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.bulkAssign)
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

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesSchedulingContract.bulkStatusUpdate)
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
}
