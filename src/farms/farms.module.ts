import { Module } from '@nestjs/common';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FarmAccessGuard } from './guards';

@Module({
  imports: [PrismaModule],
  controllers: [FarmsController],
  providers: [FarmsService, FarmAccessGuard],
  exports: [FarmsService, FarmAccessGuard],
})
export class FarmsModule {}
