import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppCacheModule } from '../common/cache.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPermissionsService } from './permissions.service';

@Module({
  imports: [
    PrismaModule,
    AppCacheModule,
    IntelligenceModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsPermissionsService,
  ],
  exports: [
    AnalyticsService,
    AnalyticsPermissionsService,
  ]
})
export class AnalyticsModule {}
