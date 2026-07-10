import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { measureSizes, BUDGETS } from '../../scripts/check-size.js';

let dir;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lume-check-size-'));
  fs.writeFileSync(path.join(dir, 'state.min.mjs'), 'x'.repeat(100));
  fs.writeFileSync(path.join(dir, 'unbudgeted.mjs'), 'y'.repeat(50));
  fs.writeFileSync(path.join(dir, 'state.min.mjs.map'), '{}'); // must be skipped
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('measureSizes', () => {
  it('measures gzip size per file, skips sourcemaps, and flags budget entries', async () => {
    const { results, anyFailed } = await measureSizes(dir);
    const files = results.map(r => r.file);
    expect(files).toContain('state.min.mjs');
    expect(files).toContain('unbudgeted.mjs');
    expect(files).not.toContain('state.min.mjs.map');

    const state = results.find(r => r.file === 'state.min.mjs');
    const expectedGz = zlib.gzipSync(Buffer.from('x'.repeat(100))).length;
    expect(state.gzipped).toBe(expectedGz);
    expect(state.budget).toBe(BUDGETS['state.min.mjs']);
    expect(state.overBudget).toBe(false);
    expect(anyFailed).toBe(false);

    const unbudgeted = results.find(r => r.file === 'unbudgeted.mjs');
    expect(unbudgeted.budget).toBeNull();
  });

  it('throws a clear error when the directory does not exist', async () => {
    await expect(measureSizes(path.join(dir, 'does-not-exist')))
      .rejects.toThrow('dist/ not found. Run `npm run build` first.');
  });
});
