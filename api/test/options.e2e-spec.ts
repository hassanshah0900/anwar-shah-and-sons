import { INestApplication } from '@nestjs/common';
import { optionTypeListSchema, optionTypeSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { resetCatalog } from './support/database.js';
import { signUpAs } from './support/users.js';

describe('Admin product options (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string[];

  const send = (method: 'post' | 'patch' | 'delete', path: string, body?: object) =>
    request(app.getHttpServer())
      [method](`/api/v1/admin/option-types${path}`)
      .set('Cookie', admin)
      .set('Origin', WEB_ORIGIN)
      .send(body);

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    await resetCatalog(prisma);
    await prisma.user.deleteMany();
    admin = await signUpAs(app, 'options-admin@example.com', 'admin');
  });

  afterAll(async () => {
    await app.close();
  });

  it('is admin only', async () => {
    const customer = await signUpAs(app, 'options-customer@example.com');

    await request(app.getHttpServer())
      .get('/api/v1/admin/option-types')
      .set('Cookie', customer)
      .expect(403);
  });

  it('manages a text option such as Size', async () => {
    const size = (await send('post', '', { name: 'Size', kind: 'text' }).expect(201)).body;
    expect(optionTypeSchema.parse(size)).toMatchObject({ slug: 'size', kind: 'text', values: [] });

    const medium = (
      await send('post', `/${size.id}/values`, {
        label: 'M',
        colorHex: '#ffffff',
        position: 2,
      }).expect(201)
    ).body;
    expect(medium).toMatchObject({ label: 'M', slug: 'm', colorHex: null });

    await send('post', `/${size.id}/values`, { label: 'S', position: 1 }).expect(201);
    await send('post', `/${size.id}/values`, { label: 'M' }).expect(409);

    const list = optionTypeListSchema.parse(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/option-types')
          .set('Cookie', admin)
          .expect(200)
      ).body,
    );
    expect(list.optionTypes[0]?.values.map((value) => value.label)).toEqual(['S', 'M']);
  });

  it('keeps values in the order they were added', async () => {
    const shoe = (await send('post', '', { name: 'Shoe size', kind: 'text' }).expect(201)).body;
    for (const label of ['40', '38', '42', '39']) {
      await send('post', `/${shoe.id}/values`, { label }).expect(201);
    }

    const list = optionTypeListSchema.parse(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/option-types')
          .set('Cookie', admin)
          .expect(200)
      ).body,
    );
    const values = list.optionTypes.find((type) => type.id === shoe.id)?.values;
    expect(values?.map((value) => value.label)).toEqual(['40', '38', '42', '39']);
  });

  it('requires a swatch for colour values', async () => {
    const colour = (await send('post', '', { name: 'Colour', kind: 'color' }).expect(201)).body;

    await send('post', `/${colour.id}/values`, { label: 'Black' }).expect(400);
    const black = (
      await send('post', `/${colour.id}/values`, { label: 'Black', colorHex: '#1A1A1A' }).expect(
        201,
      )
    ).body;
    expect(black.colorHex).toBe('#1a1a1a');

    await send('patch', `/${colour.id}/values/${black.id}`, { colorHex: null }).expect(400);
  });

  it('does not let a value be edited through another option type', async () => {
    const fit = (await send('post', '', { name: 'Fit', kind: 'text' }).expect(201)).body;
    const length = (await send('post', '', { name: 'Length', kind: 'text' }).expect(201)).body;
    const slim = (await send('post', `/${fit.id}/values`, { label: 'Slim' }).expect(201)).body;

    await send('patch', `/${length.id}/values/${slim.id}`, { label: 'Hijacked' }).expect(404);
    await send('delete', `/${length.id}/values/${slim.id}`).expect(404);
  });

  it('keeps the kind fixed and deletes a type with its values', async () => {
    const material = (await send('post', '', { name: 'Material', kind: 'text' }).expect(201)).body;
    await send('post', `/${material.id}/values`, { label: 'Cotton' }).expect(201);

    const renamed = (
      await send('patch', `/${material.id}`, { name: 'Fabric', kind: 'color' }).expect(200)
    ).body;
    expect(renamed).toMatchObject({ name: 'Fabric', kind: 'text' });

    await send('delete', `/${material.id}`).expect(204);
    await send('post', `/${material.id}/values`, { label: 'Linen' }).expect(404);
  });
});
