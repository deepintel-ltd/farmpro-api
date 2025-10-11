import { Controller, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { BillingService } from './billing.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { billingContract } from '../../contracts/billing.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller()

export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ==========================================================================
  // Subscription Plans
  // ==========================================================================

  @TsRestHandler(billingContract.getPlans)
  public getPlans(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getPlans, async ({ query }) => {
      try {
        const result = await this.billingService.plans.findAll(query as any);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve subscription plans',
          'GET_PLANS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(billingContract.getPlan)
  public getPlan(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getPlan, async ({ params }) => {
      try {
        const result = await this.billingService.plans.findOne(params.id);
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Subscription plan not found',
          notFoundCode: 'PLAN_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve subscription plan',
          internalErrorCode: 'GET_PLAN_FAILED',
        });
      }
    });
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  @TsRestHandler(billingContract.getCurrentSubscription)
  public getCurrentSubscription(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.getCurrentSubscription,
      async () => {
        try {
          const result =
            await this.billingService.subscriptions.getCurrentSubscription(
              req.user.organizationId,
            );
          return { status: 200 as const, body: result };
        } catch (error: unknown) {
          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Subscription not found',
            notFoundCode: 'SUBSCRIPTION_NOT_FOUND',
            internalErrorMessage: 'Failed to retrieve subscription',
            internalErrorCode: 'GET_SUBSCRIPTION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(billingContract.createSubscription)
  public createSubscription(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.createSubscription, async ({ body }) => {
      try {
        const result = await this.billingService.subscriptions.createSubscription(
          req.user.organizationId,
          body.data.attributes as any,
        );
        return { status: 201 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid subscription data',
          badRequestCode: 'INVALID_SUBSCRIPTION_DATA',
          internalErrorMessage: 'Failed to create subscription',
          internalErrorCode: 'CREATE_SUBSCRIPTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(billingContract.updateSubscription)
  public updateSubscription(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.updateSubscription, async ({ body }) => {
      try {
        const result = await this.billingService.subscriptions.updateSubscription(
          req.user.organizationId,
          body.data.attributes as any,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Subscription not found',
          notFoundCode: 'SUBSCRIPTION_NOT_FOUND',
          badRequestMessage: 'Invalid subscription data',
          badRequestCode: 'INVALID_SUBSCRIPTION_DATA',
          internalErrorMessage: 'Failed to update subscription',
          internalErrorCode: 'UPDATE_SUBSCRIPTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(billingContract.changePlan)
  public changePlan(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.changePlan, async ({ body }) => {
      try {
        const result = await this.billingService.subscriptions.changePlan(
          req.user.organizationId,
          body.data.attributes as any,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Subscription or plan not found',
          notFoundCode: 'SUBSCRIPTION_OR_PLAN_NOT_FOUND',
          badRequestMessage: 'Invalid plan change request',
          badRequestCode: 'INVALID_PLAN_CHANGE',
          internalErrorMessage: 'Failed to change subscription plan',
          internalErrorCode: 'CHANGE_PLAN_FAILED',
        });
      }
    });
  }

  @TsRestHandler(billingContract.cancelSubscription)
  public cancelSubscription(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.cancelSubscription, async ({ body }) => {
      try {
        const result = await this.billingService.subscriptions.cancelSubscription(
          req.user.organizationId,
          body.data.attributes as any,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Subscription not found',
          notFoundCode: 'SUBSCRIPTION_NOT_FOUND',
          badRequestMessage: 'Invalid cancellation request',
          badRequestCode: 'INVALID_CANCELLATION',
          internalErrorMessage: 'Failed to cancel subscription',
          internalErrorCode: 'CANCEL_SUBSCRIPTION_FAILED',
        });
      }
    });
  }

  @TsRestHandler(billingContract.resumeSubscription)
  public resumeSubscription(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.resumeSubscription, async () => {
      try {
        const result =
          await this.billingService.subscriptions.resumeSubscription(
            req.user.organizationId,
          );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Subscription not found',
          notFoundCode: 'SUBSCRIPTION_NOT_FOUND',
          badRequestMessage: 'Subscription cannot be resumed',
          badRequestCode: 'INVALID_RESUME',
          internalErrorMessage: 'Failed to resume subscription',
          internalErrorCode: 'RESUME_SUBSCRIPTION_FAILED',
        });
      }
    });
  }

  // ==========================================================================
  // Invoices
  // ==========================================================================

  @TsRestHandler(billingContract.getInvoices)
  public getInvoices(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getInvoices, async ({ query }) => {
      try {
        const result = await this.billingService.invoices.findAll(
          req.user.organizationId,
          query as any,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve invoices',
          'GET_INVOICES_FAILED',
        );
      }
    });
  }

  @TsRestHandler(billingContract.getInvoice)
  public getInvoice(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getInvoice, async ({ params }) => {
      try {
        const result = await this.billingService.invoices.findOne(
          params.id,
          req.user.organizationId,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Invoice not found',
          notFoundCode: 'INVOICE_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve invoice',
          internalErrorCode: 'GET_INVOICE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(billingContract.downloadInvoicePDF)
  public downloadInvoicePDF(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.downloadInvoicePDF,
      async ({ params }) => {
        try {
          const result = await this.billingService.invoices.getInvoicePDF(
            params.id,
            req.user.organizationId,
          );
          return { status: 200 as const, body: result };
        } catch (error: unknown) {
          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Invoice not found',
            notFoundCode: 'INVOICE_NOT_FOUND',
            internalErrorMessage: 'Failed to download invoice PDF',
            internalErrorCode: 'DOWNLOAD_INVOICE_PDF_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(billingContract.payInvoice)
  public payInvoice(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.payInvoice, async ({ params, body }) => {
      try {
        const paymentService = (this.billingService as any).payments;
        if (!paymentService) {
          return ErrorResponseUtil.internalServerError(
            new Error('Payment service not configured'),
            'Payment service is not available',
            'PAYMENT_SERVICE_UNAVAILABLE',
          );
        }

        const result = await paymentService.processPayment(
          params.id,
          req.user.organizationId,
          body.data.attributes.paymentMethodId,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Invoice or payment method not found',
          notFoundCode: 'INVOICE_OR_PAYMENT_METHOD_NOT_FOUND',
          badRequestMessage: 'Invalid payment request',
          badRequestCode: 'INVALID_PAYMENT',
          internalErrorMessage: 'Failed to process payment',
          internalErrorCode: 'PAY_INVOICE_FAILED',
        });
      }
    });
  }

  // ==========================================================================
  // Payment Methods
  // ==========================================================================

  @TsRestHandler(billingContract.getPaymentMethods)
  public getPaymentMethods(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getPaymentMethods, async () => {
      try {
        const result = await this.billingService.paymentMethods.findAll(
          req.user.organizationId,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve payment methods',
          'GET_PAYMENT_METHODS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(billingContract.createPaymentMethod)
  public createPaymentMethod(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.createPaymentMethod,
      async ({ body }) => {
        try {
          const result = await this.billingService.paymentMethods.create(
            req.user.organizationId,
            body.data.attributes as any,
          );
          return { status: 201 as const, body: result };
        } catch (error: unknown) {
          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid payment method data',
            badRequestCode: 'INVALID_PAYMENT_METHOD_DATA',
            internalErrorMessage: 'Failed to create payment method',
            internalErrorCode: 'CREATE_PAYMENT_METHOD_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(billingContract.setDefaultPaymentMethod)
  public setDefaultPaymentMethod(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.setDefaultPaymentMethod,
      async ({ params }) => {
        try {
          const result = await this.billingService.paymentMethods.setDefault(
            params.id,
            req.user.organizationId,
          );
          return { status: 200 as const, body: result };
        } catch (error: unknown) {
          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Payment method not found',
            notFoundCode: 'PAYMENT_METHOD_NOT_FOUND',
            internalErrorMessage: 'Failed to set default payment method',
            internalErrorCode: 'SET_DEFAULT_PAYMENT_METHOD_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(billingContract.deletePaymentMethod)
  public deletePaymentMethod(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.deletePaymentMethod,
      async ({ params }) => {
        try {
          await this.billingService.paymentMethods.delete(
            params.id,
            req.user.organizationId,
          );
          return { status: 204 as const, body: {} };
        } catch (error: unknown) {
          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Payment method not found',
            notFoundCode: 'PAYMENT_METHOD_NOT_FOUND',
            internalErrorMessage: 'Failed to delete payment method',
            internalErrorCode: 'DELETE_PAYMENT_METHOD_FAILED',
          });
        }
      },
    );
  }

  // ==========================================================================
  // Usage
  // ==========================================================================

  @TsRestHandler(billingContract.getUsageStats)
  public getUsageStats(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getUsageStats, async () => {
      try {
        const result = await this.billingService.usage.getUsageStats(
          req.user.organizationId,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve usage statistics',
          'GET_USAGE_STATS_FAILED',
        );
      }
    });
  }

  @TsRestHandler(billingContract.getFeatureUsage)
  public getFeatureUsage(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.getFeatureUsage, async ({ params, query }) => {
      try {
        const result = await this.billingService.usage.getFeatureUsage(
          req.user.organizationId,
          params.feature,
          query.startDate ? new Date(query.startDate) : undefined,
          query.endDate ? new Date(query.endDate) : undefined,
        );
        return { status: 200 as const, body: result };
      } catch (error: unknown) {
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve feature usage',
          'GET_FEATURE_USAGE_FAILED',
        );
      }
    });
  }

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  @TsRestHandler(billingContract.stripeWebhook)
  public stripeWebhook(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.stripeWebhook, async () => {
      try {
        // Webhook validation and processing will be implemented
        // This requires access to raw request body and Stripe signature header
        // For now, return basic response
        return {
          status: 200 as const,
          body: { received: true },
        };
      } catch {
        return {
          status: 400 as const,
          body: { error: 'Webhook processing failed' },
        };
      }
    });
  }

  @TsRestHandler(billingContract.paystackWebhook)
  public paystackWebhook(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.paystackWebhook, async () => {
      try {
        // Webhook validation and processing will be implemented
        // This requires access to raw request body and Paystack signature header
        // For now, return basic response
        return {
          status: 200 as const,
          body: { received: true },
        };
      } catch {
        return {
          status: 400 as const,
          body: { error: 'Webhook processing failed' },
        };
      }
    });
  }

  // ==========================================================================
  // Admin Endpoints
  // ==========================================================================

  @TsRestHandler(billingContract.adminGetSubscriptions)
  
  public adminGetSubscriptions(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.adminGetSubscriptions,
      async () => {
        try {
          // TODO: Implement admin subscription listing
          return ErrorResponseUtil.internalServerError(
            new Error('Not implemented'),
            'Admin subscription listing not yet implemented',
            'ADMIN_GET_SUBSCRIPTIONS_NOT_IMPLEMENTED',
          );
        } catch (error: unknown) {
          return ErrorResponseUtil.internalServerError(
            error,
            'Failed to retrieve subscriptions',
            'ADMIN_GET_SUBSCRIPTIONS_FAILED',
          );
        }
      },
    );
  }

  @TsRestHandler(billingContract.adminOverrideSubscription)
  
  public adminOverrideSubscription(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      billingContract.adminOverrideSubscription,
      async () => {
        try {
          // TODO: Implement subscription override
          return ErrorResponseUtil.internalServerError(
            new Error('Not implemented'),
            'Subscription override not yet implemented',
            'ADMIN_OVERRIDE_SUBSCRIPTION_NOT_IMPLEMENTED',
          );
        } catch (error: unknown) {
          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Subscription not found',
            notFoundCode: 'SUBSCRIPTION_NOT_FOUND',
            badRequestMessage: 'Invalid override data',
            badRequestCode: 'INVALID_OVERRIDE_DATA',
            internalErrorMessage: 'Failed to override subscription',
            internalErrorCode: 'ADMIN_OVERRIDE_SUBSCRIPTION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(billingContract.adminGetRevenue)
  
  public adminGetRevenue(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(billingContract.adminGetRevenue, async () => {
      try {
        // TODO: Implement revenue analytics
        return ErrorResponseUtil.internalServerError(
          new Error('Not implemented'),
          'Revenue analytics not yet implemented',
          'ADMIN_GET_REVENUE_NOT_IMPLEMENTED',
        );
      } catch (error: unknown) {
        return ErrorResponseUtil.internalServerError(
          error,
          'Failed to retrieve revenue analytics',
          'ADMIN_GET_REVENUE_FAILED',
        );
      }
    });
  }
}
