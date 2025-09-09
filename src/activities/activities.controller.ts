import { Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { activitiesContract } from '../../contracts/activities.contract';
import { ActivitiesService } from './activities.service';
import { ActivityCostService } from './activity-cost.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityHelpService } from './activity-help.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivitySchedulingService } from './activity-scheduling.service';

@Controller()
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly costService: ActivityCostService,
    private readonly assignmentService: ActivityAssignmentService,
    private readonly helpService: ActivityHelpService,
    private readonly templateService: ActivityTemplateService,
    private readonly schedulingService: ActivitySchedulingService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivities)
  public getActivities() {
    return tsRestHandler(activitiesContract.getActivities, async ({ req, query }) => {
      const result = await this.activitiesService.getActivities(req.user.organizationId, query);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivity)
  public getActivity() {
    return tsRestHandler(activitiesContract.getActivity, async ({ req, params }) => {
      const activity = await this.activitiesService.getActivity(params.activityId, req.user.organizationId);
      return { status: 200 as const, body: { data: activity } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createActivity)
  public createActivity() {
    return tsRestHandler(activitiesContract.createActivity, async ({ req, body }) => {
      const result = await this.activitiesService.createActivity(body, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateActivity)
  public updateActivity() {
    return tsRestHandler(activitiesContract.updateActivity, async ({ req, params, body }) => {
      const result = await this.activitiesService.updateActivity(params.activityId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.deleteActivity)
  public deleteActivity() {
    return tsRestHandler(activitiesContract.deleteActivity, async ({ req, params }) => {
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
  public startActivity() {
    return tsRestHandler(activitiesContract.startActivity, async ({ req, params, body }) => {
      const result = await this.activitiesService.startActivity(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateProgress)
  public updateProgress() {
    return tsRestHandler(activitiesContract.updateProgress, async ({ req, params, body }) => {
      const result = await this.activitiesService.updateProgress(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.completeActivity)
  public completeActivity() {
    return tsRestHandler(activitiesContract.completeActivity, async ({ req, params, body }) => {
      const result = await this.activitiesService.completeActivity(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.pauseActivity)
  public pauseActivity() {
    return tsRestHandler(activitiesContract.pauseActivity, async ({ req, params, body }) => {
      const result = await this.activitiesService.pauseActivity(params.activityId, body, req.user.userId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.resumeActivity)
  public resumeActivity() {
    return tsRestHandler(activitiesContract.resumeActivity, async ({ req, params, body }) => {
      const result = await this.activitiesService.resumeActivity(params.activityId, req.user.userId, body);
      return { status: 200 as const, body: { data: result } };
    });
  }

  // Calendar & Tasks
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getCalendar)
  public getCalendar() {
    return tsRestHandler(activitiesContract.getCalendar, async ({ req, query }) => {
      const events = await this.activitiesService.getCalendarEvents(query, req.user.organizationId);
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
  public getMyTasks() {
    return tsRestHandler(activitiesContract.getMyTasks, async ({ req, query }) => {
      const result = await this.activitiesService.getMyTasks(req.user.userId, query, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Analytics
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getAnalytics)
  public getAnalytics() {
    return tsRestHandler(activitiesContract.getAnalytics, async ({ query }) => {
      const analytics = await this.activitiesService.getAnalytics(query);
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
  public getActivityCosts() {
    return tsRestHandler(activitiesContract.getActivityCosts, async ({ req, params }) => {
      const result = await this.costService.getActivityCosts(params.activityId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.addCost)
  public addCost() {
    return tsRestHandler(activitiesContract.addCost, async ({ req, params, body }) => {
      const result = await this.costService.addCost(params.activityId, body, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateCost)
  public updateCost() {
    return tsRestHandler(activitiesContract.updateCost, async ({ req, params, body }) => {
      const result = await this.costService.updateCost(params.activityId, params.costId, body, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Assignment Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.assignActivity)
  public assignActivity() {
    return tsRestHandler(activitiesContract.assignActivity, async ({ req, params, body }) => {
      const assignments = body.assignedTo.map(userId => ({ userId, role: 'ASSIGNED' as const }));
      const result = await this.assignmentService.assignUsers(params.activityId, assignments, req.user.userId, req.user.organizationId, {
        reassignReason: body.reassignReason,
        notifyUsers: body.notifyUsers
      });
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.requestHelp)
  public requestHelp() {
    return tsRestHandler(activitiesContract.requestHelp, async ({ req, params, body }) => {
      await this.helpService.requestHelp(params.activityId, body, req.user.userId, req.user.organizationId);
      return { 
        status: 200 as const, 
        body: {
          data: {
            id: params.activityId,
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
  public getTeamPerformance() {
    return tsRestHandler(activitiesContract.getTeamPerformance, async ({ req, query }) => {
      const result = await this.activitiesService.getTeamPerformance(query, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  // Template Management
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityTemplates)
  public getActivityTemplates() {
    return tsRestHandler(activitiesContract.getActivityTemplates, async ({ req, query }) => {
      const result = await this.templateService.getTemplates(req.user.organizationId, query);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityTemplate)
  public getActivityTemplate() {
    return tsRestHandler(activitiesContract.getActivityTemplate, async ({ req, params }) => {
      const result = await this.templateService.getTemplate(params.templateId, req.user.organizationId);
      return { status: 200 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createActivityTemplate)
  public createActivityTemplate() {
    return tsRestHandler(activitiesContract.createActivityTemplate, async ({ req, body }) => {
      const result = await this.templateService.createTemplate(body, req.user.organizationId);
      return { status: 201 as const, body: { data: result } };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createFromTemplate)
  public createFromTemplate() {
    return tsRestHandler(activitiesContract.createFromTemplate, async ({ req, params, body }) => {
      const result = await this.templateService.createFromTemplate(
        params.templateId,
        body,
        req.user.userId,
        req.user.organizationId
      );
      return { status: 201 as const, body: { data: result } };
    });
  }

  // Scheduling & Planning
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.checkConflicts)
  public checkConflicts() {
    return tsRestHandler(activitiesContract.checkConflicts, async ({ req, query }) => {
      const result = await this.schedulingService.checkConflicts(query, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.bulkSchedule)
  public bulkSchedule() {
    return tsRestHandler(activitiesContract.bulkSchedule, async ({ req, body }) => {
      const result = await this.schedulingService.bulkSchedule(body, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: result };
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getWorkload)
  public getWorkload() {
    return tsRestHandler(activitiesContract.getWorkload, async ({ req, query }) => {
      const result = await this.schedulingService.getWorkloadAnalysis(query, req.user.organizationId);
      return { status: 200 as const, body: result };
    });
  }
}
