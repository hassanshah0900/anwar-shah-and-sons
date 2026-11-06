import { expect, type Browser, type Page } from '@playwright/test';
import { ADMIN, FAKE_STRIPE_URL, SHOPPER, WEB_URL } from '../support/env.ts';

const PASSWORD = 'correct-horse-battery';
let shoppers = 0;

/** The demo product every test buys: it comes in several colours and sizes. */
export const PRODUCT_SLUG = 'embroidered-lawn-kurta';
export const ADDRESS = { phone: '+92 300 1234567', line1: '12 Mall Road', city: 'Lahore' };

/** The visible page content: the router can keep the previous page hidden in the DOM. */
export const main = (page: Page) => page.locator('main:visible');

const authCall = (page: Page, path: string, data: object) =>
  page.request.post(`/api/auth/${path}`, { headers: { Origin: WEB_URL }, data });

/** A new page, signed in as a new customer, so tests can't affect each other's orders. */
export async function newShopper(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext({ baseURL: WEB_URL })).newPage();
  const email = `shopper-${Date.now()}-${++shoppers}@example.com`;
  const response = await authCall(page, 'sign-up/email', {
    name: 'Bilal Ahmed',
    email,
    password: PASSWORD,
  });
  expect(response.ok()).toBe(true);
  return page;
}

export async function newAdmin(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext({ baseURL: WEB_URL })).newPage();
  expect((await authCall(page, 'sign-in/email', ADMIN)).ok()).toBe(true);
  return page;
}

export { PASSWORD, SHOPPER };

/** Picks the first option still in stock in each group, then adds it to the bag. */
export async function addToBag(page: Page) {
  await page.goto(`/products/${PRODUCT_SLUG}`);
  const groups = main(page).locator('fieldset');
  await expect(groups.first()).toBeVisible();
  for (const group of await groups.all()) {
    // Unavailable values say why in their label, in brackets.
    await group.locator('[role=radio]:not([aria-label*="("])').first().click();
  }
  await main(page)
    .getByRole('button', { name: /add to bag/i })
    .click();
  await expect(page.getByRole('banner').getByRole('link', { name: /bag/i })).toContainText(/\d/);
}

/** Fills in the checkout form for a customer without a saved address. */
export async function fillAddress(page: Page) {
  await page.goto('/checkout');
  await page.locator('input[name="address.phone"]').fill(ADDRESS.phone);
  await page.locator('input[name="address.line1"]').fill(ADDRESS.line1);
  await page.locator('input[name="address.city"]').fill(ADDRESS.city);
}

export const orderNumber = (page: Page) => {
  const match = /\/orders\/(\d+)/.exec(page.url());
  if (!match) throw new Error(`Not on an order page: ${page.url()}`);
  return Number(match[1]);
};

/** Bag → checkout → Stripe's page, leaving the customer about to pay. */
export async function goToPayment(page: Page) {
  await addToBag(page);
  await fillAddress(page);
  await main(page)
    .getByRole('button', { name: /continue to payment/i })
    .click();
  await page.waitForURL(`${FAKE_STRIPE_URL}/**`);
}

export async function placeCashOrder(page: Page): Promise<number> {
  await addToBag(page);
  await fillAddress(page);
  await main(page).locator('label[for=payment-cod]').click();
  await main(page)
    .getByRole('button', { name: /place order/i })
    .click();
  await page.waitForURL(/\/account\/orders\/\d+\?placed=1/);
  return orderNumber(page);
}

/** Places a card order and pays it, ending on the order page. */
export async function placePaidOrder(page: Page): Promise<number> {
  await goToPayment(page);
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.waitForURL(/\/account\/orders\/\d+\?paid=1/);
  return orderNumber(page);
}

export const paymentSection = (page: Page) =>
  page.locator('section[aria-labelledby=payment-heading]');

const setFailing = async (page: Page, what: string, fail: boolean) => {
  const response = await page.request.post(`${FAKE_STRIPE_URL}/test/fail-${what}`, {
    form: { fail: String(fail) },
  });
  expect(response.ok()).toBe(true);
};

/** Makes Stripe refuse refunds, or accept them again. */
export const setRefundsFailing = (page: Page, fail: boolean) => setFailing(page, 'refunds', fail);

/** Makes Stripe refuse new payment pages, or accept them again. */
export const setSessionsFailing = (page: Page, fail: boolean) => setFailing(page, 'sessions', fail);
