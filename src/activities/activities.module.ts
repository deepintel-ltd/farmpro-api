import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PermissionsService } from './permissions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PermissionsService],
  exports: [ActivitiesService, PermissionsService],
})
export class ActivitiesModule {}