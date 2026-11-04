# api

NestJS REST API for Anwar Shah & Sons. See the [root README](../../README.md) for the overall setup.

## Configuration

Copy `.env.example` to `.env`. Every variable is validated at startup by
[`src/config/env.ts`](src/config/env.ts). The app refuses to start if one is missing or malformed.

| Variable                                                              | Description                                              | Default                                  |
| --------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `NODE_ENV`                                                            | `development`, `test` or `production`                    | `development`                            |
| `PORT`                                                                | HTTP port                                                | `4000`                                   |
| `CORS_ORIGIN`                                                         | Origin allowed to call the API (the web app)             | (required)                               |
| `DATABASE_URL`                                                        | PostgreSQL connection string                             | (required)                               |
| `BETTER_AUTH_SECRET`                                                  | Signs auth cookies; at least 32 characters               | (required)                               |
| `BETTER_AUTH_URL`                                                     | Public URL of the web app (it proxies `/api/auth/*`)     | (required)                               |
| `STORE_CURRENCY`                                                      | ISO 4217 currency for all prices                         | `PKR`                                    |
| `STORE_LOCALE`                                                        | Locale for formatting prices and dates                   | `en-PK`                                  |
| `SHIPPING_FLAT_RATE`                                                  | Shipping per order, in major units (e.g. `250`)          | `0`                                      |
| `FREE_SHIPPING_OVER`                                                  | Subtotal (major units) from which shipping is free       | (none)                                   |
| `EMAIL_DRIVER`                                                        | `log` (print emails to the console) or `smtp`            | `log`                                    |
| `EMAIL_FROM`                                                          | Sender name and address                                  | `Anwar Shah & Sons <no-reply@localhost>` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP server for the `smtp` driver (`SMTP_HOST` required) | port `587`                               |
| `STORAGE_DRIVER`                                                      | `local` (a directory) or `s3`                            | `local`                                  |
| `STORAGE_LOCAL_DIR`                                                   | Directory for the local driver                           | `uploads`                                |
| `S3_BUCKET`, `S3_REGION`                                              | Bucket for the S3 driver (required with `s3`)            |                                          |
| `S3_ENDPOINT`                                                         | S3-compatible endpoint such as MinIO; omit for AWS       |                                          |

`ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` are read only by `npm run db:seed`.

With `STORAGE_DRIVER=s3` the API needs `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on
`products/*` in the bucket. Credentials come from the AWS default chain (e.g. the ECS task
role). See [ADR 0007](../../docs/adr/0007-media-storage.md).

## Routes

| Route                                         | Description                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                             | Health check: `200` when all dependencies are up, else `503` (public)                                                 |
| `/api/auth/*`                                 | Better Auth: sign-up, sign-in, sign-out, session (public)                                                             |
| `GET /api/v1/users/me`                        | The signed-in user                                                                                                    |
| `GET /api/v1/users`                           | All users (admin only)                                                                                                |
| `GET /api/v1/store`                           | Store currency and locale (public)                                                                                    |
| `GET /api/v1/categories`                      | Category tree (public)                                                                                                |
| `GET /api/v1/products`                        | Active products: `category`, `q`, repeated `option=<option>:<value>`, `minPrice`, `maxPrice`, `sort`, `page` (public) |
| `GET /api/v1/products/:slug`                  | Product page data with stock levels, not counts (public)                                                              |
| `GET /api/v1/cart`                            | The visitor's cart, with live prices and stock levels (public)                                                        |
| `POST /api/v1/cart/items`                     | Add `{ variantId, quantity }`; a guest's first add returns a new cart token (public)                                  |
| `PATCH /api/v1/cart/items/:variantId`         | Set `{ quantity }`; `0` removes the line (public)                                                                     |
| `DELETE /api/v1/cart/items/:variantId`        | Remove a line (public)                                                                                                |
| `POST /api/v1/checkout`                       | Place an order from the signed-in customer's cart (`address`, `expectedTotal`, `notes`)                               |
| `GET /api/v1/orders`                          | The customer's orders (`status`, `page`)                                                                              |
| `GET /api/v1/orders/:number`                  | One of the customer's orders                                                                                          |
| `/api/v1/admin/orders`                        | All orders: list (`status`, `page`), get, `PATCH { status }` (admin)                                                  |
| `/api/v1/admin/categories`                    | Category tree: list, create, update, delete (admin)                                                                   |
| `/api/v1/admin/option-types`                  | Product options and their values (admin)                                                                              |
| `/api/v1/admin/products`                      | Products: list (filter, search, paginate), create, update, delete (admin)                                             |
| `/api/v1/admin/products/:id/variants`         | Variants: add, update, delete, `POST /generate` all combinations (admin)                                              |
| `/api/v1/admin/products/:id/images`           | Images: multipart upload (`file`, `alt`, `optionValueId`), update, delete (admin)                                     |
| `GET /api/v1/media/products/:productId/:file` | Uploaded images, cached forever (public)                                                                              |

Every route requires a session unless it is marked `@AllowAnonymous()`, and every write
must come from the web app's origin (CSRF). Request bodies are validated with the shared
Zod schemas. See
[ADR 0005](../../docs/adr/0005-authentication-with-better-auth.md).

## Cart

Signed-in customers' carts belong to their account. Guests get a random token on their
first add, which the web app keeps in a cookie and sends back in the `x-cart-token` header;
only its SHA-256 hash is stored. When a customer is signed in and still holds a guest token,
the guest cart joins theirs (quantities add up, to at most 10 per item).

Prices are never stored in the cart, so it always shows the live price. Lines whose product
was unpublished, or whose stock fell below the quantity, are marked unavailable and left out
of the subtotal.

## Orders

Checkout needs a signed-in customer and pays cash on delivery. In one transaction it checks
that every line is still available, compares the total with `expectedTotal` (the amount the
shopper saw; a mismatch is refused), takes stock with a conditional update so it can't go
below zero, creates the order and empties the cart. If any step fails, nothing changes.

Orders copy product names, options, SKUs and prices, so catalog edits never change past
orders. Numbers start at 1001. Status moves `pending → confirmed → shipped → delivered`, and
`pending` or `confirmed` orders can be `cancelled`, which puts their items back in stock.

## Email

`Mailer` sends through the driver chosen with `EMAIL_DRIVER`. In development, `log` prints each
email (with its links) to the API console. In production, `smtp` works with any SMTP server,
such as AWS SES's SMTP endpoint.

- **Password reset:** Better Auth emails a link to the web app's `/reset-password` page. It is
  valid for an hour, and resetting signs out the account's other sessions.
- **Orders:** customers are emailed when an order is placed, shipped or cancelled.

Emails are sent after the request's work is committed and never make it fail; a failed send
is logged.

## Scripts

| Command               | Description                                |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Start in watch mode                        |
| `npm run build`       | Compile to `dist/`                         |
| `npm start`           | Run the compiled app                       |
| `npm test`            | Unit tests (`src/**/*.spec.ts`)            |
| `npm run test:e2e`    | HTTP-level tests (`test/**/*.e2e-spec.ts`) |
| `npm run db:generate` | Generate the Prisma client                 |
| `npm run db:migrate`  | Create and apply a migration (development) |
| `npm run db:deploy`   | Apply pending migrations (production)      |
| `npm run db:studio`   | Open Prisma Studio                         |

Run them from this directory, or from the root with `npm run <script> -w api`.

## Structure

```
src/
  auth/         Better Auth instance and Nest module
  catalog/      categories, product options, products and variants
  common/       validation pipe, error filter, origin guard
  config/       environment validation
  prisma/       PrismaService (single client / connection pool)
  health/       health check module
  store/        store settings endpoint
  storage/      media storage drivers (local, S3) and image type detection
  media/        serves uploaded media
  storefront/   public catalog: categories, product listing and pages
  users/        current user and admin user list
  generated/    Prisma client (generated, git-ignored)
  app.setup.ts  HTTP setup shared by main.ts and e2e tests
prisma/
  schema.prisma
test/           e2e tests
```
