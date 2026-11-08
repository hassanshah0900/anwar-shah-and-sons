import { expect, test, type Page } from '@playwright/test';
import { main, newAdmin, newShopper, placeCashOrder } from './helpers.ts';

const toConfirm = (admin: Page) =>
  main(admin)
    .getByRole('link', { name: /To confirm/ })
    .locator('.text-2xl');

const orderLink = (admin: Page, number: number) =>
  main(admin).getByRole('link', { name: `#${number}`, exact: true });

test('a new order shows on the dashboard and in the order lists', async ({ browser }) => {
  const admin = await newAdmin(browser);
  await admin.goto('/admin');
  const before = Number(await toConfirm(admin).textContent());

  const shopper = await newShopper(browser);
  const number = await placeCashOrder(shopper);

  await admin.reload();
  await expect(toConfirm(admin)).toHaveText(String(before + 1));
  const recent = main(admin).getByRole('region', { name: 'Recent orders' });
  await expect(recent.getByRole('row').filter({ hasText: `#${number}` })).toContainText(
    'Bilal Ahmed',
  );

  // The tile opens the pending orders.
  await main(admin)
    .getByRole('link', { name: /To confirm/ })
    .click();
  await expect(admin).toHaveURL(/status=pending/);
  await expect(orderLink(admin, number)).toBeVisible();

  // Once confirmed, it moves to the confirmed list.
  await orderLink(admin, number).click();
  await admin.getByRole('button', { name: 'Confirm order' }).click();
  await expect(admin.getByRole('button', { name: 'Mark shipped' })).toBeVisible();

  await admin.goto('/admin/orders?status=pending');
  await expect(main(admin).getByText(/^\d+ orders?$/)).toBeVisible();
  await expect(orderLink(admin, number)).toHaveCount(0);
  await main(admin)
    .getByRole('navigation', { name: 'Filter by status' })
    .getByRole('link', {
      name: 'Confirmed',
    })
    .click();
  await expect(admin).toHaveURL(/status=confirmed/);
  await expect(orderLink(admin, number)).toBeVisible();
});

test('new customers are listed first', async ({ browser }) => {
  const shopper = await newShopper(browser);
  const session = await (await shopper.request.get('/api/auth/get-session')).json();
  const email: string = session.user.email;

  const admin = await newAdmin(browser);
  await admin.goto('/admin/customers');
  const first = main(admin).locator('tbody tr').first();
  await expect(first).toContainText(email);
  await expect(first).toContainText('customer');
});
