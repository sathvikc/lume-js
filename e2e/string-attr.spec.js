import { test, expect } from '@playwright/test';

// stringAttr URL filtering in a real browser. No example page uses
// stringAttr, so this runs against a fixture.
const ATTRS = [['#link', 'href'], ['#img', 'src'], ['#obj', 'data']];

const DANGEROUS = [
  'javascript:alert(1)',
  ' java\tscript:alert(1)',
  'JavaScript:alert(1)',
  'vbscript:msgbox(1)',
  'data:text/html,<script>alert(1)</script>',
];

let dialogs;

test.beforeEach(async ({ page }) => {
  dialogs = [];
  page.on('dialog', dialog => {
    dialogs.push(dialog.message());
    dialog.dismiss();
  });
  await page.goto('/e2e/fixtures/string-attr.html');
  await page.waitForFunction(() => window.ready);
});

const setUrl = (page, url) => page.evaluate(u => { window.store.url = u; }, url);

for (const url of DANGEROUS) {
  test(`removes URL attributes for ${JSON.stringify(url)}`, async ({ page }) => {
    for (const [sel, attr] of ATTRS) {
      await expect(page.locator(sel)).toHaveAttribute(attr, '/safe.html');
    }
    await setUrl(page, url);
    for (const [sel, attr] of ATTRS) {
      await expect(page.locator(sel)).not.toHaveAttribute(attr);
    }
    await page.click('#link');
    expect(dialogs).toEqual([]);
  });
}

test('keeps safe and relative URLs, including look-alikes', async ({ page }) => {
  for (const url of ['https://example.com/', 'javascript-tutorial.html', 'data:image/png;base64,AA==']) {
    await setUrl(page, url);
    for (const [sel, attr] of ATTRS) {
      await expect(page.locator(sel)).toHaveAttribute(attr, url);
    }
  }
});
