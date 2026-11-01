# 0006. A configurable catalog

- **Status**: Accepted
- **Date**: 2026-11-01

## Context

The store sells clothing in many variations: sizes that differ by garment (S–XL, 30–40,
EU shoe sizes), colours, fits and fabrics. These change over time and must not require a
code change. Prices must be exact, and the store must be able to run in a currency other
than PKR.

## Decision

- **Admin-defined options.** Admins create option types (e.g. Size, Colour, Fit) and
  their values. A type is `text` (labels such as M) or `color` (labels with a hex swatch).
  The kind is fixed after creation so existing values stay valid. Values keep the order
  they were added in. Products will pick the option types they use, and each combination
  of values becomes a variant with its own SKU and stock.
- **Category tree.** Categories nest (e.g. Women › Kurtas). Moves that would create a
  cycle are rejected, and a category with sub-categories can't be deleted.
- **Money as integers.** Prices are stored as integers in the currency's minor unit, as
  defined by the runtime's currency data (`Intl`). PKR has no minor unit in that data, so
  Rs 4,990 is stored as `4990`. USD stores cents. Helpers in `@repo/shared` convert and
  format.
- **Store settings from the environment.** `STORE_CURRENCY` and `STORE_LOCALE` are
  validated against `Intl` at startup and published at `GET /api/v1/store`. They are
  deployment configuration, not admin settings, because changing the currency doesn't
  convert existing prices.
- **Constraints in the database.** Uniqueness (slugs) and references are enforced by
  Postgres. The API maps violations to `409`/`404` instead of checking first, which would
  race.

## Consequences

- New sizes, colours or option types need no deployment.
- Prices never suffer floating-point rounding, and formatting follows the store locale.
- Switching currency requires migrating prices. That is deliberate and documented on the
  setting.
- Admin forms and the API share one set of Zod schemas, so a rule is defined once.
