import { Controller, UseGuards, UseInterceptors, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationIsolationGuard } from '../common/guards/organization-isolation.guard';
import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mediaContract } from '../../contracts/media.contract';
import { MediaService } from './media.service';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import {
  RequireFeature,
  RequirePermission,
  RequireCapability,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';

@ApiTags('media')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, OrganizationIsolationGuard, FeatureAccessGuard, PermissionsGuard)
@RequireFeature('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @TsRestHandler(mediaContract.uploadFile)
  @RequirePermission('media', 'create')
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
  @RequirePermission('media', 'read')
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
  @RequirePermission('media', 'read')
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
  @RequirePermission('media', 'read')
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
  @RequirePermission('media', 'read')
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
  @RequirePermission('media', 'delete')
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
  @RequirePermission('media', 'read')
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
  @RequirePermission('media', 'update')
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
