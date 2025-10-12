import { z } from 'zod';
import {
  JsonApiResourceSchema,
  JsonApiCollectionSchema,
  JsonApiCreateRequestSchema,
} from './schemas';

// =============================================================================
// Enums
// =============================================================================

export const SubscriptionTierSchema = z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']);
export const SubscriptionStatusSchema = z.enum(['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'PAUSED', 'INCOMPLETE']);
export const BillingIntervalSchema = z.enum(['MONTHLY', 'YEARLY']);
export const CurrencySchema = z.enum(['USD', 'NGN']);
export const InvoiceStatusSchema = z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']);
export const PaymentMethodTypeSchema = z.enum(['CARD', 'BANK_ACCOUNT', 'MOBILE_MONEY']);
export const PaymentProviderSchema = z.enum(['STRIPE', 'PAYSTACK']);
export const PaymentStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED']);

// =============================================================================
// Subscription Plan Schemas
// =============================================================================

export const SubscriptionPlanSchema = z.object({
  name: z.string(),
  tier: SubscriptionTierSchema,
  description: z.string().nullable().optional(),
  priceUSD: z.string(), // Decimal as string
  priceNGN: z.string(), // Decimal as string
  billingInterval: BillingIntervalSchema,
  maxUsers: z.number(),
  maxFarms: z.number(),
  maxActivitiesPerMonth: z.number(),
  maxActiveListings: z.number(),
  storageGB: z.number(),
  apiCallsPerDay: z.number(),
  hasAdvancedAnalytics: z.boolean(),
  hasAIInsights: z.boolean(),
  hasAPIAccess: z.boolean(),
  hasCustomRoles: z.boolean(),
  hasPrioritySupport: z.boolean(),
  hasWhiteLabel: z.boolean(),
  features: z.record(z.any()).nullable().optional(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SubscriptionPlanResourceSchema = JsonApiResourceSchema(SubscriptionPlanSchema);
export const SubscriptionPlanCollectionSchema = JsonApiCollectionSchema(SubscriptionPlanSchema);

// =============================================================================
// Subscription Schemas
// =============================================================================

export const SubscriptionSchema = z.object({
  organizationId: z.string(),
  planId: z.string(),
  status: SubscriptionStatusSchema,
  currency: CurrencySchema,
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  billingInterval: BillingIntervalSchema,
  trialStart: z.string().nullable().optional(),
  trialEnd: z.string().nullable().optional(),
  isTrialing: z.boolean(),
  autoRenew: z.boolean(),
  paymentMethodId: z.string().nullable().optional(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SubscriptionResourceSchema = JsonApiResourceSchema(SubscriptionSchema);
export const SubscriptionCollectionSchema = JsonApiCollectionSchema(SubscriptionSchema);

// =============================================================================
// Invoice Schemas
// =============================================================================

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  amount: z.string(),
});

export const InvoiceSchema = z.object({
  subscriptionId: z.string(),
  invoiceNumber: z.string(),
  status: InvoiceStatusSchema,
  subtotal: z.string(),
  tax: z.string(),
  total: z.string(),
  amountPaid: z.string(),
  amountDue: z.string(),
  currency: CurrencySchema,
  issuedAt: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable().optional(),
  paymentIntentId: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  lineItems: z.array(InvoiceLineItemSchema),
  pdfUrl: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const InvoiceResourceSchema = JsonApiResourceSchema(InvoiceSchema);
export const InvoiceCollectionSchema = JsonApiCollectionSchema(InvoiceSchema);

// =============================================================================
// Payment Method Schemas
// =============================================================================

export const PaymentMethodSchema = z.object({
  organizationId: z.string(),
  type: PaymentMethodTypeSchema,
  provider: PaymentProviderSchema,
  cardLast4: z.string().nullable().optional(),
  cardBrand: z.string().nullable().optional(),
  cardExpMonth: z.number().nullable().optional(),
  cardExpYear: z.number().nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountLast4: z.string().nullable().optional(),
  isDefault: z.boolean(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaymentMethodResourceSchema = JsonApiResourceSchema(PaymentMethodSchema);
export const PaymentMethodCollectionSchema = JsonApiCollectionSchema(PaymentMethodSchema);

// =============================================================================
// Payment Schemas
// =============================================================================

export const PaymentSchema = z.object({
  invoiceId: z.string(),
  paymentMethodId: z.string().nullable().optional(),
  amount: z.string(),
  currency: CurrencySchema,
  status: PaymentStatusSchema,
  provider: PaymentProviderSchema,
  failureReason: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaymentResourceSchema = JsonApiResourceSchema(PaymentSchema);
export const PaymentCollectionSchema = JsonApiCollectionSchema(PaymentSchema);

// =============================================================================
// Usage Record Schemas
// =============================================================================

export const UsageRecordSchema = z.object({
  subscriptionId: z.string(),
  featureName: z.string(),
  quantity: z.number(),
  unit: z.string().nullable().optional(),
  recordedAt: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
});

export const UsageRecordResourceSchema = JsonApiResourceSchema(UsageRecordSchema);
export const UsageRecordCollectionSchema = JsonApiCollectionSchema(UsageRecordSchema);

// =============================================================================
// Request Schemas
// =============================================================================

// Create Subscription Request
export const CreateSubscriptionRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    planId: z.string(),
    currency: CurrencySchema,
    billingInterval: BillingIntervalSchema.optional(),
    paymentMethodId: z.string().optional(),
    startTrial: z.coerce.boolean().optional(),
  })
);

// Update Subscription Request
export const UpdateSubscriptionRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    autoRenew: z.coerce.boolean().optional(),
    cancelAtPeriodEnd: z.coerce.boolean().optional(),
  }).partial()
);

// Change Plan Request
export const ChangePlanRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    planId: z.string(),
    billingInterval: BillingIntervalSchema.optional(),
  })
);

// Cancel Subscription Request
export const CancelSubscriptionRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    cancelReason: z.string().optional(),
    immediate: z.coerce.boolean().optional(),
  })
);

// Create Payment Method Request
export const CreatePaymentMethodRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    type: PaymentMethodTypeSchema,
    provider: PaymentProviderSchema,
    stripePaymentMethodId: z.string().optional(),
    paystackAuthorizationCode: z.string().optional(),
    setAsDefault: z.coerce.boolean().optional(),
  })
);

// Update Payment Method Request
export const UpdatePaymentMethodRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    isDefault: z.boolean(),
  })
);

// Pay Invoice Request
export const PayInvoiceRequestSchema = JsonApiCreateRequestSchema(
  z.object({
    paymentMethodId: z.string().optional(),
  })
);

// Webhook Event Schema
export const WebhookEventSchema = z.object({
  type: z.string(),
  data: z.record(z.any()),
  signature: z.string().optional(),
});

// Usage Stats Response
export const UsageStatsSchema = z.object({
  currentPeriod: z.object({
    start: z.string(),
    end: z.string(),
  }),
  features: z.record(z.object({
    used: z.number(),
    limit: z.number(),
    unit: z.string().optional(),
    isUnlimited: z.boolean(),
    percentageUsed: z.number().optional(),
  })),
});

export const UsageStatsResourceSchema = JsonApiResourceSchema(UsageStatsSchema);
