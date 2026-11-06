import { expect, test } from '@playwright/test';
import { main, newAdmin } from './helpers.ts';

test('admins choose how many orders show on a page', async ({ browser }) => {
  const admin = await newAdmin(browser);
  await admin.goto('/admin/orders');
  const rows = main(admin).locator('tbody tr');
  // The demo shop has 60 orders, so the default of 25 fills the first page.
  await expect(rows).toHaveCount(25);

  await main(admin).getByRole('combobox', { name: 'Rows per page' }).click();
  await admin.getByRole('option', { name: '10', exact: true }).click();
  await expect(admin).toHaveURL(/pageSize=10/);
  await expect(rows).toHaveCount(10);

  // Other pages keep the chosen size.
  await main(admin).getByRole('link', { name: 'Page 2' }).click();
  await expect(admin).toHaveURL(/page=2/);
  await expect(admin).toHaveURL(/pageSize=10/);
  await expect(rows).toHaveCount(10);
});
