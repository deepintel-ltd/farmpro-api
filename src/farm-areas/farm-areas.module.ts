import { Module } from '@nestjs/common';
import { FarmAreasController } from './farm-areas.controller';
import { FarmAreasService } from './farm-areas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FarmAreasController],
  providers: [FarmAreasService],
  exports: [FarmAreasService],
})
export class FarmAreasModule {}
