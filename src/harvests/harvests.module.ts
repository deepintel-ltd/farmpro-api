import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HarvestsService } from './harvests.service';
import { HarvestsController } from './harvests.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}

