import { INestApplication } from '@nestjs/common';
import { productSchema, type Product } from '@repo/shared';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

describe('Admin product variants (e2e)', () => {
  let app: INestApplication<App>;
  let api: ReturnType<typeof adminApi>;
  let product: Product;
  const value: Record<string, string> = {};

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    api = adminApi(app, await signUpAs(app, 'variants-admin@example.com', 'admin'));

    const categoryId = (await api.post('/categories', { name: 'Kurtas' }).expect(201)).body.id;
    const size = (await api.post('/option-types', { name: 'Size', kind: 'text' }).expect(201)).body;
    const colour = (await api.post('/option-types', { name: 'Colour', kind: 'color' }).expect(201))
      .body;
    for (const label of ['S', 'M']) {
      value[label] = (
        await api.post(`/option-types/${size.id}/values`, { label }).expect(201)
      ).body.id;
    }
    for (const [label, colorHex] of [
      ['Black', '#1a1a1a'],
      ['Ivory', '#f5f0e6'],
    ] as const) {
      value[label] = (
        await api.post(`/option-types/${colour.id}/values`, { label, colorHex }).expect(201)
      ).body.id;
    }

    product = (
      await api
        .post('/products', {
          name: 'Lawn Kurta',
          categoryId,
          price: 4990,
          optionTypeIds: [size.id, colour.id],
        })
        .expect(201)
    ).body;
  });

  afterAll(async () => {
    await app.close();
  });

  const variants = (path = '') => `/products/${product.id}/variants${path}`;

  it('adds a variant with one value per option', async () => {
    product = productSchema.parse(
      (
        await api
          .post(variants(), { sku: 'lk-s-blk', stock: 5, optionValueIds: [value.S, value.Black] })
          .expect(201)
      ).body,
    );

    expect(product.variants).toEqual([
      expect.objectContaining({ sku: 'LK-S-BLK', stock: 5, price: null }),
    ]);
  });

  it('rejects incomplete, mixed or repeated combinations', async () => {
    const missingColour = await api
      .post(variants(), { sku: 'A', optionValueIds: [value.S] })
      .expect(400);
    expect(missingColour.body.issues[0].path).toBe('optionValueIds');

    await api.post(variants(), { sku: 'B', optionValueIds: [value.S, value.M] }).expect(400);

    const duplicate = await api
      .post(variants(), { sku: 'C', optionValueIds: [value.Black, value.S] })
      .expect(400);
    expect(duplicate.body.issues[0].message).toBe('This combination already exists');
  });

  it('rejects a duplicate SKU by name', async () => {
    const response = await api
      .post(variants(), { sku: 'LK-S-BLK', optionValueIds: [value.M, value.Black] })
      .expect(409);

    expect(response.body.message).toBe('SKU is already in use');
  });

  it('generates the missing combinations with readable SKUs', async () => {
    product = productSchema.parse((await api.post(variants('/generate'), {}).expect(201)).body);

    expect(product.variants.map((variant) => variant.sku)).toEqual([
      'LK-S-BLK',
      'LAWN-KURTA-S-IVORY',
      'LAWN-KURTA-M-BLACK',
      'LAWN-KURTA-M-IVORY',
    ]);

    const again = productSchema.parse((await api.post(variants('/generate'), {}).expect(201)).body);
    expect(again.variants).toHaveLength(4);
  });

  it('updates stock and price overrides', async () => {
    const target = product.variants[1]!;

    product = productSchema.parse(
      (await api.patch(variants(`/${target.id}`), { stock: 12, price: 5490 }).expect(200)).body,
    );
    expect(product.variants[1]).toMatchObject({ stock: 12, price: 5490 });

    await api.patch(variants(`/${target.id}`), { stock: -1 }).expect(400);
  });

  it('counts variants and adds up their stock in the product list', async () => {
    const list = (await api.get('/products').expect(200)).body;
    const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);

    expect(totalStock).toBeGreaterThan(0);
    expect(list.products).toEqual([
      expect.objectContaining({
        id: product.id,
        variantCount: product.variants.length,
        totalStock,
      }),
    ]);
  });

  it("locks the product's options once it has variants", async () => {
    await api.patch(`/products/${product.id}`, { optionTypeIds: [] }).expect(409);
  });

  it('keeps at least one variant on an active product', async () => {
    const publish = await api.patch(`/products/${product.id}`, { status: 'active' });
    expect(publish.body).toMatchObject({ status: 'active' });

    for (const variant of product.variants.slice(1)) {
      await api.delete(variants(`/${variant.id}`)).expect(200);
    }
    await api.delete(variants(`/${product.variants[0]!.id}`)).expect(409);
  });

  it('protects option values that variants use', async () => {
    const colourId = product.options[1]!.optionTypeId;

    await api.delete(`/option-types/${colourId}/values/${value.Black}`).expect(409);
  });
});
