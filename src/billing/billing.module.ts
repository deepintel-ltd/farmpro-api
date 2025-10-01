import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PlanService } from './services/plan.service';
import { SubscriptionService } from './services/subscription.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentService } from './services/payment.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { StripeProvider } from './providers/stripe.provider';
import { PaystackProvider } from './providers/paystack.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    PlanService,
    SubscriptionService,
    InvoiceService,
    PaymentMethodService,
    PaymentService,
    UsageTrackingService,
    StripeProvider,
    PaystackProvider,
  ],
  exports: [
    BillingService,
    PlanService,
    SubscriptionService,
    InvoiceService,
    PaymentMethodService,
    PaymentService,
    UsageTrackingService,
    StripeProvider,
    PaystackProvider,
  ],
})
export class BillingModule {}
