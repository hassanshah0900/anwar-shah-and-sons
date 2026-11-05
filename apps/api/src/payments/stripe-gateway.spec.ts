import Stripe from 'stripe';
import { StripeGateway, toStripeAmount } from './stripe-gateway.js';

describe('toStripeAmount', () => {
  it.each([
    [4990, 'PKR', 499000], // No minor unit in the store, two decimals at Stripe.
    [4990, 'USD', 4990],
    [4990, 'JPY', 4990],
    [4990, 'KWD', 4990],
  ])('converts %i %s to %i', (minor, currency, expected) => {
    expect(toStripeAmount(minor, currency)).toBe(expected);
  });
});

describe('StripeGateway.refund', () => {
  const gateway = new StripeGateway('sk_test_unused', undefined);
  const stripeError = (code: string) =>
    Stripe.errors.StripeError.generate({ type: 'invalid_request_error', code, message: code });
  const failWith = (error: Error) =>
    vi
      .spyOn((gateway as unknown as { stripe: Stripe }).stripe.refunds, 'create')
      .mockRejectedValue(error);

  it('counts a charge that was already refunded as done', async () => {
    failWith(stripeError('charge_already_refunded'));
    await expect(gateway.refund('pi_1', 'key')).resolves.toBeUndefined();
  });

  it('passes on other failures', async () => {
    failWith(stripeError('rate_limit'));
    await expect(gateway.refund('pi_1', 'key')).rejects.toThrow('rate_limit');
  });
});

describe('StripeGateway.parseWebhook', () => {
  const secret = 'whsec_test';
  const gateway = new StripeGateway('sk_test_unused', secret);

  const event = (type: string) =>
    JSON.stringify({ id: 'evt_1', object: 'event', type, data: { object: { id: 'cs_1' } } });
  const signed = (payload: string, key = secret) =>
    Stripe.webhooks.generateTestHeaderString({ payload, secret: key });

  it.each(['checkout.session.completed', 'checkout.session.expired'])('reads %s', (type) => {
    const payload = event(type);
    expect(gateway.parseWebhook(Buffer.from(payload), signed(payload))).toBe('cs_1');
  });

  it('ignores other events', () => {
    const payload = event('customer.created');
    expect(gateway.parseWebhook(Buffer.from(payload), signed(payload))).toBeNull();
  });

  it('rejects a wrong signature', () => {
    const payload = event('checkout.session.completed');
    expect(() =>
      gateway.parseWebhook(Buffer.from(payload), signed(payload, 'whsec_other')),
    ).toThrow();
  });

  it('rejects a changed body', () => {
    const payload = event('checkout.session.completed');
    const tampered = payload.replace('cs_1', 'cs_2');
    expect(() => gateway.parseWebhook(Buffer.from(tampered), signed(payload))).toThrow();
  });
});
