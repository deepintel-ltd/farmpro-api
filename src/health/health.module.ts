import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaHealthService } from '../prisma/prisma.health';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthService],
  exports: [PrismaHealthService],
})
export class HealthModule {}