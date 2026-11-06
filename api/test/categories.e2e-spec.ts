import { INestApplication } from '@nestjs/common';
import { categoryListSchema, categorySchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

describe('Admin categories (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string[];

  const http = () => request(app.getHttpServer());
  const create = (body: object) =>
    http()
      .post('/api/v1/admin/categories')
      .set('Cookie', admin)
      .set('Origin', WEB_ORIGIN)
      .send(body);

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    admin = await signUpAs(app, 'catalog-admin@example.com', 'admin');
  });

  afterAll(async () => {
    await app.close();
  });

  it('is admin only', async () => {
    const customer = await signUpAs(app, 'catalog-customer@example.com');

    await http().get('/api/v1/admin/categories').expect(401);
    await http().get('/api/v1/admin/categories').set('Cookie', customer).expect(403);
  });

  it('creates a category and derives its slug', async () => {
    const response = await create({ name: "Women's Wear" }).expect(201);

    expect(categorySchema.parse(response.body)).toMatchObject({
      name: "Women's Wear",
      slug: 'womens-wear',
      parentId: null,
    });
  });

  it('rejects writes without the web origin', async () => {
    await http()
      .post('/api/v1/admin/categories')
      .set('Cookie', admin)
      .send({ name: 'Forged' })
      .expect(403);
  });

  it('validates input', async () => {
    const response = await create({ name: '' }).expect(400);

    expect(response.body.issues).toEqual([{ path: 'name', message: 'Enter a name' }]);
  });

  it('answers 409 for a duplicate slug', async () => {
    const response = await create({ name: 'Womens Wear' }).expect(409);

    expect(response.body.message).toBe('Slug is already in use');
  });

  it('nests, lists, prevents cycles and protects parents from deletion', async () => {
    const parent = (await create({ name: 'Men' }).expect(201)).body;
    const child = (await create({ name: 'Shirts', parentId: parent.id }).expect(201)).body;

    const list = categoryListSchema.parse(
      (await http().get('/api/v1/admin/categories').set('Cookie', admin).expect(200)).body,
    );
    expect(list.categories.find((c) => c.id === child.id)?.parentId).toBe(parent.id);

    await http()
      .patch(`/api/v1/admin/categories/${parent.id}`)
      .set('Cookie', admin)
      .set('Origin', WEB_ORIGIN)
      .send({ parentId: child.id })
      .expect(400);

    await http()
      .delete(`/api/v1/admin/categories/${parent.id}`)
      .set('Cookie', admin)
      .set('Origin', WEB_ORIGIN)
      .expect(409);

    await http()
      .delete(`/api/v1/admin/categories/${child.id}`)
      .set('Cookie', admin)
      .set('Origin', WEB_ORIGIN)
      .expect(204);
  });

  it('answers 404 for an unknown category', async () => {
    await http()
      .patch('/api/v1/admin/categories/missing')
      .set('Cookie', admin)
      .set('Origin', WEB_ORIGIN)
      .send({ name: 'Nope' })
      .expect(404);
  });
});
