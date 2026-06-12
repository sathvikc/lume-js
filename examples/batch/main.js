import { state, effect, bindDom, batch } from 'lume-js';

const STORES = 200;
const BURSTS = 100;

// 200 independent stores — one per dashboard cell, as separate widgets/modules would have
const stores = Array.from({ length: STORES }, () => state({ value: 50 }));

// UI store for the readouts (data-bind targets)
const ui = state({
  sum: 0, avg: '0.0', min: 0, max: 0,
  worstFrame: '…',
  plainTime: '—', plainAgg: '—', plainCell: '—',
  batchTime: '—', batchAgg: '—', batchCell: '—',
});
bindDom(document.body, ui);

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
    cell.textContent = Math.round(v);
  });
}

// ── Cross-store layer: ONE aggregate effect reading all 200 stores ────────
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

async function run(useBatch) {
  if (running) return;
  running = true;
  buttons.forEach(b => { b.disabled = true; });

  const agg0 = aggRuns;
  const cell0 = cellRuns;
  const t0 = performance.now();

  for (let b = 0; b < BURSTS; b++) {
    if (useBatch) {
      batch(burst);    // one synchronous flush: aggregate runs ONCE
    } else {
      burst();         // per-store flushes: aggregate runs once per store
    }
    await nextTick();
  }

  const elapsed = `${(performance.now() - t0).toFixed(0)} ms`;
  if (useBatch) {
    ui.batchTime = elapsed;
    ui.batchAgg = aggRuns - agg0;
    ui.batchCell = cellRuns - cell0;
  } else {
    ui.plainTime = elapsed;
    ui.plainAgg = aggRuns - agg0;
    ui.plainCell = cellRuns - cell0;
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
