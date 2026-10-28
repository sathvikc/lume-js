import { test, expect } from '@playwright/test';

// examples/template-list: bindDom two-way inputs, repeat() with a <template>
// row, keyed reordering, and the select option.
test.beforeEach(async ({ page }) => {
  await page.goto('/examples/template-list/index.html');
  await expect(page.locator('#people li')).toHaveCount(3);
});

const names = page => page.locator('#people li .name');

test('renders rows from the template with nested paths and $index', async ({ page }) => {
  await expect(names(page)).toHaveText(['Ada', 'Grace', 'Edsger']);
  await expect(page.locator('#people li .city')).toHaveText(['London', 'New York', 'Rotterdam']);
  await expect(page.locator('#people li .idx')).toHaveText(['0', '1', '2']);
});

test('two-way inputs feed the store and clear when the store resets them', async ({ page }) => {
  const [nameInput, cityInput] = await page.locator('.row input').all();
  await nameInput.fill('Marie');
  await cityInput.fill('Paris');
  await page.click('#add');

  await expect(names(page)).toHaveText(['Ada', 'Grace', 'Edsger', 'Marie']);
  await expect(page.locator('#people li').last().locator('.city')).toHaveText('Paris');
  await expect(nameInput).toHaveValue('');
  await expect(cityInput).toHaveValue('');
});

test('shuffle moves the same row elements instead of recreating them', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelectorAll('#people li').forEach(li => {
      li.__name = li.querySelector('.name').textContent;
    });
  });

  // Shuffle is random; retry until the order actually changes.
  const before = await names(page).allTextContents();
  let after = before;
  for (let i = 0; i < 20 && after.join() === before.join(); i++) {
    await page.click('#shuffle');
    after = await names(page).allTextContents();
  }
  expect(after).not.toEqual(before);

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('#people li')].map(li => ({
      tag: li.__name,
      name: li.querySelector('.name').textContent,
      idx: li.querySelector('.idx').textContent,
    })));
  rows.forEach((row, i) => {
    expect(row.tag).toBe(row.name);
    expect(row.idx).toBe(String(i));
  });
});

test('select moves one class between rows', async ({ page }) => {
  const rows = page.locator('#people li');
  await rows.nth(1).click();
  await expect(page.locator('#people li.selected')).toHaveCount(1);
  await expect(rows.nth(1)).toHaveClass(/selected/);

  await rows.nth(0).click();
  await expect(page.locator('#people li.selected')).toHaveCount(1);
  await expect(rows.nth(0)).toHaveClass(/selected/);
});

test('removing a row drops only that row', async ({ page }) => {
  await page.locator('#people li').first().locator('.remove').click();
  await expect(names(page)).toHaveText(['Grace', 'Edsger']);
  await expect(page.locator('#people li .idx')).toHaveText(['0', '1']);
});
