import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityAssignmentService } from './activity-assignment.service';
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
import { ActivityAssignmentGuard } from './guards';

@Module({
  imports: [
    PrismaModule, 
    MarketModule,
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
    ActivityTemplateService,
    ActivitySchedulingService,
    ActivityNotesService,
    ActivityUpdatesGateway,
    MobileFieldService,
    WeatherService,
    ActivityAssignmentGuard,
  ],
  exports: [
    ActivitiesService,
    PermissionsService,
    ActivityAssignmentService,
    ActivityTemplateService,
    ActivitySchedulingService,
    ActivityNotesService,
    ActivityUpdatesGateway,
    MobileFieldService,
    WeatherService,
    ActivityAssignmentGuard,
  ],
})
export class ActivitiesModule {}
