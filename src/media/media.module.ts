import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ActivityNotesService } from './activity-notes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, ActivityNotesService],
  exports: [MediaService, ActivityNotesService],
})
export class MediaModule {}