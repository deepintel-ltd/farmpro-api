import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityCostService } from './activity-cost.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService, 
    PermissionsService, 
    ActivityTemplateService, 
    ActivityCostService, 
    ActivityAssignmentService
  ],
  exports: [
    ActivitiesService, 
    PermissionsService, 
    ActivityTemplateService, 
    ActivityCostService, 
    ActivityAssignmentService
  ],
})
export class ActivitiesModule {}
