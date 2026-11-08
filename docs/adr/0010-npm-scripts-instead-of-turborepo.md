# 0010. Plain npm scripts instead of Turborepo

- **Status**: Accepted
- **Date**: 2026-11-08

## Context

ADR 0001 chose Turborepo to run tasks in dependency order and cache them. With three
buildable workspaces, the only ordering that matters is building `shared` before the apps, and
caching saves a few seconds. Turborepo was one more tool to learn and explain, and it added
steps to CI and container builds.

## Decision

Remove Turborepo. Root scripts in `package.json` build `shared` first, then run each task
across the workspaces with `npm run <task> --workspaces --if-present`.

## Consequences

- One tool fewer: everything runs through npm, which ships with Node.js.
- Tasks run one workspace at a time, with no cache, so full builds take slightly longer.
- The order lives in the root scripts; a new workspace that others depend on must be added there.
