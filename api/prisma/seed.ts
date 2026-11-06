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
import { createDatabase, createPool } from '../src/db/connection.js';
import { validateEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter.js';

const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).default('Store Admin'),
  ADMIN_EMAIL: emailSchema,
  ADMIN_PASSWORD: passwordSchema,
});

async function main() {
  const env = validateEnv(process.env);
  const admin = adminSchema.parse(process.env);
  const prisma = new PrismaClient({ adapter: createPrismaAdapter(env.DATABASE_URL) });
  // Better Auth goes through Drizzle; the rest of this script still uses Prisma.
  const pool = createPool(env.DATABASE_URL);

  try {
    const existing = await prisma.user.findUnique({ where: { email: admin.ADMIN_EMAIL } });

    if (!existing) {
      // Sign up through Better Auth so the password is hashed and stored its way.
      await createAuth(createDatabase(pool), env).api.signUpEmail({
        body: { name: admin.ADMIN_NAME, email: admin.ADMIN_EMAIL, password: admin.ADMIN_PASSWORD },
      });
    }

    await prisma.user.update({ where: { email: admin.ADMIN_EMAIL }, data: { role: ADMIN_ROLE } });
    console.log(`Admin ready: ${admin.ADMIN_EMAIL}${existing ? ' (already existed)' : ''}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
