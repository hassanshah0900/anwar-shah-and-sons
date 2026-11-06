import { INestApplication } from '@nestjs/common';
import { dashboardSchema, DASHBOARD_DAYS, type Dashboard } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

const TIME_ZONE = 'Asia/Karachi'; // The default STORE_TIMEZONE.
const SHIPPING = 250; // vitest.config.e2e.ts
const DAY = 86_400_000;

/** A date as YYYY-MM-DD in the store's time zone. */
const localDate = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });

describe('Admin dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: ReturnType<typeof adminApi>;
  let customer: string[];
  let productId: string;
  const variant: Record<string, string> = {};

  const dashboard = async (): Promise<Dashboard> =>
    dashboardSchema.parse((await admin.get('/dashboard').expect(200)).body);

  /** An order written straight to the database, for dates the API can't produce. */
  const pastOrder = (createdAt: Date, total: number, status: 'pending' | 'cancelled' = 'pending') =>
    prisma.order.create({
      data: {
        email: 'past@example.com',
        status,
        paymentMethod: 'cod',
        currency: 'PKR',
        subtotal: total,
        shipping: 0,
        total,
        fullName: 'Past Customer',
        phone: '+92 300 0000000',
        line1: '1 Old Road',
        city: 'Lahore',
        createdAt,
      },
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await prisma.order.deleteMany();
    await prisma.cart.deleteMany();
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    admin = adminApi(app, await signUpAs(app, 'dashboard-admin@example.com', 'admin'));
    customer = await signUpAs(app, 'dashboard-customer@example.com');

    const categoryId = (await admin.post('/categories', { name: 'Shawls' }).expect(201)).body.id;
    const size = (await admin.post('/option-types', { name: 'Size', kind: 'text' }).expect(201))
      .body;
    productId = (
      await admin
        .post('/products', {
          name: 'Pashmina Shawl',
          categoryId,
          price: 3000,
          optionTypeIds: [size.id],
        })
        .expect(201)
    ).body.id;
    for (const [key, label, stock] of [
      ['scarce', 'S', 3],
      ['plenty', 'L', 50],
    ] as const) {
      const valueId = (await admin.post(`/option-types/${size.id}/values`, { label }).expect(201))
        .body.id;
      await admin
        .post(`/products/${productId}/variants`, {
          sku: `shawl-${label}`,
          stock,
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

  const placeOrder = async (variantId: string, quantity: number) => {
    const call = (method: 'post', path: string) =>
      request(app.getHttpServer())
        [method](`/api/v1${path}`)
        .set('Cookie', customer)
        .set('Origin', WEB_ORIGIN);
    await call('post', '/cart/items').send({ variantId, quantity }).expect(201);
    const response = await call('post', '/checkout')
      .send({
        address: {
          fullName: 'Ayesha Khan',
          phone: '+92 300 1234567',
          line1: '12 Mall Road',
          city: 'Lahore',
        },
        expectedTotal: 3000 * quantity + SHIPPING,
      })
      .expect(201);
    return response.body.number as number;
  };

  it('is for admins only', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', customer)
      .expect(403);
  });

  it('starts empty, with every day of the period listed', async () => {
    const result = await dashboard();

    expect(result).toMatchObject({
      currency: 'PKR',
      timeZone: TIME_ZONE,
      today: { orders: 0, revenue: 0 },
      period: { orders: 0, revenue: 0, averageOrderValue: 0 },
      pendingOrders: 0,
      toShip: 0,
      recentOrders: [],
    });
    expect(result.daily).toHaveLength(DASHBOARD_DAYS);
    expect(result.daily.at(-1)!.date).toBe(localDate(new Date()));
  });

  it('adds up orders by local day, leaving out cancelled ones and older days', async () => {
    const first = await placeOrder(variant.scarce!, 2); // 6,250
    const second = await placeOrder(variant.plenty!, 1); // 3,250
    await placeOrder(variant.plenty!, 1); // 3,250, cancelled below
    const cancelled = (await prisma.order.findFirstOrThrow({ orderBy: { number: 'desc' } })).number;
    await admin.patch(`/orders/${cancelled}`, { status: 'cancelled' }).expect(200);
    await admin.patch(`/orders/${second}`, { status: 'confirmed' }).expect(200);

    const tenDaysAgo = new Date(Date.now() - 10 * DAY);
    await pastOrder(tenDaysAgo, 5000);
    await pastOrder(tenDaysAgo, 9999, 'cancelled');
    await pastOrder(new Date(Date.now() - (DASHBOARD_DAYS + 5) * DAY), 7000);

    const result = await dashboard();

    expect(result.today).toEqual({ orders: 2, revenue: 6250 + 3250 });
    expect(result.daily.find((day) => day.date === localDate(tenDaysAgo))).toMatchObject({
      orders: 1,
      revenue: 5000,
    });
    expect(result.period).toEqual({
      orders: 3,
      revenue: 6250 + 3250 + 5000,
      averageOrderValue: Math.round((6250 + 3250 + 5000) / 3),
    });
    // The first order and both past pending orders wait for confirmation; the second awaits shipping.
    expect(result.pendingOrders).toBe(3);
    expect(result.toShip).toBe(1);
    expect(result.recentOrders[0]!.number).toBeGreaterThan(first);
  });

  it('lists low-stock variants of active products, emptiest first', async () => {
    const result = await dashboard();

    // The scarce size started at 3 and 2 were ordered.
    expect(result.lowStock).toEqual([
      {
        productId,
        productName: 'Pashmina Shawl',
        variantLabel: 'Size: S',
        sku: expect.any(String),
        stock: 1,
      },
    ]);
    expect(result.lowStockCount).toBe(1);

    await admin.patch(`/products/${productId}`, { status: 'draft' }).expect(200);
    try {
      expect((await dashboard()).lowStock).toEqual([]);
    } finally {
      await admin.patch(`/products/${productId}`, { status: 'active' }).expect(200);
    }
  });
});
