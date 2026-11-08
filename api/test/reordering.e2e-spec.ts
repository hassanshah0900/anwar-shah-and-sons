import { INestApplication } from '@nestjs/common';
import {
  categoryListSchema,
  optionTypeSchema,
  productSchema,
  type Category,
  type Product,
} from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { resetCatalog, testDatabase } from './support/database.js';
import { signUpAs } from './support/users.js';
import { users } from '../src/db/schema/index.js';

// A valid 1×1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const STALE = 'The list has changed. Reload the page and try again.';

describe('Reordering catalog lists (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string[];
  let api: ReturnType<typeof adminApi>;
  let customer: ReturnType<typeof adminApi>;

  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  beforeAll(async () => {
    app = await createTestApp();
    const db = testDatabase(app);
    await resetCatalog(db);
    await db.delete(users);
    admin = await signUpAs(app, 'reorder-admin@example.com', 'admin');
    api = adminApi(app, admin);
    customer = adminApi(app, await signUpAs(app, 'reorder-customer@example.com'));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('categories', () => {
    let women: Category;
    let children: Category[];

    beforeAll(async () => {
      women = (await api.post('/categories', { name: 'Women' }).expect(201)).body;
      await api.post('/categories', { name: 'Men' }).expect(201);
      children = [];
      for (const name of ['Kurtas', 'Shawls', 'Dupattas']) {
        children.push(
          (await api.post('/categories', { name, parentId: women.id }).expect(201)).body,
        );
      }
    });

    const childrenOf = (categories: Category[], parentId: string | null) =>
      categories.filter((category) => category.parentId === parentId).map((c) => c.name);

    it('orders the sub-categories of one parent', async () => {
      const [kurtas, shawls, dupattas] = ids(children);
      const response = await api
        .put('/categories/order', { parentId: women.id, ids: [dupattas, kurtas, shawls] })
        .expect(200);

      const { categories } = categoryListSchema.parse(response.body);
      expect(childrenOf(categories, women.id)).toEqual(['Dupattas', 'Kurtas', 'Shawls']);
      // Other levels are untouched.
      expect(childrenOf(categories, null)).toEqual(['Women', 'Men']);
    });

    it('orders the top level', async () => {
      const top = (await api.get('/categories').expect(200)).body.categories.filter(
        (category: Category) => category.parentId === null,
      );
      const response = await api
        .put('/categories/order', { parentId: null, ids: ids(top).reverse() })
        .expect(200);
      expect(childrenOf(categoryListSchema.parse(response.body).categories, null)).toEqual([
        'Men',
        'Women',
      ]);
    });

    it('refuses a list that isn’t exactly the siblings', async () => {
      const [kurtas, shawls, dupattas] = ids(children);
      // One missing.
      const missing = await api
        .put('/categories/order', { parentId: women.id, ids: [kurtas, shawls] })
        .expect(400);
      expect(missing.body.message).toBe(STALE);
      // One from another level.
      await api
        .put('/categories/order', { parentId: women.id, ids: [kurtas, shawls, dupattas, women.id] })
        .expect(400);
      // Repeated.
      await api
        .put('/categories/order', { parentId: women.id, ids: [kurtas, kurtas, shawls] })
        .expect(400);
      await api.put('/categories/order', { parentId: 'nope', ids: [kurtas] }).expect(400);
    });

    it('is admin only', async () => {
      await customer.put('/categories/order', { parentId: null, ids: [women.id] }).expect(403);
    });
  });

  describe('option values, images and product options', () => {
    let sizeId: string;
    let colourId: string;
    let product: Product;

    beforeAll(async () => {
      const size = (await api.post('/option-types', { name: 'Size', kind: 'text' }).expect(201))
        .body;
      sizeId = size.id;
      for (const label of ['S', 'M', 'L']) {
        await api.post(`/option-types/${sizeId}/values`, { label }).expect(201);
      }
      const colour = (
        await api.post('/option-types', { name: 'Colour', kind: 'color' }).expect(201)
      ).body;
      colourId = colour.id;
      await api
        .post(`/option-types/${colourId}/values`, { label: 'Black', colorHex: '#000000' })
        .expect(201);

      const categoryId = (await api.post('/categories', { name: 'Kids' }).expect(201)).body.id;
      product = (
        await api
          .post('/products', {
            name: 'Cotton Kurta',
            categoryId,
            price: 3000,
            optionTypeIds: [sizeId, colourId],
          })
          .expect(201)
      ).body;
    });

    it('orders an option’s values', async () => {
      const values = (await api.get('/option-types').expect(200)).body.optionTypes.find(
        (type: { id: string }) => type.id === sizeId,
      ).values;
      const [s, m, l] = ids(values);

      const response = await api
        .put(`/option-types/${sizeId}/values/order`, { ids: [l, m, s] })
        .expect(200);
      const size = optionTypeSchema.parse(response.body);
      expect(size.values.map((value) => value.label)).toEqual(['L', 'M', 'S']);

      await api.put(`/option-types/${sizeId}/values/order`, { ids: [l, m] }).expect(400);
      await api.put('/option-types/nope/values/order', { ids: [l] }).expect(404);
      await customer.put(`/option-types/${sizeId}/values/order`, { ids: [l, m, s] }).expect(403);
    });

    it('orders a product’s images, making the first the main one', async () => {
      let latest = product;
      for (const alt of ['Front', 'Back', 'Detail']) {
        latest = (
          await request(app.getHttpServer())
            .post(`/api/v1/admin/products/${product.id}/images`)
            .set('Cookie', admin)
            .set('Origin', WEB_ORIGIN)
            .field('alt', alt)
            .attach('file', PNG, { filename: `${alt}.png` })
            .expect(201)
        ).body;
      }
      const [front, back, detail] = ids(latest.images);

      const response = await api
        .put(`/products/${product.id}/images/order`, { ids: [detail, front, back] })
        .expect(200);
      const { images } = productSchema.parse(response.body);
      expect(images.map((image) => image.alt)).toEqual(['Detail', 'Front', 'Back']);
      expect(images.map((image) => image.position)).toEqual([0, 1, 2]);

      await api.put(`/products/${product.id}/images/order`, { ids: [detail] }).expect(400);
      await api.put('/products/nope/images/order', { ids: [detail] }).expect(404);
      await customer
        .put(`/products/${product.id}/images/order`, { ids: [detail, front, back] })
        .expect(403);
    });

    it('orders a product’s options, even once it has variants', async () => {
      await api.post(`/products/${product.id}/variants/generate`, {}).expect(201);

      const response = await api
        .put(`/products/${product.id}/options/order`, { ids: [colourId, sizeId] })
        .expect(200);
      expect(productSchema.parse(response.body).options.map((option) => option.name)).toEqual([
        'Colour',
        'Size',
      ]);

      await api.put(`/products/${product.id}/options/order`, { ids: [colourId] }).expect(400);
      await api.put('/products/nope/options/order', { ids: [colourId] }).expect(404);
      await customer
        .put(`/products/${product.id}/options/order`, { ids: [sizeId, colourId] })
        .expect(403);
    });

    it('keeps the option order when the product form is saved again', async () => {
      const { body } = await api.get(`/products/${product.id}`).expect(200);
      for (const variant of body.variants) {
        await api.delete(`/products/${product.id}/variants/${variant.id}`).expect(200);
      }

      // The form sends options in the order they're listed in, not the product's order.
      const saved = await api
        .patch(`/products/${product.id}`, { optionTypeIds: [sizeId, colourId] })
        .expect(200);
      expect(productSchema.parse(saved.body).options.map((option) => option.name)).toEqual([
        'Colour',
        'Size',
      ]);
    });
  });
});
