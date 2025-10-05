import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PlanService } from './services/plan.service';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionCronService } from './services/subscription-cron.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentService } from './services/payment.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { PlanFeatureMapperService } from './services/plan-feature-mapper.service';
import { StripeProvider } from './providers/stripe.provider';
import { PaystackProvider } from './providers/paystack.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [BillingController],
  providers: [
    BillingService,
    PlanService,
    SubscriptionService,
    SubscriptionCronService,
    InvoiceService,
    PaymentMethodService,
    PaymentService,
    UsageTrackingService,
    PlanFeatureMapperService,
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
    PlanFeatureMapperService,
    StripeProvider,
    PaystackProvider,
  ],
})
export class BillingModule {}
