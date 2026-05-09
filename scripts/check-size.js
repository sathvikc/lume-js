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
 * Budgets:
 *   dist/index.mjs (core)   ≤ 3 KB gzipped
 *   dist/addons.mjs         ≤ 6 KB gzipped
 *   dist/handlers.mjs       ≤ 2 KB gzipped
 *   dist/lume.global.js     ≤ 8 KB gzipped  (all-in-one CDN build)
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

const BUDGETS = {
  'index.mjs':      3 * 1024,  // 3 KB  — core must stay tight
  'addons.mjs':     6 * 1024,  // 6 KB
  'handlers.mjs':   2 * 1024,  // 2 KB
  'lume.global.js': 8 * 1024,  // 8 KB  — full CDN build
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let files;
  try {
    const entries = await readdir(distDir);
    files = entries.filter(f => !SKIP.test(f) && (f.endsWith('.mjs') || f.endsWith('.js')));
  } catch {
    console.error('❌ dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const results = [];

  for (const file of files.sort()) {
    const content = await readFile(resolve(distDir, file));
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

  const anyFailed = results.some(r => r.overBudget);

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

main();
