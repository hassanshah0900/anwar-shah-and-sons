import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  categoryItem,
  choose,
  createCategory,
  createOption,
  PIXEL,
  unique,
} from './admin-helpers.ts';
import { main, newAdmin } from './helpers.ts';

/** The names in a list, in order, read from their drag handles; only those in `names`. */
async function order(scope: Locator, names: string[]): Promise<string[]> {
  const labels = await scope
    .getByRole('button', { name: /^Reorder / })
    .evaluateAll((handles) =>
      handles.map((handle) => handle.getAttribute('aria-label')?.replace(/^Reorder /, '') ?? ''),
    );
  return labels.filter((label) => names.includes(label));
}

/** dnd-kit adds its live region once it has mounted, so the handles are live from then on. */
const sortingReady = (page: Page) =>
  expect(page.locator('[id^=DndLiveRegion]').first()).toBeAttached();

/**
 * Moves an item from the keyboard: pick it up, step with the arrow key, drop it. Each
 * key waits for the screen reader announcement of the one before, as a person would.
 */
async function moveWithKeys(page: Page, scope: Locator, name: string, key: string, steps: number) {
  await sortingReady(page);
  await scope.getByRole('button', { name: `Reorder ${name}`, exact: true }).focus();
  await page.keyboard.press('Space');
  const pickedUp = page.locator('[id^=DndLiveRegion]').filter({ hasText: `Picked up ${name}` });
  await expect(pickedUp).toHaveCount(1);
  const announcer = page.locator(`[id="${await pickedUp.getAttribute('id')}"]`);

  for (let step = 0; step < steps; step++) {
    const before = await announcer.textContent();
    await page.keyboard.press(key);
    await expect(announcer).not.toHaveText(before ?? '');
    await expect(announcer).toContainText(`${name} moved to position`);
  }
  await page.keyboard.press('Space');
  await expect(announcer).toContainText(`${name} dropped`);
}

/** Drags one item's handle onto another's with the mouse. */
async function drag(page: Page, scope: Locator, name: string, onto: string) {
  await sortingReady(page);
  const handle = (label: string) =>
    scope.getByRole('button', { name: `Reorder ${label}`, exact: true });
  // The mouse can only reach what's on screen.
  await scope.scrollIntoViewIfNeeded();
  const from = await handle(name).boundingBox();
  const to = await handle(onto).boundingBox();
  if (!from || !to) throw new Error('Handles not visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
}

/** The order holds once the page is loaded again from the server. */
async function expectSaved(page: Page, scope: () => Locator, names: string[]) {
  await expect.poll(() => order(scope(), names)).toEqual(names);
  await page.reload();
  await expect.poll(() => order(scope(), names)).toEqual(names);
}

test('an admin reorders sub-categories', async ({ browser }) => {
  const admin = await newAdmin(browser);
  const parent = unique('Formal');
  const [kurtas, shawls, dupattas] = ['Kurtas', 'Shawls', 'Dupattas'].map(unique);
  await admin.goto('/admin/categories');
  await createCategory(admin, parent);
  for (const child of [kurtas, shawls, dupattas]) await createCategory(admin, child, parent);
  const tree = () => categoryItem(admin, parent);
  await expect
    .poll(() => order(tree(), [kurtas, shawls, dupattas]))
    .toEqual([kurtas, shawls, dupattas]);

  // From the keyboard: Dupattas up two places.
  await moveWithKeys(admin, tree(), dupattas, 'ArrowUp', 2);
  await expectSaved(admin, tree, [dupattas, kurtas, shawls]);

  // With the mouse: Dupattas back under Shawls.
  await drag(admin, tree(), dupattas, shawls);
  await expectSaved(admin, tree, [kurtas, shawls, dupattas]);
});

test('an admin reorders an option’s values', async ({ browser }) => {
  const admin = await newAdmin(browser);
  const name = unique('Waist');
  await createOption(admin, name, ['28', '30', '32']);
  const section = () => main(admin).getByRole('region', { name, exact: true });

  await moveWithKeys(admin, section(), '32', 'ArrowUp', 2);
  await expectSaved(admin, section, ['32', '28', '30']);
});

test('an admin reorders a product’s images and options', async ({ browser }) => {
  const admin = await newAdmin(browser);
  const category = unique('Scarves');
  const colour = unique('Hue');
  const size = unique('Width');
  const product = unique('Silk Scarf');

  await admin.goto('/admin/categories');
  await createCategory(admin, category);
  await createOption(admin, colour, ['Ivory'], true);
  await createOption(admin, size, ['Narrow']);

  await admin.goto('/admin/products/new');
  await main(admin).getByLabel('Name', { exact: true }).fill(product);
  await choose(admin, main(admin), 'Category', category);
  await main(admin).getByLabel('Price', { exact: true }).fill('4000');
  await main(admin)
    .getByLabel(new RegExp(`^${colour}`))
    .check();
  await main(admin)
    .getByLabel(new RegExp(`^${size}`))
    .check();
  await main(admin).getByRole('button', { name: 'Create product' }).click();
  await expect(admin).toHaveURL(/\/admin\/products\/(?!new)[^/]+$/);

  // Images: the one dragged to the front becomes the main one.
  const images = () => main(admin).getByRole('region', { name: 'Images' });
  for (const alt of ['Front', 'Back', 'Detail']) {
    await images()
      .getByLabel(/^Image/)
      .setInputFiles({
        name: `${alt}.png`,
        mimeType: 'image/png',
        buffer: PIXEL,
      });
    await images().getByLabel('Alt text').last().fill(alt);
    await images().getByRole('button', { name: 'Upload' }).click();
    await expect(images().getByRole('img', { name: alt })).toBeVisible();
  }
  await drag(admin, images(), 'Detail', 'Front');
  await expectSaved(admin, images, ['Detail', 'Front', 'Back']);
  await expect(images().getByRole('listitem').first()).toContainText('Main');
  await expect(images().getByRole('listitem').first().getByRole('img')).toHaveAccessibleName(
    'Detail',
  );

  // Options: shoppers see them in the order chosen, even once variants exist.
  const variants = main(admin).getByRole('region', { name: 'Variants' });
  await variants.getByRole('button', { name: 'Generate all combinations' }).click();
  await expect(variants.locator('tbody tr')).toHaveCount(1);
  await variants.getByLabel(/^Stock for/).fill('3');
  await variants.getByRole('button', { name: /^Save / }).click();
  await expect(variants.getByRole('status')).toHaveText('Saved');
  await main(admin)
    .getByLabel(/^Active/)
    .check();
  await main(admin).getByRole('button', { name: 'Save changes' }).click();
  await expect(main(admin).getByRole('status').first()).toHaveText('Product saved');

  const options = () =>
    main(admin).locator('fieldset').filter({ hasText: 'Order shown to shoppers' });
  await moveWithKeys(admin, options(), size, 'ArrowUp', 1);
  await expectSaved(admin, options, [size, colour]);

  const slug = await main(admin).getByLabel('URL slug').inputValue();
  await admin.goto(`/products/${slug}`);
  await expect(main(admin).locator('fieldset legend')).toContainText([size, colour]);
});
