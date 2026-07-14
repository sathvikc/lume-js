// render-queue-lab sweep — runs the whole regime × mode matrix sequentially in
// one throttled Chromium, writing a raw JSON per case into results/ plus a
// results/summary.json. Sequential + single-browser so cases never contend for
// the throttled CPU (contention silently inflates every number).
//
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright-core
//   (start `npm run dev -- --port 5199 --strictPort` first)
//   node examples/render-queue-lab/sweep.mjs [quick]
//
// `quick` runs a small smoke subset.

import { runCase } from './run.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'results');
mkdirSync(OUT, { recursive: true });

const MODES_ALL = ['off', 'rq', 'simple', 'adaptive', 'cv'];

function buildMatrix(kind) {
  const cases = [];
  const add = (o) => cases.push({ mode: 'off', regime: 'storm', cells: 3000, budget: 2,
    churn: 0.08, rate: 20, warmup: 1500, measure: 6000, type: false, converge: false, dot: 1, ...o });

  if (kind === 'quick') {
    add({ mode: 'off', regime: 'dashboard', measure: 4000, type: true });
    add({ mode: 'rq', regime: 'dashboard', measure: 4000, type: true });
    return cases;
  }

  // CLEAN matrix: dot=0 removes the repaint artifact so the per-frame floor is
  // ~25fps at 3000 cells and the scheduling signal is visible with many frames
  // and many keystrokes. This is renderQueue's best-case measurement.
  if (kind === 'clean') {
    for (const mode of ['off', 'rq', 'simple', 'cv', 'adaptive']) add({ mode, regime: 'storm', dot: 0, measure: 7000, type: true });
    for (const mode of ['off', 'rq', 'simple', 'cv', 'adaptive']) add({ mode, regime: 'dashboard', churn: 0.08, dot: 0, measure: 7000, type: true });
    for (const mode of ['off', 'rq', 'simple', 'cv']) add({ mode, regime: 'burst', dot: 0, measure: 6000, type: true, converge: true });
    for (const cells of [800, 1500]) for (const mode of ['off', 'rq', 'simple']) add({ mode, regime: 'dashboard', cells, dot: 0, measure: 6000, type: true });
    return cases;
  }

  // 1. Storm (pathological ceiling) — input is the headline; long window.
  for (const mode of MODES_ALL) add({ mode, regime: 'storm', measure: 8000, type: true });

  // 2. Dashboard tick (5-10% churn) — the realistic steady regime.
  for (const mode of MODES_ALL) add({ mode, regime: 'dashboard', churn: 0.08, measure: 6000, type: true });
  for (const mode of ['off', 'rq', 'simple']) add({ mode, regime: 'dashboard', churn: 0.05, measure: 6000, type: true });

  // 3. Burst (all change once, then quiet) — convergence + input at the spike.
  for (const mode of ['off', 'rq', 'simple', 'adaptive']) add({ mode, regime: 'burst', measure: 4000, type: true, converge: true });

  // 4. Quiet control — overhead of the mode itself with no writes.
  for (const mode of ['off', 'rq']) add({ mode, regime: 'quiet', measure: 3000, type: true });

  // 5. Storm scale sweep for rq (freeze characterization).
  for (const cells of [1000, 3000, 10000]) add({ mode: 'rq', regime: 'storm', cells, measure: 6000, type: false });
  for (const cells of [1000, 3000, 10000]) add({ mode: 'off', regime: 'storm', cells, measure: 6000, type: false });

  // 6. Budget sensitivity for rq under dashboard (does a bigger budget converge?).
  for (const budget of [2, 8, 16, 32]) add({ mode: 'rq', regime: 'dashboard', churn: 0.08, budget, measure: 6000, type: true });

  return cases;
}

const kind = process.argv.includes('quick') ? 'quick' : process.argv.includes('clean') ? 'clean' : 'full';
const matrix = buildMatrix(kind);
const summary = [];
let i = 0;
// Each case runs in its OWN browser (runCase launches + closes it) so a single
// crash or hang can never poison the rest of the sweep.
for (const c of matrix) {
  i++;
  const tag = `${c.mode}-${c.regime}-c${c.cells}-b${c.budget}${c.churn !== 0.08 ? '-ch' + c.churn : ''}${c.dot === 0 ? '-nodot' : ''}${c.type ? '-type' : ''}`;
  const t0 = Date.now();
  process.stdout.write(`[${i}/${matrix.length}] ${tag} … `);
  try {
    const res = await runCase(c);
    writeFileSync(resolve(OUT, `${tag}.json`), JSON.stringify(res, null, 2));
    summary.push({ tag, ...flat(res) });
    console.log(`ok ${(Date.now() - t0) / 1000 | 0}s  in.worst=${res.inputDelay.worst} fps=${res.frame.fps} peakBL=${res.backlog.peak} stale=${res.maxStalenessMs} conv=${res.backlog.convergeMs}`);
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    summary.push({ tag, error: e.message });
  }
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
}
console.log(`\nWrote ${summary.length} results to ${OUT}`);

function flat(r) {
  return {
    mode: r.mode, regime: r.regime, cells: r.cells, budget: r.budgetMs, churn: r.churn,
    slowdown: r.throttle.effectiveSlowdown,
    inWorst: r.inputDelay.worst, inP95: r.inputDelay.p95, keys: r.inputDelay.keys,
    fps: r.frame.fps, p95gap: r.frame.p95Gap, worstgap: r.frame.worstGap,
    peakBL: r.backlog.peak, endBL: r.backlog.atEnd, convMs: r.backlog.convergeMs,
    stale: r.maxStalenessMs, applied: r.appliedCount, errs: r.errs.length,
  };
}
