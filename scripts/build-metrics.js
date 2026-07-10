#!/usr/bin/env node

/**
 * Generates docs/metrics.json — the single source for facts (version, sizes,
 * budgets, test count, browser floor) that used to be hand-typed as literals
 * across README.md, docs/README.md, AGENT_GUIDE.md, and the guides.
 *
 * Every value is derived, never typed in:
 *   - version      <- package.json
 *   - sizes/budgets <- scripts/check-size.js's measureSizes() (requires dist/,
 *                      built here if missing)
 *   - tests        <- vitest run --reporter=json
 *   - browserFloor <- constant below; the source of truth for *when* it
 *                      changes is a human decision recorded in AGENTS.md
 *
 * Usage:
 *   node scripts/build-metrics.js   # writes docs/metrics.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { measureSizes, BUDGETS } from './check-size.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

// Changes only when a human decides (see AGENTS.md's "Browser floor" line);
// this constant is the one machine-readable place it lives.
const BROWSER_FLOOR = { chrome: '80+', firefox: '74+', safari: '13.1+', edge: '80+' };

function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

async function readSizes() {
  if (!fs.existsSync(distDir)) {
    execFileSync('node', ['scripts/build.js'], { cwd: root, stdio: 'inherit' });
  }

  let measured;
  try {
    measured = await measureSizes(distDir);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const kb = bytes => (bytes / 1024).toFixed(2);
  const ORDER = [
    ['state.min.mjs', 'state'],
    ['index.min.mjs', 'index'],
    ['handlers.min.mjs', 'handlers'],
    ['addons.min.mjs', 'addons'],
    ['lume.global.js', 'global'],
  ];
  const resultByFile = Object.fromEntries(measured.results.map(r => [r.file, r]));
  const sizes = {};
  const budgets = {};
  for (const [file, key] of ORDER) {
    if (resultByFile[file]) sizes[key] = kb(resultByFile[file].gzipped);
    if (key !== 'global' && BUDGETS[file] != null) budgets[key] = kb(BUDGETS[file]);
  }
  return { sizes, budgets };
}

function readTestCount() {
  const out = execFileSync(
    'npx', ['vitest', 'run', '--reporter=json'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  const report = JSON.parse(out);
  return report.numTotalTests;
}

async function main() {
  const version = readVersion();
  const { sizes, budgets } = await readSizes();
  const tests = readTestCount();

  const metrics = {
    version,
    tests,
    sizes,
    budgets,
    browserFloor: BROWSER_FLOOR,
  };

  const outPath = path.join(root, 'docs', 'metrics.json');
  fs.writeFileSync(outPath, JSON.stringify(metrics, null, 2) + '\n');
  console.log(`Wrote docs/metrics.json (version ${version}, ${tests} tests)`);
}

main();
