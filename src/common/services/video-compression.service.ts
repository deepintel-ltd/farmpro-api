import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface VideoCompressionOptions {
  quality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
  maxBitrate?: string;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow' | 'veryslow';
  crf?: number; // Constant Rate Factor (18-28, lower = better quality)
}

export interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  outputPath?: string;
  error?: string;
  processingTime: number;
}

@Injectable()
export class VideoCompressionService {
  private readonly logger = new Logger(VideoCompressionService.name);
  private readonly tempDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tempDir = this.configService.get('TEMP_DIR') || tmpdir();
  }

  /**
   * Compress a video file using FFmpeg
   */
  async compressVideo(
    inputBuffer: Buffer,
    originalFilename: string,
    options: VideoCompressionOptions = {}
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const inputPath = join(this.tempDir, `input_${Date.now()}_${originalFilename}`);
    const outputPath = join(this.tempDir, `compressed_${Date.now()}_${originalFilename}`);

    try {
      // Write input buffer to temporary file
      await fs.writeFile(inputPath, inputBuffer);

      // Get compression settings based on quality preset
      const compressionSettings = this.getCompressionSettings(options);

      // Build FFmpeg command
      const ffmpegArgs = this.buildFFmpegCommand(inputPath, outputPath, compressionSettings);

      // Execute FFmpeg compression
      const result = await this.executeFFmpeg(ffmpegArgs);

      if (!result.success) {
        return {
          success: false,
          originalSize: inputBuffer.length,
          compressedSize: 0,
          compressionRatio: 0,
          error: result.error,
          processingTime: Date.now() - startTime,
        };
      }

      // Read compressed file
      const compressedBuffer = await fs.readFile(outputPath);
      const originalSize = inputBuffer.length;
      const compressedSize = compressedBuffer.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      this.logger.log(
        `Video compressed: ${originalSize} bytes → ${compressedSize} bytes (${compressionRatio.toFixed(1)}% reduction)`
      );

      return {
        success: true,
        originalSize,
        compressedSize,
        compressionRatio,
        outputPath,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Video compression failed:', error);
      return {
        success: false,
        originalSize: inputBuffer.length,
        compressedSize: 0,
        compressionRatio: 0,
        error: (error as Error).message,
        processingTime: Date.now() - startTime,
      };
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles([inputPath, outputPath]);
    }
  }

  /**
   * Get compression settings based on quality preset
   */
  private getCompressionSettings(options: VideoCompressionOptions) {
    const defaults = {
      quality: 'medium' as const,
      maxWidth: 1920,
      maxHeight: 1080,
      maxBitrate: '2M',
      preset: 'medium' as const,
      crf: 23,
    };

    const settings = { ...defaults, ...options };

    // Adjust settings based on quality preset
    switch (settings.quality) {
      case 'low':
        return {
          ...settings,
          crf: 28,
          maxBitrate: '1M',
          preset: 'fast' as const,
        };
      case 'high':
        return {
          ...settings,
          crf: 18,
          maxBitrate: '5M',
          preset: 'slow' as const,
        };
      default: // medium
        return settings;
    }
  }

  /**
   * Build FFmpeg command arguments
   */
  private buildFFmpegCommand(
    inputPath: string,
    outputPath: string,
    settings: ReturnType<VideoCompressionService['getCompressionSettings']>
  ): string[] {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264', // Video codec
      '-c:a', 'aac', // Audio codec
      '-preset', settings.preset,
      '-crf', settings.crf.toString(),
      '-maxrate', settings.maxBitrate,
      '-bufsize', `${parseInt(settings.maxBitrate) * 2}M`,
      '-vf', `scale='min(${settings.maxWidth},iw)':'min(${settings.maxHeight},ih)':force_original_aspect_ratio=decrease`,
      '-movflags', '+faststart', // Optimize for web streaming
      '-y', // Overwrite output file
      outputPath,
    ];

    return args;
  }

  /**
   * Execute FFmpeg command
   */
  private async executeFFmpeg(args: string[]): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ 
            success: false, 
            error: `FFmpeg exited with code ${code}: ${errorOutput}` 
          });
        }
      });

      ffmpeg.on('error', (error) => {
        resolve({ 
          success: false, 
          error: `FFmpeg execution failed: ${error.message}` 
        });
      });
    });
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete temporary file ${filePath}:`, error);
      }
    }
  }

  /**
   * Check if FFmpeg is available on the system
   */
  async isFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get video metadata using FFprobe
   */
  async getVideoMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch (error) {
            reject(new Error('Failed to parse FFprobe output'));
          }
        } else {
          reject(new Error(`FFprobe failed: ${errorOutput}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(error);
      });
    });
  }
}
