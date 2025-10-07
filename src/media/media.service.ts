import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedStorageService } from '../common/services/storage.service';
import { VideoCompressionService } from '../common/services/video-compression.service';
import { ConfigService } from '@nestjs/config';

export interface UploadFileDto {
  file: any;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: UnifiedStorageService,
    private readonly videoCompressionService: VideoCompressionService,
    private readonly configService: ConfigService,
  ) {}

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

    // Check if file is a video and compress if needed
    let fileBuffer = uploadData.file.buffer;
    let fileMimeType = uploadData.file.mimetype;
    const originalSize = uploadData.file.size;
    let compressionInfo = null;

    if (this.isVideoFile(uploadData.file.mimetype)) {
      const compressionResult = await this.compressVideoIfNeeded(
        uploadData.file.buffer,
        uploadData.file.originalname
      );
      
      if (compressionResult.success && compressionResult.compressedSize < originalSize) {
        fileBuffer = compressionResult.compressedBuffer!;
        fileMimeType = 'video/mp4'; // Compressed videos are always MP4
        compressionInfo = {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio,
          processingTime: compressionResult.processingTime,
        };
      }
    }

    // Generate S3 key with context organization
    const fileExtension = fileMimeType === 'video/mp4' ? 'mp4' : uploadData.file.originalname.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const s3Key = `organizations/${organizationId}/${uploadData.metadata.context}/${uploadData.metadata.contextId}/${timestamp}-${randomId}.${fileExtension}`;

    try {
      // Upload to storage service (S3 or Cloudflare R2)
      const uploadResult = await this.storageService.uploadFile(
        s3Key,
        fileBuffer,
        fileMimeType,
        {
          context: uploadData.metadata.context,
          contextId: uploadData.metadata.contextId,
          organizationId,
          uploadedBy: userId,
          originalName: uploadData.file.originalname,
          ...(compressionInfo && { compressionInfo: JSON.stringify(compressionInfo) }),
        }
      );

      // Save media record to database
      const media = await this.prisma.media.create({
        data: {
          // Use the appropriate foreign key based on context
          ...(uploadData.metadata.context === 'activity' && { farmActivityId: uploadData.metadata.contextId }),
          ...(uploadData.metadata.context === 'order' && { orderId: uploadData.metadata.contextId }),
          ...(uploadData.metadata.context === 'observation' && { observationId: uploadData.metadata.contextId }),
          
          filename: uploadData.file.originalname,
          url: uploadResult.url,
          mimeType: uploadData.file.mimetype,
          size: uploadData.file.size,
          metadata: {
            storageKey: s3Key,
            storageBucket: uploadResult.bucket,
            storageProvider: this.storageService.getConfig().provider,
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

      return this.formatMediaResponse(media);
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
      // Delete from storage service
      const storageKey = metadata?.storageKey || metadata?.s3Key; // Support legacy s3Key
      if (storageKey) {
        await this.storageService.deleteFile(storageKey);
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
    const storageKey = metadata?.storageKey || metadata?.s3Key; // Support legacy s3Key
    
    if (!storageKey) {
      // Return direct URL for legacy files
      return media.attributes.url;
    }

    try {
      const url = await this.storageService.generateSignedUrl(storageKey, 3600); // 1 hour

      // Add audit entry for download
      await this.addAuditEntry(mediaId, 'DOWNLOADED', organizationId, 'File downloaded');

      return url;
    } catch (error) {
      throw new BadRequestException(`Failed to generate download URL: ${(error as Error).message}`);
    }
  }

  async getFileAudit(mediaId: string, organizationId: string) {
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

    const metadata = media.metadata as any;
    
    return {
      mediaId,
      filename: media.filename,
      auditTrail: metadata?.auditTrail || [],
      createdAt: media.uploadedAt.toISOString(),
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
        storageProvider: metadata?.storageProvider || 'aws', // Default to aws for legacy files
        storageBucket: metadata?.storageBucket || metadata?.s3Bucket,
      },
    };
  }

  private validateFile(file: any) {
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

  /**
   * Check if the file is a video that can be compressed
   */
  private isVideoFile(mimeType: string): boolean {
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    return videoTypes.includes(mimeType);
  }

  /**
   * Compress video if it meets the criteria for compression
   */
  private async compressVideoIfNeeded(
    buffer: Buffer,
    filename: string
  ): Promise<{
    success: boolean;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    compressedBuffer?: Buffer;
    processingTime: number;
    error?: string;
  }> {
    const minSizeForCompression = 5 * 1024 * 1024; // 5MB minimum size for compression
    const maxSizeForCompression = 100 * 1024 * 1024; // 100MB maximum size for compression

    // Skip compression for small files or very large files
    if (buffer.length < minSizeForCompression || buffer.length > maxSizeForCompression) {
      return {
        success: true,
        originalSize: buffer.length,
        compressedSize: buffer.length,
        compressionRatio: 0,
        compressedBuffer: buffer,
        processingTime: 0,
      };
    }

    try {
      // Check if FFmpeg is available
      const isFFmpegAvailable = await this.videoCompressionService.isFFmpegAvailable();
      if (!isFFmpegAvailable) {
        // Return original buffer if FFmpeg is not available
        return {
          success: true,
          originalSize: buffer.length,
          compressedSize: buffer.length,
          compressionRatio: 0,
          compressedBuffer: buffer,
          processingTime: 0,
        };
      }

      // Compress the video
      const result = await this.videoCompressionService.compressVideo(
        buffer,
        filename,
        {
          quality: 'medium',
          maxWidth: 1920,
          maxHeight: 1080,
        }
      );

      if (result.success && result.outputPath) {
        // Read the compressed file
        const { promises: fs } = await import('fs');
        const compressedBuffer = await fs.readFile(result.outputPath);
        
        return {
          success: true,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          compressionRatio: result.compressionRatio,
          compressedBuffer,
          processingTime: result.processingTime,
        };
      }

      // If compression failed, return original buffer
      return {
        success: true,
        originalSize: buffer.length,
        compressedSize: buffer.length,
        compressionRatio: 0,
        compressedBuffer: buffer,
        processingTime: result.processingTime,
        error: result.error,
      };
    } catch (error) {
      // If compression fails, return original buffer
      return {
        success: true,
        originalSize: buffer.length,
        compressedSize: buffer.length,
        compressionRatio: 0,
        compressedBuffer: buffer,
        processingTime: 0,
        error: (error as Error).message,
      };
    }
  }
}
