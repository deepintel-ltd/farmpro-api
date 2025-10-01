import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  SubscriptionPlanResourceSchema,
  SubscriptionPlanCollectionSchema,
  SubscriptionResourceSchema,
  SubscriptionCollectionSchema,
  InvoiceResourceSchema,
  InvoiceCollectionSchema,
  PaymentMethodResourceSchema,
  PaymentMethodCollectionSchema,
  PaymentResourceSchema,
  UsageStatsResourceSchema,
  CreateSubscriptionRequestSchema,
  UpdateSubscriptionRequestSchema,
  ChangePlanRequestSchema,
  CancelSubscriptionRequestSchema,
  CreatePaymentMethodRequestSchema,
  UpdatePaymentMethodRequestSchema,
  PayInvoiceRequestSchema,
  WebhookEventSchema,
} from './billing.schemas';
import {
  CommonQueryParams,
  AllQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  CuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Billing Contracts
// =============================================================================

export const billingContract = c.router({
  // ========================================
  // Subscription Plans
  // ========================================

  // Get all subscription plans
  getPlans: {
    method: 'GET',
    path: '/billing/plans',
    query: AllQueryParams,
    responses: {
      200: SubscriptionPlanCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all subscription plans',
  },

  // Get single subscription plan
  getPlan: {
    method: 'GET',
    path: '/billing/plans/:id',
    pathParams: CuidPathParam('Plan'),
    query: CommonQueryParams,
    responses: {
      200: SubscriptionPlanResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a subscription plan by ID',
  },

  // ========================================
  // Subscriptions
  // ========================================

  // Get current organization subscription
  getCurrentSubscription: {
    method: 'GET',
    path: '/billing/subscription',
    query: CommonQueryParams,
    responses: {
      200: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get current organization subscription',
  },

  // Create subscription
  createSubscription: {
    method: 'POST',
    path: '/billing/subscription',
    body: CreateSubscriptionRequestSchema,
    responses: {
      201: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new subscription',
  },

  // Update subscription
  updateSubscription: {
    method: 'PATCH',
    path: '/billing/subscription',
    body: UpdateSubscriptionRequestSchema,
    responses: {
      200: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update current subscription',
  },

  // Change subscription plan
  changePlan: {
    method: 'POST',
    path: '/billing/subscription/change-plan',
    body: ChangePlanRequestSchema,
    responses: {
      200: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Change subscription plan',
  },

  // Cancel subscription
  cancelSubscription: {
    method: 'POST',
    path: '/billing/subscription/cancel',
    body: CancelSubscriptionRequestSchema,
    responses: {
      200: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Cancel current subscription',
  },

  // Resume subscription
  resumeSubscription: {
    method: 'POST',
    path: '/billing/subscription/resume',
    body: z.object({}),
    responses: {
      200: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Resume a canceled subscription',
  },

  // ========================================
  // Invoices
  // ========================================

  // Get all invoices
  getInvoices: {
    method: 'GET',
    path: '/billing/invoices',
    query: AllQueryParams,
    responses: {
      200: InvoiceCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all invoices for current organization',
  },

  // Get single invoice
  getInvoice: {
    method: 'GET',
    path: '/billing/invoices/:id',
    pathParams: CuidPathParam('Invoice'),
    query: CommonQueryParams,
    responses: {
      200: InvoiceResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get an invoice by ID',
  },

  // Download invoice PDF
  downloadInvoicePDF: {
    method: 'GET',
    path: '/billing/invoices/:id/pdf',
    pathParams: CuidPathParam('Invoice'),
    responses: {
      200: z.object({
        url: z.string(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get invoice PDF download URL',
  },

  // Pay invoice
  payInvoice: {
    method: 'POST',
    path: '/billing/invoices/:id/pay',
    pathParams: CuidPathParam('Invoice'),
    body: PayInvoiceRequestSchema,
    responses: {
      200: PaymentResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Pay an invoice',
  },

  // ========================================
  // Payment Methods
  // ========================================

  // Get all payment methods
  getPaymentMethods: {
    method: 'GET',
    path: '/billing/payment-methods',
    query: AllQueryParams,
    responses: {
      200: PaymentMethodCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all payment methods',
  },

  // Add payment method
  createPaymentMethod: {
    method: 'POST',
    path: '/billing/payment-methods',
    body: CreatePaymentMethodRequestSchema,
    responses: {
      201: PaymentMethodResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Add a new payment method',
  },

  // Set default payment method
  setDefaultPaymentMethod: {
    method: 'PATCH',
    path: '/billing/payment-methods/:id/default',
    pathParams: CuidPathParam('PaymentMethod'),
    body: z.object({}),
    responses: {
      200: PaymentMethodResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Set a payment method as default',
  },

  // Delete payment method
  deletePaymentMethod: {
    method: 'DELETE',
    path: '/billing/payment-methods/:id',
    pathParams: CuidPathParam('PaymentMethod'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      ...CommonErrorResponses,
    },
    summary: 'Delete a payment method',
  },

  // ========================================
  // Usage
  // ========================================

  // Get usage statistics
  getUsageStats: {
    method: 'GET',
    path: '/billing/usage',
    query: z.object({
      period: z.enum(['current', 'previous', 'all']).optional(),
    }),
    responses: {
      200: UsageStatsResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get usage statistics for current organization',
  },

  // Get feature-specific usage
  getFeatureUsage: {
    method: 'GET',
    path: '/billing/usage/:feature',
    pathParams: z.object({
      feature: z.string(),
    }),
    query: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('usage-stats'),
          id: z.string(),
          attributes: z.object({
            featureName: z.string(),
            totalUsage: z.number(),
            limit: z.number(),
            isUnlimited: z.boolean(),
            periodStart: z.string(),
            periodEnd: z.string(),
            dailyUsage: z.array(z.object({
              date: z.string(),
              count: z.number(),
            })),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get usage statistics for a specific feature',
  },

  // ========================================
  // Webhooks
  // ========================================

  // Stripe webhook
  stripeWebhook: {
    method: 'POST',
    path: '/billing/webhooks/stripe',
    body: WebhookEventSchema,
    responses: {
      200: z.object({ received: z.boolean() }),
      400: z.object({ error: z.string() }),
    },
    summary: 'Handle Stripe webhook events',
  },

  // Paystack webhook
  paystackWebhook: {
    method: 'POST',
    path: '/billing/webhooks/paystack',
    body: WebhookEventSchema,
    responses: {
      200: z.object({ received: z.boolean() }),
      400: z.object({ error: z.string() }),
    },
    summary: 'Handle Paystack webhook events',
  },

  // ========================================
  // Admin (Platform Admin only)
  // ========================================

  // Get all subscriptions (admin)
  adminGetSubscriptions: {
    method: 'GET',
    path: '/billing/admin/subscriptions',
    query: AllQueryParams.extend({
      status: z.string().optional(),
      tier: z.string().optional(),
    }),
    responses: {
      200: SubscriptionCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all subscriptions (admin only)',
  },

  // Override subscription limits (admin)
  adminOverrideSubscription: {
    method: 'POST',
    path: '/billing/admin/subscriptions/:id/override',
    pathParams: CuidPathParam('Subscription'),
    body: z.object({
      data: z.object({
        type: z.literal('subscription-override'),
        attributes: z.object({
          maxUsers: z.number().optional(),
          maxFarms: z.number().optional(),
          maxActivitiesPerMonth: z.number().optional(),
          maxActiveListings: z.number().optional(),
          features: z.record(z.boolean()).optional(),
          reason: z.string(),
        }),
      }),
    }),
    responses: {
      200: SubscriptionResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Override subscription limits (admin only)',
  },

  // Get revenue analytics (admin)
  adminGetRevenue: {
    method: 'GET',
    path: '/billing/admin/revenue',
    query: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupBy: z.enum(['day', 'week', 'month', 'year']).optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('revenue-analytics'),
          id: z.string(),
          attributes: z.object({
            mrr: z.string(), // Monthly Recurring Revenue
            arr: z.string(), // Annual Recurring Revenue
            totalRevenue: z.string(),
            totalSubscriptions: z.number(),
            activeSubscriptions: z.number(),
            churnRate: z.number(),
            averageRevenuePerUser: z.string(),
            revenueByTier: z.record(z.string()),
            revenueOverTime: z.array(z.object({
              period: z.string(),
              amount: z.string(),
            })),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get revenue analytics (admin only)',
  },
});

export type BillingContract = typeof billingContract;
