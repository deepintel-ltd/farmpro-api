import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Currency } from '@prisma/client';

@Injectable()
export class StripeProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
    }

    this.stripe = new Stripe(apiKey || 'sk_test_placeholder', {
      apiVersion: '2024-12-18.acacia',
    });
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(data: {
    email: string;
    name: string;
    organizationId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    this.logger.log(`Creating Stripe customer for: ${data.email}`);

    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          organizationId: data.organizationId,
          ...data.metadata,
        },
      });

      this.logger.log(`Created Stripe customer: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.logger.log(
      `Attaching payment method ${paymentMethodId} to customer ${customerId}`,
    );

    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        },
      );

      this.logger.log(`Attached payment method: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to attach payment method', error);
      throw new BadRequestException('Failed to attach payment method');
    }
  }

  /**
   * Set default payment method for customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    this.logger.log(
      `Setting default payment method for customer ${customerId}`,
    );

    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return customer;
    } catch (error) {
      this.logger.error('Failed to set default payment method', error);
      throw new BadRequestException('Failed to set default payment method');
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(data: {
    customerId: string;
    priceId: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    this.logger.log(`Creating Stripe subscription for customer: ${data.customerId}`);

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: data.priceId }],
        trial_period_days: data.trialPeriodDays,
        metadata: data.metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      this.logger.log(`Created Stripe subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    data: {
      priceId?: string;
      cancelAtPeriodEnd?: boolean;
      metadata?: Record<string, string>;
    },
  ): Promise<Stripe.Subscription> {
    this.logger.log(`Updating Stripe subscription: ${subscriptionId}`);

    try {
      const updateData: Stripe.SubscriptionUpdateParams = {
        cancel_at_period_end: data.cancelAtPeriodEnd,
        metadata: data.metadata,
      };

      if (data.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(
          subscriptionId,
        );
        updateData.items = [
          {
            id: subscription.items.data[0].id,
            price: data.priceId,
          },
        ];
        updateData.proration_behavior = 'create_prorations';
      }

      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        updateData,
      );

      this.logger.log(`Updated Stripe subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to update Stripe subscription', error);
      throw new BadRequestException('Failed to update subscription');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    this.logger.log(
      `Canceling Stripe subscription: ${subscriptionId} (immediate: ${immediately})`,
    );

    try {
      if (immediately) {
        const subscription = await this.stripe.subscriptions.cancel(
          subscriptionId,
        );
        return subscription;
      } else {
        const subscription = await this.stripe.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end: true,
          },
        );
        return subscription;
      }
    } catch (error) {
      this.logger.error('Failed to cancel Stripe subscription', error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    this.logger.log(`Resuming Stripe subscription: ${subscriptionId}`);

    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: false,
        },
      );

      this.logger.log(`Resumed Stripe subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to resume Stripe subscription', error);
      throw new BadRequestException('Failed to resume subscription');
    }
  }

  /**
   * Create a payment intent for invoice payment
   */
  async createPaymentIntent(data: {
    amount: number;
    currency: Currency;
    customerId: string;
    invoiceId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Creating payment intent for invoice: ${data.invoiceId}`);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        customer: data.customerId,
        metadata: {
          invoiceId: data.invoiceId,
          ...data.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Created payment intent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Retrieve an invoice
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to retrieve invoice: ${invoiceId}`, error);
      throw new BadRequestException('Failed to retrieve invoice');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Create a price for a subscription plan
   */
  async createPrice(data: {
    productId: string;
    amount: number;
    currency: Currency;
    interval: 'month' | 'year';
    nickname?: string;
  }): Promise<Stripe.Price> {
    this.logger.log(
      `Creating Stripe price for product: ${data.productId}`,
    );

    try {
      const price = await this.stripe.prices.create({
        product: data.productId,
        unit_amount: Math.round(data.amount * 100),
        currency: data.currency.toLowerCase(),
        recurring: {
          interval: data.interval,
        },
        nickname: data.nickname,
      });

      this.logger.log(`Created Stripe price: ${price.id}`);
      return price;
    } catch (error) {
      this.logger.error('Failed to create Stripe price', error);
      throw new BadRequestException('Failed to create price');
    }
  }

  /**
   * Get customer portal URL
   */
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<string> {
    this.logger.log(`Creating customer portal session for: ${customerId}`);

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      this.logger.error('Failed to create customer portal session', error);
      throw new BadRequestException('Failed to create portal session');
    }
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve payment method: ${paymentMethodId}`,
        error,
      );
      throw new BadRequestException('Failed to retrieve payment method');
    }
  }

  /**
   * Detach payment method
   */
  async detachPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.logger.log(`Detaching payment method: ${paymentMethodId}`);

    try {
      return await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      this.logger.error('Failed to detach payment method', error);
      throw new BadRequestException('Failed to detach payment method');
    }
  }
}
