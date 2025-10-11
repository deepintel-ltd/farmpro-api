import { Controller, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationId } from '../common/decorators/organization-context.decorator';
import { MobileFieldService } from './mobile-field.service';
import { mobileFieldContract } from '../../contracts/mobile-field.contract';

interface AuthenticatedRequest extends Request {
  user: CurrentUser;
}

@Controller()
export class MobileFieldController {
  constructor(private readonly mobileFieldService: MobileFieldService) {}

  @TsRestHandler(mobileFieldContract.getMyTasks)
  public getMyTasks(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.getMyTasks, async ({ query }) => {
      const result = await this.mobileFieldService.getMyTasks(req.user.userId, organizationId, query);
      return { 
        status: 200 as const, 
        body: { 
          data: result,
          meta: { 
            total: result?.length ?? 0,
            page: 1,
            limit: query.limit ?? 50
          }
        } 
      };
    });
  }

  @TsRestHandler(mobileFieldContract.getTaskDetails)
  public getTaskDetails(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.getTaskDetails, async ({ params }) => {
      const result = await this.mobileFieldService.getTaskDetails(params.taskId, req.user.userId, organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.startTask)
  public startTask(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.startTask, async ({ params, body }) => {
      const result = await this.mobileFieldService.startTask(params.taskId, body as any, req.user.userId, organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.updateTaskProgress)
  public updateTaskProgress(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.updateTaskProgress, async ({ params, body }) => {
      const result = await this.mobileFieldService.updateTaskProgress(params.taskId, body as any, req.user.userId, organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.completeTask)
  public completeTask(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.completeTask, async ({ params, body }) => {
      const result = await this.mobileFieldService.completeTask(params.taskId, body as any, req.user.userId, organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.addTaskNote)
  public addTaskNote(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.addTaskNote, async ({ params, body }) => {
      const result = await this.mobileFieldService.addTaskNote(params.taskId, body as any, req.user.userId, organizationId);
      return { status: 201 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.addTaskPhoto)
  public addTaskPhoto(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.addTaskPhoto, async ({ params, body }) => {
      const result = await this.mobileFieldService.addTaskPhoto(
        params.taskId, 
        body as any, 
        req.user.userId, 
        organizationId
      );
      return { status: 201 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.getOfflineData)
  public getOfflineData(
    @Request() req: AuthenticatedRequest,
    @OrganizationId() organizationId: string,
  ) {
    return tsRestHandler(mobileFieldContract.getOfflineData, async () => {
      const result = await this.mobileFieldService.getOfflineData(req.user.userId, organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.syncOfflineData)
  public syncOfflineData(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(mobileFieldContract.syncOfflineData, async ({ body }) => {
      const result = await this.mobileFieldService.syncOfflineData(body as any, req.user.userId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.getFieldConditions)
  public getFieldConditions() {
    return tsRestHandler(mobileFieldContract.getFieldConditions, async ({ query }) => {
      const result = await this.mobileFieldService.getFieldConditions(
        query.latitude,
        query.longitude
      );
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.reportIssue)
  public reportIssue(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(mobileFieldContract.reportIssue, async ({ body }) => {
      const result = await this.mobileFieldService.reportIssue(body as any, req.user.userId);
      return { status: 201 as const, body: { data: result as any } };
    });
  }
}
