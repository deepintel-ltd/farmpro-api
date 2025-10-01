import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency } from '@prisma/client';
import * as crypto from 'crypto';

interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  integration: number;
  domain: string;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, any>;
}

interface PaystackSubscription {
  id: number;
  subscription_code: string;
  email_token: string;
  amount: number;
  cron_expression: string;
  next_payment_date: string;
  status: string;
  customer: PaystackCustomer;
  plan: any;
  authorization: any;
}

interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    brand: string;
  };
}

@Injectable()
export class PaystackProvider {
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';

    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured');
    }
  }

  /**
   * Make HTTP request to Paystack API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Paystack API error');
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Paystack API error: ${endpoint}`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Paystack API error',
      );
    }
  }

  /**
   * Create a Paystack customer
   */
  async createCustomer(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }): Promise<PaystackCustomer> {
    this.logger.log(`Creating Paystack customer for: ${data.email}`);

    const customer = await this.request<PaystackCustomer>('POST', '/customer', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      metadata: data.metadata,
    });

    this.logger.log(`Created Paystack customer: ${customer.customer_code}`);
    return customer;
  }

  /**
   * Initialize a transaction
   */
  async initializeTransaction(data: {
    email: string;
    amount: number; // In kobo (NGN smallest unit)
    reference?: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    this.logger.log(`Initializing Paystack transaction for: ${data.email}`);

    const result = await this.request<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('POST', '/transaction/initialize', {
      email: data.email,
      amount: data.amount,
      reference: data.reference,
      callback_url: data.callbackUrl,
      metadata: data.metadata,
    });

    this.logger.log(`Initialized transaction: ${result.reference}`);
    return result;
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    this.logger.log(`Verifying Paystack transaction: ${reference}`);

    const transaction = await this.request<PaystackTransaction>(
      'GET',
      `/transaction/verify/${reference}`,
    );

    this.logger.log(`Transaction verified: ${reference} - ${transaction.status}`);
    return transaction;
  }

  /**
   * Charge authorization (for recurring payments)
   */
  async chargeAuthorization(data: {
    authorizationCode: string;
    email: string;
    amount: number; // In kobo
    reference?: string;
    metadata?: Record<string, any>;
  }): Promise<PaystackTransaction> {
    this.logger.log(
      `Charging authorization for: ${data.email} (${data.amount} kobo)`,
    );

    const transaction = await this.request<PaystackTransaction>(
      'POST',
      '/transaction/charge_authorization',
      {
        authorization_code: data.authorizationCode,
        email: data.email,
        amount: data.amount,
        reference: data.reference,
        metadata: data.metadata,
      },
    );

    this.logger.log(`Charged authorization: ${transaction.reference}`);
    return transaction;
  }

  /**
   * Create a subscription plan
   */
  async createPlan(data: {
    name: string;
    amount: number; // In kobo
    interval: 'monthly' | 'annually';
    description?: string;
  }): Promise<any> {
    this.logger.log(`Creating Paystack plan: ${data.name}`);

    const plan = await this.request<{ plan_code: string}>('POST', '/plan', {
      name: data.name,
      amount: data.amount,
      interval: data.interval,
      description: data.description,
    });

    this.logger.log(`Created Paystack plan: ${plan.plan_code}`);
    return plan;
  }

  /**
   * Create a subscription
   */
  async createSubscription(data: {
    customerCode: string;
    planCode: string;
    authorizationCode: string;
  }): Promise<PaystackSubscription> {
    this.logger.log(
      `Creating Paystack subscription for customer: ${data.customerCode}`,
    );

    const subscription = await this.request<PaystackSubscription>(
      'POST',
      '/subscription',
      {
        customer: data.customerCode,
        plan: data.planCode,
        authorization: data.authorizationCode,
      },
    );

    this.logger.log(`Created subscription: ${subscription.subscription_code}`);
    return subscription;
  }

  /**
   * Disable a subscription
   */
  async disableSubscription(data: {
    subscriptionCode: string;
    emailToken: string;
  }): Promise<void> {
    this.logger.log(`Disabling Paystack subscription: ${data.subscriptionCode}`);

    await this.request('POST', '/subscription/disable', {
      code: data.subscriptionCode,
      token: data.emailToken,
    });

    this.logger.log(`Disabled subscription: ${data.subscriptionCode}`);
  }

  /**
   * Enable a subscription
   */
  async enableSubscription(data: {
    subscriptionCode: string;
    emailToken: string;
  }): Promise<void> {
    this.logger.log(`Enabling Paystack subscription: ${data.subscriptionCode}`);

    await this.request('POST', '/subscription/enable', {
      code: data.subscriptionCode,
      token: data.emailToken,
    });

    this.logger.log(`Enabled subscription: ${data.subscriptionCode}`);
  }

  /**
   * Get subscription details
   */
  async getSubscription(
    subscriptionCode: string,
  ): Promise<PaystackSubscription> {
    this.logger.log(`Fetching Paystack subscription: ${subscriptionCode}`);

    return await this.request<PaystackSubscription>(
      'GET',
      `/subscription/${subscriptionCode}`,
    );
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Convert NGN to kobo (smallest unit)
   */
  toKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert kobo to NGN
   */
  fromKobo(amount: number): number {
    return amount / 100;
  }

  /**
   * Generate transaction reference
   */
  generateReference(prefix: string = 'TXN'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get authorization details
   */
  async getAuthorization(
    authorizationCode: string,
  ): Promise<any> {
    this.logger.log(`Fetching authorization: ${authorizationCode}`);

    // Paystack doesn't have a direct endpoint for this
    // We'll need to get it from a transaction that used this auth
    // For now, return a placeholder
    return {
      authorization_code: authorizationCode,
    };
  }

  /**
   * List customer authorizations
   */
  async listCustomerAuthorizations(customerCode: string): Promise<any[]> {
    this.logger.log(`Listing authorizations for customer: ${customerCode}`);

    return await this.request<any[]>(
      'GET',
      `/customer/${customerCode}/authorization`,
    );
  }

  /**
   * Deactivate authorization
   */
  async deactivateAuthorization(authorizationCode: string): Promise<void> {
    this.logger.log(`Deactivating authorization: ${authorizationCode}`);

    await this.request('POST', '/customer/deactivate_authorization', {
      authorization_code: authorizationCode,
    });

    this.logger.log(`Deactivated authorization: ${authorizationCode}`);
  }

  /**
   * Create refund
   */
  async createRefund(data: {
    transactionReference: string;
    amount?: number; // Optional partial refund amount in kobo
    merchantNote?: string;
    customerNote?: string;
  }): Promise<any> {
    this.logger.log(`Creating refund for: ${data.transactionReference}`);

    const refund = await this.request<{ id: string }>('POST', '/refund', {
      transaction: data.transactionReference,
      amount: data.amount,
      merchant_note: data.merchantNote,
      customer_note: data.customerNote,
    });

    this.logger.log(`Created refund: ${refund.id}`);
    return refund;
  }

  /**
   * Get customer
   */
  async getCustomer(customerCode: string): Promise<PaystackCustomer> {
    this.logger.log(`Fetching customer: ${customerCode}`);

    return await this.request<PaystackCustomer>(
      'GET',
      `/customer/${customerCode}`,
    );
  }

  /**
   * Update customer
   */
  async updateCustomer(
    customerCode: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<PaystackCustomer> {
    this.logger.log(`Updating customer: ${customerCode}`);

    return await this.request<PaystackCustomer>(
      'PUT',
      `/customer/${customerCode}`,
      {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        metadata: data.metadata,
      },
    );
  }
}
