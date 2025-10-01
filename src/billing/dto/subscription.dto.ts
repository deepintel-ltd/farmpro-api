import { Currency, BillingInterval } from '@prisma/client';

export class CreateSubscriptionDto {
  planId: string;
  currency: Currency;
  billingInterval?: BillingInterval;
  paymentMethodId?: string;
  startTrial?: boolean;
}

export class UpdateSubscriptionDto {
  autoRenew?: boolean;
  cancelAtPeriodEnd?: boolean;
}

export class ChangePlanDto {
  planId: string;
  billingInterval?: BillingInterval;
}

export class CancelSubscriptionDto {
  cancelReason?: string;
  immediate?: boolean;
}

export class ResumeSubscriptionDto {}
