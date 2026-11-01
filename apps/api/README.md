# api

NestJS REST API for Anwar Shah & Sons. See the [root README](../../README.md) for the overall setup.

## Configuration

Copy `.env.example` to `.env`. Every variable is validated at startup by
[`src/config/env.ts`](src/config/env.ts). The app refuses to start if one is missing or malformed.

| Variable       | Description                                  | Default       |
| -------------- | -------------------------------------------- | ------------- |
| `NODE_ENV`     | `development`, `test` or `production`        | `development` |
| `PORT`         | HTTP port                                    | `4000`        |
| `CORS_ORIGIN`  | Origin allowed to call the API (the web app) | (required)    |
| `DATABASE_URL` | PostgreSQL connection string                 | (required)    |

## Routes

| Route             | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `GET /api/health` | Health check: `200` when all dependencies are up, else `503` |
| `/api/v1/...`     | Versioned resources                                          |

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
  config/       environment validation
  prisma/       PrismaService (single client / connection pool)
  health/       health check module
  generated/    Prisma client (generated, git-ignored)
  app.setup.ts  HTTP setup shared by main.ts and e2e tests
prisma/
  schema.prisma
test/           e2e tests
```
