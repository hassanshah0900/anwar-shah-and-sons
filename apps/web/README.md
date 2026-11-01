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
  app/           routes (App Router); (store) group holds the storefront layout
  components/
    layout/      header, footer, mobile navigation
    ui/          shadcn/ui components, restyled to the design system
  config/        site name and navigation
  lib/
    api/         server-only API clients, validated with @repo/shared schemas
    env.ts       server environment validation
    fonts.ts     next/font definitions
  styles/        vendored shadcn variants
  test/          design system guard test
```

Data is fetched in Server Components. Uncached data is rendered inside `<Suspense>` so the
static shell is served immediately (Cache Components).
