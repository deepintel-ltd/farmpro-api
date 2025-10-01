import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppCacheModule } from '../common/cache.module';
import { CommonModule } from '../common/common.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { JobQueueService } from '../common/services/job-queue.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    PrismaModule,
    AppCacheModule,
    CommonModule,
    IntelligenceModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    JobQueueService,
  ],
  exports: [
    AnalyticsService,
  ]
})
export class AnalyticsModule {}
