// render-queue-lab smart-scheduler experiment — tests the two principles:
// drop-stale rendering + an input-reserved dynamic budget. The point of the
// dynamic budget is to get, at once, what a FIXED budget forces you to choose
// between: a small fixed budget is responsive to input but slow to refresh; a
// large fixed budget refreshes fast but blocks input. `smart` should match the
// small budget's input latency AND the large budget's freshness.
//
// `node smart.mjs`  (server + playwright-core required)

import { runCase } from './run.mjs';

// BURST isolates the render from the writer: all cells change once, then the
// main thread is quiet except the render loop draining the backlog. A 3000-cell
// backlog at a 2ms budget takes many frames to drain, so the budget directly
// controls both input latency and how fast the picture catches up. Bursty typing
// (1.2s on / 1.2s off) gives the input-reserved budget idle gaps to catch up in.
const base = { regime: 'burst', cells: 3000, rate: 20, warmup: 1200, measure: 9000,
  type: true, typeBursty: true, converge: true, dot: 0, text: 1 };

console.log('\n=== burst (3000, dot off, bursty typing) — input vs convergence ===');
console.log('variant           in.med  in.p95  worstBlock  convergeMs  busyFrac');
const cases = [
  ['pull  budget=2',  { mode: 'pull', budget: 2 }],
  ['pull  budget=10', { mode: 'pull', budget: 10 }],
  ['smart budget=2',  { mode: 'smart', budget: 2 }], // 2ms interacting, 10ms idle
];
for (const [label, opts] of cases) {
  const r = await runCase({ ...base, ...opts });
  const mt = r.mainThread || {};
  console.log(`${label.padEnd(16)} ${String(r.inputDelay.median).padStart(6)}  ${String(r.inputDelay.p95).padStart(6)}  ${String(mt.worstBlockMs).padStart(9)}  ${String(r.backlog.convergeMs).padStart(9)}  ${String(r.smartBusyFraction ?? '-').padStart(7)}`);
}
