import { Controller, UseGuards, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MobileFieldService } from './mobile-field.service';
import { mobileFieldContract } from '../../contracts/mobile-field.contract';

interface AuthenticatedRequest extends Request {
  user: CurrentUser;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class MobileFieldController {
  constructor(private readonly mobileFieldService: MobileFieldService) {}

  @TsRestHandler(mobileFieldContract.getMyTasks)
  public getMyTasks(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.getMyTasks, async ({ query }) => {
      const result = await this.mobileFieldService.getMyTasks(req.user.userId, req.user.organizationId, query);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.getTaskDetails)
  public getTaskDetails(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.getTaskDetails, async ({ params }) => {
      const result = await this.mobileFieldService.getTaskDetails(params.taskId, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.startTask)
  public startTask(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.startTask, async ({ params, body }) => {
      const result = await this.mobileFieldService.startTask(params.taskId, body as any, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.updateTaskProgress)
  public updateTaskProgress(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.updateTaskProgress, async ({ params, body }) => {
      const result = await this.mobileFieldService.updateTaskProgress(params.taskId, body as any, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.completeTask)
  public completeTask(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.completeTask, async ({ params, body }) => {
      const result = await this.mobileFieldService.completeTask(params.taskId, body as any, req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.addTaskNote)
  public addTaskNote(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.addTaskNote, async ({ params, body }) => {
      const result = await this.mobileFieldService.addTaskNote(params.taskId, body as any, req.user.userId, req.user.organizationId);
      return { status: 201 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.addTaskPhoto)
  public addTaskPhoto(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.addTaskPhoto, async ({ params, body }) => {
      const result = await this.mobileFieldService.addTaskPhoto(
        params.taskId, 
        body as any, 
        req.user.userId, 
        req.user.organizationId
      );
      return { status: 201 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.getOfflineData)
  public getOfflineData(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.getOfflineData, async () => {
      const result = await this.mobileFieldService.getOfflineData(req.user.userId, req.user.organizationId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.syncOfflineData)
  public syncOfflineData(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.syncOfflineData, async ({ body }) => {
      const result = await this.mobileFieldService.syncOfflineData(body as any, req.user.userId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.getFieldConditions)
  public getFieldConditions(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.getFieldConditions, async () => {
      const result = await this.mobileFieldService.getFieldConditions(req.user.userId);
      return { status: 200 as const, body: { data: result as any } };
    });
  }

  @TsRestHandler(mobileFieldContract.reportIssue)
  public reportIssue(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mobileFieldContract.reportIssue, async ({ body }) => {
      const result = await this.mobileFieldService.reportIssue(body as any, req.user.userId);
      return { status: 201 as const, body: { data: result as any } };
    });
  }
}
