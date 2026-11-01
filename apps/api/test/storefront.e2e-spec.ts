import { INestApplication } from '@nestjs/common';
import { productDetailSchema, productListingSchema, type ProductListing } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

describe('Public catalog (e2e)', () => {
  let app: INestApplication<App>;
  const value: Record<string, string> = {};

  const listing = async (query = ''): Promise<ProductListing> =>
    productListingSchema.parse(
      (await request(app.getHttpServer()).get(`/api/v1/products${query}`).expect(200)).body,
    );
  const names = (result: ProductListing) => result.products.map((product) => product.name);

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    const api = adminApi(app, await signUpAs(app, 'storefront-admin@example.com', 'admin'));

    const women = (await api.post('/categories', { name: 'Women' }).expect(201)).body.id;
    const kurtas = (await api.post('/categories', { name: 'Kurtas', parentId: women }).expect(201))
      .body.id;
    const men = (await api.post('/categories', { name: 'Men' }).expect(201)).body.id;

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

    const create = async (
      name: string,
      categoryId: string,
      price: number,
      variants: { values: string[]; stock: number; price?: number }[],
      status: 'active' | 'draft' = 'active',
    ) => {
      const product = (
        await api
          .post('/products', { name, categoryId, price, optionTypeIds: [size.id, colour.id] })
          .expect(201)
      ).body;
      for (const [index, variant] of variants.entries()) {
        await api
          .post(`/products/${product.id}/variants`, {
            sku: `${product.slug}-${index}`,
            stock: variant.stock,
            price: variant.price,
            optionValueIds: variant.values.map((label) => value[label]),
          })
          .expect(201);
      }
      if (status === 'active') await api.patch(`/products/${product.id}`, { status }).expect(200);
      return product;
    };

    await create('Lawn Kurta', kurtas, 4990, [
      { values: ['S', 'Black'], stock: 5 },
      { values: ['M', 'Ivory'], stock: 0, price: 5490 },
    ]);
    await create('Oxford Shirt', men, 2990, [{ values: ['M', 'Black'], stock: 2 }]);
    await create('Secret Draft', men, 1000, [{ values: ['S', 'Black'], stock: 9 }], 'draft');
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists only active products, newest first, without a session', async () => {
    const result = await listing();

    expect(names(result)).toEqual(['Oxford Shirt', 'Lawn Kurta']);
    expect(result.total).toBe(2);
  });

  it('summarises each product for its card', async () => {
    const kurta = (await listing()).products.find((product) => product.name === 'Lawn Kurta');

    expect(kurta).toMatchObject({
      priceFrom: 4990,
      priceTo: 5490,
      inStock: true,
      colors: [
        { label: 'Black', colorHex: '#1a1a1a' },
        { label: 'Ivory', colorHex: '#f5f0e6' },
      ],
    });
  });

  it('includes sub-categories when browsing a category', async () => {
    expect(names(await listing('?category=women'))).toEqual(['Lawn Kurta']);
    expect(names(await listing('?category=kurtas'))).toEqual(['Lawn Kurta']);
    await request(app.getHttpServer()).get('/api/v1/products?category=missing').expect(404);
  });

  it('filters by option values: alternatives within an option, all options together', async () => {
    expect(names(await listing('?option=colour:ivory'))).toEqual(['Lawn Kurta']);
    expect(names(await listing('?option=size:m&option=size:s'))).toHaveLength(2);
    expect(names(await listing('?option=size:m&option=colour:ivory'))).toEqual(['Lawn Kurta']);
  });

  it('filters by price, sorts and paginates', async () => {
    expect(names(await listing('?maxPrice=3000'))).toEqual(['Oxford Shirt']);
    expect(names(await listing('?sort=price-desc'))).toEqual(['Lawn Kurta', 'Oxford Shirt']);
    expect(names(await listing('?sort=price-asc&pageSize=1&page=2'))).toEqual(['Lawn Kurta']);
    await request(app.getHttpServer()).get('/api/v1/products?sort=cheapest').expect(400);
  });

  it('returns facets and the price range for the products in scope', async () => {
    const result = await listing('?option=colour:ivory');

    expect(result.facets).toEqual([
      expect.objectContaining({
        slug: 'size',
        values: [expect.objectContaining({ slug: 's' }), expect.objectContaining({ slug: 'm' })],
      }),
      expect.objectContaining({
        slug: 'colour',
        kind: 'color',
        values: expect.arrayContaining([expect.objectContaining({ slug: 'ivory' })]),
      }),
    ]);
    expect(result.price).toEqual({ min: 2990, max: 4990 });
    expect((await listing('?category=women')).price).toEqual({ min: 4990, max: 4990 });
  });

  it('serves a product page without revealing stock counts', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/products/lawn-kurta')
      .expect(200);
    const product = productDetailSchema.parse(response.body);

    expect(product.breadcrumbs.map((crumb) => crumb.name)).toEqual(['Women', 'Kurtas']);
    expect(product.options.map((option) => option.values.map((v) => v.label))).toEqual([
      ['S', 'M'],
      ['Black', 'Ivory'],
    ]);
    expect(product.variants.map(({ price, stockLevel }) => ({ price, stockLevel }))).toEqual([
      { price: 4990, stockLevel: 'in_stock' },
      { price: 5490, stockLevel: 'out_of_stock' },
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(/"stock"|"sku"/);
    expect(response.headers['cache-control']).toContain('max-age=60');
  });

  it('hides drafts and unknown products', async () => {
    await request(app.getHttpServer()).get('/api/v1/products/secret-draft').expect(404);
    await request(app.getHttpServer()).get('/api/v1/products/missing').expect(404);
  });

  it('lists categories publicly', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);

    expect(response.body.categories.map((c: { slug: string }) => c.slug).sort()).toEqual([
      'kurtas',
      'men',
      'women',
    ]);
  });
});
