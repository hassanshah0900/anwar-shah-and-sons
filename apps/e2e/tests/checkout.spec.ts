import { expect, test } from '@playwright/test';
import { FAKE_STRIPE_URL, SHIPPING } from '../support/env.ts';
import {
  addToBag,
  fillAddress,
  goToPayment,
  main,
  newAdmin,
  newShopper,
  orderNumber,
  paymentSection,
  placeCashOrder,
  placePaidOrder,
} from './helpers.ts';

const digits = (text: string) => text.replace(/\D/g, '');

test('paying cash: the order is placed and the admin moves it along', async ({ browser }) => {
  const page = await newShopper(browser);
  const number = await placeCashOrder(page);
  await expect(main(page)).toContainText('your order is placed');
  await expect(paymentSection(page)).toContainText('Cash on delivery · Not paid');

  await page.goto('/account/orders');
  await expect(main(page)).toContainText(`${number}`);

  const admin = await newAdmin(browser);
  await admin.goto(`/admin/orders/${number}`);
  await admin.getByRole('button', { name: 'Confirm order' }).click();
  await admin.getByRole('button', { name: 'Mark shipped' }).click();
  await admin.getByRole('button', { name: 'Mark delivered' }).click();
  await expect(paymentSection(admin)).toContainText('Cash on delivery · Paid');
});

test('paying by card: Stripe charges the total shown, and the webhook confirms it', async ({
  browser,
}) => {
  const page = await newShopper(browser);
  await addToBag(page);
  await fillAddress(page);
  const button = main(page).getByRole('button', { name: /continue to payment/i });
  const shown = digits((await button.textContent()) ?? '');
  expect(Number(shown)).toBeGreaterThan(SHIPPING);

  await button.click();
  await page.waitForURL(`${FAKE_STRIPE_URL}/**`);
  // PKR has no decimals in the store but two at Stripe, so this catches a wrong conversion.
  await expect(page.locator('#amount')).toHaveText(shown);

  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.waitForURL(/\/account\/orders\/\d+\?paid=1/);
  await expect(main(page)).toContainText("we've received your payment");
  await expect(paymentSection(page)).toContainText('Card · Paid');

  // The admin's view doesn't ask Stripe, so this can only come from the webhook.
  const admin = await newAdmin(browser);
  await admin.goto(`/admin/orders/${orderNumber(page)}`);
  await expect(paymentSection(admin)).toContainText('Card · Paid');
  await expect(admin.getByRole('button', { name: 'Mark shipped' })).toBeVisible();

  await page.goto('/cart');
  await expect(main(page)).not.toContainText('Embroidered Lawn Kurta');
});

test('a customer who returns before the webhook still sees their payment', async ({ browser }) => {
  const page = await newShopper(browser);
  await goToPayment(page);
  await page.getByRole('button', { name: 'Pay, webhook delayed' }).click();
  await page.waitForURL(/\?paid=1/);

  await expect(main(page)).toContainText("we've received your payment");
  await expect(paymentSection(page)).toContainText('Card · Paid');
});

test('a customer who leaves Stripe’s page can come back and pay', async ({ browser }) => {
  const page = await newShopper(browser);
  await goToPayment(page);
  await page.getByRole('link', { name: 'Back' }).click();
  await page.waitForURL(/\/account\/orders\/\d+$/);
  await expect(main(page)).toContainText("This order hasn't been paid yet");
  await expect(main(page)).toContainText('Awaiting payment');
  const number = orderNumber(page);

  // It's the customer's move, so the admin can cancel it but not confirm it.
  const admin = await newAdmin(browser);
  await admin.goto(`/admin/orders/${number}`);
  await expect(admin.getByRole('button', { name: 'Cancel order' })).toBeVisible();
  await expect(admin.getByRole('button', { name: 'Confirm order' })).toHaveCount(0);

  await main(page).getByRole('button', { name: 'Pay now' }).click();
  await page.waitForURL(`${FAKE_STRIPE_URL}/**`);
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.waitForURL(/\?paid=1/);
  await expect(paymentSection(page)).toContainText('Card · Paid');
});

test('an order not paid in time is cancelled', async ({ browser }) => {
  const page = await newShopper(browser);
  await goToPayment(page);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1);
  await page.getByRole('link', { name: 'Back' }).click();
  await page.waitForURL(/\/account\/orders\/\d+$/);

  const expired = await page.request.post(`${FAKE_STRIPE_URL}/test/expire/${sessionId}`);
  expect(expired.ok()).toBe(true);

  await page.reload();
  await expect(main(page)).toContainText('Cancelled');
  await expect(main(page).getByRole('button', { name: 'Pay now' })).toHaveCount(0);
  await expect(paymentSection(page)).toContainText('Card · Not paid');
});

test('the checkout refuses an incomplete address', async ({ browser }) => {
  const page = await newShopper(browser);
  await addToBag(page);
  await page.goto('/checkout');
  await main(page)
    .getByRole('button', { name: /continue to payment/i })
    .click();
  await expect(main(page)).toContainText('Enter a valid phone number');
  await expect(page).toHaveURL(/\/checkout/);
});

test('paid card orders show on the customer’s history', async ({ browser }) => {
  const page = await newShopper(browser);
  const number = await placePaidOrder(page);
  await page.goto('/account/orders');
  await expect(main(page)).toContainText(`${number}`);
  await expect(main(page)).toContainText('Confirmed');
});
