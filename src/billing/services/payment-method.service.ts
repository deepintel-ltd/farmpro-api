import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentMethodDto } from '../dto/payment-method.dto';
import { PaymentProvider } from '@prisma/client';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all payment methods for an organization
   */
  async findAll(organizationId: string) {
    this.logger.log(`Fetching payment methods for organization: ${organizationId}`);

    return this.prisma.paymentMethod.findMany({
      where: { organizationId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get a single payment method
   */
  async findOne(id: string, organizationId: string) {
    this.logger.log(`Fetching payment method: ${id}`);

    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    // Verify ownership
    if (paymentMethod.organizationId !== organizationId) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    return paymentMethod;
  }

  /**
   * Create a new payment method
   */
  async create(organizationId: string, dto: CreatePaymentMethodDto) {
    this.logger.log(`Creating payment method for organization: ${organizationId}`, {
      type: dto.type,
      provider: dto.provider,
    });

    // Validate provider-specific fields
    if (dto.provider === PaymentProvider.STRIPE && !dto.stripePaymentMethodId) {
      throw new BadRequestException(
        'stripePaymentMethodId is required for Stripe payment methods',
      );
    }

    if (
      dto.provider === PaymentProvider.PAYSTACK &&
      !dto.paystackAuthorizationCode
    ) {
      throw new BadRequestException(
        'paystackAuthorizationCode is required for Paystack payment methods',
      );
    }

    // If setAsDefault is true, unset other default payment methods
    if (dto.setAsDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: {
          organizationId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create payment method
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        organizationId,
        type: dto.type,
        provider: dto.provider,
        stripePaymentMethodId: dto.stripePaymentMethodId,
        paystackAuthorizationCode: dto.paystackAuthorizationCode,
        isDefault: dto.setAsDefault ?? false,
        // Card details would be populated from payment provider webhook/response
      },
    });

    this.logger.log(`Successfully created payment method: ${paymentMethod.id}`);

    return paymentMethod;
  }

  /**
   * Set a payment method as default
   */
  async setDefault(id: string, organizationId: string) {
    this.logger.log(`Setting payment method as default: ${id}`);

    // Verify the payment method exists and belongs to the organization
    await this.findOne(id, organizationId);

    // Unset other default payment methods
    await this.prisma.paymentMethod.updateMany({
      where: {
        organizationId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this payment method as default
    const paymentMethod = await this.prisma.paymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });

    this.logger.log(`Successfully set payment method as default: ${id}`);

    return paymentMethod;
  }

  /**
   * Delete a payment method
   */
  async delete(id: string, organizationId: string) {
    this.logger.log(`Deleting payment method: ${id}`);

    // Verify the payment method exists and belongs to the organization
    await this.findOne(id, organizationId);

    // Check if it's being used by any active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        organizationId,
        paymentMethodId: id,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        'Cannot delete payment method that is being used by an active subscription',
      );
    }

    // Delete the payment method
    await this.prisma.paymentMethod.delete({
      where: { id },
    });

    this.logger.log(`Successfully deleted payment method: ${id}`);

    return { success: true };
  }

  /**
   * Get default payment method
   */
  async getDefault(organizationId: string) {
    const defaultMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        organizationId,
        isDefault: true,
      },
    });

    return defaultMethod;
  }

  /**
   * Update payment method details from provider response
   * (Called from webhook handlers)
   */
  async updateFromProvider(
    id: string,
    data: {
      cardLast4?: string;
      cardBrand?: string;
      cardExpMonth?: number;
      cardExpYear?: number;
      bankName?: string;
      accountLast4?: string;
    },
  ) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }
}
