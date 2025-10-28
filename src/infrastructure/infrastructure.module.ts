import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureController } from './infrastructure.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InfrastructureController],
  providers: [InfrastructureService],
  exports: [InfrastructureService],
})
export class InfrastructureModule {}

