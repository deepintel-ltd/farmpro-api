import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityCostService } from './activity-cost.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PermissionsService, ActivityTemplateService, ActivityCostService],
  exports: [ActivitiesService, PermissionsService, ActivityTemplateService, ActivityCostService],
})
export class ActivitiesModule {}
