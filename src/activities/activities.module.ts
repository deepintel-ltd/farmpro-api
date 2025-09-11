import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityCostService } from './activity-cost.service';
import { ActivityHelpService } from './activity-help.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivitySchedulingService } from './activity-scheduling.service';
import { ActivityNotesService } from './activity-notes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketModule } from '../market/market.module';
import { ActivityUpdatesGateway } from './activity-updates.gateway';
import { MobileFieldController } from './mobile-field.controller';
import { MobileFieldService } from './mobile-field.service';
import { WeatherService } from './weather.service';
import { JwtModule } from '@nestjs/jwt';
import { AppCacheModule } from '@/common/cache.module';
import { MonitoringService } from '@/common/services/monitoring.service';
import { QueryOptimizationService } from '@/common/services/query-optimization.service';
import { JobQueueService } from '@/common/services/job-queue.service';
import { ConflictResolutionService } from './services/conflict-resolution.service';
import { MarketAnalysisJobProcessor } from './jobs/market-analysis.job';
import { ActivityAnalyticsJobProcessor } from './jobs/activity-analytics.job';

@Module({
  imports: [
    PrismaModule, 
    MarketModule,
    AppCacheModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
      }),
    }),
  ],
  controllers: [ActivitiesController, MobileFieldController],
  providers: [
    ActivitiesService,
    PermissionsService,
    ActivityAssignmentService,
    ActivityCostService,
    ActivityHelpService,
    ActivityTemplateService,
    ActivitySchedulingService,
    ActivityNotesService,
    ActivityUpdatesGateway,
    MobileFieldService,
    WeatherService,
    MonitoringService,
    QueryOptimizationService,
    JobQueueService,
    ConflictResolutionService,
    MarketAnalysisJobProcessor,
    ActivityAnalyticsJobProcessor,
  ],
  exports: [
    ActivitiesService,
    PermissionsService,
    ActivityAssignmentService,
    ActivityCostService,
    ActivityHelpService,
    ActivityTemplateService,
    ActivitySchedulingService,
    ActivityNotesService,
    ActivityUpdatesGateway,
    MobileFieldService,
    WeatherService,
    MonitoringService,
    QueryOptimizationService,
    JobQueueService,
    ConflictResolutionService,
    MarketAnalysisJobProcessor,
    ActivityAnalyticsJobProcessor,
  ],
})
export class ActivitiesModule {}
