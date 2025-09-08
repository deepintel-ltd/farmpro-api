import { Module } from '@nestjs/common';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService],
})
export class FarmsModule {}
