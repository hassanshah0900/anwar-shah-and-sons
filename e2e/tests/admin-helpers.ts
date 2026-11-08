import { expect, type Locator, type Page } from '@playwright/test';
import { main } from './helpers.ts';

/** Names of their own, so a rerun against the same data doesn't clash. */
export const unique = (name: string) => `${name} ${Date.now().toString(36)}`;

/** The smallest valid PNG: one transparent pixel. */
export const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const dialog = (page: Page) => page.getByRole('dialog');

/** Opens a dialog, clicking again if the first click landed before the page was hydrated. */
export async function openDialog(page: Page, trigger: Locator) {
  await expect(async () => {
    if (!(await dialog(page).isVisible())) await trigger.click();
    await expect(dialog(page)).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

/** Opens a shadcn select by its label and picks an option. */
export async function choose(page: Page, scope: Page | Locator, label: string, option: string) {
  await scope.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

export async function confirmDelete(page: Page, label: string) {
  await main(page).getByRole('button', { name: label, exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Delete' }).click();
}

export async function createCategory(page: Page, name: string, parent?: string) {
  await openDialog(page, main(page).getByRole('button', { name: 'New category' }));
  await dialog(page).getByLabel('Name', { exact: true }).fill(name);
  if (parent) await choose(page, dialog(page), 'Parent', parent);
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toHaveCount(0);
}

/** A category's own list item, which holds its sub-categories too. */
export const categoryItem = (page: Page, name: string) =>
  main(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) })
    .last();

/** Creates an option and its values on the options page; returns its section. */
export async function createOption(page: Page, name: string, values: string[], colour = false) {
  await page.goto('/admin/options');
  await openDialog(page, main(page).getByRole('button', { name: 'New option' }));
  await dialog(page).getByLabel('Name', { exact: true }).fill(name);
  if (colour) await dialog(page).getByRole('radio', { name: 'Colours with a swatch' }).click();
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(dialog(page)).toHaveCount(0);

  const section = main(page).getByRole('region', { name, exact: true });
  for (const label of values) {
    await section.getByLabel(`New ${name.toLowerCase()} value`).fill(label);
    await section.getByRole('button', { name: 'Add' }).click();
    await expect(section.getByRole('listitem').filter({ hasText: label })).toBeVisible();
  }
  return section;
}
