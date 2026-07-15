// render-queue-lab GENERIC matrix runner — use this instead of writing a new
// comparison script every time (saves tokens / session budget). It runs the
// cross-product of modes × regimes × cell-counts and prints a table plus a full
// JSON to results/. Everything is CLI-driven; add a mode to main.js and it is
// immediately runnable here.
//
//   node matrix.mjs --modes off,pull,smart --regimes storm,dashboard \
//     --cells 1000,3000 --budget 2 --nodot --type --measure 6000
//
// Flags: --modes, --regimes, --cells (comma lists); --budget, --churn, --rate,
// --measure, --warmup (numbers); --nodot, --type, --burst-type, --norender,
// --converge, --headed (booleans); --out <file> (default results/matrix-<ts>.json).
// Columns shown: in.med / in.p95 / fps / worstBlock / free% / maxStale / peakBL /
// starved / conv / busyFrac / prod / slice (— when N/A). Full detail in the JSON.

import { runCase } from './run.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'results');
mkdirSync(OUT, { recursive: true });

function parse(argv) {
  const a = { modes: ['off', 'pull'], regimes: ['dashboard'], cells: [3000],
    budget: 2, churn: 0.08, rate: 20, warmup: 1500, measure: 6000,
    type: false, typeBursty: false, converge: false, dot: 1, text: 1, render: 1,
    headed: false, out: null };
  const nums = new Set(['budget', 'churn', 'rate', 'warmup', 'measure']);
  const lists = { modes: 'modes', regimes: 'regimes', cells: 'cells' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'nodot') { a.dot = 0; continue; }
    if (k === 'norender') { a.render = 0; continue; }
    if (k === 'notext') { a.text = 0; continue; }
    if (k === 'type') { a.type = true; continue; }
    if (k === 'burst-type') { a.type = true; a.typeBursty = true; continue; }
    if (k === 'converge') { a.converge = true; continue; }
    if (k === 'headed') { a.headed = true; continue; }
    const v = argv[++i];
    if (k in lists) a[lists[k]] = k === 'cells' ? v.split(',').map(Number) : v.split(',');
    else if (nums.has(k)) a[k] = Number(v);
    else if (k === 'out') a.out = v;
  }
  return a;
}

const fmt = (v, w = 6) => String(v == null ? '—' : v).padStart(w);
const cols = (r) => {
  const mt = r.mainThread || {}; const st = r.starvation || {};
  return [
    fmt(r.inputDelay.median), fmt(r.inputDelay.p95), fmt(r.frame.fps, 5),
    fmt(mt.worstBlockMs), fmt(mt.freePct, 5), fmt(r.maxStalenessMs, 7),
    fmt(r.backlog.peak, 6), fmt(st.zeroCount, 5), fmt(r.backlog.convergeMs, 6),
    fmt(r.smartBusyFraction, 5), fmt(r.maxProducerMs, 5), fmt(r.maxSliceMs, 5),
  ].join(' ');
};
const HEADER = ['in.med', 'in.p95', '  fps', 'worstBl', 'free%', 'maxStal', 'peakBL', 'starv', '  conv', 'busyF', ' prod', 'slice'];

const a = parse(process.argv.slice(2));
const all = [];
console.log(`modes=${a.modes} regimes=${a.regimes} cells=${a.cells} budget=${a.budget} rate=${a.rate}x dot=${a.dot} type=${a.type}${a.typeBursty ? '(bursty)' : ''}`);
for (const regime of a.regimes) {
  for (const cells of a.cells) {
    console.log(`\n=== ${regime} · ${cells} cells ===`);
    console.log('mode      ' + HEADER.join(' '));
    for (const mode of a.modes) {
      const t0 = Date.now();
      try {
        const r = await runCase({ mode, regime, cells, budget: a.budget, churn: a.churn,
          rate: a.rate, warmup: a.warmup, measure: a.measure, type: a.type,
          typeBursty: a.typeBursty, converge: a.converge, dot: a.dot, text: a.text,
          render: a.render, headed: a.headed });
        all.push(r);
        console.log(mode.padEnd(9) + ' ' + cols(r) + `   (${(Date.now() - t0) / 1000 | 0}s, ${r.throttle.effectiveSlowdown}x)`);
      } catch (e) {
        console.log(mode.padEnd(9) + ' FAIL ' + e.message.split('\n')[0]);
      }
    }
  }
}
const out = a.out || resolve(OUT, `matrix-${Date.now()}.json`);
writeFileSync(out, JSON.stringify(all, null, 2));
console.log(`\nWrote ${all.length} cases to ${out}`);
