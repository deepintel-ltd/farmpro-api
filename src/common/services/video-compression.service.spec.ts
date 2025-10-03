import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VideoCompressionService } from './video-compression.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('VideoCompressionService', () => {
  let service: VideoCompressionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoCompressionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                TEMP_DIR: tmpdir(),
                VIDEO_COMPRESSION_ENABLED: 'true',
                FFMPEG_PATH: 'ffmpeg',
                FFPROBE_PATH: 'ffprobe',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VideoCompressionService>(VideoCompressionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isFFmpegAvailable', () => {
    it('should check if FFmpeg is available', async () => {
      const isAvailable = await service.isFFmpegAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('compressVideo', () => {
    it('should handle compression failure gracefully', async () => {
      // Create a mock video buffer (not a real video file)
      const mockVideoBuffer = Buffer.from('fake video content');
      const mockFilename = 'test.mp4';

      const result = await service.compressVideo(mockVideoBuffer, mockFilename);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.originalSize).toBe(mockVideoBuffer.length);
      expect(result.error).toBeDefined();
    });

    it('should return original buffer when compression fails', async () => {
      const mockVideoBuffer = Buffer.from('fake video content');
      const mockFilename = 'test.mp4';

      const result = await service.compressVideo(mockVideoBuffer, mockFilename);

      expect(result.success).toBe(false);
      expect(result.originalSize).toBe(mockVideoBuffer.length);
      expect(result.compressedSize).toBe(0);
      expect(result.compressionRatio).toBe(0);
    });
  });

  describe('getCompressionSettings', () => {
    it('should return correct settings for low quality', () => {
      const settings = (service as any).getCompressionSettings({ quality: 'low' });
      
      expect(settings.crf).toBe(28);
      expect(settings.maxBitrate).toBe('1M');
      expect(settings.preset).toBe('fast');
    });

    it('should return correct settings for medium quality', () => {
      const settings = (service as any).getCompressionSettings({ quality: 'medium' });
      
      expect(settings.crf).toBe(23);
      expect(settings.maxBitrate).toBe('2M');
      expect(settings.preset).toBe('medium');
    });

    it('should return correct settings for high quality', () => {
      const settings = (service as any).getCompressionSettings({ quality: 'high' });
      
      expect(settings.crf).toBe(18);
      expect(settings.maxBitrate).toBe('5M');
      expect(settings.preset).toBe('slow');
    });

    it('should use default settings when no options provided', () => {
      const settings = (service as any).getCompressionSettings({});
      
      expect(settings.quality).toBe('medium');
      expect(settings.crf).toBe(23);
      expect(settings.maxWidth).toBe(1920);
      expect(settings.maxHeight).toBe(1080);
    });
  });

  describe('buildFFmpegCommand', () => {
    it('should build correct FFmpeg command', () => {
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/output.mp4';
      const settings = {
        crf: 23,
        maxBitrate: '2M',
        preset: 'medium',
        maxWidth: 1920,
        maxHeight: 1080,
      };

      const command = (service as any).buildFFmpegCommand(inputPath, outputPath, settings);

      expect(command).toContain('-i');
      expect(command).toContain(inputPath);
      expect(command).toContain('-c:v');
      expect(command).toContain('libx264');
      expect(command).toContain('-crf');
      expect(command).toContain('23');
      expect(command).toContain('-maxrate');
      expect(command).toContain('2M');
      expect(command).toContain(outputPath);
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up temporary files', async () => {
      const tempDir = tmpdir();
      const testFile = join(tempDir, `test_${Date.now()}.txt`);
      
      // Create a test file
      await fs.writeFile(testFile, 'test content');
      
      // Verify file exists
      await expect(fs.access(testFile)).resolves.not.toThrow();
      
      // Clean up
      await (service as any).cleanupTempFiles([testFile]);
      
      // Verify file is deleted
      await expect(fs.access(testFile)).rejects.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      const nonExistentFile = '/tmp/non-existent-file.txt';
      
      // Should not throw error
      await expect((service as any).cleanupTempFiles([nonExistentFile])).resolves.not.toThrow();
    });
  });
});
