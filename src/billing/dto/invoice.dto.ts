export class PayInvoiceDto {
  paymentMethodId?: string;
}

export class WebhookEventDto {
  type: string;
  data: Record<string, any>;
  signature?: string;
}
