import { INestApplication } from '@nestjs/common';
import { productSchema, type Product } from '@repo/shared';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { adminApi } from './support/catalog.js';
import { signUpAs } from './support/users.js';
import { users } from '../src/db/schema/index.js';
import { resetCatalog, testDatabase } from './support/database.js';

// A valid 1×1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('Admin product images (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string[];
  let api: ReturnType<typeof adminApi>;
  let product: Product;
  let blackId: string;
  let otherValueId: string;

  const storedPath = (key: string) => join(process.env['STORAGE_LOCAL_DIR'] ?? '', key);
  const upload = (
    file: Buffer | null,
    fields: Record<string, string> = {},
    { filename = 'photo.png', cookies = admin, origin = WEB_ORIGIN } = {},
  ) => {
    const req = request(app.getHttpServer())
      .post(`/api/v1/admin/products/${product.id}/images`)
      .set('Cookie', cookies)
      .set('Origin', origin);
    for (const [name, value] of Object.entries(fields)) req.field(name, value);
    return file ? req.attach('file', file, { filename }) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    const db = testDatabase(app);
    await resetCatalog(db);
    await db.delete(users);
    admin = await signUpAs(app, 'images-admin@example.com', 'admin');
    api = adminApi(app, admin);

    const categoryId = (await api.post('/categories', { name: 'Kurtas' }).expect(201)).body.id;
    const colour = (await api.post('/option-types', { name: 'Colour', kind: 'color' }).expect(201))
      .body;
    blackId = (
      await api
        .post(`/option-types/${colour.id}/values`, { label: 'Black', colorHex: '#1a1a1a' })
        .expect(201)
    ).body.id;
    const fit = (await api.post('/option-types', { name: 'Fit', kind: 'text' }).expect(201)).body;
    otherValueId = (await api.post(`/option-types/${fit.id}/values`, { label: 'Slim' }).expect(201))
      .body.id;

    product = (
      await api
        .post('/products', {
          name: 'Lawn Kurta',
          categoryId,
          price: 4990,
          optionTypeIds: [colour.id],
        })
        .expect(201)
    ).body;
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads an image and serves the same bytes publicly', async () => {
    product = productSchema.parse(
      (await upload(PNG, { alt: 'Front view', optionValueId: blackId }).expect(201)).body,
    );
    const image = product.images[0]!;
    expect(image).toMatchObject({ alt: 'Front view', optionValueId: blackId, position: 0 });
    expect(image.key).toMatch(new RegExp(`^products/${product.id}/[0-9a-f-]{36}\\.png$`));

    const served = await request(app.getHttpServer())
      .get(`/api/v1/media/${image.key}`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cache-control']).toContain('immutable');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(served.body as Buffer, PNG)).toBe(0);
  });

  it('judges files by their content, not their name', async () => {
    const renamed = await upload(
      Buffer.from('<!doctype html><script>alert(1)</script>'),
      {},
      {
        filename: 'evil.png',
      },
    ).expect(400);
    expect(renamed.body.issues[0]).toEqual({
      path: 'file',
      message: 'Upload a JPEG, PNG, WebP or AVIF image',
    });

    await upload(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      {},
      {
        filename: 'logo.svg',
      },
    ).expect(400);
  });

  it('rejects missing and oversized files', async () => {
    await upload(null, { alt: 'Nothing attached' }).expect(400);
    await upload(Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])).expect(413);
  });

  it("only links images to the product's own option values", async () => {
    const response = await upload(PNG, { optionValueId: otherValueId }).expect(400);
    expect(response.body.issues[0].path).toBe('optionValueId');
  });

  it('is admin only and checks the origin', async () => {
    const customer = await signUpAs(app, 'images-customer@example.com');

    await upload(PNG, {}, { cookies: customer }).expect(403);
    await upload(PNG, {}, { origin: 'https://evil.example' }).expect(403);
  });

  it('updates alt text and colour', async () => {
    const image = product.images[0]!;

    product = productSchema.parse(
      (
        await api
          .patch(`/products/${product.id}/images/${image.id}`, {
            alt: 'Back view',
            optionValueId: null,
          })
          .expect(200)
      ).body,
    );
    expect(product.images[0]).toMatchObject({ alt: 'Back view', optionValueId: null });
  });

  it('deletes the image file with the image', async () => {
    const image = product.images[0]!;
    expect(existsSync(storedPath(image.key))).toBe(true);

    await api.delete(`/products/${product.id}/images/${image.id}`).expect(200);

    expect(existsSync(storedPath(image.key))).toBe(false);
    await request(app.getHttpServer()).get(`/api/v1/media/${image.key}`).expect(404);
  });

  it('deletes image files when the product is deleted', async () => {
    product = productSchema.parse((await upload(PNG).expect(201)).body);
    const key = product.images[0]!.key;

    await api.delete(`/products/${product.id}`).expect(204);

    expect(existsSync(storedPath(key))).toBe(false);
  });

  it('only serves keys of the expected shape', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/media/products/x/..%2F..%2Fpackage.json')
      .expect(404);
    await request(app.getHttpServer()).get('/api/v1/media/products/x/not-an-image.txt').expect(404);
  });
});
