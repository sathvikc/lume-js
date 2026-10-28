import { test, expect } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';

// Loads every example page and collects console errors and uncaught
// exceptions. Warn-only for now: findings are reported as test annotations
// (and GitHub ::warning lines in CI) without failing the run. Flip STRICT
// once the pages are clean and the signal has proven stable.
const STRICT = false;

const PAGES = ['examples/index.html', ...readdirSync('examples', { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(`examples/${d.name}/index.html`))
  .map(d => `examples/${d.name}/index.html`)];

for (const path of PAGES) {
  test(`${path} loads without console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(`uncaught: ${err.message}`));

    await page.goto(`/${path}`);
    await page.waitForLoadState('networkidle');

    if (STRICT) {
      expect(errors).toEqual([]);
      return;
    }
    for (const error of errors) {
      test.info().annotations.push({ type: 'warning', description: error });
      if (process.env.CI) console.log(`::warning title=${path}::${error.replace(/\r?\n/g, ' ')}`);
    }
  });
}
