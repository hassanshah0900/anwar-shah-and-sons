# Anwar Shah & Sons

An online store for Anwar Shah & Sons, my uncle's clothing business. It's built as one TypeScript
monorepo, with a Next.js storefront and a NestJS REST API.

> Infrastructure (AWS, provisioned with Terraform) lives in a [separate repository](https://github.com/hassanshah0900/anwar-shah-and-sons-infrastructure).

## Architecture

```mermaid
flowchart LR
    browser([Browser]) --> web["web<br/>Next.js"]
    web -- "REST /api" --> api["api<br/>NestJS"]
    api -- Prisma --> db[(PostgreSQL)]
    shared["@repo/shared<br/>Zod contracts"] -.-> web
    shared -.-> api
```

- **`apps/web`**: Next.js (App Router) storefront. Server Components call the API from the server.
- **`apps/api`**: NestJS REST API. Owns the database through Prisma.
- **`packages/shared`**: Zod schemas and inferred types for every API contract, used by both
  apps. A breaking API change fails type checking in the web app.

## Tech stack

| Area      | Choice                                   |
| --------- | ---------------------------------------- |
| Language  | TypeScript (strict)                      |
| Frontend  | Next.js 16, React 19, Tailwind CSS 4     |
| UI        | shadcn/ui (Radix), Lucide icons          |
| Backend   | NestJS 12                                |
| Database  | PostgreSQL, Prisma 7 (pg driver adapter) |
| Contracts | Zod 4                                    |
| Auth      | Better Auth (sessions, roles)            |
| Testing   | Vitest, Supertest, Playwright            |
| Linting   | ESLint (web), oxlint (api), Prettier     |
| Monorepo  | npm workspaces, Turborepo                |

## Repository structure

```
apps/
  api/            NestJS API
  web/            Next.js storefront
packages/
  shared/         API contracts (Zod schemas + types)
  tsconfig/       shared TypeScript configs
docs/
  adr/            architecture decision records
```

## Getting started

### Prerequisites

- Node.js 24 (`nvm use`)
- Docker (for the local PostgreSQL database)

### Setup

```bash
npm install

cp .env.example .env                          # choose a POSTGRES_PASSWORD
cp apps/api/.env.example apps/api/.env        # use the same password in DATABASE_URL
cp apps/web/.env.example apps/web/.env.local

docker compose up -d                          # PostgreSQL on localhost:5432
npm run db:deploy -w api                      # apply database migrations
npm run db:seed -w api                        # create the admin from ADMIN_* in apps/api/.env
npm run db:seed:demo -w api                   # optional: demo catalog, customers and orders
npm run dev
```

Sign in at http://localhost:3000/sign-in with the admin account to reach `/admin`, or
create a customer account at `/sign-up`.

The demo seed adds 18 products across Women, Men and Kids (with generated photos, sizes,
colours and stock), 8 customers (`*@demo.example.com`, password `demo-password`) with
addresses, and 60 orders over the last two months. It only adds what's missing, never
deletes, and refuses to run with `NODE_ENV=production`.

The local database is PostgreSQL 17 in Docker. The password is passed to the container as
a Compose secret, not an environment variable. Stop it with `docker compose down`; add `-v`
to delete its data. Production uses Aurora PostgreSQL, provisioned in the infrastructure
repository.

| App | URL                              |
| --- | -------------------------------- |
| web | http://localhost:3000            |
| api | http://localhost:4000/api        |
|     | http://localhost:4000/api/health |

### Scripts

Run from the repository root. Turborepo runs each task in every workspace that defines it.

| Command                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start all apps in watch mode                       |
| `npm run build`        | Build all packages and apps                        |
| `npm run lint`         | Lint all workspaces                                |
| `npm run typecheck`    | Type-check all workspaces                          |
| `npm test`             | Run unit tests                                     |
| `npm run test:browser` | Run browser tests (needs Postgres; see `apps/e2e`) |
| `npm run format`       | Format the repo with Prettier                      |
| `npm run format:check` | Check formatting without fixes                     |

App-specific commands (database migrations, e2e tests) are in each app's README.

## Contributing

This repository follows GitHub Flow and Conventional Commits. See [CONTRIBUTING.md](CONTRIBUTING.md).
