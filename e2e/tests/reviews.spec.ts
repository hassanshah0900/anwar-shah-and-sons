import { expect, test } from '@playwright/test';
import { main, newAdmin, newShopper, placeCashOrder, PRODUCT_SLUG } from './helpers.ts';

test('a customer reviews a product once it has been delivered', async ({ browser }) => {
  const page = await newShopper(browser);
  const number = await placeCashOrder(page);
  const reviews = () => main(page).locator('#reviews');

  // Not delivered yet: no form.
  await page.goto(`/products/${PRODUCT_SLUG}`);
  await expect(reviews()).toContainText('once your order has been delivered');

  const admin = await newAdmin(browser);
  await admin.goto(`/admin/orders/${number}`);
  await admin.getByRole('button', { name: 'Confirm order' }).click();
  await admin.getByRole('button', { name: 'Mark shipped' }).click();
  await admin.getByRole('button', { name: 'Mark delivered' }).click();
  await expect(main(admin)).toContainText('Delivered');

  await page.reload();
  await reviews()
    .getByRole('radio', { name: /^4 stars/ })
    .click();
  await reviews().getByLabel('Title (optional)').fill('Breathable and neat');
  await reviews()
    .getByLabel('Your review')
    .fill('Wore it all afternoon in the heat. Lovely fabric.');
  await reviews().getByRole('button', { name: 'Post review' }).click();

  // The page refreshes with the review listed and the form gone.
  await expect(reviews()).toContainText('Thanks for reviewing this.');
  await expect(reviews()).toContainText('Breathable and neat');
});
