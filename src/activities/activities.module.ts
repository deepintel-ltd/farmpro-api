import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityCostService } from './activity-cost.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PermissionsService, ActivityAssignmentService, ActivityCostService],
  exports: [ActivitiesService, PermissionsService, ActivityAssignmentService, ActivityCostService],
})
export class ActivitiesModule {}
