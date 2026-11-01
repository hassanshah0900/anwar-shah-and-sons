# web

Next.js storefront for Anwar Shah & Sons. See the [root README](../../README.md) for the overall setup.

## Configuration

Copy `.env.example` to `.env.local`. Server-side variables are validated by
[`src/lib/env.ts`](src/lib/env.ts) when first read, at request time, so the same build can target any environment.

| Variable  | Description                                           |
| --------- | ----------------------------------------------------- |
| `API_URL` | Base URL of the NestJS API, reachable from the server |

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the dev server on port 3000 |
| `npm run build`     | Production build                  |
| `npm start`         | Serve the production build        |
| `npm test`          | Unit tests (`src/**/*.test.ts`)   |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | TypeScript                        |

## Structure

```
src/
  app/           routes (App Router)
  components/    React components
  lib/
    api/         server-only API clients, validated with @repo/shared schemas
    env.ts       server environment validation
```

Data is fetched in Server Components. Uncached data is rendered inside `<Suspense>` so the
static shell is served immediately (Cache Components).
