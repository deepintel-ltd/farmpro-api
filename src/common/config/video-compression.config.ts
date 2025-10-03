import { registerAs } from '@nestjs/config';

export default registerAs('videoCompression', () => ({
  enabled: process.env.VIDEO_COMPRESSION_ENABLED === 'true' || true,
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  tempDir: process.env.TEMP_DIR || '/tmp',
  
  // Compression settings
  minSizeForCompression: parseInt(process.env.VIDEO_MIN_COMPRESSION_SIZE) || 5 * 1024 * 1024, // 5MB
  maxSizeForCompression: parseInt(process.env.VIDEO_MAX_COMPRESSION_SIZE) || 100 * 1024 * 1024, // 100MB
  
  // Quality presets
  qualityPresets: {
    low: {
      crf: 28,
      maxBitrate: '1M',
      preset: 'fast',
      maxWidth: 1280,
      maxHeight: 720,
    },
    medium: {
      crf: 23,
      maxBitrate: '2M',
      preset: 'medium',
      maxWidth: 1920,
      maxHeight: 1080,
    },
    high: {
      crf: 18,
      maxBitrate: '5M',
      preset: 'slow',
      maxWidth: 1920,
      maxHeight: 1080,
    },
  },
  
  // Default quality
  defaultQuality: process.env.VIDEO_DEFAULT_QUALITY || 'medium',
  
  // Timeout settings
  compressionTimeout: parseInt(process.env.VIDEO_COMPRESSION_TIMEOUT) || 300000, // 5 minutes
  
  // Cleanup settings
  cleanupTempFiles: process.env.VIDEO_CLEANUP_TEMP_FILES !== 'false',
  tempFileRetentionMs: parseInt(process.env.VIDEO_TEMP_RETENTION_MS) || 300000, // 5 minutes
}));
