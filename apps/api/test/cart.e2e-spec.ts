import { INestApplication } from '@nestjs/common';
import { CART_TOKEN_HEADER, cartMutationSchema, cartSchema, type Cart } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

describe('Cart (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: ReturnType<typeof adminApi>;
  let productId: string;
  /** Variant ids by name: small (stock 3), medium (stock 20, own price), draft. */
  const variant: Record<string, string> = {};

  type Who = { token?: string; cookies?: string[] };

  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, who: Who = {}) => {
    const req = request(app.getHttpServer())
      [method](`/api/v1/cart${path}`)
      .set('Origin', WEB_ORIGIN);
    if (who.token) req.set(CART_TOKEN_HEADER, who.token);
    if (who.cookies) req.set('Cookie', who.cookies);
    return req;
  };
  const getCart = async (who: Who = {}): Promise<Cart> =>
    cartSchema.parse((await call('get', '', who).expect(200)).body);
  const add = (variantId: string, quantity: number, who: Who = {}) =>
    call('post', '/items', who).send({ variantId, quantity });
  /** Adds as a guest and returns the new cart token. */
  const addAsNewGuest = async (variantId: string, quantity = 1): Promise<string> => {
    const { token } = cartMutationSchema.parse((await add(variantId, quantity).expect(201)).body);
    expect(token).toEqual(expect.any(String));
    return token!;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await prisma.cart.deleteMany();
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    admin = adminApi(app, await signUpAs(app, 'cart-admin@example.com', 'admin'));

    const categoryId = (await admin.post('/categories', { name: 'Kurtas' }).expect(201)).body.id;
    const size = (await admin.post('/option-types', { name: 'Size', kind: 'text' }).expect(201))
      .body;
    const value: Record<string, string> = {};
    for (const label of ['S', 'M']) {
      value[label] = (
        await admin.post(`/option-types/${size.id}/values`, { label }).expect(201)
      ).body.id;
    }

    const product = async (name: string, variants: [string, string, number, number?][]) => {
      const created = (
        await admin
          .post('/products', { name, categoryId, price: 4990, optionTypeIds: [size.id] })
          .expect(201)
      ).body;
      for (const [key, label, stock, price] of variants) {
        const sku = `${created.slug}-${label}`;
        await admin
          .post(`/products/${created.id}/variants`, {
            sku,
            stock,
            price,
            optionValueIds: [value[label]],
          })
          .expect(201);
        // The endpoint answers with the whole product; find the new variant by its size.
        variant[key] = (
          await prisma.productVariant.findFirstOrThrow({
            where: {
              productId: created.id,
              optionValues: { some: { optionValueId: value[label] } },
            },
          })
        ).id;
      }
      return created.id as string;
    };

    productId = await product('Lawn Kurta', [
      ['small', 'S', 3],
      ['medium', 'M', 20, 5490],
    ]);
    await admin.patch(`/products/${productId}`, { status: 'active' }).expect(200);
    await product('Secret Draft', [['draft', 'S', 5]]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts empty, without creating a cart', async () => {
    expect(await getCart()).toEqual({ lines: [], itemCount: 0, subtotal: 0 });
    expect(await prisma.cart.count()).toBe(0);
  });

  it('creates a guest cart on the first add and returns its token once', async () => {
    const response = await add(variant.small!, 2).expect(201);
    const { cart, token } = cartMutationSchema.parse(response.body);

    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(cart.lines).toEqual([
      expect.objectContaining({
        variantId: variant.small,
        productId,
        name: 'Lawn Kurta',
        slug: 'lawn-kurta',
        options: [{ name: 'Size', value: 'S' }],
        unitPrice: 4990,
        quantity: 2,
        lineTotal: 9980,
        stockLevel: 'low_stock',
        available: true,
      }),
    ]);
    expect(cart).toMatchObject({ itemCount: 2, subtotal: 9980 });

    // Only the hash is stored; the token itself is the guest's secret.
    const stored = await prisma.cart.findFirstOrThrow({ select: { tokenHash: true } });
    expect(stored.tokenHash).not.toBe(token);

    // The same token reaches the same cart, and later adds return no new token.
    expect((await getCart({ token: token! })).itemCount).toBe(2);
    const again = cartMutationSchema.parse(
      (await add(variant.medium!, 1, { token: token! }).expect(201)).body,
    );
    expect(again.token).toBeNull();
    expect(again.cart).toMatchObject({ itemCount: 3, subtotal: 9980 + 5490 });
  });

  it('adds to an existing line instead of repeating it', async () => {
    const token = await addAsNewGuest(variant.medium!, 2);
    const { cart } = cartMutationSchema.parse(
      (await add(variant.medium!, 3, { token }).expect(201)).body,
    );

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]!.quantity).toBe(5);
  });

  it('refuses more than the stock or the per-item limit', async () => {
    const token = await addAsNewGuest(variant.small!, 3);
    const tooMany = await add(variant.small!, 1, { token }).expect(409);
    expect(tooMany.body.message).toBe('Not enough stock for that quantity');

    await add(variant.medium!, 10, { token }).expect(201);
    const overLimit = await add(variant.medium!, 1, { token }).expect(409);
    expect(overLimit.body.message).toBe('You can buy up to 10 of an item');

    await add(variant.medium!, 11).expect(400);
    await add(variant.medium!, 0).expect(400);
  });

  it('does not sell drafts or unknown variants', async () => {
    await add(variant.draft!, 1).expect(404);
    await add('missing', 1).expect(404);
  });

  it('changes and removes lines', async () => {
    const token = await addAsNewGuest(variant.medium!, 2);
    await addAsNewGuest(variant.small!); // Another guest's cart, untouched below.
    await add(variant.small!, 1, { token }).expect(201);

    const lowered = cartSchema.parse(
      (await call('patch', `/items/${variant.medium}`, { token }).send({ quantity: 1 }).expect(200))
        .body,
    );
    expect(lowered.itemCount).toBe(2);

    await call('patch', `/items/${variant.small}`, { token }).send({ quantity: 4 }).expect(409);

    const removed = cartSchema.parse(
      (await call('patch', `/items/${variant.small}`, { token }).send({ quantity: 0 }).expect(200))
        .body,
    );
    expect(removed.lines.map((line) => line.variantId)).toEqual([variant.medium]);

    const emptied = cartSchema.parse(
      (await call('delete', `/items/${variant.medium}`, { token }).expect(200)).body,
    );
    expect(emptied.lines).toEqual([]);

    // Changing a line that isn't there is a 404; deleting one is a no-op.
    await call('patch', `/items/${variant.medium}`, { token }).send({ quantity: 1 }).expect(404);
    await call('delete', `/items/${variant.medium}`, { token }).expect(200);
  });

  it('treats an unknown token as no cart', async () => {
    expect((await getCart({ token: 'not-a-real-token' })).lines).toEqual([]);
    const { token } = cartMutationSchema.parse(
      (await add(variant.small!, 1, { token: 'not-a-real-token' }).expect(201)).body,
    );
    expect(token).not.toBe('not-a-real-token');
  });

  it('rejects writes from another origin', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Origin', 'https://evil.example')
      .send({ variantId: variant.small, quantity: 1 })
      .expect(403);
  });

  it('keeps a signed-in customer’s cart with their account', async () => {
    const cookies = await signUpAs(app, 'cart-customer@example.com');
    const { token } = cartMutationSchema.parse(
      (await add(variant.medium!, 2, { cookies }).expect(201)).body,
    );

    expect(token).toBeNull();
    expect((await getCart({ cookies })).itemCount).toBe(2);
    expect((await getCart()).itemCount).toBe(0);
  });

  it('gives a guest cart to a customer who signs in without one', async () => {
    const token = await addAsNewGuest(variant.small!, 1);
    const cookies = await signUpAs(app, 'cart-adopter@example.com');

    expect((await getCart({ cookies, token })).itemCount).toBe(1);
    // The cart now belongs to the account; the old token no longer reaches it.
    expect((await getCart({ cookies })).itemCount).toBe(1);
    expect((await getCart({ token })).itemCount).toBe(0);
  });

  it('merges a guest cart into the customer’s cart, up to the limit', async () => {
    const cookies = await signUpAs(app, 'cart-merger@example.com');
    await add(variant.medium!, 6, { cookies }).expect(201);
    const token = await addAsNewGuest(variant.medium!, 7);
    await add(variant.small!, 1, { token }).expect(201);

    const merged = await getCart({ cookies, token });

    expect(new Map(merged.lines.map((line) => [line.variantId, line.quantity]))).toEqual(
      new Map([
        [variant.medium, 10],
        [variant.small, 1],
      ]),
    );
    expect((await getCart({ token })).lines).toEqual([]);
  });

  it('keeps unpublished products in the cart but out of the subtotal', async () => {
    const token = await addAsNewGuest(variant.small!, 1);
    await add(variant.medium!, 1, { token }).expect(201);
    await admin.patch(`/products/${productId}`, { status: 'draft' }).expect(200);

    try {
      const cart = await getCart({ token });
      expect(cart.lines.every((line) => !line.available)).toBe(true);
      expect(cart).toMatchObject({ itemCount: 2, subtotal: 0 });
    } finally {
      await admin.patch(`/products/${productId}`, { status: 'active' }).expect(200);
    }
  });
});
