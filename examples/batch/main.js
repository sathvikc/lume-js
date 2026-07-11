import { state, effect, bindDom, batch } from 'lume-js';

// UI store for the readouts (data-bind targets)
const ui = state({
  fps: '—',
  worst: '—',
  aggPerFrame: '—',
  storeLabel: '',
  sum: '—', avg: '—', min: '—', max: '—',
});
bindDom(document.body, ui);

const grid = document.getElementById('grid');
const fpsEl = document.getElementById('fps');
const dot = document.getElementById('dot');
const startBtn = document.getElementById('start');
const batchToggle = document.getElementById('use-batch');
const storesSlider = document.getElementById('stores');

// ── Store setup (rebuilt when the slider moves) ────────────────────────────
let stores = [];
let disposers = [];
let aggRuns = 0;

function setup(count) {
  for (const dispose of disposers) dispose();
  disposers = [];
  grid.textContent = '';

  // One independent store per cell, as separate widgets/modules would have.
  stores = Array.from({ length: count }, () => state({ value: Math.random() * 100 }));
  ui.storeLabel = count.toLocaleString('en-US');

  // Keep the grid roughly 2:1 regardless of store count.
  grid.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(count * 2))}, 1fr)`;

  // Fine-grained layer: one effect per store, driving its own cell's hue.
  // These run once per changed store in BOTH modes; batch() never makes
  // granular updates coarser.
  for (const s of stores) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    grid.appendChild(cell);
    disposers.push(effect(() => {
      cell.style.setProperty('--h', String(Math.round(s.value * 3.3)));
    }));
  }

  // Cross-store layer: ONE aggregate effect reading every store. Per-store
  // flushing runs this once per mutated store; batch() runs it once per frame.
  disposers.push(effect(() => {
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < stores.length; i++) {
      const v = stores[i].value;
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    aggRuns++;
    ui.sum = Math.round(sum).toLocaleString('en-US');
    ui.avg = (sum / stores.length).toFixed(1);
    ui.min = String(Math.round(min));
    ui.max = String(Math.round(max));
  }));
}

// ── The write burst: one new value per store, every frame ─────────────────
function burst() {
  for (let i = 0; i < stores.length; i++) {
    const s = stores[i];
    let v = s.value + (Math.random() * 24 - 12);
    if (v < 0) v = -v;
    if (v > 100) v = 200 - v;
    s.value = v;
  }
}

// ── Main loop + frame instrumentation ──────────────────────────────────────
let running = false;

let frames = 0;
let worstGap = 0;
let lastFrame = performance.now();
let lastSample = performance.now();
let aggMark = 0;

function onFrame(now) {
  const gap = now - lastFrame;
  lastFrame = now;
  if (gap > worstGap) worstGap = gap;
  frames++;

  // JS-driven dot: positioned from here, every frame. Unlike a CSS animation
  // (which the compositor keeps running), this visibly freezes when the main
  // thread stalls.
  dot.style.transform = `translateX(${(Math.sin(now / 300) + 1) * 51}px)`;

  if (running) {
    if (batchToggle.checked) {
      batch(burst); // all stores flush together: aggregate runs ONCE
    } else {
      burst(); // per-store flushes: aggregate runs once per store
    }
    // Without batch, the flushes are microtasks queued during burst(); they
    // run after this callback but before the next frame, so the frame-gap
    // meter above captures their full cost either way.
  }

  const elapsed = now - lastSample;
  if (elapsed >= 1000) {
    ui.fps = String(Math.round((frames * 1000) / elapsed));
    ui.worst = `${worstGap.toFixed(0)} ms`;
    ui.aggPerFrame = running
      ? Math.round((aggRuns - aggMark) / frames).toLocaleString('en-US')
      : '0';
    const fps = (frames * 1000) / elapsed;
    fpsEl.className = `v ${fps >= 50 ? 'fps-good' : fps >= 30 ? 'fps-mid' : 'fps-bad'}`;
    frames = 0;
    worstGap = 0;
    aggMark = aggRuns;
    lastSample = now;
  }

  requestAnimationFrame(onFrame);
}

// ── Controls ───────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  running = !running;
  startBtn.textContent = running ? 'Stop' : 'Start';
});

storesSlider.addEventListener('change', () => {
  setup(Number(storesSlider.value));
});

setup(Number(storesSlider.value));
requestAnimationFrame(onFrame);
