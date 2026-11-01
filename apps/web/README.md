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

## Authentication

Better Auth runs in the API. `src/app/api/auth/[...all]/route.ts` proxies `/api/auth/*` to
it, so session cookies stay first-party on the web origin.

- **Server:** `src/lib/auth/session.ts` (`getSessionUser`, `requireUser`, `requireAdmin`).
  Render anything that reads the session inside `<Suspense>`.
- **Browser:** `src/lib/auth/client.ts` (sign-in, sign-up, sign-out).
- **`src/proxy.ts`:** redirects visitors without a session cookie away from `/account`
  and `/admin` before rendering.

## Design system

Monochrome tokens, a 4px maximum radius and borders over shadows, built on shadcn/ui. The
rules and their enforcement are described in
[ADR 0004](../../docs/adr/0004-monochrome-design-system.md).

- **Tokens:** `src/app/globals.css`. Tailwind's default palette is removed, so use semantic
  classes (`bg-background`, `text-muted-foreground`, `border-border`).
- **Fonts:** `src/lib/fonts.ts`. `h1`/`h2` use the display serif by default.
- **Components:** `src/components/ui`. Add new ones with `npx shadcn@4.23.0 add <name>`, then
  restyle them to the system. `npm test` flags most deviations.
- **Style guide:** http://localhost:3000/styleguide shows every token and component.

## Structure

```
src/
  app/           routes (App Router); (store) = storefront, admin = admin area
  proxy.ts       redirects signed-out visitors from protected routes
  components/
    account/     account menu and sign-out
    auth/        sign-in and sign-up forms
    layout/      header, footer, mobile navigation
    ui/          shadcn/ui components, restyled to the design system
  config/        site name and navigation
  lib/
    api/         server-only API clients, validated with @repo/shared schemas
    auth/        session access, auth client, safe redirects
    env.ts       server environment validation
    fonts.ts     next/font definitions
  styles/        vendored shadcn variants
  test/          design system guard test
```

Data is fetched in Server Components. Uncached data is rendered inside `<Suspense>` so the
static shell is served immediately (Cache Components).
