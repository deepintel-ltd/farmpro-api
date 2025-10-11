import { Module } from '@nestjs/common';
import { CurrencyService } from './services/currency.service';
import { JobQueueService } from './services/job-queue.service';
import { MonitoringService } from './services/monitoring.service';
import { QueryOptimizationService } from './services/query-optimization.service';
import { UserContextService } from './services/user-context.service';
import { OrganizationContextService } from './services/organization-context.service';
import { AuthorizationGuard } from './guards/authorization.guard';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    CurrencyService,
    JobQueueService,
    MonitoringService,
    QueryOptimizationService,
    UserContextService,
    OrganizationContextService,
    AuthorizationGuard,
  ],
  exports: [
    CurrencyService,
    JobQueueService,
    MonitoringService,
    QueryOptimizationService,
    UserContextService,
    OrganizationContextService,
    AuthorizationGuard,
  ],
})
export class CommonModule {}
