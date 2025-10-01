import { Module } from '@nestjs/common';
import { CurrencyService } from './services/currency.service';
import { JobQueueService } from './services/job-queue.service';
import { MonitoringService } from './services/monitoring.service';
import { QueryOptimizationService } from './services/query-optimization.service';

@Module({
  providers: [
    CurrencyService,
    JobQueueService,
    MonitoringService,
    QueryOptimizationService,
  ],
  exports: [
    CurrencyService,
    JobQueueService,
    MonitoringService,
    QueryOptimizationService,
  ],
})
export class CommonModule {}
