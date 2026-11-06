# 0009. Drizzle as the ORM

- **Status**: Accepted
- **Date**: 2026-11-07
- **Supersedes**: [0003](0003-prisma-orm.md)

## Context

Prisma's schema is written in its own language, so TypeScript can't read it. A generate step
turns it into a client and types under `src/generated`, which must run before anything type
checks or builds, and after every schema change. In practice that step was a regular source
of friction: stale types after a schema edit, an extra Turborepo task, and generated code to
keep out of linting and formatting.

## Decision

Use Drizzle ORM with the `pg` driver:

- the schema is TypeScript, in `api/src/db/schema`, split by area like the API's modules;
  query types are inferred from it, with no generate step;
- `drizzle-kit generate` writes SQL migrations to `api/drizzle` from schema changes, and the
  API's own runner (`src/db/migrate.ts`) applies them;
- the first migration is a baseline that recreates the database Prisma's migrations built,
  checked object by object (columns, constraints, indexes, enums, the sequence and the reviews
  trigger). Databases Prisma already migrated record the baseline as applied instead of
  running it.

Migrations leave out the `public` schema name so the same files build the tests' own schemas.

The move happens over several pull requests. Until the last one, Prisma's client still runs
the queries Drizzle hasn't taken over, so `schema.prisma` must not change in the meantime.

## Consequences

- Schema edits show up in query types immediately.
- Queries read closer to the SQL they run, at the cost of Prisma's nested writes: related rows
  are inserted explicitly, inside a transaction.
- Things Drizzle's schema can't express (triggers, sequence settings) live as hand-written
  SQL in migrations, as they did with Prisma.
- The database is accessed only through the `DATABASE` provider, one connection pool per
  process.
