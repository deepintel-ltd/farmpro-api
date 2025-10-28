import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KPIsService } from './kpis.service';
import { KPIsController } from './kpis.controller';

@Module({
  imports: [PrismaModule],
  controllers: [KPIsController],
  providers: [KPIsService],
  exports: [KPIsService],
})
export class KPIsModule {}

