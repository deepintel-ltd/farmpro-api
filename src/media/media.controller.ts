import { Controller, UseInterceptors, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import { mediaContract } from '../../contracts/media.contract';
import { MediaService } from './media.service';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import {
  RequirePermission,
  RequireCapability,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';

@Controller()
@Secured(FEATURES.MEDIA)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @TsRestHandler(mediaContract.uploadFile)
  @RequirePermission(...PERMISSIONS.MEDIA.CREATE)
  @UseInterceptors(FileInterceptor('file'))
  public uploadFile(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.uploadFile, async ({ body }) => {
      const file = req.file;
      
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      if (!body.context || !body.contextId) {
        throw new BadRequestException('Context and contextId are required');
      }

      // Parse metadata
      const metadata: any = { context: body.context, contextId: body.contextId };
      if (body.description) metadata.description = body.description;
      if (body.tags) {
        try {
          metadata.tags = JSON.parse(body.tags);
        } catch {
          metadata.tags = [body.tags];
        }
      }
      if (body.location) {
        try {
          metadata.location = JSON.parse(body.location);
        } catch {
          // Invalid location format, ignore
        }
      }

      const result = await this.mediaService.uploadFile(
        { file, metadata },
        req.user.userId,
        req.user.organizationId
      );

      return { status: 200 as const, body: { data: result } };
    });
  }

  @TsRestHandler(mediaContract.getMyFiles)
  @RequirePermission(...PERMISSIONS.MEDIA.READ)
  public getMyFiles(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.getMyFiles, async ({ query }) => {
      const result = await this.mediaService.getUserFiles(
        req.user.userId,
        req.user.organizationId,
        {
          context: query.context,
          contextId: query.contextId,
          limit: query.limit ? parseInt(query.limit) : 50,
          offset: query.offset ? parseInt(query.offset) : 0,
        }
      );
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(mediaContract.getContextFiles)
  @RequirePermission(...PERMISSIONS.MEDIA.READ)
  public getContextFiles(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.getContextFiles, async ({ params }) => {
      const result = await this.mediaService.getContextFiles(
        params.context,
        params.contextId,
        req.user.organizationId
      );
      return { status: 200 as const, body: result };
    });
  }

  @TsRestHandler(mediaContract.getFile)
  @RequirePermission(...PERMISSIONS.MEDIA.READ)
  public getFile(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.getFile, async ({ params }) => {
      const result = await this.mediaService.getFile(
        params.mediaId, 
        req.user.organizationId
      );
      return { status: 200 as const, body: { data: result } };
    });
  }

  @TsRestHandler(mediaContract.getFileDownloadUrl)
  @RequirePermission(...PERMISSIONS.MEDIA.READ)
  public getFileDownloadUrl(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.getFileDownloadUrl, async ({ params }) => {
      const url = await this.mediaService.generateDownloadUrl(
        params.mediaId, 
        req.user.organizationId
      );
      return { 
        status: 200 as const,
        body: {
          data: {
            id: params.mediaId,
            type: 'download-url' as const,
            attributes: {
              downloadUrl: url, 
              expiresIn: 3600,
              mediaId: params.mediaId
            }
          }
        }
      };
    });
  }

  @TsRestHandler(mediaContract.deleteFile)
  @RequirePermission(...PERMISSIONS.MEDIA.DELETE)
  public deleteFile(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.deleteFile, async ({ params, body }) => {
      const result = await this.mediaService.deleteFile(
        params.mediaId,
        req.user.userId,
        req.user.organizationId,
        body.reason
      );
      return { status: 200 as const, body: { data: result } };
    });
  }

  @TsRestHandler(mediaContract.getFileAudit)
  @RequirePermission(...PERMISSIONS.MEDIA.READ)
  public getFileAudit(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.getFileAudit, async ({ params }) => {
      const result = await this.mediaService.getFileAudit(
        params.mediaId,
        req.user.organizationId
      );
      return { 
        status: 200 as const, 
        body: {
          data: {
            id: params.mediaId,
            type: 'media-audit' as const,
            attributes: result
          }
        }
      };
    });
  }

  @TsRestHandler(mediaContract.updateFileMetadata)
  @RequirePermission(...PERMISSIONS.MEDIA.UPDATE)
  public updateFileMetadata(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(mediaContract.updateFileMetadata, async ({ params, body }) => {
      const result = await this.mediaService.updateFileMetadata(
        params.mediaId,
        { description: body.description, tags: body.tags },
        req.user.userId,
        req.user.organizationId,
        body.reason
      );
      return { status: 200 as const, body: { data: result } };
    });
  }
}
