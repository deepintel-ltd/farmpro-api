import { Injectable, Logger } from '@nestjs/common';
import { Currency } from '@prisma/client';

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  lastUpdated: Date;
}

export interface CurrencyConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  exchangeRate: number;
  convertedAt: Date;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  
  // Fixed exchange rates as per billing plan (1 USD = 1000 NGN)
  private readonly exchangeRates: Record<string, number> = {
    'USD_NGN': 1000,
    'NGN_USD': 0.001,
  };

  /**
   * Convert amount from one currency to another
   */
  convertAmount(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): CurrencyConversionResult {
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        convertedAt: new Date(),
      };
    }

    const rateKey = `${fromCurrency}_${toCurrency}`;
    const exchangeRate = this.exchangeRates[rateKey];

    if (!exchangeRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const convertedAmount = amount * exchangeRate;

    this.logger.log(
      `Converted ${amount} ${fromCurrency} to ${convertedAmount} ${toCurrency} (rate: ${exchangeRate})`
    );

    return {
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      fromCurrency,
      toCurrency,
      exchangeRate,
      convertedAt: new Date(),
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  getExchangeRate(fromCurrency: Currency, toCurrency: Currency): number {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = this.exchangeRates[rateKey];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return rate;
  }

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount: number, currency: Currency): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === Currency.USD ? 'USD' : 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  }

  /**
   * Format amount with currency code
   */
  formatAmountWithCode(amount: number, currency: Currency): string {
    return `${amount.toFixed(2)} ${currency}`;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return [Currency.USD, Currency.NGN];
  }

  /**
   * Check if currency is supported
   */
  isSupportedCurrency(currency: string): currency is Currency {
    return Object.values(Currency).includes(currency as Currency);
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: Currency): string {
    switch (currency) {
      case Currency.USD:
        return '$';
      case Currency.NGN:
        return '₦';
      default:
        return currency;
    }
  }

  /**
   * Get currency name
   */
  getCurrencyName(currency: Currency): string {
    switch (currency) {
      case Currency.USD:
        return 'US Dollar';
      case Currency.NGN:
        return 'Nigerian Naira';
      default:
        return currency;
    }
  }

  /**
   * Convert multiple amounts at once
   */
  convertMultipleAmounts(
    amounts: Array<{ amount: number; currency: Currency }>,
    targetCurrency: Currency,
  ): Array<CurrencyConversionResult> {
    return amounts.map(({ amount, currency }) =>
      this.convertAmount(amount, currency, targetCurrency)
    );
  }

  /**
   * Get currency info for display
   */
  getCurrencyInfo(currency: Currency) {
    return {
      code: currency,
      name: this.getCurrencyName(currency),
      symbol: this.getCurrencySymbol(currency),
      isSupported: this.isSupportedCurrency(currency),
    };
  }
}
