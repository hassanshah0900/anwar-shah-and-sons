import { expect, test, type Page } from '@playwright/test';
import {
  main,
  newAdmin,
  newShopper,
  paymentSection,
  placeCashOrder,
  placePaidOrder,
  setRefundsFailing,
} from './helpers.ts';

const cancelOrder = async (page: Page) => {
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel order' }).click();
};

test.afterEach(async ({ page }) => {
  await setRefundsFailing(page, false);
});

test('a customer cancels a cash order', async ({ browser }) => {
  const page = await newShopper(browser);
  await placeCashOrder(page);

  await cancelOrder(page);

  await expect(main(page)).toContainText('Cancelled');
  await expect(main(page).getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
});

test('a customer cancels a paid order and is refunded', async ({ browser }) => {
  const page = await newShopper(browser);
  await placePaidOrder(page);

  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByRole('dialog')).toContainText('refund your payment');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel order' }).click();

  await expect(paymentSection(page)).toContainText('Card · Refunded');
});

test('a customer can’t cancel once the order has shipped', async ({ browser }) => {
  const page = await newShopper(browser);
  const number = await placeCashOrder(page);

  const admin = await newAdmin(browser);
  await admin.goto(`/admin/orders/${number}`);
  await admin.getByRole('button', { name: 'Confirm order' }).click();
  await admin.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(admin.getByRole('button', { name: 'Mark delivered' })).toBeVisible();

  await page.reload();
  await expect(main(page)).toContainText('Shipped');
  await expect(main(page).getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
});

test('a failed refund is flagged, and the admin can retry it', async ({ browser }) => {
  const page = await newShopper(browser);
  const number = await placePaidOrder(page);
  await setRefundsFailing(page, true);

  await cancelOrder(page);
  await expect(paymentSection(page)).toContainText('Card · Refund pending');
  await expect(main(page)).toContainText('Refund pending');

  // The dashboard points the admin at it.
  const admin = await newAdmin(browser);
  await admin.goto('/admin');
  await expect(main(admin).getByRole('alert')).toContainText('failed');
  await main(admin).getByRole('alert').getByRole('link').click();
  await expect(admin).toHaveURL(/refundDue=true/);
  await main(admin)
    .getByRole('link', { name: `${number}` })
    .click();

  // Stripe is still refusing: the admin is told and nothing changes.
  const retry = admin.getByRole('button', { name: 'Retry refund' });
  await retry.click();
  await expect(main(admin)).toContainText("didn't go through");
  await expect(paymentSection(admin)).toContainText('Card · Refund pending');

  await setRefundsFailing(page, false);
  await retry.click();
  await expect(paymentSection(admin)).toContainText('Card · Refunded');
  await expect(retry).toHaveCount(0);

  await page.reload();
  await expect(paymentSection(page)).toContainText('Card · Refunded');
});
