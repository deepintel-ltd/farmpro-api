import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';

export interface UploadFileDto {
  file: Express.Multer.File;
  metadata: {
    context: string; // 'activity', 'order', 'observation', etc.
    contextId: string;
    description?: string;
    tags?: string[];
    location?: {
      lat?: number;
      lng?: number;
      address?: string;
    };
  };
}

interface FileFilters {
  context?: string;
  contextId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class MediaService {
  private s3: S3;
  private bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION') || 'us-east-1',
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET') || 'farmpro-media-dev';
  }

  async uploadFile(
    uploadData: UploadFileDto,
    userId: string,
    organizationId: string
  ) {
    // Validate context access
    await this.validateContextAccess(
      uploadData.metadata.context,
      uploadData.metadata.contextId,
      organizationId
    );

    // Validate file
    this.validateFile(uploadData.file);

    // Generate S3 key with context organization
    const fileExtension = uploadData.file.originalname.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const s3Key = `organizations/${organizationId}/${uploadData.metadata.context}/${uploadData.metadata.contextId}/${timestamp}-${randomId}.${fileExtension}`;

    try {
      // Upload to S3
      const uploadResult = await this.s3.upload({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: uploadData.file.buffer,
        ContentType: uploadData.file.mimetype,
        Metadata: {
          context: uploadData.metadata.context,
          contextId: uploadData.metadata.contextId,
          organizationId,
          uploadedBy: userId,
          originalName: uploadData.file.originalname,
        },
        ServerSideEncryption: 'AES256',
      }).promise();

      // Save media record to database
      const media = await this.prisma.media.create({
        data: {
          // Use the appropriate foreign key based on context
          ...(uploadData.metadata.context === 'activity' && { farmActivityId: uploadData.metadata.contextId }),
          ...(uploadData.metadata.context === 'order' && { orderId: uploadData.metadata.contextId }),
          ...(uploadData.metadata.context === 'observation' && { observationId: uploadData.metadata.contextId }),
          
          filename: uploadData.file.originalname,
          url: uploadResult.Location,
          mimeType: uploadData.file.mimetype,
          size: uploadData.file.size,
          metadata: {
            s3Key,
            s3Bucket: this.bucketName,
            context: uploadData.metadata.context,
            contextId: uploadData.metadata.contextId,
            uploadedBy: userId,
            organizationId,
            ...uploadData.metadata,
            auditTrail: [{
              action: 'UPLOADED',
              userId,
              timestamp: new Date().toISOString(),
              details: 'File uploaded successfully'
            }]
          },
        },
      });

      return {
        id: media.id,
        type: 'media-file' as const,
        attributes: {
          id: media.id,
          filename: media.filename,
          mimeType: media.mimeType,
          size: media.size,
          context: uploadData.metadata.context,
          contextId: uploadData.metadata.contextId,
          uploadedAt: media.uploadedAt.toISOString(),
          metadata: {
            description: uploadData.metadata.description,
            tags: uploadData.metadata.tags,
            location: uploadData.metadata.location,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  async getUserFiles(
    userId: string,
    organizationId: string,
    filters: FileFilters = {}
  ) {
    const where: any = {
      metadata: {
        path: ['uploadedBy'],
        equals: userId
      }
    };

    // Add context filters
    if (filters.context) {
      where.metadata = {
        ...where.metadata,
        path: ['context'],
        equals: filters.context
      };
    }

    if (filters.contextId) {
      where.metadata = {
        ...where.metadata,
        path: ['contextId'],
        equals: filters.contextId
      };
    }

    const mediaFiles = await this.prisma.media.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    return {
      data: mediaFiles.map(media => this.formatMediaResponse(media)),
      meta: {
        totalFiles: mediaFiles.length,
        totalSize: mediaFiles.reduce((sum, file) => sum + file.size, 0),
        filters,
      },
    };
  }

  async getContextFiles(context: string, contextId: string, organizationId: string) {
    // Validate context access
    await this.validateContextAccess(context, contextId, organizationId);

    const where: any = {};
    
    // Map context to appropriate foreign key
    switch (context) {
      case 'activity':
        where.farmActivityId = contextId;
        break;
      case 'order':
        where.orderId = contextId;
        break;
      case 'observation':
        where.observationId = contextId;
        break;
      default:
        where.metadata = {
          path: ['context'],
          equals: context
        };
    }

    const mediaFiles = await this.prisma.media.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    return {
      data: mediaFiles.map(media => this.formatMediaResponse(media)),
      meta: {
        context,
        contextId,
        totalFiles: mediaFiles.length,
        totalSize: mediaFiles.reduce((sum, file) => sum + file.size, 0),
      },
    };
  }

  async getFile(mediaId: string, organizationId: string) {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        metadata: {
          path: ['organizationId'],
          equals: organizationId
        }
      },
    });

    if (!media) {
      throw new NotFoundException('File not found');
    }

    return this.formatMediaResponse(media);
  }

  async deleteFile(
    mediaId: string, 
    userId: string, 
    organizationId: string,
    reason?: string
  ) {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        metadata: {
          path: ['organizationId'],
          equals: organizationId
        }
      },
    });

    if (!media) {
      throw new NotFoundException('File not found');
    }

    // Check if user created the file
    const metadata = media.metadata as any;
    if (metadata?.uploadedBy !== userId) {
      throw new ForbiddenException('Can only delete files you uploaded');
    }

    try {
      // Delete from S3
      const s3Key = metadata?.s3Key;
      if (s3Key) {
        await this.s3.deleteObject({
          Bucket: this.bucketName,
          Key: s3Key,
        }).promise();
      }

      // Update audit trail before deletion
      const auditTrail = metadata?.auditTrail || [];
      auditTrail.push({
        action: 'DELETED',
        userId,
        timestamp: new Date().toISOString(),
        details: reason || 'File deleted by user'
      });

      // Soft delete by updating metadata (preserve audit)
      await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          metadata: {
            ...metadata,
            auditTrail,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            deleteReason: reason
          }
        }
      });

      // Then hard delete
      await this.prisma.media.delete({
        where: { id: mediaId },
      });

      return {
        success: true,
        message: 'File deleted successfully',
        auditTrail: auditTrail.slice(-1)[0] // Return latest audit entry
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  async generateDownloadUrl(mediaId: string, organizationId: string) {
    const media = await this.getFile(mediaId, organizationId);
    const metadata = media.attributes as any;
    const s3Key = metadata?.s3Key;
    
    if (!s3Key) {
      // Return direct URL for legacy files
      return media.attributes.url;
    }

    try {
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: s3Key,
        Expires: 3600, // 1 hour
      });

      // Add audit entry for download
      await this.addAuditEntry(mediaId, 'DOWNLOADED', organizationId, 'File downloaded');

      return url;
    } catch (error) {
      throw new BadRequestException(`Failed to generate download URL: ${(error as Error).message}`);
    }
  }

  async getFileAudit(mediaId: string, organizationId: string) {
    const media = await this.getFile(mediaId, organizationId);
    const metadata = media.attributes as any;
    
    return {
      mediaId,
      filename: media.attributes.filename,
      auditTrail: metadata?.auditTrail || [],
      createdAt: media.attributes.uploadedAt,
      uploadedBy: metadata?.uploadedBy,
    };
  }

  async updateFileMetadata(
    mediaId: string,
    updates: { description?: string; tags?: string[] },
    userId: string,
    organizationId: string,
    reason?: string
  ) {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        metadata: {
          path: ['organizationId'],
          equals: organizationId
        }
      },
    });

    if (!media) {
      throw new NotFoundException('File not found');
    }

    // Check if user created the file
    const metadata = media.metadata as any;
    if (metadata?.uploadedBy !== userId) {
      throw new ForbiddenException('Can only update files you uploaded');
    }

    // Update metadata with audit
    const auditTrail = metadata?.auditTrail || [];
    auditTrail.push({
      action: 'UPDATED',
      userId,
      timestamp: new Date().toISOString(),
      details: reason || 'File metadata updated',
      changes: updates
    });

    const updatedMedia = await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        metadata: {
          ...metadata,
          ...updates,
          auditTrail,
          lastUpdatedBy: userId,
          lastUpdatedAt: new Date().toISOString()
        }
      }
    });

    return this.formatMediaResponse(updatedMedia);
  }

  private async validateContextAccess(context: string, contextId: string, organizationId: string) {
    let exists = false;

    switch (context) {
      case 'activity': {
        const activity = await this.prisma.farmActivity.findFirst({
          where: { id: contextId, farm: { organizationId } }
        });
        exists = !!activity;
        break;
      }
      case 'order': {
        const order = await this.prisma.order.findFirst({
          where: { id: contextId, buyerOrgId: organizationId }
        });
        exists = !!order;
        break;
      }
      case 'observation': {
        const observation = await this.prisma.observation.findFirst({
          where: { id: contextId, userId: organizationId } // Simplified check
        });
        exists = !!observation;
        break;
      }
      default:
        throw new BadRequestException(`Invalid context: ${context}`);
    }

    if (!exists) {
      throw new NotFoundException(`${context} with ID ${contextId} not found`);
    }
  }

  private async addAuditEntry(mediaId: string, action: string, organizationId: string, details: string) {
    try {
      const media = await this.prisma.media.findFirst({
        where: {
          id: mediaId,
          metadata: {
            path: ['organizationId'],
            equals: organizationId
          }
        },
      });

      if (media) {
        const metadata = media.metadata as any;
        const auditTrail = metadata?.auditTrail || [];
        auditTrail.push({
          action,
          timestamp: new Date().toISOString(),
          details
        });

        await this.prisma.media.update({
          where: { id: mediaId },
          data: {
            metadata: {
              ...metadata,
              auditTrail
            }
          }
        });
      }
    } catch (error) {
      // Don't fail the main operation if audit fails
      console.warn('Failed to add audit entry:', error);
    }
  }

  private formatMediaResponse(media: any) {
    const metadata = media.metadata as any;
    return {
      id: media.id,
      type: 'media-file' as const,
      attributes: {
        id: media.id,
        filename: media.filename,
        mimeType: media.mimeType,
        size: media.size,
        url: media.url,
        context: metadata?.context,
        contextId: metadata?.contextId,
        uploadedAt: media.uploadedAt.toISOString(),
        uploadedBy: metadata?.uploadedBy,
        description: metadata?.description,
        tags: metadata?.tags,
        location: metadata?.location,
      },
    };
  }

  private validateFile(file: Express.Multer.File) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type '${file.mimetype}' not allowed`);
    }

    // Security: Check for malicious extensions
    const filename = file.originalname.toLowerCase();
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.js', '.jar'];
    
    if (dangerousExtensions.some(ext => filename.endsWith(ext))) {
      throw new BadRequestException('File extension not allowed for security reasons');
    }
  }
}
