# 0008. Flat workspace layout

- **Status**: Accepted
- **Date**: 2026-11-07

## Context

ADR 0001 placed workspaces under `apps/*` and `packages/*`, following Turborepo's suggested
layout. With only four workspaces, the extra level made the repository harder to read: the
grouping folders add a step to every path without telling you anything about the code, and the
`@repo/tsconfig` package existed only to share one config file.

## Decision

Put each workspace directly at the root: `web`, `api`, `shared` and `e2e`, listed one by one in
the root `package.json`. Replace the `@repo/tsconfig` package with a root `tsconfig.base.json`
that each project extends by relative path.

The rest of ADR 0001 stands: one repository, npm workspaces and Turborepo.

## Consequences

- Paths are shorter and the root listing shows the whole system at a glance.
- A new workspace must be added to `workspaces` by name; there is no glob to pick it up.
- Package names (`web`, `api`, `@repo/shared`, `e2e`) are unchanged, so `-w` and `--filter`
  commands work as before.
