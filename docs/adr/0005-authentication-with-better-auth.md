# 0005. Authentication with Better Auth

- **Status**: Accepted
- **Date**: 2026-11-01

## Context

Customers need accounts and staff need an admin area, so the platform needs sign-up,
sign-in, sessions and role-based authorisation. Options considered:

- **Build it in NestJS** (password hashing, JWTs, refresh rotation): full control, but a
  lot of security-sensitive code to write and maintain.
- **AWS Cognito**: managed, but ties the app to AWS, is awkward to run locally, and
  adds per-user cost at scale.
- **Better Auth**: an open-source (MIT) TypeScript library that runs in our own API and
  stores everything in our own database.

## Decision

Use **Better Auth inside the NestJS API**, via `@thallesp/nestjs-better-auth`:

- **Email and password** sign-up and sign-in. Sessions are database-backed (Postgres via
  the Prisma adapter) and carried in an HttpOnly cookie.
- **Roles** from the admin plugin: `customer` (default) and `admin`, defined in
  `@repo/shared`. Admins are created by the seed script, never by sign-up.
- **Default deny:** a global guard requires a session on every API route unless it is
  marked `@AllowAnonymous()`. Admin routes add `@Roles(['admin'])`.
- **Same-origin cookies:** the web app proxies `/api/auth/*` to the API, so the browser
  only talks to the web origin and the session cookie is first-party. `BETTER_AUTH_URL`
  is the web app's URL.
- **CSRF:** Better Auth rejects state-changing requests from untrusted origins. It skips
  this check under `NODE_ENV=test` by default, so we force it on, and tests cover it.

In the web app, a server-only Data Access Layer (`src/lib/auth/session.ts`) reads the
session. A Next.js proxy redirects visitors without a session cookie away from
`/account` and `/admin` before rendering, and the pages then validate the session
properly. Non-admins get a 404 for the admin area instead of a 403, so its existence is
not revealed.

## Consequences

- No auth service to run or pay for. Accounts live in our database next to orders.
- Sessions can be revoked server-side. Signing out deletes the session row.
- Adding social login, two-factor or password reset later is configuration plus UI, not
  new infrastructure. Email-based flows need an email provider first.
- Every new API route is private by default. Public endpoints such as the catalog must
  opt out explicitly with `@AllowAnonymous()`.
- The NestJS integration is a community package, so its upgrades need checking.
