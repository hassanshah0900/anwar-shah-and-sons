import { INestApplication } from '@nestjs/common';
import { addressListSchema, addressSchema, MAX_ADDRESSES, type Address } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, WEB_ORIGIN } from './support/app.js';
import { signUpAs } from './support/users.js';

const home = {
  fullName: 'Ayesha Khan',
  phone: '+92 300 1234567',
  line1: '12 Mall Road',
  city: 'Lahore',
};
const office = { ...home, line1: '5 Gulberg Avenue', line2: 'Floor 3', postalCode: '54660' };

describe('Address book (e2e)', () => {
  let app: INestApplication<App>;

  const as = (cookies: string[]) => {
    const call = (method: 'get' | 'post' | 'patch' | 'delete', path = '') =>
      request(app.getHttpServer())
        [method](`/api/v1/addresses${path}`)
        .set('Cookie', cookies)
        .set('Origin', WEB_ORIGIN);
    return {
      list: async (): Promise<Address[]> =>
        addressListSchema.parse((await call('get').expect(200)).body).addresses,
      add: async (body: object): Promise<Address> =>
        addressSchema.parse((await call('post').send(body).expect(201)).body),
      call,
    };
  };

  beforeAll(async () => {
    app = await createTestApp();
    await app.get(PrismaService).user.deleteMany({ where: { email: { endsWith: '@book.test' } } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('needs a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/addresses').expect(401);
  });

  it('makes the first address the default and keeps one default', async () => {
    const book = as(await signUpAs(app, 'defaults@book.test'));

    const first = await book.add(home);
    expect(first).toMatchObject({ ...home, line2: null, postalCode: null, isDefault: true });

    const second = await book.add({ ...office, isDefault: true });
    expect(second.isDefault).toBe(true);
    expect((await book.list()).map((address) => [address.line1, address.isDefault])).toEqual([
      [office.line1, true],
      [home.line1, false],
    ]);

    await book.call('patch', `/${first.id}`).send({ isDefault: true }).expect(200);
    expect((await book.list())[0]!.id).toBe(first.id);
    await book.call('patch', `/${first.id}`).send({ isDefault: false }).expect(400);
  });

  it('updates only the fields sent', async () => {
    const book = as(await signUpAs(app, 'updates@book.test'));
    const saved = await book.add(office);

    const moved = addressSchema.parse(
      (await book.call('patch', `/${saved.id}`).send({ city: 'Karachi' }).expect(200)).body,
    );
    expect(moved).toMatchObject({ city: 'Karachi', line2: 'Floor 3', postalCode: '54660' });

    const cleared = addressSchema.parse(
      (await book.call('patch', `/${saved.id}`).send({ line2: '' }).expect(200)).body,
    );
    expect(cleared.line2).toBeNull();
    await book.call('patch', `/${saved.id}`).send({ phone: 'nope' }).expect(400);
  });

  it('hands the default on when it is deleted', async () => {
    const book = as(await signUpAs(app, 'deletes@book.test'));
    const first = await book.add(home);
    const second = await book.add(office);

    await book.call('delete', `/${first.id}`).expect(204);
    expect(await book.list()).toEqual([
      expect.objectContaining({ id: second.id, isDefault: true }),
    ]);
  });

  it('keeps customers to their own addresses', async () => {
    const owner = as(await signUpAs(app, 'owner@book.test'));
    const other = as(await signUpAs(app, 'other@book.test'));
    const saved = await owner.add(home);

    await other.call('patch', `/${saved.id}`).send({ city: 'Quetta' }).expect(404);
    await other.call('delete', `/${saved.id}`).expect(404);
    expect(await other.list()).toEqual([]);
  });

  it(`stops at ${MAX_ADDRESSES} addresses`, async () => {
    const book = as(await signUpAs(app, 'full@book.test'));
    for (let index = 0; index < MAX_ADDRESSES; index++) {
      await book.add({ ...home, line1: `${index + 1} Mall Road` });
    }
    const response = await book.call('post').send(home).expect(409);
    expect(response.body.message).toBe(`You can save up to ${MAX_ADDRESSES} addresses`);
  });
});
