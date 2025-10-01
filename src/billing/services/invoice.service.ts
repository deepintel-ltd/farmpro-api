import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createJsonApiCollection, createJsonApiResource } from '../../common/utils/json-api-response.util';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all invoices for an organization
   */
  async findAll(organizationId: string, filters?: {
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    this.logger.log(`Fetching invoices for organization: ${organizationId}`, filters);

    // First get the subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for organization: ${organizationId}`);
      return [];
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        subscriptionId: subscription.id,
        status: filters?.status,
        createdAt: {
          gte: filters?.startDate,
          lte: filters?.endDate,
        },
      },
      include: {
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Found ${invoices.length} invoices for subscription: ${subscription.id}`);

    const invoiceResources = invoices.map(invoice => ({
      id: invoice.id,
      type: 'invoices',
      attributes: {
        ...invoice,
        subtotal: invoice.subtotal.toFixed(2),
        tax: invoice.tax.toFixed(2),
        total: invoice.total.toFixed(2),
        amountPaid: invoice.amountPaid.toFixed(2),
        amountDue: invoice.amountDue.toFixed(2),
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
    }));

    return createJsonApiCollection(invoiceResources);
  }

  /**
   * Get a single invoice
   */
  async findOne(invoiceId: string, organizationId: string) {
    this.logger.log(`Fetching invoice: ${invoiceId}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: {
            organization: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Verify the invoice belongs to the organization
    if (invoice.subscription.organizationId !== organizationId) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    return createJsonApiResource(
      invoice.id,
      'invoices',
      {
        ...invoice,
        subtotal: invoice.subtotal.toFixed(2),
        tax: invoice.tax.toFixed(2),
        total: invoice.total.toFixed(2),
        amountPaid: invoice.amountPaid.toFixed(2),
        amountDue: invoice.amountDue.toFixed(2),
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      }
    );
  }

  /**
   * Create an invoice for a subscription
   */
  async createInvoice(subscriptionId: string) {
    this.logger.log(`Creating invoice for subscription: ${subscriptionId}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Determine price based on currency
    const subtotal =
      subscription.currency === Currency.USD
        ? subscription.plan.priceUSD
        : subscription.plan.priceNGN;

    const tax = new Decimal(0); // TODO: Calculate tax based on jurisdiction
    const total = new Decimal(subtotal).plus(tax);

    // Create line items
    const lineItems = [
      {
        description: `${subscription.plan.name} - ${subscription.billingInterval}`,
        quantity: 1,
        unitPrice: subtotal.toString(),
        amount: subtotal.toString(),
      },
    ];

    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const invoice = await this.prisma.invoice.create({
      data: {
        subscriptionId,
        invoiceNumber,
        status: InvoiceStatus.OPEN,
        subtotal,
        tax,
        total,
        amountPaid: new Decimal(0),
        amountDue: total,
        currency: subscription.currency,
        dueDate,
        lineItems,
      },
      include: {
        payments: true,
      },
    });

    this.logger.log(`Successfully created invoice: ${invoice.id}`);

    return invoice;
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string, paymentId?: string) {
    this.logger.log(`Marking invoice as paid: ${invoiceId}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        amountPaid: invoice.total,
        amountDue: new Decimal(0),
        paidAt: new Date(),
        paymentIntentId: paymentId,
      },
      include: {
        payments: true,
      },
    });
  }

  /**
   * Get invoice PDF URL (placeholder for now)
   */
  async getInvoicePDF(invoiceId: string, organizationId: string) {
    // Get raw invoice data for PDF generation
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Verify the invoice belongs to the organization
    if (invoice.subscription.organizationId !== organizationId) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // TODO: Implement PDF generation
    // For now, return a placeholder URL
    return {
      url: invoice.pdfUrl || `/api/billing/invoices/${invoiceId}/pdf`,
    };
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const count = await this.prisma.invoice.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }
}
