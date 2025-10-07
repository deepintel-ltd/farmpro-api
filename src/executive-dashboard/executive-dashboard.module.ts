import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AppCacheModule } from '../common/cache.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PrismaModule,
    AppCacheModule,
    CommonModule,
  ],
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService],
  exports: [ExecutiveDashboardService],
})
export class ExecutiveDashboardModule {}
