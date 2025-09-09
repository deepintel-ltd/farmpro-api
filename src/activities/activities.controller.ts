import { Controller, UseGuards, Logger, Request, Body, Query } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { activitiesContract } from '../../contracts/activities.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityCostService } from './activity-cost.service';
import {
  CreateActivityDto,
  UpdateActivityDto,
  StartActivityDto,
  UpdateProgressDto,
  CompleteActivityDto,
  PauseActivityDto,
  ActivityQueryOptions,
  CalendarQueryOptions,
  MyTasksQueryOptions,
  AnalyticsQueryOptions,
} from './dto/activities.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
export class ActivitiesController {
  private readonly logger = new Logger(ActivitiesController.name);

  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly permissionsService: PermissionsService,
    private readonly activityTemplateService: ActivityTemplateService,
    private readonly activityCostService: ActivityCostService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivities)
  public getActivities(
    @Request() req: AuthenticatedRequest,
    @Query() query: ActivityQueryOptions,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getActivities, async () => {
      try {
        await this.permissionsService.checkPermission(req.user, 'activity', 'read');
        const result = await this.activitiesService.getActivities(req.user.organizationId, query);

        this.logger.log(`Retrieved ${result.data.length} activities`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get activities failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view activities',
          unauthorizedCode: 'ACTIVITY_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivity)
  public getActivity(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'read');
        const activity = await this.activitiesService.getActivity(activityId, req.user.organizationId);

        return {
          status: 200 as const,
          body: { data: activity },
        };
      } catch (error: unknown) {
        this.logger.error('Get activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          unauthorizedMessage: 'Insufficient permissions to view activity',
          unauthorizedCode: 'ACTIVITY_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createActivity)
  public createActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateActivityDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.createActivity, async () => {
      try {
        await this.permissionsService.checkPermission(req.user, 'activity', 'create');
        await this.permissionsService.checkFarmAccess(req.user, body.farmId);
        const result = await this.activitiesService.createActivity(body, req.user.userId, req.user.organizationId);

        this.logger.log(`Created activity: ${body.name}`);
        return {
          status: 201 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Create activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid activity data',
          badRequestCode: 'INVALID_ACTIVITY_DATA',
          unauthorizedMessage: 'Insufficient permissions to create activity',
          unauthorizedCode: 'ACTIVITY_CREATE_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateActivity)
  public updateActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateActivityDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.updateActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'update');
        const result = await this.activitiesService.updateActivity(activityId, body, req.user.userId, req.user.organizationId);

        this.logger.log(`Updated activity: ${activityId}`);
        return {
          status: 200 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Update activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          badRequestMessage: 'Invalid activity data',
          badRequestCode: 'INVALID_ACTIVITY_DATA',
          unauthorizedMessage: 'Insufficient permissions to update activity',
          unauthorizedCode: 'ACTIVITY_UPDATE_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.deleteActivity)
  public deleteActivity(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.deleteActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'delete');
        await this.activitiesService.deleteActivity(activityId, req.user.userId, req.user.organizationId);

        return {
          status: 200 as const,
          body: {
            data: {
              id: activityId,
              type: 'activities' as const,
              attributes: {
                message: 'Activity cancelled successfully',
                success: true,
              },
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Delete activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          unauthorizedMessage: 'Cannot delete activity',
          unauthorizedCode: 'ACTIVITY_DELETE_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.startActivity)
  public startActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: StartActivityDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.startActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'execute');
        const result = await this.activitiesService.startActivity(activityId, body, req.user.userId);

        this.logger.log(`Started activity: ${activityId}`);
        return {
          status: 200 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Start activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          badRequestMessage: 'Activity cannot be started',
          badRequestCode: 'ACTIVITY_START_INVALID',
          unauthorizedMessage: 'Not assigned to this activity',
          unauthorizedCode: 'ACTIVITY_NOT_ASSIGNED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateProgress)
  public updateProgress(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateProgressDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.updateProgress, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'execute');
        const result = await this.activitiesService.updateProgress(activityId, body, req.user.userId);

        this.logger.log(`Updated progress for activity: ${activityId}`);
        return {
          status: 200 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Update progress failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          badRequestMessage: 'Invalid progress data',
          badRequestCode: 'INVALID_PROGRESS_DATA',
          unauthorizedMessage: 'Not assigned to this activity',
          unauthorizedCode: 'ACTIVITY_NOT_ASSIGNED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.completeActivity)
  public completeActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: CompleteActivityDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.completeActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'execute');
        const result = await this.activitiesService.completeActivity(activityId, body, req.user.userId);

        this.logger.log(`Completed activity: ${activityId}`);
        return {
          status: 200 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Complete activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          badRequestMessage: 'Invalid completion data',
          badRequestCode: 'INVALID_COMPLETION_DATA',
          unauthorizedMessage: 'Not assigned to this activity',
          unauthorizedCode: 'ACTIVITY_NOT_ASSIGNED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.pauseActivity)
  public pauseActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: PauseActivityDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.pauseActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'execute');
        const result = await this.activitiesService.pauseActivity(activityId, body, req.user.userId);

        return {
          status: 200 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Pause activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          unauthorizedMessage: 'Not assigned to this activity',
          unauthorizedCode: 'ACTIVITY_NOT_ASSIGNED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.resumeActivity)
  public resumeActivity(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.resumeActivity, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'execute');
        const result = await this.activitiesService.resumeActivity(activityId, req.user.userId);

        return {
          status: 200 as const,
          body: { data: result },
        };
      } catch (error: unknown) {
        this.logger.error('Resume activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          unauthorizedMessage: 'Not assigned to this activity',
          unauthorizedCode: 'ACTIVITY_NOT_ASSIGNED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getCalendar)
  public getCalendar(
    @Request() req: AuthenticatedRequest,
    @Query() query: CalendarQueryOptions,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getCalendar, async () => {
      try {
        await this.permissionsService.checkPermission(req.user, 'activity', 'read');
        await this.permissionsService.checkFarmAccess(req.user, query.farmId);
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
              period: {
                start: query.startDate,
                end: query.endDate,
              },
              totalCount: events.length,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get calendar failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view calendar',
          unauthorizedCode: 'CALENDAR_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getMyTasks)
  public getMyTasks(
    @Request() req: AuthenticatedRequest,
    @Query() query: MyTasksQueryOptions,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getMyTasks, async () => {
      try {
        const result = await this.activitiesService.getMyTasks(req.user.userId, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get my tasks failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve user tasks',
          internalErrorCode: 'MY_TASKS_FAILED',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getAnalytics)
  public getAnalytics(
    @Request() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryOptions,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getAnalytics, async () => {
      try {
        await this.permissionsService.checkPermission(req.user, 'analytics', 'read');
        await this.permissionsService.checkFarmAccess(req.user, query.farmId);
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
      } catch (error: unknown) {
        this.logger.error('Get analytics failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view analytics',
          unauthorizedCode: 'ANALYTICS_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityTemplates)
  public getActivityTemplates(
    @Request() req: AuthenticatedRequest,
    @Query() query: { type?: string; cropType?: string },
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getActivityTemplates, async () => {
      try {
        await this.permissionsService.checkPermission(req.user, 'activity', 'read');
        const result = await this.activityTemplateService.getTemplates(req.user.organizationId, query);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get activity templates failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view templates',
          unauthorizedCode: 'TEMPLATE_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityTemplate)
  public getActivityTemplate(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getActivityTemplate, async ({ params }) => {
      try {
        const { templateId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'read');
        const template = await this.activityTemplateService.getTemplate(templateId, req.user.organizationId);

        return {
          status: 200 as const,
          body: { data: template },
        };
      } catch (error: unknown) {
        this.logger.error('Get activity template failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity template not found',
          notFoundCode: 'TEMPLATE_NOT_FOUND',
          unauthorizedMessage: 'Insufficient permissions to view template',
          unauthorizedCode: 'TEMPLATE_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.createFromTemplate)
  public createFromTemplate(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.createFromTemplate, async ({ params }) => {
      try {
        const { templateId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'create');
        await this.permissionsService.checkFarmAccess(req.user, body.farmId);
        
        const result = await this.activityTemplateService.createActivityFromTemplate(
          templateId,
          body,
          req.user.userId,
          req.user.organizationId
        );

        this.logger.log(`Created activity from template: ${templateId}`);
        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Create activity from template failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity template not found',
          notFoundCode: 'TEMPLATE_NOT_FOUND',
          badRequestMessage: 'Invalid activity data',
          badRequestCode: 'INVALID_ACTIVITY_DATA',
          unauthorizedMessage: 'Insufficient permissions to create activity',
          unauthorizedCode: 'ACTIVITY_CREATE_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.getActivityCosts)
  public getActivityCosts(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.getActivityCosts, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'finance', 'read');
        const result = await this.activityCostService.getActivityCosts(activityId, req.user.organizationId);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get activity costs failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          unauthorizedMessage: 'Insufficient permissions to view costs',
          unauthorizedCode: 'COST_READ_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.addCost)
  public addCost(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.addCost, async ({ params }) => {
      try {
        const { activityId } = params;
        await this.permissionsService.checkPermission(req.user, 'activity', 'execute');
        const result = await this.activityCostService.addCost(activityId, body, req.user.userId, req.user.organizationId);

        this.logger.log(`Added cost to activity: ${activityId}`);
        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Add cost failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity not found',
          notFoundCode: 'ACTIVITY_NOT_FOUND',
          badRequestMessage: 'Invalid cost data',
          badRequestCode: 'INVALID_COST_DATA',
          unauthorizedMessage: 'Insufficient permissions to add costs',
          unauthorizedCode: 'COST_CREATE_FORBIDDEN',
        });
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(activitiesContract.updateCost)
  public updateCost(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(activitiesContract.updateCost, async ({ params }) => {
      try {
        const { activityId, costId } = params;
        await this.permissionsService.checkPermission(req.user, 'finance', 'update');
        const result = await this.activityCostService.updateCost(activityId, costId, body, req.user.userId, req.user.organizationId);

        this.logger.log(`Updated cost for activity: ${activityId}`);
        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Update cost failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Activity or cost not found',
          notFoundCode: 'COST_NOT_FOUND',
          badRequestMessage: 'Invalid cost data',
          badRequestCode: 'INVALID_COST_DATA',
          unauthorizedMessage: 'Insufficient permissions to update costs',
          unauthorizedCode: 'COST_UPDATE_FORBIDDEN',
        });
      }
    });
  }
}
