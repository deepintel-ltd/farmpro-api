import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaHealthService } from '../prisma/prisma.health';
import { PrismaModule } from '../prisma/prisma.module';
import { UnifiedStorageService } from '../common/services/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthService, UnifiedStorageService],
  exports: [PrismaHealthService, UnifiedStorageService],
})
export class HealthModule {}
