import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { CurrencyModule } from '../common/currency/currency.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    CurrencyModule,
  ],
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService],
  exports: [ExecutiveDashboardService],
})
export class ExecutiveDashboardModule {}
