import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityCostService } from './activity-cost.service';
import { ActivityHelpService } from './activity-help.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PermissionsService, ActivityAssignmentService, ActivityCostService, ActivityHelpService],
  exports: [ActivitiesService, PermissionsService, ActivityAssignmentService, ActivityCostService, ActivityHelpService],
})
export class ActivitiesModule {}
