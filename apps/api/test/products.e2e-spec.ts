import { INestApplication } from '@nestjs/common';
import { productListSchema, productSchema } from '@repo/shared';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

describe('Admin products (e2e)', () => {
  let app: INestApplication<App>;
  let api: ReturnType<typeof adminApi>;
  let categoryId: string;
  let sizeId: string;
  let colourId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    api = adminApi(app, await signUpAs(app, 'products-admin@example.com', 'admin'));

    categoryId = (await api.post('/categories', { name: 'Kurtas' }).expect(201)).body.id;
    sizeId = (await api.post('/option-types', { name: 'Size', kind: 'text' }).expect(201)).body.id;
    colourId = (await api.post('/option-types', { name: 'Colour', kind: 'color' }).expect(201)).body
      .id;
  });

  afterAll(async () => {
    await app.close();
  });

  const lawnKurta = () => ({
    name: 'Lawn Kurta',
    categoryId,
    price: 4990,
    compareAtPrice: 6490,
    optionTypeIds: [sizeId, colourId],
  });

  it('creates a draft product with its options in order', async () => {
    const product = productSchema.parse(
      (await api.post('/products', lawnKurta()).expect(201)).body,
    );

    expect(product).toMatchObject({
      slug: 'lawn-kurta',
      status: 'draft',
      price: 4990,
      variants: [],
    });
    expect(product.options.map((option) => option.name)).toEqual(['Size', 'Colour']);
  });

  it('refuses to publish a product without variants', async () => {
    const response = await api
      .post('/products', { ...lawnKurta(), name: 'Silk Kurta', status: 'active' })
      .expect(400);

    expect(response.body.issues).toEqual([
      { path: 'status', message: 'Add at least one variant before publishing' },
    ]);
  });

  it('checks the compare-at price against the stored price on update', async () => {
    const id = (await api.post('/products', { ...lawnKurta(), name: 'Cotton Kurta' }).expect(201))
      .body.id;

    const response = await api.patch(`/products/${id}`, { compareAtPrice: 1000 }).expect(400);
    expect(response.body.issues[0].path).toBe('compareAtPrice');
  });

  it('rejects unknown categories and options as field errors', async () => {
    const badCategory = await api
      .post('/products', { ...lawnKurta(), name: 'X', categoryId: 'missing' })
      .expect(400);
    expect(badCategory.body.issues[0].path).toBe('categoryId');

    const badOption = await api
      .post('/products', { ...lawnKurta(), name: 'Y', optionTypeIds: ['missing'] })
      .expect(400);
    expect(badOption.body.issues[0].path).toBe('optionTypeIds');
  });

  it('changes options freely while there are no variants', async () => {
    const id = (await api.post('/products', { ...lawnKurta(), name: 'Linen Kurta' }).expect(201))
      .body.id;

    const updated = (await api.patch(`/products/${id}`, { optionTypeIds: [colourId] }).expect(200))
      .body;
    expect(updated.options.map((option: { name: string }) => option.name)).toEqual(['Colour']);
  });

  it('lists, filters and searches products', async () => {
    const all = productListSchema.parse((await api.get('/products').expect(200)).body);
    expect(all.total).toBe(3);
    expect(all.products[0]).toMatchObject({
      variantCount: 0,
      totalStock: 0,
      category: { name: 'Kurtas' },
    });

    const search = productListSchema.parse((await api.get('/products?q=linen').expect(200)).body);
    expect(search.products.map((product) => product.name)).toEqual(['Linen Kurta']);

    const page = productListSchema.parse(
      (await api.get('/products?page=2&pageSize=2').expect(200)).body,
    );
    expect(page.products).toHaveLength(1);

    await api.get('/products?status=sold').expect(400);
  });

  it('protects categories and options that products use', async () => {
    await api.delete(`/categories/${categoryId}`).expect(409);
    await api.delete(`/option-types/${sizeId}`).expect(409);
  });

  it('deletes a product', async () => {
    const id = (await api.post('/products', { ...lawnKurta(), name: 'Temporary' }).expect(201)).body
      .id;

    await api.delete(`/products/${id}`).expect(204);
    await api.get(`/products/${id}`).expect(404);
  });
});
