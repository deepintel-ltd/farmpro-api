import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeProvider } from '../providers/stripe.provider';
import { PaystackProvider } from '../providers/paystack.provider';
import { InvoiceService } from './invoice.service';
import { PaymentMethodService } from './payment-method.service';
import {
  Currency,
  PaymentProvider,
  PaymentStatus,
  InvoiceStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
    private readonly paystackProvider: PaystackProvider,
    private readonly invoiceService: InvoiceService,
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  /**
   * Process payment for an invoice
   */
  async processPayment(
    invoiceId: string,
    organizationId: string,
    paymentMethodId?: string,
  ) {
    this.logger.log(`Processing payment for invoice: ${invoiceId}`);

    const invoiceResponse = await this.invoiceService.findOne(invoiceId, organizationId);
    const invoice = (invoiceResponse.data as any).attributes;

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already paid');
    }

    // Get payment method
    const paymentMethod = paymentMethodId
      ? await this.paymentMethodService.findOne(paymentMethodId, organizationId)
      : await this.paymentMethodService.getDefault(organizationId);

    if (!paymentMethod) {
      throw new BadRequestException(
        'No payment method found. Please add a payment method first.',
      );
    }

    // Process based on provider
    if (paymentMethod.provider === PaymentProvider.STRIPE) {
      return this.processStripePayment(invoice, paymentMethod);
    } else if (paymentMethod.provider === PaymentProvider.PAYSTACK) {
      return this.processPaystackPayment(invoice, paymentMethod);
    }

    throw new BadRequestException('Unsupported payment provider');
  }

  /**
   * Process payment via Stripe
   */
  private async processStripePayment(invoice: any, paymentMethod: any) {
    this.logger.log(`Processing Stripe payment for invoice: ${invoice.id}`);

    try {
      const subscription = invoice.subscription;

      if (!subscription.stripeCustomerId) {
        throw new BadRequestException('Stripe customer not found');
      }

      // Create payment intent
      const paymentIntent = await this.stripeProvider.createPaymentIntent({
        amount: parseFloat(invoice.total.toString()),
        currency: invoice.currency,
        customerId: subscription.stripeCustomerId,
        invoiceId: invoice.id,
        metadata: {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
        },
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethodId: paymentMethod.id,
          amount: invoice.total,
          currency: invoice.currency,
          status: PaymentStatus.PROCESSING,
          provider: PaymentProvider.STRIPE,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      this.logger.log(`Created payment record: ${payment.id}`);

      return {
        payment,
        clientSecret: paymentIntent.client_secret,
        requiresAction: paymentIntent.status === 'requires_action',
      };
    } catch (error) {
      this.logger.error('Stripe payment processing failed', error);
      throw new BadRequestException('Payment processing failed');
    }
  }

  /**
   * Process payment via Paystack
   */
  private async processPaystackPayment(invoice: any, paymentMethod: any): Promise<{
    payment: any;
    transaction: any;
    status: string;
  }> {
    this.logger.log(`Processing Paystack payment for invoice: ${invoice.id}`);

    try {
      const subscription = invoice.subscription;

      if (!subscription.paystackCustomerCode) {
        throw new BadRequestException('Paystack customer not found');
      }

      if (!paymentMethod.paystackAuthorizationCode) {
        throw new BadRequestException('Paystack authorization not found');
      }

      const amountInKobo = this.paystackProvider.toKobo(
        parseFloat(invoice.total.toString()),
      );

      const reference = this.paystackProvider.generateReference('PAY');

      // Charge the authorization
      const transaction = await this.paystackProvider.chargeAuthorization({
        authorizationCode: paymentMethod.paystackAuthorizationCode,
        email: subscription.organization.email || 'billing@example.com',
        amount: amountInKobo,
        reference,
        metadata: {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
        },
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethodId: paymentMethod.id,
          amount: invoice.total,
          currency: invoice.currency,
          status:
            transaction.status === 'success'
              ? PaymentStatus.SUCCEEDED
              : PaymentStatus.PENDING,
          provider: PaymentProvider.PAYSTACK,
          paystackReference: transaction.reference,
        },
      });

      // If payment succeeded, mark invoice as paid
      if (transaction.status === 'success') {
        await this.invoiceService.markAsPaid(invoice.id, payment.id);
      }

      this.logger.log(`Created payment record: ${payment.id}`);

      return {
        payment,
        transaction,
        status: transaction.status,
      };
    } catch (error) {
      this.logger.error('Paystack payment processing failed', error);
      throw new BadRequestException('Payment processing failed');
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentId: string) {
    this.logger.log(`Handling successful payment: ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
      },
    });

    // Mark invoice as paid
    await this.invoiceService.markAsPaid(payment.invoiceId, paymentId);

    this.logger.log(`Payment successful: ${paymentId}`);

    return payment;
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(paymentId: string, reason: string) {
    this.logger.log(`Handling failed payment: ${paymentId}`);

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: reason,
      },
      include: {
        invoice: true,
      },
    });

    this.logger.warn(`Payment failed: ${paymentId} - ${reason}`);

    // TODO: Send notification to customer about failed payment

    return payment;
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ) {
    this.logger.log(`Refunding payment: ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Can only refund successful payments');
    }

    try {
      if (payment.provider === PaymentProvider.STRIPE) {
        // Stripe refund
        if (!payment.stripePaymentIntentId) {
          throw new BadRequestException('Stripe payment intent ID not found');
        }

        // TODO: Implement Stripe refund
        this.logger.warn('Stripe refund not yet implemented');
      } else if (payment.provider === PaymentProvider.PAYSTACK) {
        // Paystack refund
        if (!payment.paystackReference) {
          throw new BadRequestException('Paystack reference not found');
        }

        const amountInKobo = amount
          ? this.paystackProvider.toKobo(amount)
          : undefined;

        await this.paystackProvider.createRefund({
          transactionReference: payment.paystackReference,
          amount: amountInKobo,
          customerNote: reason,
        });
      }

      // Update payment status
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          metadata: {
            ...(typeof payment.metadata === 'object' ? payment.metadata : {}),
            refundReason: reason,
            refundedAt: new Date().toISOString(),
            refundAmount: amount || payment.amount,
          },
        },
      });

      this.logger.log(`Refunded payment: ${paymentId}`);

      return updatedPayment;
    } catch (error) {
      this.logger.error('Refund failed', error);
      throw new BadRequestException('Refund processing failed');
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            subscription: {
              include: {
                organization: true,
              },
            },
          },
        },
        paymentMethod: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * List payments for an organization
   */
  async listPayments(organizationId: string, filters?: {
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    // Get subscription first
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      return [];
    }

    return this.prisma.payment.findMany({
      where: {
        invoice: {
          subscriptionId: subscription.id,
        },
        status: filters?.status,
        createdAt: {
          gte: filters?.startDate,
          lte: filters?.endDate,
        },
      },
      include: {
        invoice: true,
        paymentMethod: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
