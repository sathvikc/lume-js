#!/usr/bin/env node

/**
 * The one writer for every managed marker region: facts sourced from
 * docs/metrics.json, and structure (nav footers, docs/README index) sourced
 * from docs/manifest.json. Every marker-bearing file is simultaneously
 * template and output — there is no separate template mirror.
 *
 * Marker syntax: `<!-- lume:KEY -->...<!-- /lume:KEY -->`. Whatever sits
 * between the pair is regenerated on every run; an unrecognized KEY is a
 * hard error (a typo'd marker must fail loudly, never sit there unmanaged).
 *
 * `createEngine()` takes injectable I/O so tests/scripts/*.test.js can drive
 * it against an in-memory file set instead of the real repo tree.
 *
 * Usage:
 *   node scripts/sync-docs.js           # write every managed file
 *   node scripts/sync-docs.js --check   # exit 1 if any managed file is stale
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAIR_RE = /<!--\s*(lume:[\w-]+)\s*-->([\s\S]*?)<!--\s*\/\1\s*-->/g;
const KEY_MENTION_RE = /<!--\s*(\/?)(lume:[\w-]+)\s*-->/g;

// docs/README.md is the docs-tree index — a virtual manifest head ("Introduction")
// that every content page's nav chain starts from, without being a content entry itself.
const DOCS_INDEX = { path: 'docs/README.md', title: 'Introduction' };

export function createEngine(metrics, manifest, { root, readFileSync = fs.readFileSync, existsSync = fs.existsSync } = {}) {
  const flatEntries = [];
  for (const section of manifest.sections) {
    for (const entry of section.entries) {
      flatEntries.push({ ...entry, section });
    }
  }

  for (const entry of flatEntries) {
    if (!existsSync(path.join(root, entry.path))) {
      throw new Error(`docs/manifest.json references a missing path: ${entry.path}`);
    }
  }

  function relLink(fromPath, toPath) {
    const fromDir = path.posix.dirname(fromPath);
    return path.posix.relative(fromDir, toPath);
  }

  // Nav spine: manifest order, filtered to files that actually carry a
  // lume:nav marker. This is what excludes docs/design/design-decisions.md —
  // a historical, hand-maintained document per CLAUDE.md/AGENTS.md — and the
  // "Start here" section's AGENT_GUIDE.md/README.md, without hardcoding any
  // filename.
  function hasNavMarker(relPath) {
    const content = readFileSync(path.join(root, relPath), 'utf8');
    return /<!--\s*lume:nav\s*-->/.test(content);
  }

  const spine = [DOCS_INDEX, ...flatEntries.filter(e => hasNavMarker(e.path))];

  function navFooter(filePath) {
    const i = spine.findIndex(e => e.path === filePath);
    if (i === -1) throw new Error(`${filePath} carries a lume:nav marker but is not in the nav spine`);
    const prev = i > 0 ? spine[i - 1] : null;
    const next = i < spine.length - 1 ? spine[i + 1] : null;
    const parts = [];
    if (prev) parts.push(`**← Previous: [${prev.title}](${relLink(filePath, prev.path)})**`);
    if (next) parts.push(`**Next: [${next.title}](${relLink(filePath, next.path)}) →**`);
    return `\n${parts.join(' | ')}\n`;
  }

  function docIndexBlock() {
    const sections = manifest.sections
      .filter(section => section.docIndex !== false)
      .map(section => {
        const bullets = section.entries
          .map(entry => `- [${entry.title}](${relLink('docs/README.md', entry.path)})`)
          .join('\n');
        return `### ${section.title}\n${bullets}`;
      });
    return `\n${sections.join('\n\n')}\n`;
  }

  // Fact values, from docs/metrics.json.
  const VALUES = {
    'lume:version': metrics.version,
    'lume:tests': String(metrics.tests),
    'lume:size-state': metrics.sizes.state,
    'lume:size-index': metrics.sizes.index,
    'lume:size-handlers': metrics.sizes.handlers,
    'lume:size-addons': metrics.sizes.addons,
    'lume:size-global': metrics.sizes.global,
    'lume:budget-state': metrics.budgets.state,
    'lume:budget-index': metrics.budgets.index,
    'lume:budget-handlers': metrics.budgets.handlers,
    'lume:budget-addons': metrics.budgets.addons,
    'lume:browser-chrome': metrics.browserFloor.chrome,
    'lume:browser-firefox': metrics.browserFloor.firefox,
    'lume:browser-safari': metrics.browserFloor.safari,
    'lume:browser-edge': metrics.browserFloor.edge,
  };

  // Whole-line generators, for spots an inline comment can't sit: inside an
  // HTML attribute string, or where the line itself needs full regeneration.
  const LINES = {
    'lume:badge-version': () =>
      `\n    <a href="package.json"><img src="https://img.shields.io/badge/version-${metrics.version}-orange.svg" alt="v${metrics.version}"></a>\n`,
    'lume:badge-tests': () =>
      `\n    <a href="tests/"><img src="https://img.shields.io/badge/tests-${metrics.tests}%20passing-brightgreen.svg" alt="${metrics.tests} tests"></a>\n`,
    'lume:badge-size-state': () =>
      `\n    <a href="scripts/check-size.js"><img src="https://img.shields.io/badge/universal%20core-${metrics.sizes.state}KB-blue.svg" alt="universal core ${metrics.sizes.state}KB"></a>\n`,
    'lume:badge-size-index': () =>
      `\n    <a href="scripts/check-size.js"><img src="https://img.shields.io/badge/core%20%2B%20DOM-${metrics.sizes.index}KB-blue.svg" alt="core + DOM ${metrics.sizes.index}KB"></a>\n`,
    'lume:pin-url': () =>
      `\n'https://cdn.jsdelivr.net/npm/lume-js@${metrics.version}/dist/index.min.mjs'\n`,
    'lume:comment-size-state': () =>
      `\nimport { state, batch } from 'lume-js/state';    // Node/CLI/workers: ${metrics.sizes.state} KB kernel\n`,
    'lume:comment-size-index': () =>
      `\nimport { state, bindDom, effect, batch } from 'lume-js';   // ${metrics.sizes.index} KB\n`,
  };

  // Block generators — structure, computed per the file they're written into.
  const BLOCKS = {
    'lume:nav': (filePath) => navFooter(filePath),
    'lume:doc-index': () => docIndexBlock(),
  };

  const GENERATORS = { ...LINES, ...BLOCKS };

  function resolveValue(key, filePath) {
    if (key in VALUES) return VALUES[key];
    if (key in GENERATORS) return GENERATORS[key](filePath);
    return undefined;
  }

  function checkKnownKeys(content, filePath) {
    const seen = new Map(); // key -> { opens, closes }
    let m;
    KEY_MENTION_RE.lastIndex = 0;
    while ((m = KEY_MENTION_RE.exec(content))) {
      const [, closing, key] = m;
      if (!(key in VALUES) && !(key in GENERATORS)) {
        throw new Error(`Unknown marker '${key}' in ${filePath}`);
      }
      const entry = seen.get(key) ?? { opens: 0, closes: 0 };
      if (closing) entry.closes++; else entry.opens++;
      seen.set(key, entry);
    }
    for (const [key, { opens, closes }] of seen) {
      if (opens !== closes) {
        throw new Error(`Malformed marker '${key}' in ${filePath} (unbalanced open/close)`);
      }
    }
  }

  function syncFile(filePath) {
    const abs = path.join(root, filePath);
    const original = readFileSync(abs, 'utf8');
    checkKnownKeys(original, filePath);

    const updated = original.replace(PAIR_RE, (whole, key) => {
      const value = resolveValue(key, filePath);
      return `<!-- ${key} -->${value}<!-- /${key} -->`;
    });

    return { abs, original, updated, changed: updated !== original };
  }

  const MANAGED_FILES = [
    ...new Set([
      'README.md',
      'AGENT_GUIDE.md',
      'docs/README.md',
      ...flatEntries.map(e => e.path),
    ]),
  ];

  return { flatEntries, spine, relLink, navFooter, docIndexBlock, VALUES, GENERATORS, resolveValue, checkKnownKeys, syncFile, MANAGED_FILES };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const CHECK = process.argv.includes('--check');

  const metrics = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'metrics.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'manifest.json'), 'utf8'));
  const engine = createEngine(metrics, manifest, { root });

  const changedFiles = [];
  for (const filePath of engine.MANAGED_FILES) {
    const { abs, updated, changed } = engine.syncFile(filePath);
    if (!changed) continue;
    changedFiles.push(filePath);
    if (!CHECK) fs.writeFileSync(abs, updated);
  }

  if (CHECK) {
    if (changedFiles.length > 0) {
      console.error(`Stale docs: ${changedFiles.join(', ')}. Run \`npm run docs:sync\` and commit the result.`);
      process.exit(1);
    }
    console.log('docs/manifest.json and docs/metrics.json are in sync with the managed files.');
  } else if (changedFiles.length > 0) {
    console.log(`Updated: ${changedFiles.join(', ')}`);
  } else {
    console.log('Nothing to update — already in sync.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
