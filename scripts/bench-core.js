#!/usr/bin/env node

/**
 * Lume.js Core Performance Benchmark
 *
 * Measures reactive primitive throughput and DOM operations using the same
 * operation categories as js-framework-benchmark (krausest.github.io):
 *
 *   Reactive core:
 *     state-read          — property reads per second (tracking disabled)
 *     state-write         — property writes + microtask notifications/s
 *     effect-run          — effects re-run per second under load
 *     computed-read       — computed.value reads per second
 *     subscribe-notify    — $subscribe notifications per second
 *
 *   DOM operations (jsdom):
 *     bind-1k             — bindDom() initial scan: 1,000 reactive elements
 *     bind-5k             — bindDom() initial scan: 5,000 reactive elements
 *     update-1k           — update 1,000 bound properties one tick
 *     repeat-create-1k    — repeat(): create list of 1,000 items
 *     repeat-update-1k    — repeat(): replace all 1,000 items with new data
 *     repeat-partial-100  — repeat(): update every 10th of 1,000 items
 *     repeat-swap         — repeat(): swap first and last item
 *     repeat-clear        — repeat(): clear all 1,000 items
 *
 * Run: node scripts/bench-core.js
 *      node scripts/bench-core.js --json    (machine-readable)
 *      npm run bench
 *
 * Note: JSDOM is ~10-100x slower than a real browser's C++ engine for DOM ops.
 * Reactive core numbers are accurate; DOM numbers show relative performance
 * between operations, not absolute real-browser throughput.
 */

import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// ── Bootstrap jsdom global for DOM benchmarks ────────────────────────────────

const { window } = new JSDOM('<!DOCTYPE html><body></body>');
global.document = window.document;
global.window = window;
global.HTMLElement = window.HTMLElement;
global.MutationObserver = window.MutationObserver;

// ── Import Lume from source ──────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../src');

const { state, effect, bindDom } = await import(`${src}/index.js`);
const { computed, watch, repeat } = await import(`${src}/addons/index.js`);

const isJson = process.argv.includes('--json');

// ── Benchmark runner ─────────────────────────────────────────────────────────

async function bench(label, fn, { iterations = 50, async: isAsync = false } = {}) {
  // Warmup
  for (let i = 0; i < 5; i++) {
    isAsync ? await fn() : fn();
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    isAsync ? await fn() : fn();
    times.push(performance.now() - t0);
  }

  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const p95    = times[Math.floor(times.length * 0.95)];
  const min    = times[0];
  const max    = times[times.length - 1];

  return { label, median, p95, min, max };
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function makeReactiveDOM(n) {
  const container = document.createElement('div');
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.setAttribute('data-bind', `key${i}`);
    container.appendChild(el);
  }
  document.body.appendChild(container);
  return container;
}

function makeListContainer() {
  const el = document.createElement('div');
  el.id = `list-${Math.random().toString(36).slice(2)}`;
  document.body.appendChild(el);
  return el;
}

function makeItems(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + offset,
    label: `Item ${i + offset}`,
    done: i % 2 === 0,
  }));
}

// ── Run all benchmarks ────────────────────────────────────────────────────────

const results = [];

// ─── Reactive core ───────────────────────────────────────────────────────────

{
  // state-read: raw property reads with no effect context
  const store = state({ x: 0 });
  const READS = 100_000;
  results.push(await bench('state-read (100k reads)', () => {
    for (let i = 0; i < READS; i++) { void store.x; }
  }, { iterations: 20 }));
}

{
  // state-write: writes that schedule microtask notifications
  const store = state({ x: 0 });
  const WRITES = 1_000;
  results.push(await bench('state-write + notify (1k writes)', async () => {
    for (let i = 0; i < WRITES; i++) { store.x = i; }
    await Promise.resolve(); // flush microtask batch
  }, { iterations: 50, async: true }));
}

{
  // effect-run: how many effect re-runs happen per second
  const store = state({ tick: 0 });
  let runs = 0;
  const stop = effect(() => { void store.tick; runs++; });
  runs = 0; // reset after initial run

  const TICKS = 500;
  results.push(await bench('effect re-runs (500 ticks)', async () => {
    for (let i = 0; i < TICKS; i++) { store.tick = i; }
    await Promise.resolve();
  }, { iterations: 30, async: true }));

  stop();
}

{
  // computed: reads of a computed value (cached between changes)
  const store = state({ a: 1, b: 2 });
  const sum = computed(() => store.a + store.b);
  const READS = 100_000;
  results.push(await bench('computed.value read (100k reads)', () => {
    for (let i = 0; i < READS; i++) { void sum.value; }
  }, { iterations: 20 }));
  sum.dispose();
}

{
  // subscribe-notify: $subscribe callback throughput
  const store = state({ n: 0 });
  let calls = 0;
  const unsub = store.$subscribe('n', () => calls++);
  calls = 0;

  const WRITES = 500;
  results.push(await bench('$subscribe notify (500 writes)', async () => {
    for (let i = 0; i < WRITES; i++) { store.n = i; }
    await Promise.resolve();
  }, { iterations: 50, async: true }));

  unsub();
}

// ─── DOM: bindDom ────────────────────────────────────────────────────────────

{
  results.push(await bench('bindDom scan 1k elements', () => {
    const container = makeReactiveDOM(1000);
    const store = state(Object.fromEntries(
      Array.from({ length: 1000 }, (_, i) => [`key${i}`, `val${i}`])
    ));
    const cleanup = bindDom(container, store);
    cleanup();
    container.remove();
  }, { iterations: 20 }));
}

{
  results.push(await bench('bindDom scan 5k elements', () => {
    const container = makeReactiveDOM(5000);
    const store = state(Object.fromEntries(
      Array.from({ length: 5000 }, (_, i) => [`key${i}`, `val${i}`])
    ));
    const cleanup = bindDom(container, store);
    cleanup();
    container.remove();
  }, { iterations: 10 }));
}

{
  // update-1k: bind once, then update all 1k properties in one tick
  const container = makeReactiveDOM(1000);
  const initial = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`key${i}`, `val${i}`]));
  const store = state(initial);
  const cleanup = bindDom(container, store);

  results.push(await bench('update 1k bound properties', async () => {
    for (let i = 0; i < 1000; i++) { store[`key${i}`] = `new${i}`; }
    await Promise.resolve();
  }, { iterations: 30, async: true }));

  cleanup();
  container.remove();
}

// ─── DOM: repeat() ───────────────────────────────────────────────────────────

{
  results.push(await bench('repeat() create 1k rows', async () => {
    const container = makeListContainer();
    const store = state({ items: [] });
    const cleanup = repeat(`#${container.id}`, store, 'items', {
      key: item => item.id,
      render: (item, el) => { el.textContent = item.label; },
    });

    store.items = makeItems(1000);
    await Promise.resolve();

    cleanup();
    container.remove();
  }, { iterations: 15, async: true }));
}

{
  // repeat-update: replace all rows with fresh data
  const container = makeListContainer();
  const store = state({ items: makeItems(1000) });
  const cleanup = repeat(`#${container.id}`, store, 'items', {
    key: item => item.id,
    render: (item, el) => { el.textContent = item.label; },
  });
  await Promise.resolve();

  let gen = 0;
  results.push(await bench('repeat() replace all 1k rows', async () => {
    store.items = makeItems(1000, ++gen * 1000);
    await Promise.resolve();
  }, { iterations: 15, async: true }));

  cleanup();
  container.remove();
}

{
  // repeat-partial: update every 10th item (100 of 1000)
  const container = makeListContainer();
  const store = state({ items: makeItems(1000) });
  const cleanup = repeat(`#${container.id}`, store, 'items', {
    key: item => item.id,
    render: (item, el) => { el.textContent = item.label; },
  });
  await Promise.resolve();

  results.push(await bench('repeat() partial update (every 10th of 1k)', async () => {
    const updated = [...store.items];
    for (let i = 0; i < updated.length; i += 10) {
      updated[i] = { ...updated[i], label: `Updated ${i}` };
    }
    store.items = updated;
    await Promise.resolve();
  }, { iterations: 20, async: true }));

  cleanup();
  container.remove();
}

{
  // repeat-swap: swap first and last
  const container = makeListContainer();
  const store = state({ items: makeItems(1000) });
  const cleanup = repeat(`#${container.id}`, store, 'items', {
    key: item => item.id,
    render: (item, el) => { el.textContent = item.label; },
  });
  await Promise.resolve();

  results.push(await bench('repeat() swap first/last row', async () => {
    const items = [...store.items];
    const tmp = items[0];
    items[0] = items[items.length - 1];
    items[items.length - 1] = tmp;
    store.items = items;
    await Promise.resolve();
  }, { iterations: 30, async: true }));

  cleanup();
  container.remove();
}

{
  // repeat-clear: remove all rows
  const container = makeListContainer();

  results.push(await bench('repeat() clear 1k rows', async () => {
    const store = state({ items: makeItems(1000) });
    const cleanup = repeat(`#${container.id}`, store, 'items', {
      key: item => item.id,
      render: (item, el) => { el.textContent = item.label; },
    });
    await Promise.resolve();

    store.items = [];
    await Promise.resolve();

    cleanup();
  }, { iterations: 15, async: true }));

  container.remove();
}

// ── Output ────────────────────────────────────────────────────────────────────

if (isJson) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

const fmt = (ms) => ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
const w = (s, n) => String(s).padEnd(n);
const wr = (s, n) => String(s).padStart(n);

console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║  Lume.js Core Benchmark                                                ║');
console.log('║  Note: DOM ops run in JSDOM — real browsers are 10-100x faster         ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

console.log(`${w('Operation', 38)} ${wr('Median', 10)} ${wr('P95', 10)} ${wr('Min', 10)} ${wr('Max', 10)}`);
console.log('─'.repeat(72));

const sections = [
  { label: 'Reactive Core', prefix: 'state-read' },
  { label: 'DOM – bindDom', prefix: 'bindDom' },
  { label: 'DOM – repeat()', prefix: 'repeat()' },
];

let lastSection = null;
for (const r of results) {
  const section = r.label.startsWith('state') || r.label.startsWith('effect') ||
                  r.label.startsWith('computed') || r.label.startsWith('$subscribe')
    ? 'Reactive Core'
    : r.label.startsWith('bindDom') || r.label.startsWith('update')
    ? 'DOM – bindDom'
    : 'DOM – repeat()';

  if (section !== lastSection) {
    if (lastSection !== null) console.log();
    console.log(`  ${section}`);
    lastSection = section;
  }

  console.log(
    `  ${w(r.label, 36)} ${wr(fmt(r.median), 10)} ${wr(fmt(r.p95), 10)} ${wr(fmt(r.min), 10)} ${wr(fmt(r.max), 10)}`
  );
}

console.log('\n' + '─'.repeat(72));
console.log('Lower is better. All times in ms (μs = microseconds).');
console.log('Median: typical case. P95: worst 5% of runs.\n');
