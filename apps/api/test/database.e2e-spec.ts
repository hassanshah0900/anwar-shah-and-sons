import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './support/app.js';

/** Guards against e2e suites writing to development data in the public schema. */
describe('E2E database isolation', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs every query against the e2e schema', async () => {
    const prisma = app.get(PrismaService);
    const marker = `isolation-${Date.now()}@example.com`;

    await prisma.user.create({ data: { id: marker, name: 'Isolation', email: marker } });

    try {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) AS count FROM e2e.users WHERE email = ${marker}`;
      expect(Number(rows[0]?.count)).toBe(1);
    } finally {
      await prisma.user.delete({ where: { email: marker } });
    }
  });
});
