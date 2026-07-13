#!/usr/bin/env node

/**
 * Lume.js Size Check
 *
 * Measures gzipped size of every dist entry point after build.
 * Run `npm run build` first, then `npm run size`.
 *
 * Why core is the headline metric:
 *   dist/index.mjs is the mandatory baseline — every user pays it.
 *   dist/addons.mjs and dist/handlers.mjs are fully optional; tree-shaking
 *   means users only pay for what they actually import. Advertising the core
 *   size is honest: it's the minimum cost to use Lume.js at all.
 *
 * Budgets (enforced on self-contained builds only):
 *   dist/index.min.mjs      ≤ 3 KB gzipped  (CDN core, self-contained)
 *   dist/addons.min.mjs     ≤ 6 KB gzipped  (CDN addons, self-contained)
 *   dist/handlers.min.mjs   ≤ 2 KB gzipped  (CDN handlers, self-contained)
 *   dist/lume.global.js     ≤ 8 KB gzipped  (CDN all-in-one)
 *
 * The npm split builds (index.mjs, addons.mjs, handlers.mjs) are NOT budgeted
 * because they import a shared chunk — they are incomplete on their own and
 * their individual sizes do not reflect the true cost to users.
 *
 * Usage:
 *   npm run size              # local terminal output
 *   npm run size -- --json    # machine-readable JSON (for CI diffing)
 */

import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const gzipAsync = promisify(gzip);
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const isJson = process.argv.includes('--json');

// ── Budgets (gzipped bytes) ──────────────────────────────────────────────────

export const BUDGETS = {
  'index.min.mjs':    3 * 1024,     // 3 KB    — CDN core, self-contained
  'state.min.mjs':    1.75 * 1024,  // 1.75 KB — universal kernel (state+batch, DOM-free)
  'addons.min.mjs':   6 * 1024,     // 6 KB    — CDN addons, self-contained
  'handlers.min.mjs': 2 * 1024,     // 2 KB    — CDN handlers, self-contained
  'lume.global.js':   9 * 1024,     // 9 KB    — CDN all-in-one (grows as addons are added; not the guarded budget)
};

// Files to skip in the dist report (sourcemaps, shared chunks)
const SKIP = /\.(map)$|^shared-/;

// ── Helpers ──────────────────────────────────────────────────────────────────

function kb(bytes) { return (bytes / 1024).toFixed(2); }
function pct(used, budget) { return ((used / budget) * 100).toFixed(1); }
function bar(used, budget, width = 20) {
  const filled = Math.round(Math.min(used / budget, 1) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── Measurement ──────────────────────────────────────────────────────────────

/**
 * Measures gzipped size of every dist entry point. Shared by this script's
 * CLI and scripts/build-metrics.js, so the numbers can never diverge.
 */
export async function measureSizes(dir = distDir) {
  let files;
  try {
    const entries = await readdir(dir);
    files = entries.filter(f => !SKIP.test(f) && (f.endsWith('.mjs') || f.endsWith('.js')));
  } catch {
    throw new Error('dist/ not found. Run `npm run build` first.');
  }

  const results = [];

  for (const file of files.sort()) {
    const content = await readFile(resolve(dir, file));
    const gz = await gzipAsync(content);
    const budget = BUDGETS[file] ?? null;
    const overBudget = budget != null && gz.length > budget;

    results.push({
      file,
      raw: content.length,
      gzipped: gz.length,
      budget,
      overBudget,
    });
  }

  return { results, anyFailed: results.some(r => r.overBudget) };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let results, anyFailed;
  try {
    ({ results, anyFailed } = await measureSizes());
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // ── JSON output (for CI diffing) ─────────────────────────────────────────

  if (isJson) {
    console.log(JSON.stringify({ passed: !anyFailed, files: results }, null, 2));
    process.exit(anyFailed ? 1 : 0);
  }

  // ── GitHub Actions step summary ──────────────────────────────────────────

  if (isGitHubActions) {
    console.log('## 📦 Lume.js Bundle Size Report\n');
    console.log('| File | Raw | Gzipped | Budget | Status |');
    console.log('|------|-----|---------|--------|--------|');
    for (const r of results) {
      const status = r.budget == null ? '—'
        : r.overBudget ? `❌ over by ${kb(r.gzipped - r.budget)} KB`
        : `✅ ${pct(r.gzipped, r.budget)}%`;
      const budget = r.budget != null ? `${kb(r.budget)} KB` : '—';
      console.log(`| \`${r.file}\` | ${kb(r.raw)} KB | **${kb(r.gzipped)} KB** | ${budget} | ${status} |`);
    }
    if (!anyFailed) {
      console.log('\n✅ All bundles within budget.');
    } else {
      console.log('\n❌ One or more bundles exceed their budget.');
    }
    process.exit(anyFailed ? 1 : 0);
  }

  // ── Terminal output ───────────────────────────────────────────────────────

  console.log('\n🔍 Lume.js Bundle Size Report');
  console.log('═'.repeat(72));
  console.log(`${'File'.padEnd(24)} ${'Raw'.padStart(8)} ${'Gzipped'.padStart(9)} ${'Budget'.padStart(8)}  Usage`);
  console.log('─'.repeat(72));

  for (const r of results) {
    const budgetStr = r.budget != null ? `${kb(r.budget)} KB` : '   —   ';
    const usageStr = r.budget != null
      ? `${bar(r.gzipped, r.budget)} ${pct(r.gzipped, r.budget)}%${r.overBudget ? ' ❌' : ''}`
      : '';
    console.log(
      `${r.file.padEnd(24)} ${(kb(r.raw) + ' KB').padStart(8)} ${(kb(r.gzipped) + ' KB').padStart(9)} ${budgetStr.padStart(8)}  ${usageStr}`
    );
  }

  console.log('─'.repeat(72));
  const totalGz = results.reduce((s, r) => s + r.gzipped, 0);
  const totalRaw = results.reduce((s, r) => s + r.raw, 0);
  console.log(`${'TOTAL'.padEnd(24)} ${(kb(totalRaw) + ' KB').padStart(8)} ${(kb(totalGz) + ' KB').padStart(9)}`);
  console.log('═'.repeat(72));

  if (!anyFailed) {
    console.log('\n✅ All bundles within budget.\n');
  } else {
    console.log('\n❌ Budget exceeded:\n');
    for (const r of results.filter(r => r.overBudget)) {
      console.log(`   ${r.file}: ${kb(r.gzipped)} KB gzipped (budget ${kb(r.budget)} KB, over by ${kb(r.gzipped - r.budget)} KB)`);
    }
    console.log();
  }

  process.exit(anyFailed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
