# web

Next.js storefront for Anwar Shah & Sons. See the [root README](../../README.md) for the overall setup.

## Configuration

Copy `.env.example` to `.env.local`. Server-side variables are validated by
[`src/lib/env.ts`](src/lib/env.ts) when first read, at request time, so the same build can target any environment.

| Variable   | Description                                               |
| ---------- | --------------------------------------------------------- |
| `API_URL`  | Base URL of the NestJS API, reachable from the server     |
| `SITE_URL` | Public URL of the store; read at build time too (see SEO) |

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
- **Browser:** `src/lib/auth/client.ts` (sign-in, sign-up, sign-out, password reset).
- **Password reset:** `/forgot-password` asks the API to email a link, with the same answer
  whether or not the address has an account. The link opens `/reset-password?token=…`, which
  sets the new password; expired or used links offer a new one.
- **`src/proxy.ts`:** redirects visitors without a session cookie away from `/account`,
  `/checkout` and `/admin` before rendering.
- After signing in or up, the forms do a full page load, so the browser can't reuse a
  cached "redirect to sign-in" for the page the visitor was heading to.

## Shop

- **`/`**: home page with categories and new arrivals. Its copy lives in `src/config/site.ts`.
- **`/shop`** (all products, with `?q=` search) and **`/shop/<category>`** (includes
  sub-categories): filters, sort and pagination.
- **Search:** the header's search button opens a bar that searches `/shop?q=`.
- **Help and company pages:** `/contact`, `/shipping`, `/returns`, `/about`. Their wording and
  the store's contact details are in `src/config/content.ts`; shipping charges come from the
  store settings, so the page always matches checkout.
- **Errors:** `(store)/error.tsx` and `admin/error.tsx` show a retry page inside the normal
  layout; `global-error.tsx` covers failures of the root layout.
- **Navigation:** the header, mobile menu and footer list the top-level categories, so the
  menus follow what admins create.

- **`/products/<slug>`**: gallery, colour and size pickers, and the chosen variant's price
  and stock. Picking a colour shows that colour's images. Choices that are sold out or don't
  exist with the current selection are crossed out but can still be picked; picking one
  clears the choices it can't combine with (`src/lib/catalog/variant-selection.ts`). The
  choice is kept in the URL (`?colour=black&size=m`). Drafts and unknown slugs show the 404 page.

- **`/cart`**: the bag, with quantity steppers, remove, and a subtotal. "Add to bag" on the
  product page and the header's item count use the same Server Actions
  (`src/app/(store)/cart/actions.ts`).

- **`/checkout`** (signed in): shipping address (the default saved address is filled in, others
  can be picked, and a new one can be saved), cash on delivery and the order summary. Guests
  are sent to sign in first; their bag comes with them. The form sends back the total it
  showed, so the API refuses the order if prices changed.
- **`/account`**: change name and password (other devices are signed out), with links to
  orders and **`/account/addresses`**, the address book (add, edit, delete, choose a default).
- **`/account/orders`** and **`/account/orders/<number>`**: order history and details. A new
  order opens with a thank-you note.

A guest's cart token is kept in the `cart_token` cookie (httpOnly, 60 days) and sent to the
API as `x-cart-token` by `src/lib/api/cart.ts`. When a signed-in shopper changes the cart, the
API has already moved any guest cart to their account, so the cookie is deleted.

The page's state lives in the URL (`option=size:m`, `min`, `max`, `sort`, `page`); see
`src/lib/catalog/listing-params.ts`. Filters are plain links and a GET form, so they work
without JavaScript and every view can be shared. Catalog data comes from the public API
through `src/lib/api/catalog.ts`, without cookies.

## SEO

- **`SITE_URL`** (default `http://localhost:3000`) is the store's public URL, used for absolute
  links in metadata, `robots.txt`, the sitemap and structured data. It is read at build time,
  so set it for builds as well as at runtime.
- **`/robots.txt`** keeps the admin, account, cart, checkout and API out of search engines and
  points to **`/sitemap.xml`**, which lists the fixed pages, every category and every active
  product, built per request from the catalog.
- **Product pages** include schema.org `Product` (price or price range, currency, stock) and
  `BreadcrumbList` data for rich results (`src/lib/seo/structured-data.ts`).
- **Canonical URLs:** variant choices, filters, sorting and pages point to the plain product or
  category URL. Search results are `noindex`.

## Admin

`/admin` (admins only) opens on a dashboard: today's and 30-day revenue and orders, a daily
revenue chart (hover or focus a column for its figures; also available as a table), orders
to confirm or ship, low stock and recent orders. Then Orders, Customers, Products,
Categories and Options. Orders can be
filtered by status and moved to their next status (confirm, ship, deliver); cancelling asks
first and returns the items to stock. Products are
created as drafts, get variants (generated from their options or added one by one) and can
then be published. Each product has an image gallery: uploads are checked in the browser
and by the API, and images can be tied to an option value such as a colour.

Product images are served at `/media/*`, streamed from the API, and optimised by `next/image`
(only `/media/**` is allowed). Server Actions accept bodies up to 6 MB for uploads. Changes go through Server
Actions that re-check the admin role, validate with the shared schemas and call the API
through `src/lib/api/server.ts`, which forwards the visitor's cookie and origin.

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
    admin/       admin navigation and dialogs
    auth/        sign-in and sign-up forms
    cart/        header bag button, add to bag, quantity controls
    orders/      order details and status badge
    layout/      header, footer, mobile navigation
    shop/        product card and grid, filters, sort, pagination, product page
    ui/          shadcn/ui components, restyled to the design system
  config/        site name, home page copy, footer links, help page content
  lib/
    api/         server-only API clients, validated with @repo/shared schemas
    auth/        session access, auth client, safe redirects
    catalog/     category tree, shop URL state, shop navigation, variant selection
    forms/       Server Action form state
    env.ts       server environment validation
    fonts.ts     next/font definitions
  styles/        vendored shadcn variants
  test/          design system guard test
```

Data is fetched in Server Components. Uncached data is rendered inside `<Suspense>` so the
static shell is served immediately (Cache Components).
