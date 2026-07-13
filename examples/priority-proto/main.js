import { state, effect, bindDom, batch } from 'lume-js';
import { renderQueue } from 'lume-js/addons';

// ─────────────────────────────────────────────────────────────────────────────
// renderQueue — priority-scheduled presentation (experimental addon)
//
// State stays synchronous (truth never lags), but DOM writes that merely
// *present* state become schedulable work with a per-frame budget and a
// priority order. Each entry splits into:
//   track: () => ...   tracked read, runs inside Lume's flush, marks dirty
//   apply: () => ...   the DOM write, drained later within the budget
// The drain runs on rAF, spends budgetMs per frame, takes visible cells
// before offscreen ones (IntersectionObserver), and stops early the moment
// the browser reports pending input (isInputPending, where available).
// Coalescing is free: dirty is a Set, so a cell written five times between
// drains repaints once, from current state. `queue.size` is the honest
// backlog this demo reads back into the "cells behind" readout.
//
// This page drives the real addon (import above); the vite alias resolves
// 'lume-js/addons' to src/. Flip the toggle to compare it against a plain
// effect() per cell.
// ─────────────────────────────────────────────────────────────────────────────

// ── Page state ──────────────────────────────────────────────────────────────
const ui = state({
  fps: '—',
  worst: '—',
  inputDelay: '—',
  behind: '0',
  storeLabel: '',
});
bindDom(document.body, ui);

const grid = document.getElementById('grid');
const fpsEl = document.getElementById('fps');
const dot = document.getElementById('dot');
const startBtn = document.getElementById('start');
const priorityToggle = document.getElementById('use-priority');
const storesSlider = document.getElementById('stores');

const hue = v => String(Math.round(v * 3.3));

let stores = [];
let disposers = [];
let queue = renderQueue({ budgetMs: 2 });

// (Re)wire the per-cell effects for the current mode. Cells and stores are
// kept; only the effect layer is rebuilt when the toggle flips.
let cells = [];
function wireCells(usePriority) {
  for (const dispose of disposers) dispose();
  disposers = [];
  queue = renderQueue({ budgetMs: 2 });
  for (let i = 0; i < stores.length; i++) {
    const s = stores[i];
    const cell = cells[i];
    if (usePriority) {
      disposers.push(queue.schedule({
        el: cell,
        track: () => s.value,
        apply: () => { cell.style.setProperty('--h', hue(s.value)); },
      }));
    } else {
      disposers.push(effect(() => {
        cell.style.setProperty('--h', hue(s.value));
      }));
    }
  }
}

function setup(count) {
  stores = Array.from({ length: count }, () => state({ value: Math.random() * 100 }));
  ui.storeLabel = count.toLocaleString('en-US');
  grid.textContent = '';
  cells = stores.map(() => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    grid.appendChild(cell);
    return cell;
  });
  grid.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(count * 2))}, 1fr)`;
  wireCells(priorityToggle.checked);
}

// ── The write burst: one new value per store, every frame (always batched) ──
function burst() {
  for (let i = 0; i < stores.length; i++) {
    const s = stores[i];
    let v = s.value + (Math.random() * 24 - 12);
    if (v < 0) v = -v;
    if (v > 100) v = 200 - v;
    s.value = v;
  }
}

// ── Input delay: real event timing while you type ──────────────────────────
// processingStart - startTime = how long the event sat in the queue before
// any handler ran. Entries only appear past the 16ms duration threshold, so
// when keys were pressed but nothing crossed it, the readout says "< 16 ms".
let worstInput = 0;
let inputEvents = 0;
document.addEventListener('keydown', () => { inputEvents++; }, { passive: true });
document.addEventListener('pointerdown', () => { inputEvents++; }, { passive: true });
try {
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      const d = e.processingStart - e.startTime;
      if (d > worstInput) worstInput = d;
    }
  }).observe({ type: 'event', durationThreshold: 16 });
} catch { /* event timing unsupported: readout stays "—" */ }

// ── Main loop + frame meter ─────────────────────────────────────────────────
let running = false;
let frames = 0;
let worstGap = 0;
let lastFrame = performance.now();
let lastSample = performance.now();

function onFrame(now) {
  const gap = now - lastFrame;
  lastFrame = now;
  if (gap > worstGap) worstGap = gap;
  frames++;

  dot.style.transform = `translateX(${(Math.sin(now / 300) + 1) * 51}px)`;

  if (running) batch(burst);

  const elapsed = now - lastSample;
  if (elapsed >= 1000) {
    const fps = (frames * 1000) / elapsed;
    ui.fps = String(Math.round(fps));
    ui.worst = `${worstGap.toFixed(0)} ms`;
    ui.behind = queue.size.toLocaleString('en-US');
    if (worstInput > 0) ui.inputDelay = `${Math.round(worstInput)} ms`;
    else ui.inputDelay = inputEvents > 0 ? '< 16 ms' : '—';
    fpsEl.className = `v ${fps >= 50 ? 'fps-good' : fps >= 30 ? 'fps-mid' : 'fps-bad'}`;
    frames = 0;
    worstGap = 0;
    worstInput = 0;
    inputEvents = 0;
    lastSample = now;
  }

  requestAnimationFrame(onFrame);
}

// ── Controls ────────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  running = !running;
  startBtn.textContent = running ? 'Stop' : 'Start';
});

priorityToggle.addEventListener('change', () => {
  wireCells(priorityToggle.checked);
});

storesSlider.addEventListener('change', () => {
  setup(Number(storesSlider.value));
});

setup(Number(storesSlider.value));
requestAnimationFrame(onFrame);
