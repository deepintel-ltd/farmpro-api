import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnifiedStorageService } from './storage.service';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({
    input,
    resolveMiddleware: jest.fn(),
  })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({
    input,
    resolveMiddleware: jest.fn(),
  })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({
    input,
    resolveMiddleware: jest.fn(),
  })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('UnifiedStorageService', () => {
  let service: UnifiedStorageService;
  let configService: ConfigService;
  let mockS3Client: jest.Mocked<S3Client>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UnifiedStorageService>(UnifiedStorageService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Get the mocked S3Client instance
    mockS3Client = (service as any).s3Client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AWS S3 Configuration', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          STORAGE_PROVIDER: 'aws',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_REGION: 'us-east-1',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        };
        return config[key];
      });

      // Recreate the service with the new configuration
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UnifiedStorageService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<UnifiedStorageService>(UnifiedStorageService);
      mockS3Client = (service as any).s3Client;
    });

    it('should create S3Client with AWS configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        region: 'us-east-1',
      });
    });

    it('should upload file to AWS S3', async () => {
      const mockUploadResult = {
        ETag: '"test-etag"',
      };
      
      mockS3Client.send = jest.fn().mockResolvedValue(mockUploadResult);

      const result = await service.uploadFile(
        'test-key',
        Buffer.from('test content'),
        'text/plain',
        { test: 'metadata' }
      );

      // Check that send was called with a PutObjectCommand
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-key',
            Body: expect.any(Buffer),
            ContentType: 'text/plain',
            Metadata: { test: 'metadata' },
            ServerSideEncryption: 'AES256',
          }),
        })
      );

      expect(result).toEqual({
        key: 'test-key',
        url: 'https://test-bucket.s3.us-east-1.amazonaws.com/test-key',
        bucket: 'test-bucket',
        etag: '"test-etag"',
      });
    });

    it('should delete file from AWS S3', async () => {
      mockS3Client.send = jest.fn().mockResolvedValue({});

      await service.deleteFile('test-key');

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-key',
          }),
        })
      );
    });

    it('should generate signed URL for AWS S3', async () => {
      const mockSignedUrl = 'https://test-bucket.s3.us-east-1.amazonaws.com/test-key?signature=test';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

      const result = await service.generateSignedUrl('test-key', 3600);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-key',
          }),
        }),
        { expiresIn: 3600 }
      );

      expect(result).toBe(mockSignedUrl);
    });
  });

  describe('Cloudflare R2 Configuration', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          STORAGE_PROVIDER: 'cloudflare',
          CLOUDFLARE_R2_BUCKET: 'test-r2-bucket',
          CLOUDFLARE_R2_REGION: 'auto',
          CLOUDFLARE_R2_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
          CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-r2-access-key',
          CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-r2-secret-key',
          CLOUDFLARE_R2_CUSTOM_DOMAIN: 'cdn.example.com',
        };
        return config[key];
      });

      // Recreate the service with the new configuration
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UnifiedStorageService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<UnifiedStorageService>(UnifiedStorageService);
      mockS3Client = (service as any).s3Client;
    });

    it('should create S3Client with Cloudflare R2 configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        credentials: {
          accessKeyId: 'test-r2-access-key',
          secretAccessKey: 'test-r2-secret-key',
        },
        region: 'auto',
        endpoint: 'https://test-account.r2.cloudflarestorage.com',
        forcePathStyle: true,
      });
    });

    it('should generate URL with custom domain for Cloudflare R2', () => {
      const url = service.getFileUrl('test-key');
      expect(url).toBe('https://cdn.example.com/test-key');
    });

    it('should fallback to R2 public URL when no custom domain', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          STORAGE_PROVIDER: 'cloudflare',
          CLOUDFLARE_R2_BUCKET: 'test-r2-bucket',
          CLOUDFLARE_R2_REGION: 'auto',
          CLOUDFLARE_R2_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
          CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-r2-access-key',
          CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-r2-secret-key',
          CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
        };
        return config[key];
      });

      const url = service.getFileUrl('test-key');
      expect(url).toBe('https://test-account-id.r2.cloudflarestorage.com/test-r2-bucket/test-key');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          STORAGE_PROVIDER: 'aws',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_REGION: 'us-east-1',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        };
        return config[key];
      });

      // Recreate the service with the new configuration
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UnifiedStorageService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<UnifiedStorageService>(UnifiedStorageService);
      mockS3Client = (service as any).s3Client;
    });

    it('should handle upload errors', async () => {
      const error = new Error('Upload failed');
      mockS3Client.send = jest.fn().mockRejectedValue(error);

      await expect(
        service.uploadFile('test-key', Buffer.from('test'), 'text/plain')
      ).rejects.toThrow('Storage upload failed: Upload failed');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockS3Client.send = jest.fn().mockRejectedValue(error);

      await expect(service.deleteFile('test-key')).rejects.toThrow('Storage delete failed: Delete failed');
    });

    it('should handle signed URL generation errors', async () => {
      const error = new Error('URL generation failed');
      (getSignedUrl as jest.Mock).mockRejectedValue(error);

      await expect(service.generateSignedUrl('test-key')).rejects.toThrow('Signed URL generation failed: URL generation failed');
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          STORAGE_PROVIDER: 'aws',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_REGION: 'us-east-1',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        };
        return config[key];
      });

      // Recreate the service with the new configuration
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UnifiedStorageService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<UnifiedStorageService>(UnifiedStorageService);
      mockS3Client = (service as any).s3Client;
    });

    it('should return healthy status when connection works', async () => {
      const error = new Error('NoSuchKey');
      (error as any).name = 'NoSuchKey';
      mockS3Client.send = jest.fn().mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        provider: 'aws',
        bucket: 'test-bucket',
      });
    });

    it('should return unhealthy status when connection fails', async () => {
      const error = new Error('Connection failed');
      mockS3Client.send = jest.fn().mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        provider: 'aws',
        bucket: 'test-bucket',
      });
    });
  });
});
