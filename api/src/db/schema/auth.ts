import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, fk, timestamp3, updatedAt } from './columns.js';

// Better Auth's core tables plus its admin plugin (role, ban fields, impersonation).
// Better Auth creates the ids, so these tables have no id default.

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    /** System role: "customer" (default) or "admin". See @repo/shared roles. */
    role: text('role').notNull().default('customer'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp3('ban_expires'),
    createdAt: createdAt(),
    updatedAt: timestamp3('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    expiresAt: timestamp3('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    impersonatedBy: text('impersonated_by'),
    userId: text('user_id').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('sessions_token_key').on(t.token),
    index('sessions_user_id_idx').on(t.userId),
    fk('sessions_user_id_fkey', t.userId, users.id, 'cascade'),
  ],
);

/** Credentials per sign-in method. For email and password, `password` holds the hash. */
export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp3('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp3('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('accounts_user_id_idx').on(t.userId),
    fk('accounts_user_id_fkey', t.userId, users.id, 'cascade'),
  ],
);

/** Short-lived tokens, e.g. for email verification and password reset. */
export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp3('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp3('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);
