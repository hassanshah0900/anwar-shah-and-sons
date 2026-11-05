import { INestApplication } from '@nestjs/common';
import {
  checkoutResultSchema,
  orderSchema,
  paymentLinkSchema,
  type Order,
  type PaymentMethod,
} from '@repo/shared';
import Stripe from 'stripe';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Mailer, type MailMessage } from '../src/mail/mailer.js';
import { OrderPaymentsJob } from '../src/orders/order-payments.job.js';
import {
  PaymentGateway,
  type NewPaymentSession,
  type PaymentSession,
} from '../src/payments/payment-gateway.js';
import { StripeGateway } from '../src/payments/stripe-gateway.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

const WEBHOOK_SECRET = 'whsec_e2e'; // vitest.config.e2e.ts
const SHIPPING = 250; // vitest.config.e2e.ts
const MINUTE = 60_000;

/** Stripe without the network: webhook signatures are still checked for real. */
class FakeStripe extends StripeGateway {
  sessions = new Map<string, PaymentSession>();
  created: NewPaymentSession[] = [];
  refunds: { paymentIntentId: string; idempotencyKey: string }[] = [];
  expired: string[] = [];
  failNextCreate = false;
  failNextRefund = false;

  constructor() {
    super('sk_test_unused', WEBHOOK_SECRET);
  }

  override async createSession(input: NewPaymentSession): Promise<PaymentSession> {
    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new Error('Stripe is down');
    }
    this.created.push(input);
    const id = `cs_${this.created.length}`;
    const session: PaymentSession = {
      id,
      url: `https://checkout.stripe.test/${id}`,
      status: 'open',
      paid: false,
      paymentIntentId: null,
    };
    this.sessions.set(id, session);
    return session;
  }
  override async getSession(id: string): Promise<PaymentSession> {
    return this.sessions.get(id)!;
  }
  override async expireSession(id: string): Promise<void> {
    this.expired.push(id);
    this.sessions.set(id, { ...this.sessions.get(id)!, status: 'expired', url: null });
  }
  override async refund(paymentIntentId: string, idempotencyKey: string): Promise<void> {
    if (this.failNextRefund) {
      this.failNextRefund = false;
      throw new Error('Stripe is down');
    }
    this.refunds.push({ paymentIntentId, idempotencyKey });
  }

  /** The customer pays on Stripe's page. */
  pay(id: string): void {
    this.sessions.set(id, {
      ...this.sessions.get(id)!,
      status: 'complete',
      paid: true,
      url: null,
      paymentIntentId: `pi_${id}`,
    });
  }
  /** The customer's time runs out. */
  expire(id: string): void {
    this.sessions.set(id, { ...this.sessions.get(id)!, status: 'expired', url: null });
  }
}

describe('Card payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: ReturnType<typeof adminApi>;
  let stripe: FakeStripe;
  let productId: string;
  let variantId: string;
  let sent: MailMessage[];
  let shopperCount = 0;

  const address = {
    fullName: 'Ayesha Khan',
    phone: '+92 300 1234567',
    line1: '12 Mall Road',
    city: 'Lahore',
  };
  const TOTAL = 2000 + SHIPPING;

  const newShopper = async () => {
    const cookies = await signUpAs(app, `payer-${++shopperCount}@example.com`);
    const call = (method: 'get' | 'post', path: string) =>
      request(app.getHttpServer())
        [method](`/api/v1${path}`)
        .set('Cookie', cookies)
        .set('Origin', WEB_ORIGIN);
    return {
      addToBag: () => call('post', '/cart/items').send({ variantId, quantity: 1 }).expect(201),
      checkout: (paymentMethod: PaymentMethod = 'card') =>
        call('post', '/checkout').send({ address, paymentMethod, expectedTotal: TOTAL }),
      bagCount: async () => (await call('get', '/cart').expect(200)).body.itemCount as number,
      order: async (number: number): Promise<Order> =>
        orderSchema.parse((await call('get', `/orders/${number}`).expect(200)).body),
      resume: (number: number) => call('post', `/orders/${number}/payment`),
    };
  };

  /** A shopper with a new card order waiting to be paid. */
  const placeCardOrder = async () => {
    const shopper = await newShopper();
    await shopper.addToBag();
    const result = checkoutResultSchema.parse((await shopper.checkout().expect(201)).body);
    return { shopper, number: result.number, sessionId: `cs_${stripe.created.length}`, result };
  };

  const webhook = (type: string, sessionId: string) => {
    const payload = JSON.stringify({
      id: `evt_${sessionId}`,
      object: 'event',
      type,
      data: { object: { id: sessionId } },
    });
    // Stripe's calls have no Origin header and no session.
    return request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set(
        'Stripe-Signature',
        Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }),
      )
      .send(payload);
  };
  const paid = (sessionId: string) => webhook('checkout.session.completed', sessionId).expect(200);
  const expired = (sessionId: string) => webhook('checkout.session.expired', sessionId).expect(200);

  const stock = async () =>
    (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
  const stored = (number: number) => prisma.order.findUniqueOrThrow({ where: { number } });

  beforeAll(async () => {
    stripe = new FakeStripe();
    app = await createTestApp((builder) =>
      builder.overrideProvider(PaymentGateway).useValue(stripe),
    );
    prisma = app.get(PrismaService);
    await prisma.order.deleteMany();
    await prisma.cart.deleteMany();
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    admin = adminApi(app, await signUpAs(app, 'payments-admin@example.com', 'admin'));

    const categoryId = (await admin.post('/categories', { name: 'Shirts' }).expect(201)).body.id;
    const size = (await admin.post('/option-types', { name: 'Size', kind: 'text' }).expect(201))
      .body;
    productId = (
      await admin
        .post('/products', { name: 'Oxford', categoryId, price: 2000, optionTypeIds: [size.id] })
        .expect(201)
    ).body.id;
    const valueId = (
      await admin.post(`/option-types/${size.id}/values`, { label: 'M' }).expect(201)
    ).body.id;
    await admin
      .post(`/products/${productId}/variants`, {
        sku: 'oxford-m',
        stock: 50,
        optionValueIds: [valueId],
      })
      .expect(201);
    variantId = (await prisma.productVariant.findFirstOrThrow({ where: { productId } })).id;
    await admin.patch(`/products/${productId}`, { status: 'active' }).expect(200);
  });

  beforeEach(() => {
    sent = [];
    vi.spyOn(app.get(Mailer), 'send').mockImplementation(async (message) => {
      sent.push(message);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('holds the stock and sends the customer to pay, without an email yet', async () => {
    const before = await stock();
    const { shopper, result, number } = await placeCardOrder();

    expect(result).toMatchObject({
      status: 'pending',
      paymentMethod: 'card',
      paymentStatus: 'unpaid',
    });
    expect(result.paymentUrl).toMatch(/^https:\/\/checkout\.stripe\.test\//);
    expect(await stock()).toBe(before - 1);
    expect(await shopper.bagCount()).toBe(0);

    expect(stripe.created.at(-1)).toMatchObject({
      orderNumber: number,
      currency: 'PKR',
      successUrl: `http://localhost:3000/account/orders/${number}?paid=1`,
      cancelUrl: `http://localhost:3000/account/orders/${number}`,
      lines: [
        { name: 'Oxford', description: 'Size: M', unitAmount: 2000, quantity: 1 },
        { name: 'Shipping', unitAmount: SHIPPING, quantity: 1 },
      ],
    });
    expect(sent).toEqual([]);
  });

  it('won’t let an admin confirm an unpaid order', async () => {
    const { number } = await placeCardOrder();
    await admin.patch(`/orders/${number}`, { status: 'confirmed' }).expect(409);
  });

  it('confirms the order and emails once when Stripe says it’s paid', async () => {
    const { shopper, number, sessionId } = await placeCardOrder();
    stripe.pay(sessionId);

    await paid(sessionId);
    await paid(sessionId); // Stripe may repeat itself.

    expect(await shopper.order(number)).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    expect((await stored(number)).stripePaymentIntentId).toBe(`pi_${sessionId}`);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]!.subject).toBe(`Order #${number} received`);
    expect(sent[0]!.text).toContain("We've received your payment");
  });

  it('doesn’t trust a webhook about a session that isn’t paid', async () => {
    const { shopper, number, sessionId } = await placeCardOrder();
    await paid(sessionId);
    expect((await shopper.order(number)).paymentStatus).toBe('unpaid');
  });

  it('rejects webhooks without a valid signature', async () => {
    const { number, sessionId } = await placeCardOrder();
    stripe.pay(sessionId);
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: sessionId } },
    });

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set(
        'Stripe-Signature',
        Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_wrong' }),
      )
      .send(payload)
      .expect(400);

    expect((await stored(number)).paymentStatus).toBe('unpaid');
  });

  it('ignores events it doesn’t use, and sessions it doesn’t know', async () => {
    await webhook('customer.created', 'cs_other').expect(200);
    await paid('cs_unknown');
  });

  it('shows a returning customer their payment before the webhook arrives', async () => {
    const { shopper, number, sessionId } = await placeCardOrder();
    stripe.pay(sessionId);

    expect(await shopper.order(number)).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    await paid(sessionId);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
  });

  it('cancels and restocks when the time to pay runs out', async () => {
    const { shopper, number, sessionId } = await placeCardOrder();
    const held = await stock();
    stripe.expire(sessionId);

    await expired(sessionId);
    await expired(sessionId);

    expect(await shopper.order(number)).toMatchObject({
      status: 'cancelled',
      paymentStatus: 'unpaid',
    });
    expect(await stock()).toBe(held + 1);
    expect(stripe.refunds).toEqual([]);
    expect(stripe.expired).not.toContain(sessionId);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]!.text).toContain("You haven't been charged");
  });

  it('leaves the bag and stock as they were when Stripe can’t be reached', async () => {
    const shopper = await newShopper();
    await shopper.addToBag();
    const before = await stock();
    stripe.failNextCreate = true;

    const response = await shopper.checkout().expect(503);

    expect(response.body.message).toContain("you haven't been charged");
    expect(await stock()).toBe(before);
    expect(await shopper.bagCount()).toBe(1);
    expect(sent).toEqual([]);
  });

  it('lets the customer return to the payment page, but nobody else', async () => {
    const { shopper, number, sessionId } = await placeCardOrder();

    const link = paymentLinkSchema.parse((await shopper.resume(number).expect(201)).body);
    expect(link.url).toBe(`https://checkout.stripe.test/${sessionId}`);
    await (await newShopper()).resume(number).expect(404);

    stripe.pay(sessionId);
    await shopper.resume(number).expect(409);
    expect((await shopper.order(number)).paymentStatus).toBe('paid');
  });

  it('closes the payment page when an admin cancels an unpaid order', async () => {
    const { number, sessionId } = await placeCardOrder();
    await admin.patch(`/orders/${number}`, { status: 'cancelled' }).expect(200);

    expect(stripe.expired).toContain(sessionId);
    expect(stripe.refunds).toEqual([]);
  });

  it('refunds a payment that arrives after the order was cancelled', async () => {
    const { number, sessionId } = await placeCardOrder();
    const stockBefore = await stock();
    await admin.patch(`/orders/${number}`, { status: 'cancelled' }).expect(200);
    stripe.refunds = [];
    stripe.pay(sessionId);

    await paid(sessionId);

    const order = await stored(number);
    expect(order).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded' });
    expect(stripe.refunds).toEqual([
      { paymentIntentId: `pi_${sessionId}`, idempotencyKey: `refund-${order.id}` },
    ]);
    expect(await stock()).toBe(stockBefore + 1); // Restocked once, by the cancel.
  });

  it('refunds a paid order when it’s cancelled', async () => {
    const { number, sessionId } = await placeCardOrder();
    stripe.pay(sessionId);
    await paid(sessionId);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    stripe.refunds = [];

    const response = await admin.patch(`/orders/${number}`, { status: 'cancelled' }).expect(200);

    expect(response.body.paymentStatus).toBe('refunded');
    expect(stripe.refunds).toHaveLength(1);
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]!.text).toContain('Your payment has been refunded');
  });

  it('still cancels when the refund fails, and shows the order as paid', async () => {
    const { number, sessionId } = await placeCardOrder();
    stripe.pay(sessionId);
    await paid(sessionId);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    stripe.failNextRefund = true;

    const response = await admin.patch(`/orders/${number}`, { status: 'cancelled' }).expect(200);

    expect(response.body).toMatchObject({ status: 'cancelled', paymentStatus: 'paid' });
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]!.text).toContain("We'll refund your payment");
  });

  it('leaves unpaid card orders out of the dashboard until they’re paid', async () => {
    await prisma.order.deleteMany();
    const figures = async () => (await admin.get('/dashboard').expect(200)).body;

    const { sessionId } = await placeCardOrder();
    expect(await figures()).toMatchObject({ pendingOrders: 0, toShip: 0, today: { revenue: 0 } });

    stripe.pay(sessionId);
    await paid(sessionId);
    expect(await figures()).toMatchObject({ toShip: 1, today: { orders: 1, revenue: TOTAL } });
  });

  it('settles overdue orders whose webhooks never came, and only those', async () => {
    const job = app.get(OrderPaymentsJob);
    const age = (number: number) =>
      prisma.order.update({
        where: { number },
        data: { createdAt: new Date(Date.now() - 66 * MINUTE) },
      });

    const unpaid = await placeCardOrder();
    const payer = await placeCardOrder();
    const crashed = await placeCardOrder();
    const recent = await placeCardOrder();
    stripe.expire(unpaid.sessionId);
    stripe.pay(payer.sessionId);
    await prisma.order.update({
      where: { number: crashed.number },
      data: { stripeSessionId: null },
    });
    await Promise.all([unpaid, payer, crashed].map(({ number }) => age(number)));
    const held = await stock();

    expect(await job.run()).toBe(3);

    expect(await stored(unpaid.number)).toMatchObject({ status: 'cancelled' });
    expect(await stored(payer.number)).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    expect(await stored(crashed.number)).toMatchObject({ status: 'cancelled' });
    expect(await stored(recent.number)).toMatchObject({ status: 'pending' });
    expect(await stock()).toBe(held + 2);
    expect(await job.run()).toBe(0);
  });

  it('records cash as paid once a cash order is delivered', async () => {
    const shopper = await newShopper();
    await shopper.addToBag();
    const { number } = (await shopper.checkout('cod').expect(201)).body;

    expect((await stored(number)).paymentStatus).toBe('unpaid');
    for (const status of ['confirmed', 'shipped', 'delivered']) {
      await admin.patch(`/orders/${number}`, { status }).expect(200);
    }
    expect((await stored(number)).paymentStatus).toBe('paid');
  });
});
