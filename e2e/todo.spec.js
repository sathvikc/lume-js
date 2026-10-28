import { test, expect } from '@playwright/test';

// examples/todo: persist() round-trip through real localStorage, plus
// bindDom text bindings and two-way input.
test('todos and filter survive a reload', async ({ page }) => {
  await page.goto('/examples/todo/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const input = page.locator('#new-todo');
  await input.fill('Buy milk');
  await input.press('Enter');

  await expect(page.locator('#todo-list .title')).toHaveText(['Buy milk']);
  await expect(input).toHaveValue('');
  await expect(page.locator('[data-bind="remaining"]')).toHaveText('1');

  await page.locator('#todo-list input[type="checkbox"]').check();
  await expect(page.locator('[data-bind="completed"]')).toHaveText('1');
  await page.click('[data-filter="completed"]');

  await page.reload();

  await expect(page.locator('[data-filter="completed"]')).toHaveClass(/active/);
  await expect(page.locator('#todo-list .title')).toHaveText(['Buy milk']);
  await expect(page.locator('#todo-list input[type="checkbox"]')).toBeChecked();
  await expect(page.locator('[data-bind="remaining"]')).toHaveText('0');
  await expect(page.locator('[data-bind="completed"]')).toHaveText('1');

  // New ids continue after the stored ones, so keys never collide.
  await input.fill('Walk dog');
  await input.press('Enter');
  await page.click('[data-filter="all"]');
  await expect(page.locator('#todo-list .title')).toHaveText(['Walk dog', 'Buy milk']);
  const ids = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lume_todos')).todos.map(t => t.id));
  expect(new Set(ids).size).toBe(2);
});
