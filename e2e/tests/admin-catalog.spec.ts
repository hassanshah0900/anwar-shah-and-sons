import { expect, test, type Locator, type Page } from '@playwright/test';
import { main, newAdmin } from './helpers.ts';

/** Names of their own, so a rerun against the same data doesn't clash. */
const unique = (name: string) => `${name} ${Date.now().toString(36)}`;

/** The smallest valid PNG: one transparent pixel. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const dialog = (page: Page) => page.getByRole('dialog');

/** Opens a shadcn select by its label and picks an option. */
async function choose(page: Page, scope: Page | Locator, label: string, option: string) {
  await scope.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function confirmDelete(page: Page, label: string) {
  await main(page).getByRole('button', { name: label, exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Delete' }).click();
}

async function createCategory(page: Page, name: string, parent?: string) {
  await main(page).getByRole('button', { name: 'New category' }).click();
  await dialog(page).getByLabel('Name', { exact: true }).fill(name);
  if (parent) await choose(page, dialog(page), 'Parent', parent);
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toHaveCount(0);
}

const categoryRow = (page: Page, name: string) =>
  main(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name, exact: true }) });

test('an admin builds the category tree', async ({ browser }) => {
  const admin = await newAdmin(browser);
  const parent = unique('Bridal');
  const child = unique('Lehengas');
  await admin.goto('/admin/categories');

  await createCategory(admin, parent);
  await createCategory(admin, child, parent);
  await expect(categoryRow(admin, child)).toContainText(parent);

  // Renaming keeps it under its parent.
  const renamed = unique('Gharara');
  await main(admin)
    .getByRole('button', { name: `Edit ${child}` })
    .click();
  await dialog(admin).getByLabel('Name').fill(renamed);
  await dialog(admin).getByRole('button', { name: 'Save' }).click();
  await expect(categoryRow(admin, renamed)).toContainText(parent);
  await expect(categoryRow(admin, child)).toHaveCount(0);

  // A parent can't go while it has sub-categories.
  await confirmDelete(admin, `Delete ${parent}`);
  await expect(dialog(admin)).toContainText('Move or delete its sub-categories first.');
  await dialog(admin).getByRole('button', { name: 'Cancel' }).click();

  await confirmDelete(admin, `Delete ${renamed}`);
  await expect(categoryRow(admin, renamed)).toHaveCount(0);
  await confirmDelete(admin, `Delete ${parent}`);
  await expect(categoryRow(admin, parent)).toHaveCount(0);
});

test('an admin sets up an option and its values', async ({ browser }) => {
  const admin = await newAdmin(browser);
  const name = unique('Shade');
  await admin.goto('/admin/options');

  await main(admin).getByRole('button', { name: 'New option' }).click();
  await dialog(admin).getByLabel('Name').fill(name);
  await dialog(admin).getByRole('radio', { name: 'Colours with a swatch' }).click();
  await dialog(admin).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(admin)).toHaveCount(0);

  const section = main(admin).getByRole('region', { name, exact: true });
  await expect(section).toContainText('Colour');
  const newValue = section.getByLabel(`New ${name.toLowerCase()} value`);
  for (const label of ['Maroon', 'Teal']) {
    await newValue.fill(label);
    await section.getByRole('button', { name: 'Add' }).click();
    await expect(section.getByRole('listitem').filter({ hasText: label })).toBeVisible();
  }

  await section.getByRole('button', { name: 'Edit Teal' }).click();
  await dialog(admin).getByLabel('Label').fill('Peacock');
  await dialog(admin).getByRole('button', { name: 'Save' }).click();
  await expect(section.getByRole('listitem').filter({ hasText: 'Peacock' })).toBeVisible();

  await section.getByRole('button', { name: 'Delete Maroon' }).click();
  await dialog(admin).getByRole('button', { name: 'Delete' }).click();
  await expect(section.getByRole('listitem')).toHaveCount(1);

  const renamed = unique('Tone');
  await section.getByRole('button', { name: `Rename ${name}` }).click();
  await dialog(admin).getByLabel('Name').fill(renamed);
  await dialog(admin).getByRole('button', { name: 'Save' }).click();
  const renamedSection = main(admin).getByRole('region', { name: renamed, exact: true });
  await expect(renamedSection).toContainText('Peacock');

  await confirmDelete(admin, `Delete ${renamed}`);
  await expect(renamedSection).toHaveCount(0);
});

test('an admin creates a product, publishes it and deletes it', async ({ browser }) => {
  const admin = await newAdmin(browser);
  const category = unique('Shawls');
  const option = unique('Length');
  const product = unique('Pashmina Shawl');

  // Something to file it under, and a way for it to vary.
  await admin.goto('/admin/categories');
  await createCategory(admin, category);
  await admin.goto('/admin/options');
  await main(admin).getByRole('button', { name: 'New option' }).click();
  await dialog(admin).getByLabel('Name').fill(option);
  await dialog(admin).getByRole('button', { name: 'Save' }).click();
  const section = main(admin).getByRole('region', { name: option, exact: true });
  for (const label of ['Short', 'Long']) {
    await section.getByLabel(`New ${option.toLowerCase()} value`).fill(label);
    await section.getByRole('button', { name: 'Add' }).click();
    await expect(section.getByRole('listitem').filter({ hasText: label })).toBeVisible();
  }

  // The product starts as a draft: it can't go live without variants.
  await admin.goto('/admin/products');
  await main(admin).getByRole('link', { name: 'New product' }).click();
  await main(admin).getByLabel('Name', { exact: true }).fill(product);
  await main(admin).getByLabel('Description').fill('Hand-woven in Kashmir.');
  await choose(admin, main(admin), 'Category', category);
  await main(admin).getByLabel('Price', { exact: true }).fill('12500');
  await expect(main(admin).getByLabel(/^Active/)).toBeDisabled();
  await main(admin)
    .getByLabel(new RegExp(`^${option}`))
    .check();
  await main(admin).getByRole('button', { name: 'Create product' }).click();
  await expect(admin).toHaveURL(/\/admin\/products\/(?!new)[^/]+$/);
  await expect(main(admin).getByRole('heading', { level: 1 })).toHaveText(product);

  // One variant per value, then stock for one of them.
  const variants = main(admin).getByRole('region', { name: 'Variants' });
  await variants.getByRole('button', { name: 'Generate all combinations' }).click();
  await expect(variants.locator('tbody tr')).toHaveCount(2);
  await variants.getByLabel('Stock for Long').fill('7');
  await variants.getByRole('button', { name: 'Save Long' }).click();
  await expect(variants.getByRole('status')).toHaveText('Saved');

  const images = main(admin).getByRole('region', { name: 'Images' });
  await images.getByLabel(/^Image/).setInputFiles({
    name: 'shawl.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await images.getByLabel('Alt text').fill('Folded shawl');
  await images.getByRole('button', { name: 'Upload' }).click();
  await expect(images.getByRole('img', { name: 'Folded shawl' })).toBeVisible();
  await expect(images).toContainText('Main');

  await main(admin)
    .getByLabel(/^Active/)
    .check();
  await main(admin).getByRole('button', { name: 'Save changes' }).click();
  await expect(main(admin).getByRole('status').first()).toHaveText('Product saved');

  // Shoppers can see it now.
  const listing = admin.url();
  const slug = await main(admin).getByLabel('URL slug').inputValue();
  await admin.goto(`/products/${slug}`);
  await expect(main(admin).getByRole('heading', { level: 1 })).toHaveText(product);
  await expect(main(admin)).toContainText('12,500');

  // A price change reaches the shop.
  await admin.goto(listing);
  await main(admin).getByLabel('Price', { exact: true }).fill('11000');
  await main(admin).getByRole('button', { name: 'Save changes' }).click();
  await expect(main(admin).getByRole('status').first()).toHaveText('Product saved');
  await admin.goto(`/products/${slug}`);
  await expect(main(admin)).toContainText('11,000');

  // The list sums up its variants.
  await admin.goto(`/admin/products?q=${encodeURIComponent(product)}`);
  const row = main(admin).locator('tbody tr');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Active');
  await expect(row.locator('td').nth(4)).toHaveText('2');
  await expect(row.locator('td').nth(5)).toHaveText('7');

  await admin.goto(listing);
  await confirmDelete(admin, `Delete ${product}`);
  await expect(admin).toHaveURL(/\/admin\/products$/);
  await admin.goto(`/products/${slug}`);
  await expect(admin.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
