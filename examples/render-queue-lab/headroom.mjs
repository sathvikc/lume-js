// render-queue-lab headroom — answers two questions:
//   1. How many frames/sec can we sustain, and at what cell count does each mode
//      drop below 120 fps (8.3ms/frame) and 60 fps (16.6ms/frame)? Below that
//      line is where a presentation technique is worth adding.
//   2. How free is the main thread for the user's OTHER operations? worstBlock =
//      the single longest task (the worst input-blocking hang); free% = share of
//      the window NOT locked in >50ms tasks.
//
// `node headroom.mjs [storm|dashboard] [rate]`  (default storm, rate 20; pass 1
// for unthrottled to see the native ceiling). Server + playwright-core required.

import { runCase } from './run.mjs';

const regime = process.argv[2] || 'storm';
const rate = Number(process.argv[3]) || 20;
const modes = ['off', 'pull', 'bounded', 'cv'];
// argv[4]: comma-separated cell counts (defaults higher when unthrottled so the
// 60fps crossover is visible — headless rAF is vsync-capped at 60).
const cellCounts = process.argv[4]
  ? process.argv[4].split(',').map(Number)
  : (rate === 1 ? [1000, 2000, 4000, 8000, 16000] : [500, 1000, 2000, 4000]);

const base = { regime, budget: 2, churn: 0.08, rate, warmup: 1200, measure: 6000,
  type: false, converge: false, dot: 0, text: 1 };

console.log(`\nregime=${regime} rate=${rate}x  (fps / worstBlock ms / thread-free %)`);
console.log('mode      ' + cellCounts.map((c) => String(c).padStart(20)).join(''));
for (const mode of modes) {
  const cells = [];
  for (const n of cellCounts) {
    const r = await runCase({ ...base, mode, cells: n });
    const mt = r.mainThread || {};
    cells.push(`${String(r.frame.fps).padStart(5)} /${String(mt.worstBlockMs).padStart(6)} /${String(mt.freePct).padStart(4)}%`);
  }
  console.log(mode.padEnd(9) + cells.map((s) => s.padStart(20)).join(''));
}
