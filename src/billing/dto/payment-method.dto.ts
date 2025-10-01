import { PaymentMethodType, PaymentProvider } from '@prisma/client';

export class CreatePaymentMethodDto {
  type: PaymentMethodType;
  provider: PaymentProvider;
  stripePaymentMethodId?: string;
  paystackAuthorizationCode?: string;
  setAsDefault?: boolean;
}

export class UpdatePaymentMethodDto {
  isDefault: boolean;
}
