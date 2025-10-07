import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ActivityNotesService } from '../activities/activity-notes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UnifiedStorageService } from '../common/services/storage.service';
import { VideoCompressionService } from '../common/services/video-compression.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CommonModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, ActivityNotesService, UnifiedStorageService, VideoCompressionService],
  exports: [MediaService, ActivityNotesService, UnifiedStorageService, VideoCompressionService],
})
export class MediaModule {}
