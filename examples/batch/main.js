import { state, effect, bindDom, batch } from 'lume-js';

// Three independent stores — e.g. three modules of an app
const storeA = state({ value: 1 });
const storeB = state({ value: 2 });
const storeC = state({ value: 3 });

// UI store: mirrors of the three values plus effect-run counters
const ui = state({
  a: storeA.value,
  b: storeB.value,
  c: storeC.value,
  sum: 0,
  lastRuns: 0,
  totalRuns: 0,
});

bindDom(document.body, ui);

// ONE effect depending on all three stores.
// Per-state microtask batching runs it once per mutated store;
// batch() runs it exactly once for the whole group.
let runsThisAction = 0;
effect(() => {
  ui.sum = storeA.value + storeB.value + storeC.value;
  runsThisAction++;
  ui.totalRuns++;
});

function mutateAll() {
  runsThisAction = 0;
  storeA.value++;
  storeB.value++;
  storeC.value++;
  ui.a = storeA.value;
  ui.b = storeB.value;
  ui.c = storeC.value;
}

document.getElementById('without').addEventListener('click', () => {
  mutateAll();
  // Per-state flushes happen over the next microtasks; report afterwards
  setTimeout(() => { ui.lastRuns = runsThisAction; }, 0);
});

document.getElementById('with').addEventListener('click', () => {
  batch(mutateAll);
  // batch() flushed synchronously — the count is already final
  ui.lastRuns = runsThisAction;
});
