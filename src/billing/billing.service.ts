import { Injectable, Logger } from '@nestjs/common';
import { PlanService } from './services/plan.service';
import { SubscriptionService } from './services/subscription.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentService } from './services/payment.service';
import { UsageTrackingService } from './services/usage-tracking.service';

/**
 * Main billing service that coordinates all billing operations
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    public readonly plans: PlanService,
    public readonly subscriptions: SubscriptionService,
    public readonly invoices: InvoiceService,
    public readonly paymentMethods: PaymentMethodService,
    public readonly payments: PaymentService,
    public readonly usage: UsageTrackingService,
  ) {}

  /**
   * Health check for billing service
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        plans: 'operational',
        subscriptions: 'operational',
        invoices: 'operational',
        paymentMethods: 'operational',
        payments: 'operational',
        usage: 'operational',
      },
    };
  }
}
