# 0001. Monorepo with npm workspaces and Turborepo

- **Status**: Accepted
- **Date**: 2026-11-01

## Context

The platform has a Next.js frontend and a NestJS backend that change together: most features
touch the API contract and the UI that consumes it. Keeping them in separate repositories
would mean coordinating versions of a shared contracts package and opening paired pull
requests for every feature.

## Decision

Use a single repository with npm workspaces (`apps/*`, `packages/*`) and Turborepo as the
task runner. Infrastructure stays in a separate Terraform repository because it has a
different lifecycle and access model.

npm was chosen over pnpm and Yarn because it ships with Node.js, so contributors and CI need
nothing extra. Turborepo was chosen over Nx because it is smaller, needs no framework
plugins, and covers what we need: dependency-ordered tasks and caching.

## Consequences

- A feature (API, contract and UI) lands in one pull request and is reviewed as a whole.
- Turborepo builds `packages/shared` before the apps and skips unchanged work through caching.
- Both apps share one lockfile, so dependency upgrades are coordinated.
- CI and deployment must work out which app changed rather than deploying everything.
