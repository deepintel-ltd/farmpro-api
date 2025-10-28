import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CropCyclesService } from './crop-cycles.service';
import { CropCyclesController } from './crop-cycles.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CropCyclesController],
  providers: [CropCyclesService],
  exports: [CropCyclesService],
})
export class CropCyclesModule {}

