# Browser tests

Playwright tests of the main customer and admin journeys, against the built web app and API.

```bash
npm run test:browser
```

This needs Postgres running and Google Chrome installed. Stop `npm run dev` first, since both build
into the same folders. Add `-- --ui` or `-- --headed` after the command to watch them run.

The run builds the apps, wipes the `browser_tests` schema, fills it with the demo data and starts
everything on its own ports (3310, 4310, 4311). Your development data isn't touched.

## Stripe

`support/fake-stripe.ts` stands in for Stripe, so no keys or network are needed. The API uses the
real Stripe SDK against it (`STRIPE_API_URL`, refused in production), and webhooks are signed the
way Stripe signs them. That checks request formats, signatures and the amount conversion, but not
Stripe's own behaviour, so try real test keys before going live (see `api/README.md`).

## In CI

Run it with a Postgres service and `DATABASE_URL` set. GitHub's Ubuntu runners already have Chrome.
Failed tests leave traces and screenshots in `test-results/`, which are worth uploading.
