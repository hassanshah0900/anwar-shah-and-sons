import { expect, test } from '@playwright/test';
import { addToBag, main, newShopper, PASSWORD, PRODUCT_SLUG, SHOPPER } from './helpers.ts';

test('a visitor browses the shop and fills their bag', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Shop all' }).click();
  await expect(page).toHaveURL(/\/shop/);

  const products = main(page).locator('a[href^="/products/"]');
  await expect(products.first()).toBeVisible();
  await products.first().click();
  await expect(page).toHaveURL(/\/products\//);
  await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();

  await addToBag(page);
  await page.goto('/cart');
  await expect(main(page)).toContainText('Embroidered Lawn Kurta');
  await expect(main(page)).toContainText('Subtotal');
});

test('a guest’s bag survives signing in at checkout', async ({ page }) => {
  await addToBag(page);

  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/sign-in/);
  await page.locator('input[name=email]').fill(SHOPPER.email);
  await page.locator('input[name=password]').fill(SHOPPER.password);
  await main(page).locator('button[type=submit]').click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(main(page)).toContainText('Embroidered Lawn Kurta');
  await expect(main(page)).toContainText(`Ordering as ${SHOPPER.email}`);
});

test('a new customer signs up', async ({ page }) => {
  await page.goto('/sign-up');
  await page.locator('input[name=name]').fill('Sara Malik');
  await page.locator('input[name=email]').fill(`sara-${Date.now()}@example.com`);
  await page.locator('input[name=password]').fill(PASSWORD);
  await main(page).locator('button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/sign-up/);

  await page.goto('/account');
  await expect(page).toHaveURL(/\/account/);
  await expect(main(page).locator('input[name=name]')).toHaveValue('Sara Malik');
});

test('customers can’t open the admin area', async ({ browser }) => {
  const page = await newShopper(browser);
  await page.goto('/admin');
  await expect(main(page).getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
});

test('the product page is shareable with a chosen option', async ({ page }) => {
  await page.goto(`/products/${PRODUCT_SLUG}`);
  // A default choice stays out of the URL, so pick one that isn't already chosen.
  const option = main(page).locator('fieldset').first().getByRole('radio', { checked: false });
  await option.first().click();
  await expect(page).toHaveURL(/\?/);
});
