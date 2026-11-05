import { fromMinorUnits } from '@repo/shared';
import Stripe from 'stripe';
import { PaymentGateway, type NewPaymentSession, type PaymentSession } from './payment-gateway.js';

// https://docs.stripe.com/currencies#minor-units
const ZERO_DECIMAL = new Set(
  'BIF CLP DJF GNF JPY KMF KRW MGA PYG RWF UGX VND VUV XAF XOF XPF'.split(' '),
);
const THREE_DECIMAL = new Set('BHD JOD KWD OMR TND'.split(' '));

/**
 * Stripe's unit for a currency isn't always the store's: PKR has no minor unit
 * in the store (Rs 4,990 is 4990) but two decimals at Stripe (499000).
 */
export function toStripeAmount(minor: number, currency: string): number {
  const code = currency.toUpperCase();
  const exponent = ZERO_DECIMAL.has(code) ? 0 : THREE_DECIMAL.has(code) ? 3 : 2;
  return Math.round(fromMinorUnits(minor, code) * 10 ** exponent);
}

export class StripeGateway extends PaymentGateway {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string | undefined,
  ) {
    super();
    this.stripe = new Stripe(secretKey);
  }

  async createSession(input: NewPaymentSession): Promise<PaymentSession> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        // Cards settle at once, so a completed session is always a paid one.
        allowed_payment_method_types: ['card'],
        customer_email: input.email,
        client_reference_id: String(input.orderNumber),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1000),
        line_items: input.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: toStripeAmount(line.unitAmount, input.currency),
            product_data: {
              name: line.name,
              ...(line.description ? { description: line.description } : {}),
            },
          },
        })),
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return toSession(session);
  }

  async getSession(id: string): Promise<PaymentSession> {
    return toSession(await this.stripe.checkout.sessions.retrieve(id));
  }

  async expireSession(id: string): Promise<void> {
    await this.stripe.checkout.sessions.expire(id);
  }

  async refund(paymentIntentId: string, idempotencyKey: string): Promise<void> {
    try {
      await this.stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey });
    } catch (error) {
      // The money is already back, e.g. refunded by hand in Stripe's dashboard.
      if (error instanceof Stripe.errors.StripeError && error.code === 'charge_already_refunded') {
        return;
      }
      throw error;
    }
  }

  parseWebhook(rawBody: Buffer, signature: string): string | null {
    if (!this.webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    return event.type === 'checkout.session.completed' || event.type === 'checkout.session.expired'
      ? event.data.object.id
      : null;
  }
}

function toSession(session: Stripe.Checkout.Session): PaymentSession {
  const intent = session.payment_intent;
  return {
    id: session.id,
    url: session.url,
    status:
      session.status === 'complete'
        ? 'complete'
        : session.status === 'expired'
          ? 'expired'
          : 'open',
    paid: session.payment_status === 'paid',
    paymentIntentId: typeof intent === 'string' ? intent : (intent?.id ?? null),
  };
}
