import { INestApplication } from '@nestjs/common';
import { orderListSchema, orderSchema, type CheckoutInput, type Order } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Mailer, type MailMessage } from '../src/mail/mailer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

// vitest.config.e2e.ts sets shipping to 250, free from 10,000 (PKR has no minor unit).
const SHIPPING = 250;

describe('Checkout and orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: ReturnType<typeof adminApi>;
  let productId: string;
  /** small: 2,000 with 3 in stock; medium: 3,000 with 10 in stock. */
  const variant: Record<string, string> = {};

  const address = {
    fullName: 'Ayesha Khan',
    phone: '+92 300 1234567',
    line1: '12 Mall Road',
    city: 'Lahore',
  };

  const as = (cookies: string[]) => {
    const call = (method: 'get' | 'post' | 'patch', path: string) =>
      request(app.getHttpServer())
        [method](`/api/v1${path}`)
        .set('Cookie', cookies)
        .set('Origin', WEB_ORIGIN);
    return {
      add: (variantId: string, quantity: number) =>
        call('post', '/cart/items').send({ variantId, quantity }).expect(201),
      checkout: (body: Partial<CheckoutInput>) =>
        call('post', '/checkout').send({ address, ...body }),
      get: (path: string) => call('get', path),
    };
  };

  const stockOf = async (variantId: string) =>
    (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
  const setStock = (variantId: string, stock: number) =>
    admin.patch(`/products/${productId}/variants/${variantId}`, { stock }).expect(200);
  const placed = (body: unknown): Order => orderSchema.parse(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await prisma.order.deleteMany();
    await prisma.cart.deleteMany();
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    admin = adminApi(app, await signUpAs(app, 'orders-admin@example.com', 'admin'));

    const categoryId = (await admin.post('/categories', { name: 'Shirts' }).expect(201)).body.id;
    const size = (await admin.post('/option-types', { name: 'Size', kind: 'text' }).expect(201))
      .body;
    const product = (
      await admin
        .post('/products', {
          name: 'Oxford Shirt',
          categoryId,
          price: 2000,
          optionTypeIds: [size.id],
        })
        .expect(201)
    ).body;
    productId = product.id;

    for (const [key, label, stock, price] of [
      ['small', 'S', 3, undefined],
      ['medium', 'M', 10, 3000],
    ] as const) {
      const valueId = (await admin.post(`/option-types/${size.id}/values`, { label }).expect(201))
        .body.id;
      await admin
        .post(`/products/${productId}/variants`, {
          sku: `oxford-${label}`,
          stock,
          price,
          optionValueIds: [valueId],
        })
        .expect(201);
      variant[key] = (
        await prisma.productVariant.findFirstOrThrow({
          where: { productId, optionValues: { some: { optionValueId: valueId } } },
        })
      ).id;
    }
    await admin.patch(`/products/${productId}`, { status: 'active' }).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('needs a signed-in customer', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/checkout')
      .set('Origin', WEB_ORIGIN)
      .send({ address, expectedTotal: 0 })
      .expect(401);
  });

  it('refuses an empty bag', async () => {
    const shopper = as(await signUpAs(app, 'empty@example.com'));
    const response = await shopper.checkout({ expectedTotal: 0 }).expect(400);
    expect(response.body.message).toBe('Your bag is empty');
  });

  it('validates the address', async () => {
    const shopper = as(await signUpAs(app, 'typo@example.com'));
    await shopper.add(variant.small!, 1);
    await shopper
      .checkout({ address: { ...address, phone: 'call me' }, expectedTotal: 2000 + SHIPPING })
      .expect(400);
  });

  it('places an order: copies the lines, takes stock and empties the bag', async () => {
    const shopper = as(await signUpAs(app, 'ayesha@example.com'));
    await shopper.add(variant.small!, 2);

    const order = placed(
      (
        await shopper
          .checkout({ expectedTotal: 4000 + SHIPPING, notes: 'Ring the bell' })
          .expect(201)
      ).body,
    );

    expect(order).toMatchObject({
      status: 'pending',
      paymentMethod: 'cod',
      email: 'ayesha@example.com',
      currency: 'PKR',
      subtotal: 4000,
      shipping: SHIPPING,
      total: 4000 + SHIPPING,
      notes: 'Ring the bell',
      address: { ...address, line2: null, postalCode: null },
      items: [
        {
          productName: 'Oxford Shirt',
          productSlug: 'oxford-shirt',
          variantLabel: 'Size: S',
          unitPrice: 2000,
          quantity: 2,
          lineTotal: 4000,
        },
      ],
    });
    expect(order.number).toBeGreaterThanOrEqual(1001);
    expect(await stockOf(variant.small!)).toBe(1);
    expect((await shopper.get('/cart').expect(200)).body.lines).toEqual([]);

    // A later price change doesn't touch the order.
    await admin.patch(`/products/${productId}`, { price: 2500 }).expect(200);
    const again = placed((await shopper.get(`/orders/${order.number}`).expect(200)).body);
    expect(again.items[0]!.unitPrice).toBe(2000);
    await admin.patch(`/products/${productId}`, { price: 2000 }).expect(200);
    await setStock(variant.small!, 3);
  });

  it('ships free at the threshold', async () => {
    const shopper = as(await signUpAs(app, 'big-spender@example.com'));
    await shopper.add(variant.medium!, 4);

    const order = placed((await shopper.checkout({ expectedTotal: 12000 }).expect(201)).body);
    expect(order).toMatchObject({ subtotal: 12000, shipping: 0, total: 12000 });
    await setStock(variant.medium!, 10);
  });

  it('refuses a total the shopper didn’t see, changing nothing', async () => {
    const shopper = as(await signUpAs(app, 'stale@example.com'));
    await shopper.add(variant.small!, 1);

    const response = await shopper.checkout({ expectedTotal: 1 }).expect(409);
    expect(response.body.message).toBe('Prices have changed. Please review your bag.');
    expect(await stockOf(variant.small!)).toBe(3);
    expect((await shopper.get('/cart').expect(200)).body.itemCount).toBe(1);
  });

  it('refuses items that sold out after they were added', async () => {
    const shopper = as(await signUpAs(app, 'late@example.com'));
    await shopper.add(variant.small!, 2);
    await shopper.add(variant.medium!, 1);
    await setStock(variant.small!, 1);

    await shopper.checkout({ expectedTotal: 4000 + 3000 + SHIPPING }).expect(409);
    // The whole order failed, so the medium shirt was not taken either.
    expect(await stockOf(variant.medium!)).toBe(10);
    expect((await shopper.get('/cart').expect(200)).body.itemCount).toBe(3);
    await setStock(variant.small!, 3);
  });

  it('refuses unpublished products', async () => {
    const shopper = as(await signUpAs(app, 'draft@example.com'));
    await shopper.add(variant.small!, 1);
    await admin.patch(`/products/${productId}`, { status: 'draft' }).expect(200);
    try {
      await shopper.checkout({ expectedTotal: 2000 + SHIPPING }).expect(409);
    } finally {
      await admin.patch(`/products/${productId}`, { status: 'active' }).expect(200);
    }
  });

  it('shows customers only their own orders', async () => {
    const owner = as(await signUpAs(app, 'owner@example.com'));
    await owner.add(variant.small!, 1);
    const order = placed(
      (await owner.checkout({ expectedTotal: 2000 + SHIPPING }).expect(201)).body,
    );

    const mine = orderListSchema.parse((await owner.get('/orders').expect(200)).body);
    expect(mine.orders.map((summary) => summary.number)).toEqual([order.number]);
    expect(mine.orders[0]).toMatchObject({ itemCount: 1, customerName: 'Ayesha Khan' });

    const stranger = as(await signUpAs(app, 'stranger@example.com'));
    await stranger.get(`/orders/${order.number}`).expect(404);
    expect(orderListSchema.parse((await stranger.get('/orders').expect(200)).body).total).toBe(0);
    await stranger.get('/admin/orders').expect(403);
    await owner.get('/orders/not-a-number').expect(400);
  });

  it('lets admins list orders and move them through their statuses', async () => {
    await setStock(variant.small!, 3);
    const shopper = as(await signUpAs(app, 'status@example.com'));
    await shopper.add(variant.small!, 2);
    const { number } = placed(
      (await shopper.checkout({ expectedTotal: 4000 + SHIPPING }).expect(201)).body,
    );
    expect(await stockOf(variant.small!)).toBe(1);

    const pending = orderListSchema.parse(
      (await admin.get('/orders?status=pending').expect(200)).body,
    );
    expect(pending.orders.map((summary) => summary.number)).toContain(number);
    expect(pending.orders.every((summary) => summary.status === 'pending')).toBe(true);

    const skip = await admin.patch(`/orders/${number}`, { status: 'shipped' }).expect(409);
    expect(skip.body.message).toBe("A pending order can't be marked shipped");

    await admin.patch(`/orders/${number}`, { status: 'confirmed' }).expect(200);
    const cancelled = placed(
      (await admin.patch(`/orders/${number}`, { status: 'cancelled' }).expect(200)).body,
    );
    expect(cancelled.status).toBe('cancelled');
    // Cancelling returns the items to stock, once.
    expect(await stockOf(variant.small!)).toBe(3);
    await admin.patch(`/orders/${number}`, { status: 'cancelled' }).expect(200);
    expect(await stockOf(variant.small!)).toBe(3);
    await admin.patch(`/orders/${number}`, { status: 'confirmed' }).expect(409);

    await admin.get('/orders/999999').expect(404);
  });

  it('emails the customer when the order is placed, shipped or cancelled', async () => {
    const sent: MailMessage[] = [];
    vi.spyOn(app.get(Mailer), 'send').mockImplementation(async (message) => {
      sent.push(message);
    });
    await setStock(variant.small!, 3);
    const shopper = as(await signUpAs(app, 'mailbox@example.com'));

    const subjects = async (count: number) => {
      await vi.waitFor(() => expect(sent).toHaveLength(count));
      return sent.map((message) => message.subject);
    };

    await shopper.add(variant.small!, 1);
    const first = placed(
      (await shopper.checkout({ expectedTotal: 2000 + SHIPPING }).expect(201)).body,
    );
    expect(await subjects(1)).toEqual([`Order #${first.number} received`]);
    expect(sent[0]).toMatchObject({ to: 'mailbox@example.com' });
    expect(sent[0]!.text).toContain(`http://localhost:3000/account/orders/${first.number}`);

    // Confirming is internal; shipping is worth telling the customer about.
    await admin.patch(`/orders/${first.number}`, { status: 'confirmed' }).expect(200);
    await admin.patch(`/orders/${first.number}`, { status: 'shipped' }).expect(200);
    expect(await subjects(2)).toContain(`Order #${first.number} is on its way`);

    await shopper.add(variant.small!, 1);
    const second = placed(
      (await shopper.checkout({ expectedTotal: 2000 + SHIPPING }).expect(201)).body,
    );
    await admin.patch(`/orders/${second.number}`, { status: 'cancelled' }).expect(200);
    // Repeating a status change sends nothing new.
    await admin.patch(`/orders/${second.number}`, { status: 'cancelled' }).expect(200);
    expect(await subjects(4)).toEqual([
      `Order #${first.number} received`,
      `Order #${first.number} is on its way`,
      `Order #${second.number} received`,
      `Order #${second.number} was cancelled`,
    ]);
  });

  it('lets customers cancel their own orders until they ship', async () => {
    const sent: MailMessage[] = [];
    vi.spyOn(app.get(Mailer), 'send').mockImplementation(async (message) => {
      sent.push(message);
    });
    await setStock(variant.medium!, 10);
    const cookies = await signUpAs(app, 'canceller@example.com');
    const shopper = as(cookies);
    const cancel = (number: number, who = cookies) =>
      request(app.getHttpServer())
        .post(`/api/v1/orders/${number}/cancel`)
        .set('Cookie', who)
        .set('Origin', WEB_ORIGIN);
    const order = async () => {
      await shopper.add(variant.medium!, 2);
      return placed((await shopper.checkout({ expectedTotal: 6000 + SHIPPING }).expect(201)).body)
        .number;
    };

    // A pending order goes back into stock, and repeating it changes nothing.
    const pending = await order();
    expect(await stockOf(variant.medium!)).toBe(8);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect((await cancel(pending).expect(200)).body.status).toBe('cancelled');
    await cancel(pending).expect(200);
    expect(await stockOf(variant.medium!)).toBe(10);
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]!.subject).toBe(`Order #${pending} was cancelled`);

    // Nobody else can, and being signed in is required.
    const other = await order();
    await cancel(other, await signUpAs(app, 'not-the-canceller@example.com')).expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${other}/cancel`)
      .set('Origin', WEB_ORIGIN)
      .expect(401);
    expect(await stockOf(variant.medium!)).toBe(8);

    // A confirmed order still can; a shipped one can't.
    await admin.patch(`/orders/${other}`, { status: 'confirmed' }).expect(200);
    await cancel(other).expect(200);

    const shipped = await order();
    await admin.patch(`/orders/${shipped}`, { status: 'confirmed' }).expect(200);
    await admin.patch(`/orders/${shipped}`, { status: 'shipped' }).expect(200);
    const refused = await cancel(shipped).expect(409);
    expect(refused.body.message).toContain("can't be cancelled");
    expect(await stockOf(variant.medium!)).toBe(8);
  });

  it('saves the address to the book when asked, once', async () => {
    await setStock(variant.small!, 3);
    const cookies = await signUpAs(app, 'saver@example.com');
    const shopper = as(cookies);
    const book = () =>
      request(app.getHttpServer()).get('/api/v1/addresses').set('Cookie', cookies).expect(200);

    await shopper.add(variant.small!, 1);
    await shopper.checkout({ expectedTotal: 2000 + SHIPPING }).expect(201);
    expect((await book()).body.addresses).toEqual([]);

    for (let order = 0; order < 2; order++) {
      await shopper.add(variant.small!, 1);
      await shopper.checkout({ expectedTotal: 2000 + SHIPPING, saveAddress: true }).expect(201);
    }
    // The same address used twice is saved once, as the default.
    expect((await book()).body.addresses).toEqual([
      expect.objectContaining({ line1: address.line1, isDefault: true }),
    ]);
  });
});
