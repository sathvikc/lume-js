import { state, effect, bindDom, batch } from 'lume-js';

const STORES = 500;
const BURSTS = 100;

// 500 independent stores — one per dashboard cell, as separate widgets/modules would have
const stores = Array.from({ length: STORES }, () => state({ value: 50 }));

// UI store for the readouts (data-bind targets)
const ui = state({
  sum: 0, avg: '0.0', min: 0, max: 0,
  worstFrame: '…',
  plainTime: '—', plainWall: '—', plainAgg: '—', plainCell: '—', plainOps: '—',
  batchTime: '—', batchWall: '—', batchAgg: '—', batchCell: '—', batchOps: '—',
  ratio: '',
});
bindDom(document.body, ui);

const fmt = n => n.toLocaleString('en-US');

// ── Fine-grained layer: one effect per store, driving its own cell ────────
// These run once per changed store in BOTH modes — batch() never makes
// granular updates coarser.
const grid = document.getElementById('grid');
let cellRuns = 0;
for (const s of stores) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  grid.appendChild(cell);
  effect(() => {
    const v = s.value;
    cellRuns++;
    cell.style.setProperty('--h', String(Math.round(v * 1.2 + 60)));
  });
}

// ── Cross-store layer: ONE aggregate effect reading all 500 stores ────────
// This is the dashboard summary — and the thing per-store batching runs
// once per mutated store, but batch() runs once per burst.
let aggRuns = 0;
effect(() => {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < STORES; i++) {
    const v = stores[i].value;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  aggRuns++;
  ui.sum = Math.round(sum);
  ui.avg = (sum / STORES).toFixed(1);
  ui.min = Math.round(min);
  ui.max = Math.round(max);
});

// ── The benchmark ──────────────────────────────────────────────────────────
// One burst = a random-walk write to every store (think: a tick of live
// market/sensor data hitting every widget at once).
function burst() {
  for (let i = 0; i < STORES; i++) {
    const s = stores[i];
    s.value = Math.max(0, Math.min(100, s.value + (Math.random() * 10 - 5)));
  }
}

// Event-like cadence between bursts; identical in both modes so scheduling
// overhead cancels out and only effect work differs.
const nextTick = () => new Promise(resolve => setTimeout(resolve));

const buttons = [...document.querySelectorAll('button')];
let running = false;
let plainOpsTotal = 0;
let batchOpsTotal = 0;

async function run(useBatch) {
  if (running) return;
  running = true;
  buttons.forEach(b => { b.disabled = true; });

  const agg0 = aggRuns;
  const cell0 = cellRuns;
  const wall0 = performance.now();
  let work = 0;

  for (let b = 0; b < BURSTS; b++) {
    const t0 = performance.now();
    if (useBatch) {
      batch(burst);    // one synchronous flush: aggregate runs ONCE
    } else {
      burst();         // per-store flushes: aggregate runs once per store
    }
    // Without batch, each store flushes in its own microtask queued during
    // burst(); awaiting a resolved promise queues this continuation AFTER
    // those flushes, so `work` captures the effect work in both modes.
    await Promise.resolve();
    work += performance.now() - t0;
    await nextTick();
  }

  const wall = performance.now() - wall0;
  const aggDelta = aggRuns - agg0;
  const cellDelta = cellRuns - cell0;
  // writes + reads performed by effects (aggregate reads all stores per run,
  // each cell effect reads its one store) + effect executions
  const totalOps =
    STORES * BURSTS +
    aggDelta * STORES + cellDelta +
    aggDelta + cellDelta;

  if (useBatch) {
    ui.batchTime = `${work.toFixed(0)} ms`;
    ui.batchWall = `${wall.toFixed(0)} ms`;
    ui.batchAgg = fmt(aggDelta);
    ui.batchCell = fmt(cellDelta);
    ui.batchOps = fmt(totalOps);
    batchOpsTotal = totalOps;
  } else {
    ui.plainTime = `${work.toFixed(0)} ms`;
    ui.plainWall = `${wall.toFixed(0)} ms`;
    ui.plainAgg = fmt(aggDelta);
    ui.plainCell = fmt(cellDelta);
    ui.plainOps = fmt(totalOps);
    plainOpsTotal = totalOps;
  }
  if (plainOpsTotal && batchOpsTotal) {
    ui.ratio = `${Math.round(plainOpsTotal / batchOpsTotal)}× fewer operations with batch()`;
  }

  buttons.forEach(b => { b.disabled = false; });
  running = false;
}

document.getElementById('run-plain').addEventListener('click', () => run(false));
document.getElementById('run-batch').addEventListener('click', () => run(true));

// ── Frame-health meter ─────────────────────────────────────────────────────
// Worst frame-to-frame gap over the last second; a blocked main thread
// shows up here (and in the CSS pulse stuttering) immediately.
let lastFrame = performance.now();
let worst = 0;
function onFrame(now) {
  const delta = now - lastFrame;
  lastFrame = now;
  if (delta > worst) worst = delta;
  requestAnimationFrame(onFrame);
}
requestAnimationFrame(onFrame);
setInterval(() => {
  ui.worstFrame = `${worst.toFixed(0)} ms`;
  worst = 0;
}, 1000);
