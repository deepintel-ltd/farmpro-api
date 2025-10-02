import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  provider: 'aws' | 'cloudflare';
  bucketName: string;
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
}

export interface StorageService {
  uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult>;
  
  deleteFile(key: string): Promise<void>;
  
  generateSignedUrl(key: string, expiresIn?: number): Promise<string>;
  
  getFileUrl(key: string): string;
}

@Injectable()
export class UnifiedStorageService implements StorageService {
  private readonly logger = new Logger(UnifiedStorageService.name);
  private s3Client: S3Client;
  private config: StorageConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.getStorageConfig();
    this.s3Client = this.createS3Client();
  }

  private getStorageConfig(): StorageConfig {
    const provider = this.configService.get<string>('STORAGE_PROVIDER', 'aws');
    
    if (provider === 'cloudflare') {
      return {
        provider: 'cloudflare',
        bucketName: this.configService.get<string>('CLOUDFLARE_R2_BUCKET', 'farmpro-media'),
        region: this.configService.get<string>('CLOUDFLARE_R2_REGION', 'auto'),
        endpoint: this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT'),
        accessKeyId: this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      };
    } else {
      return {
        provider: 'aws',
        bucketName: this.configService.get<string>('AWS_S3_BUCKET', 'farmpro-media'),
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      };
    }
  }

  private createS3Client(): S3Client {
    const clientConfig: any = {
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      region: this.config.region,
    };

    // For Cloudflare R2, we need to set a custom endpoint
    if (this.config.provider === 'cloudflare' && this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
      clientConfig.forcePathStyle = true; // Required for R2
    }

    return new S3Client(clientConfig);
  }

  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      this.logger.log(`Uploading file to ${this.config.provider}: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      });

      const result = await this.s3Client.send(command);
      
      const url = this.getFileUrl(key);
      
      this.logger.log(`File uploaded successfully: ${url}`);

      return {
        key,
        url,
        bucket: this.config.bucketName,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error);
      throw new Error(`Storage upload failed: ${(error as Error).message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from ${this.config.provider}: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new Error(`Storage delete failed: ${(error as Error).message}`);
    }
  }

  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      this.logger.log(`Generating signed URL for ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Signed URL generated: ${signedUrl}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}:`, error);
      throw new Error(`Signed URL generation failed: ${(error as Error).message}`);
    }
  }

  getFileUrl(key: string): string {
    if (this.config.provider === 'cloudflare') {
      // For Cloudflare R2, construct URL using the custom domain or endpoint
      const customDomain = this.configService.get<string>('CLOUDFLARE_R2_CUSTOM_DOMAIN');
      if (customDomain) {
        return `https://${customDomain}/${key}`;
      }
      // Fallback to R2 public URL format
      const accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
      if (accountId) {
        return `https://${accountId}.r2.cloudflarestorage.com/${this.config.bucketName}/${key}`;
      }
      // Last fallback to endpoint
      return `${this.config.endpoint}/${this.config.bucketName}/${key}`;
    } else {
      // AWS S3 URL format
      return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
    }
  }

  getConfig(): StorageConfig {
    return { ...this.config };
  }

  async healthCheck(): Promise<{ status: string; provider: string; bucket: string }> {
    try {
      // Try to list objects to verify connection
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: 'health-check', // This will fail but we can catch the error
      });

      await this.s3Client.send(command);
      
      return {
        status: 'healthy',
        provider: this.config.provider,
        bucket: this.config.bucketName,
      };
    } catch (error) {
      // If it's a "NoSuchKey" error, the connection is working
      if ((error as any).name === 'NoSuchKey') {
        return {
          status: 'healthy',
          provider: this.config.provider,
          bucket: this.config.bucketName,
        };
      }
      
      this.logger.warn(`Storage health check failed:`, error);
      return {
        status: 'unhealthy',
        provider: this.config.provider,
        bucket: this.config.bucketName,
      };
    }
  }
}
