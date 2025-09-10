import { Controller, UseGuards, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { activitiesContract } from '../../contracts/activities.contract';
import { ActivitiesService } from './activities.service';
import { ActivityCostService } from './activity-cost.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityHelpService } from './activity-help.service';
import { ActivityTemplateService, CreateFromTemplateDto } from './activity-template.service';
import { ActivitySchedulingService } from './activity-scheduling.service';
import { ActivityNotesService, CreateNoteDto } from './activity-notes.service';
import { CalendarQueryOptions, AnalyticsQueryOptions, ConflictCheckQueryOptions, BulkScheduleRequestOptions, WorkloadQueryOptions } from './dto/activities.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly costService: ActivityCostService,
    private readonly assignmentService: ActivityAssignmentService,
    private readonly helpService: ActivityHelpService,
    private readonly templateService: ActivityTemplateService,
    private readonly schedulingService: ActivitySchedulingService,
    private readonly notesService: ActivityNotesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivities)
  public getActivities(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getActivities, async ({ query }) => {
      const result = await this.activitiesService.getActivities(req.user.organizationId, query);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivity)
  public getActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getActivity, async ({ params }) => {
      const activity = await this.activitiesService.getActivity(params.activityId, req.user.organizationId);
      return { status: 200 as const, body: { data: activity } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createActivity)
  public createActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.createActivity, async ({ body }) => {
      const result = await this.activitiesService.createActivity(body, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateActivity)
  public updateActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.updateActivity, async ({ params, body }) => {
      const result = await this.activitiesService.updateActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.deleteActivity)
  public deleteActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.deleteActivity, async ({ params }) => {
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
  @TsRestHandler(activitiesContract.startActivity)
  public startActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.startActivity, async ({ params, body }) => {
      const result = await this.activitiesService.startActivity(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateProgress)
  public updateProgress(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.updateProgress, async ({ params, body }) => {
      const result = await this.activitiesService.updateProgress(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.completeActivity)
  public completeActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.completeActivity, async ({ params, body }) => {
      const result = await this.activitiesService.completeActivity(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.pauseActivity)
  public pauseActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.pauseActivity, async ({ params, body }) => {
      const result = await this.activitiesService.pauseActivity(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.resumeActivity)
  public resumeActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.resumeActivity, async ({ params, body }) => {
      const result = await this.activitiesService.resumeActivity(params.activityId, req.user.userId, body);
      return { status: 200 as const, body: { data: result } };
    });
  }

  // Calendar & Tasks
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getCalendar)
  public getCalendar(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getCalendar, async ({ query }) => {
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
  @TsRestHandler(activitiesContract.getMyTasks)
  public getMyTasks(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getMyTasks, async ({ query }) => {
      const result = await this.activitiesService.getMyTasks(req.user.userId, query, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Analytics
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getAnalytics)
  public getAnalytics() {
    return tsRestHandler(activitiesContract.getAnalytics, async ({ query }) => {
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

  // Cost Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityCosts)
  public getActivityCosts(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getActivityCosts, async ({ params }) => {
      const result = await this.costService.getActivityCosts(params.activityId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.addCost)
  public addCost(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.addCost, async ({ params, body }) => {
      const costData = {
        type: body.type,
        description: body.description!,
        amount: body.amount!,
        quantity: body.quantity,
        unit: body.unit,
        receipt: body.receipt,
        vendor: body.vendor,
      };
      const result = await this.costService.addCost(params.activityId, costData, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateCost)
  public updateCost(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.updateCost, async ({ params, body }) => {
      const result = await this.costService.updateCost(params.activityId, params.costId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Assignment Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.assignActivity)
  public assignActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.assignActivity, async ({ params, body }) => {
      const assignments = body.assignedTo.map(userId => ({ userId, role: 'ASSIGNED' as const }));
      await this.assignmentService.assignUsers(params.activityId!, assignments, req.user.userId, req.user.organizationId, {
        reassignReason: body.reassignReason,
        notifyUsers: body.notifyUsers
      });
      // Return the updated activity instead of assignment results
      const activity = await this.activitiesService.getActivity(params.activityId!, req.user.organizationId);
      return { status: 200 as const, body: { data: activity } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.requestHelp)
  public requestHelp(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.requestHelp, async ({ params, body }) => {
      const helpData = {
        message: body.message!,
        skillsNeeded: body.skillsNeeded,
        urgency: body.urgency,
      };
      await this.helpService.requestHelp(params.activityId!, helpData, req.user.userId, req.user.organizationId);
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

  // Team Performance Analytics
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getTeamPerformance)
  public getTeamPerformance(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getTeamPerformance, async ({ query }) => {
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

  // Template Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityTemplates)
  public getActivityTemplates(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getActivityTemplates, async ({ query }) => {
      const result = await this.templateService.getTemplates(req.user.organizationId, query);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityTemplate)
  public getActivityTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getActivityTemplate, async ({ params }) => {
      const result = await this.templateService.getTemplate(params.templateId!, req.user.organizationId);
      return { status: 200 as const, body: {data: result} };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createActivityTemplate)
  public createActivityTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.createActivityTemplate, async ({ body }) => {
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
  @TsRestHandler(activitiesContract.createFromTemplate)
  public createFromTemplate(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.createFromTemplate, async ({ params, body }) => {
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
  @TsRestHandler(activitiesContract.checkConflicts)
  public checkConflicts(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.checkConflicts, async ({ query }) => {
      const result = await this.schedulingService.checkConflicts(query as ConflictCheckQueryOptions, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.bulkSchedule)
  public bulkSchedule(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.bulkSchedule, async ({ body }) => {
      const result = await this.schedulingService.bulkSchedule(body as BulkScheduleRequestOptions, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getWorkload)
  public getWorkload(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getWorkload, async ({ query }) => {
      const result = await this.schedulingService.getWorkloadAnalysis(query as WorkloadQueryOptions, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Activity Notes
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityNotes)
  public getActivityNotes(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.getActivityNotes, async ({ params }) => {
      const result = await this.notesService.getActivityNotes(params.activityId, req.user.userId, req.user.organizationId, {});
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.addNote)
  public addNote(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(activitiesContract.addNote, async ({ params, body }) => {
      const result = await this.notesService.createNote(params.activityId, body as CreateNoteDto, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: { data: result } };
    });
  }
}
