import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Integration test: sync-docs.js resolves its own root from import.meta.url,
// so exercising --check's real exit codes means running the actual script
// against a throwaway fixture tree (its own copy, not the real repo).

const scriptSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/sync-docs.js');

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lume-sync-docs-'));
  fs.mkdirSync(path.join(dir, 'docs', 'guides'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.copyFileSync(scriptSrc, path.join(dir, 'scripts', 'sync-docs.js'));

  fs.writeFileSync(
    path.join(dir, 'docs', 'metrics.json'),
    JSON.stringify({
      version: '9.9.9',
      tests: 42,
      sizes: { state: '1.00', index: '2.00', handlers: '1.00', addons: '4.00', global: '7.00' },
      budgets: { state: '1.75', index: '3.00', handlers: '2.00', addons: '6.00' },
      browserFloor: { chrome: '80+', firefox: '74+', safari: '13.1+', edge: '80+' },
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'docs', 'manifest.json'),
    JSON.stringify({
      sections: [
        { title: 'Guides', entries: [{ path: 'docs/guides/a.md', title: 'A', description: 'x' }] },
      ],
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'docs', 'guides', 'a.md'),
    'version is <!-- lume:version -->9.9.9<!-- /lume:version -->\n'
  );
  // MANAGED_FILES always includes these three regardless of manifest contents.
  fs.writeFileSync(path.join(dir, 'README.md'), 'no markers here\n');
  fs.writeFileSync(path.join(dir, 'AGENT_GUIDE.md'), 'no markers here\n');
  fs.writeFileSync(path.join(dir, 'docs', 'README.md'), 'no markers here\n');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function runCheck() {
  return spawnSync(process.execPath, ['scripts/sync-docs.js', '--check'], { cwd: dir, encoding: 'utf8' });
}

describe('sync-docs.js CLI --check', () => {
  it('exits 0 when every managed file already matches metrics.json', () => {
    const result = runCheck();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('in sync');
  });

  it('exits 1 and names the stale file when a marker value has drifted', () => {
    fs.writeFileSync(
      path.join(dir, 'docs', 'guides', 'a.md'),
      'version is <!-- lume:version -->0.0.1-stale<!-- /lume:version -->\n'
    );
    const result = runCheck();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Stale docs: docs/guides/a.md');
    expect(result.stderr).toContain('npm run docs:sync');
  });

  it('write mode repairs drift so a following --check passes', () => {
    fs.writeFileSync(
      path.join(dir, 'docs', 'guides', 'a.md'),
      'version is <!-- lume:version -->0.0.1-stale<!-- /lume:version -->\n'
    );
    const write = spawnSync(process.execPath, ['scripts/sync-docs.js'], { cwd: dir, encoding: 'utf8' });
    expect(write.status).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'docs', 'guides', 'a.md'), 'utf8')).toContain('9.9.9');

    const check = runCheck();
    expect(check.status).toBe(0);
  });
});
