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
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule, 
    MarketModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
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
  ],
})
export class ActivitiesModule {}
