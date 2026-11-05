import { defineConfig } from '@playwright/test';
import { API_DIR, API_URL, apiEnv, FAKE_STRIPE_URL, WEB_DIR, WEB_URL } from './support/env.ts';

const port = (url: string) => new URL(url).port;

/** Run with `npm run test:browser`, which builds the apps and resets the test data first. */
export default defineConfig({
  testDir: './tests',
  // The tests share a database and a fake Stripe, and some change how Stripe behaves.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: WEB_URL,
    // Installed on developers' machines and GitHub's runners; no separate download.
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node support/fake-stripe.ts',
      url: `${FAKE_STRIPE_URL}/health`,
    },
    {
      command: 'node dist/main',
      cwd: API_DIR,
      env: apiEnv,
      url: `${API_URL}/api/health`,
    },
    {
      command: `npx next start --port ${port(WEB_URL)}`,
      cwd: WEB_DIR,
      env: { API_URL, SITE_URL: WEB_URL },
      url: WEB_URL,
    },
  ],
});
