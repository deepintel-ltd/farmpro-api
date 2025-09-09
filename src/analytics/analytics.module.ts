import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPermissionsService } from './permissions.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsPermissionsService],
  exports: [AnalyticsService, AnalyticsPermissionsService],
})
export class AnalyticsModule {}
