# 0002. Shared Zod contracts between web and api

- **Status**: Accepted
- **Date**: 2026-11-01

## Context

The web app consumes the API's JSON responses. If those shapes are declared separately on
each side, they drift, and the mismatch only shows up at runtime.

## Decision

Define every request and response shape once, as a Zod schema in `packages/shared`, and
export the inferred TypeScript type alongside it.

- The **api** uses the types for its return values (and, for requests, the schemas for validation).
- The **web** app uses the schemas to validate responses at runtime before trusting them.

## Consequences

- A breaking change to a contract fails type checking in whichever app is now wrong.
- The web app degrades gracefully when it receives an unexpected payload instead of
  crashing mid-render.
- `packages/shared` must be built before the apps. Turborepo's `^build` dependency handles this.
- The package must stay free of framework- and server-specific code so both apps can import it.
