/**
 * Seeds the database. Idempotent: safe to run repeatedly.
 *
 *   npm run db:seed -w api
 *
 * Creates the admin account from ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD
 * (see .env.example), or promotes it if it already exists.
 */
import 'dotenv/config';
import { ADMIN_ROLE, emailSchema, passwordSchema } from '@repo/shared';
import { z } from 'zod';
import { createAuth } from '../src/auth/auth.js';
import { eq } from 'drizzle-orm';
import { validateEnv } from '../src/config/env.js';
import { createDatabase, createPool } from '../src/db/connection.js';
import { users } from '../src/db/schema/index.js';

const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).default('Store Admin'),
  ADMIN_EMAIL: emailSchema,
  ADMIN_PASSWORD: passwordSchema,
});

async function main() {
  const env = validateEnv(process.env);
  const admin = adminSchema.parse(process.env);
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, admin.ADMIN_EMAIL));

    if (!existing) {
      // Sign up through Better Auth so the password is hashed and stored its way.
      await createAuth(db, env).api.signUpEmail({
        body: { name: admin.ADMIN_NAME, email: admin.ADMIN_EMAIL, password: admin.ADMIN_PASSWORD },
      });
    }

    await db.update(users).set({ role: ADMIN_ROLE }).where(eq(users.email, admin.ADMIN_EMAIL));
    console.log(`Admin ready: ${admin.ADMIN_EMAIL}${existing ? ' (already existed)' : ''}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
