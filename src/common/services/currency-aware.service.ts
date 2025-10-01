import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrencyService } from './currency.service';
import { Currency } from '@prisma/client';

@Injectable()
export abstract class CurrencyAwareService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly currencyService: CurrencyService,
  ) {}

  /**
   * Get organization currency
   */
  protected async getOrganizationCurrency(organizationId: string): Promise<Currency> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    return organization.currency;
  }

  /**
   * Convert amount to organization currency
   */
  protected async convertToOrganizationCurrency(
    amount: number,
    fromCurrency: Currency,
    organizationId: string,
  ): Promise<number> {
    const organizationCurrency = await this.getOrganizationCurrency(organizationId);
    
    if (fromCurrency === organizationCurrency) {
      return amount;
    }

    const conversion = this.currencyService.convertAmount(
      amount,
      fromCurrency,
      organizationCurrency,
    );

    return conversion.convertedAmount;
  }

  /**
   * Convert amount from organization currency to target currency
   */
  protected async convertFromOrganizationCurrency(
    amount: number,
    organizationId: string,
    toCurrency: Currency,
  ): Promise<number> {
    const organizationCurrency = await this.getOrganizationCurrency(organizationId);
    
    if (organizationCurrency === toCurrency) {
      return amount;
    }

    const conversion = this.currencyService.convertAmount(
      amount,
      organizationCurrency,
      toCurrency,
    );

    return conversion.convertedAmount;
  }

  /**
   * Format amount in organization currency
   */
  protected async formatOrganizationAmount(
    amount: number,
    organizationId: string,
  ): Promise<string> {
    const organizationCurrency = await this.getOrganizationCurrency(organizationId);
    return this.currencyService.formatAmount(amount, organizationCurrency);
  }

  /**
   * Get organization currency info
   */
  protected async getOrganizationCurrencyInfo(organizationId: string) {
    const organizationCurrency = await this.getOrganizationCurrency(organizationId);
    return this.currencyService.getCurrencyInfo(organizationCurrency);
  }
}
