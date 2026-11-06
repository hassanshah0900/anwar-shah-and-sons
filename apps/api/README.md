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
| `STORE_TIMEZONE`                                                      | IANA time zone for the dashboard's days                  | `Asia/Karachi`                           |
| `STORE_LOCALE`                                                        | Locale for formatting prices and dates                   | `en-PK`                                  |
| `GUEST_CART_TTL_DAYS`                                                 | Guest carts untouched this long are deleted daily        | `60`                                     |
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

| Route                                         | Description                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/health`                             | Health check: `200` when all dependencies are up, else `503` (public)                                                    |
| `/api/auth/*`                                 | Better Auth: sign-up, sign-in, sign-out, session (public)                                                                |
| `GET /api/v1/users/me`                        | The signed-in user                                                                                                       |
| `GET /api/v1/users`                           | Users, newest first, by `page` and `pageSize` (default 25, at most 100; admin only)                                      |
| `GET /api/v1/store`                           | Store currency and locale (public)                                                                                       |
| `GET /api/v1/categories`                      | Category tree (public)                                                                                                   |
| `GET /api/v1/products`                        | Active products: `category`, `q`, repeated `option=<option>:<value>`, `minPrice`, `maxPrice`, `sort`, `page` (public)    |
| `GET /api/v1/products/:slug`                  | Product page data with stock levels, not counts (public)                                                                 |
| `GET /api/v1/cart`                            | The visitor's cart, with live prices and stock levels (public)                                                           |
| `POST /api/v1/cart/items`                     | Add `{ variantId, quantity }`; a guest's first add returns a new cart token (public)                                     |
| `PATCH /api/v1/cart/items/:variantId`         | Set `{ quantity }`; `0` removes the line (public)                                                                        |
| `DELETE /api/v1/cart/items/:variantId`        | Remove a line (public)                                                                                                   |
| `POST /api/v1/checkout`                       | Place an order from the signed-in customer's cart (`address`, `expectedTotal`, `notes`)                                  |
| `GET /api/v1/orders`                          | The customer's orders (`status`, `page`)                                                                                 |
| `GET /api/v1/orders/:number`                  | One of the customer's orders                                                                                             |
| `/api/v1/addresses`                           | The customer's address book: list, add, `PATCH` (fields sent only), delete; one default, up to 10                        |
| `GET /api/v1/admin/dashboard`                 | Today and the last 30 days (orders, revenue, daily figures), orders to confirm or ship, low stock, recent orders (admin) |
| `/api/v1/admin/orders`                        | All orders: list (`status`, `page`), get, `PATCH { status }` (admin)                                                     |
| `/api/v1/admin/categories`                    | Category tree: list, create, update, delete (admin)                                                                      |
| `/api/v1/admin/option-types`                  | Product options and their values (admin)                                                                                 |
| `/api/v1/admin/products`                      | Products: list (filter, search, paginate), create, update, delete (admin)                                                |
| `/api/v1/admin/products/:id/variants`         | Variants: add, update, delete, `POST /generate` all combinations (admin)                                                 |
| `/api/v1/admin/products/:id/images`           | Images: multipart upload (`file`, `alt`, `optionValueId`), update, delete (admin)                                        |
| `GET /api/v1/media/products/:productId/:file` | Uploaded images, cached forever (public)                                                                                 |

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

A daily job (03:00 UTC, `src/cart/cart-cleanup.job.ts`) deletes guest carts not changed for
`GUEST_CART_TTL_DAYS`. Customer carts are kept. Running it on several instances is harmless.

## Orders

Checkout needs a signed-in customer, who pays by card or cash on delivery. With `saveAddress: true` the
address is also added to the customer's address book, unless it's already there. In one transaction it checks
that every line is still available, compares the total with `expectedTotal` (the amount the
shopper saw; a mismatch is refused), takes stock with a conditional update so it can't go
below zero, creates the order and empties the cart. If any step fails, nothing changes.

Orders copy product names, options, SKUs and prices, so catalog edits never change past
orders. Numbers start at 1001. Status moves `pending → confirmed → shipped → delivered`, and
`pending` or `confirmed` orders can be `cancelled`, which puts their items back in stock. Admins
can do this, and so can customers for their own orders (`POST /api/v1/orders/<number>/cancel`).

## Card payments

Setting `STRIPE_SECRET_KEY` turns on card payments through Stripe Checkout, Stripe's hosted page,
so card details never reach this app. Without it, the store offers only cash on delivery.

1. Checkout creates the order as usual, holding the stock, and answers with a `paymentUrl`. The
   cart is emptied once that page exists, so a Stripe failure leaves the bag as it was.
2. Stripe calls `POST /api/v1/webhooks/stripe` when the session completes or expires. The
   signature is checked against the raw body, and Stripe is then asked for the session's state,
   so repeated or out-of-order calls are harmless.
3. Paid orders become `confirmed` and the confirmation email goes out. Expired ones (after
   `PAYMENT_WINDOW_MINUTES`) are cancelled and restocked.
4. Viewing an unpaid order also asks Stripe, so a customer returning from paying sees it paid even
   before the webhook. Every 10 minutes, a job settles overdue orders whose webhooks never came.

Cancelling a paid order refunds it, and so does a payment arriving after a cancellation. If the
refund fails, the order stays cancelled and marked paid. The dashboard then shows it as a refund
due, and the order page has a retry button (`POST /api/v1/admin/orders/<number>/refund`), which
emails the customer once it works. A charge already refunded in Stripe's dashboard counts as done.

To try it locally, with [test keys](https://dashboard.stripe.com/test/apikeys) and the
[Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe # Prints STRIPE_WEBHOOK_SECRET
```

Pay with card `4242 4242 4242 4242`, any future expiry and any CVC. In production, add a webhook
for `checkout.session.completed` and `checkout.session.expired`; the API must be reachable from the
internet at that path.

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
