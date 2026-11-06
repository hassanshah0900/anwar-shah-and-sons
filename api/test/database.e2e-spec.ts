import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { createTestApp } from './support/app.js';
import { eq, sql } from 'drizzle-orm';
import { users } from '../src/db/schema/index.js';
import { testDatabase } from './support/database.js';

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
    const db = testDatabase(app);
    const marker = `isolation-${Date.now()}@example.com`;

    await db.insert(users).values({ id: marker, name: 'Isolation', email: marker });

    try {
      const { rows } = await db.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM e2e.users WHERE email = ${marker}`,
      );
      expect(rows[0]?.count).toBe(1);
    } finally {
      await db.delete(users).where(eq(users.email, marker));
    }
  });

  it('runs raw SQL against the e2e schema too', async () => {
    const { rows } = await testDatabase(app).execute<{ schema: string }>(
      sql`SELECT current_schema() AS schema`,
    );
    expect(rows[0]?.schema).toBe('e2e');
  });
});
