/**
 * Generates llms.txt (index) and llms-full.txt (full doc bundle) from the
 * docs tree, per https://llmstxt.org. Both files ship in the npm package so
 * AI agents working in consuming projects can read current, version-matched
 * documentation straight from node_modules.
 *
 * Usage:
 *   node scripts/build-llms.js           # write llms.txt + llms-full.txt
 *   node scripts/build-llms.js --check   # exit 1 if committed files are stale
 *
 * Keeping this honest: the source of truth stays in AGENT_GUIDE.md, README,
 * and docs/** (which AGENTS.md's artifact matrix already forces to be kept
 * current). CI runs --check, so a docs change that forgets to regenerate
 * fails the build instead of shipping stale agent docs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const RAW_BASE = 'https://raw.githubusercontent.com/sathvikc/lume-js/main';

// Ordered manifest: what goes into llms-full.txt and gets linked in llms.txt.
// Sections mirror the docs tree; descriptions come from docs/README.md intent.
const SECTIONS = [
  {
    title: 'Start here',
    files: [
      ['AGENT_GUIDE.md', 'Distilled rules, pitfalls, and patterns for coding agents'],
      ['README.md', 'Pitch, installation, quick start, API overview'],
    ],
  },
  {
    title: 'Guides',
    files: [
      ['docs/guides/installation.md', 'CDN, npm, and import options'],
      ['docs/guides/quick-start.md', 'First app in five minutes'],
      ['docs/guides/core-concepts.md', 'Stores, effects, bindings'],
      ['docs/guides/reactivity.md', 'How the Proxy, tracking, and microtask flush work'],
      ['docs/guides/choosing-reactive-primitives.md', 'effect vs computed vs watch'],
      ['docs/guides/two-way-binding.md', 'Inputs and data-bind'],
      ['docs/guides/lists.md', 'Rendering arrays'],
      ['docs/guides/forms.md', 'Form patterns'],
      ['docs/guides/handlers.md', 'Extending bindDom with new data-* attributes'],
      ['docs/guides/cleanup-and-dispose.md', 'Tearing down effects and bindings'],
      ['docs/guides/performance.md', 'Batching and update costs'],
      ['docs/guides/animations.md', 'Animating on state change'],
      ['docs/guides/routing.md', 'Client-side routing patterns'],
      ['docs/guides/ssr-hydration.md', 'Server-rendered HTML with reactive hydration'],
      ['docs/guides/universal-core.md', 'Using lume-js/state without a DOM'],
      ['docs/guides/testing.md', 'Testing stores and bindings'],
      ['docs/guides/migration.md', 'Migrating between versions'],
      ['docs/guides/faq.md', 'Frequently asked questions'],
    ],
  },
  {
    title: 'Tutorials',
    files: [
      ['docs/tutorials/build-todo-app.md', 'Todo app walkthrough'],
      ['docs/tutorials/working-with-arrays.md', 'Immutable array updates — the golden rule'],
      ['docs/tutorials/build-tic-tac-toe.md', 'Game with history and computed winner'],
    ],
  },
  {
    title: 'API reference — core',
    files: [
      ['docs/api/core/state.md', 'state() reactive stores'],
      ['docs/api/core/effect.md', 'effect() auto-tracking and explicit deps'],
      ['docs/api/core/bindDom.md', 'bindDom() DOM binding'],
      ['docs/api/core/batch.md', 'batch() cross-store write grouping'],
      ['docs/api/core/handlers.md', 'Handler system — the { attr, apply } extension contract'],
    ],
  },
  {
    title: 'API reference — handlers',
    files: [
      ['docs/api/handlers/show.md', 'Conditional visibility'],
      ['docs/api/handlers/className.md', 'Full class attribute from state'],
      ['docs/api/handlers/boolAttr.md', 'Boolean attributes (disabled, hidden, …)'],
      ['docs/api/handlers/ariaAttr.md', 'ARIA attributes from state'],
      ['docs/api/handlers/classToggle.md', 'Toggle a single class'],
      ['docs/api/handlers/stringAttr.md', 'String attributes (href, src, title, …)'],
      ['docs/api/handlers/on.md', 'Declarative event wiring via data-on*'],
      ['docs/api/handlers/htmlAttrs.md', 'Preset bundle of common attributes'],
    ],
  },
  {
    title: 'API reference — addons',
    files: [
      ['docs/api/addons/computed.md', 'Derived read-only values'],
      ['docs/api/addons/watch.md', 'Single-key observation'],
      ['docs/api/addons/repeat.md', 'Keyed list rendering'],
      ['docs/api/addons/persist.md', 'localStorage/sessionStorage sync'],
      ['docs/api/addons/hydrateState.md', 'SSR hydration'],
      ['docs/api/addons/createCleanupGroup.md', 'Grouped disposal'],
      ['docs/api/addons/debug.md', 'Write/flush logging'],
      ['docs/api/addons/withPlugins.md', 'State extension system'],
      ['docs/api/addons/isReactive.md', 'Reactive brand detection'],
    ],
  },
  {
    title: 'Design',
    files: [
      ['docs/design/design-decisions.md', 'Ratified decisions and their reasoning'],
    ],
  },
];

const HEADER = `# Lume.js

> Minimal reactive state management using only standard JavaScript and HTML —
> no custom syntax, no build step, no framework lock-in. 1.46 KB universal
> core (state/batch), 2.66 KB with DOM binding (bindDom/effect). Reactivity
> that follows web standards: stores are Proxies over plain objects, DOM
> binding is declarative via valid data-* attributes, updates are
> microtask-batched per store with an explicit batch() escape hatch for
> cross-store writes.

Version: ${pkg.version}. Install: \`npm install lume-js\` or import from
\`https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs\`.

Key facts agents get wrong without reading the docs: arrays and nested
objects must be REPLACED, never mutated in place (reference equality);
nested objects need explicit state() wrapping; updates flush on the next
microtask, not synchronously; effects only track keys read synchronously;
data-* attribute values are state keys, never expressions.
`;

function generateIndex() {
  let out = HEADER;
  for (const section of SECTIONS) {
    out += `\n## ${section.title}\n\n`;
    for (const [file, desc] of section.files) {
      out += `- [${file}](${RAW_BASE}/${file}): ${desc}\n`;
    }
  }
  out += `\n## Optional\n\n- [llms-full.txt](${RAW_BASE}/llms-full.txt): every file above concatenated into one document\n`;
  return out;
}

function generateFull() {
  let out = HEADER;
  out += '\nThis file is the full documentation bundle: every guide, tutorial, and\nAPI page concatenated. Generated by scripts/build-llms.js — do not edit.\n';
  for (const section of SECTIONS) {
    for (const [file] of section.files) {
      const content = fs.readFileSync(path.join(root, file), 'utf8').trim();
      out += `\n\n${'='.repeat(72)}\nFILE: ${file}\n${'='.repeat(72)}\n\n${content}\n`;
    }
  }
  return out;
}

const outputs = {
  'llms.txt': generateIndex(),
  'llms-full.txt': generateFull(),
};

if (process.argv.includes('--check')) {
  const stale = Object.entries(outputs).filter(([name, content]) => {
    const file = path.join(root, name);
    return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content;
  }).map(([name]) => name);
  if (stale.length > 0) {
    console.error(`Stale agent docs: ${stale.join(', ')}. Run \`npm run llms\` and commit the result.`);
    process.exit(1);
  }
  console.log('llms.txt and llms-full.txt are up to date.');
} else {
  for (const [name, content] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(root, name), content);
    console.log(`Wrote ${name} (${(content.length / 1024).toFixed(1)} KB)`);
  }
}
