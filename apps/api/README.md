# api

NestJS REST API for Anwar Shah & Sons. See the [root README](../../README.md) for the overall setup.

## Configuration

Copy `.env.example` to `.env`. Every variable is validated at startup by
[`src/config/env.ts`](src/config/env.ts). The app refuses to start if one is missing or malformed.

| Variable             | Description                                          | Default       |
| -------------------- | ---------------------------------------------------- | ------------- |
| `NODE_ENV`           | `development`, `test` or `production`                | `development` |
| `PORT`               | HTTP port                                            | `4000`        |
| `CORS_ORIGIN`        | Origin allowed to call the API (the web app)         | (required)    |
| `DATABASE_URL`       | PostgreSQL connection string                         | (required)    |
| `BETTER_AUTH_SECRET` | Signs auth cookies; at least 32 characters           | (required)    |
| `BETTER_AUTH_URL`    | Public URL of the web app (it proxies `/api/auth/*`) | (required)    |

`ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` are read only by `npm run db:seed`.

## Routes

| Route                  | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `GET /api/health`      | Health check: `200` when all dependencies are up, else `503` (public) |
| `/api/auth/*`          | Better Auth: sign-up, sign-in, sign-out, session (public)             |
| `GET /api/v1/users/me` | The signed-in user                                                    |
| `GET /api/v1/users`    | All users (admin only)                                                |

Every route requires a session unless it is marked `@AllowAnonymous()`. See
[ADR 0005](../../docs/adr/0005-authentication-with-better-auth.md).

## Scripts

| Command               | Description                                |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Start in watch mode                        |
| `npm run build`       | Compile to `dist/`                         |
| `npm start`           | Run the compiled app                       |
| `npm test`            | Unit tests (`src/**/*.spec.ts`)            |
| `npm run test:e2e`    | HTTP-level tests (`test/**/*.e2e-spec.ts`) |
| `npm run db:generate` | Generate the Prisma client                 |
| `npm run db:migrate`  | Create and apply a migration (development) |
| `npm run db:deploy`   | Apply pending migrations (production)      |
| `npm run db:studio`   | Open Prisma Studio                         |

Run them from this directory, or from the root with `npm run <script> -w api`.

## Structure

```
src/
  auth/         Better Auth instance and Nest module
  config/       environment validation
  prisma/       PrismaService (single client / connection pool)
  health/       health check module
  users/        current user and admin user list
  generated/    Prisma client (generated, git-ignored)
  app.setup.ts  HTTP setup shared by main.ts and e2e tests
prisma/
  schema.prisma
test/           e2e tests
```
