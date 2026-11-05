export type PaymentLine = {
  name: string;
  description?: string;
  /** In the store's minor unit, like every amount in this app. */
  unitAmount: number;
  quantity: number;
};

export type NewPaymentSession = {
  /** Makes retries of the same request return the same session. */
  idempotencyKey: string;
  orderNumber: number;
  email: string;
  currency: string;
  lines: PaymentLine[];
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
};

export type PaymentSession = {
  id: string;
  /** Where the customer pays; only present while the session is open. */
  url: string | null;
  status: 'open' | 'complete' | 'expired';
  paid: boolean;
  paymentIntentId: string | null;
};

/** Takes card payments on a hosted page, so card details never reach this app. */
export abstract class PaymentGateway {
  abstract createSession(input: NewPaymentSession): Promise<PaymentSession>;
  abstract getSession(id: string): Promise<PaymentSession>;
  /** Stops a session being paid. */
  abstract expireSession(id: string): Promise<void>;
  abstract refund(paymentIntentId: string, idempotencyKey: string): Promise<void>;
  /**
   * Checks a webhook call's signature (throws if it's wrong) and returns the
   * session it's about, or null for events this app doesn't use.
   */
  abstract parseWebhook(rawBody: Buffer, signature: string): string | null;
}

/** Used when no Stripe key is set. The store doesn't offer cards, so this isn't reached. */
export class UnavailablePaymentGateway extends PaymentGateway {
  private unavailable(): never {
    throw new Error('Card payments are not configured');
  }
  createSession = (): Promise<PaymentSession> => this.unavailable();
  getSession = (): Promise<PaymentSession> => this.unavailable();
  expireSession = (): Promise<void> => this.unavailable();
  refund = (): Promise<void> => this.unavailable();
  parseWebhook = (): string | null => this.unavailable();
}
