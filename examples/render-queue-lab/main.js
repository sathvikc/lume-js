import { state, effect, bindDom, batch } from 'lume-js';
import { renderQueue } from 'lume-js/addons';

// ─────────────────────────────────────────────────────────────────────────────
// render-queue-lab — a regime testbed for the experimental renderQueue addon.
//
// One grid of reactive cells, five rendering MODES, four write REGIMES, all
// selectable from the URL so a headless Playwright driver can sweep the matrix.
// The apply work (the DOM write that presents a cell's value) is identical
// across modes — only *when* and *whether* it is deferred changes. That keeps
// OFF vs ON vs alternatives an honest comparison of scheduling, not of work.
//
//   mode    = off | rq | simple | adaptive | cv      (how presentation is wired)
//   regime  = storm | dashboard | burst | quiet       (how state is written)
//   cells   = grid size (default 3000)
//   budget  = renderQueue budgetMs (default 2)
//   churn   = dashboard fraction changed per frame (default 0.08)
//
// Modes:
//   off       one effect() per cell, DOM write synchronous in the flush
//             (the current library baseline: batch() + plain effects).
//   rq        the real renderQueue addon (tiers, budget, IO, input-preempt).
//   simple    ~15-line rAF-coalesced apply: writes mark a cell dirty, one rAF
//             applies every dirty cell — no tiers, no budget, no IO, no preempt.
//             Isolates the question "is the win just moving writes off the flush?"
//   adaptive  synchronous applies while frames are cheap; engages the simple
//             deferred drain only after a frame busts a jank threshold.
//   cv        off + CSS content-visibility:auto on cells (re-verify: measured
//             worse 2026-07-11).
//
// window.__lab exposes start/stop/reset/snapshot/backlog for the driver, and
// keeps raw arrays (event delays, frame gaps) so the driver computes p95/worst
// itself instead of trusting a 1-second on-page readout window.
// ─────────────────────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const cfg = {
  mode: params.get('mode') || 'off',
  regime: params.get('regime') || 'storm',
  cells: Number(params.get('cells')) || 3000,
  budgetMs: Number(params.get('budget')) || 2,
  churn: Number(params.get('churn')) || 0.08,
  dot: params.get('dot') !== '0', // set ?dot=0 to isolate the per-frame render floor
  render: params.get('render') !== '0', // set ?render=0 to keep the flush but skip DOM writes (isolate flush vs rendering cost)
  text: params.get('text') !== '0', // set ?text=0 for paint-only apply (CSS var, no textContent) — matches the original prototype
};

// ── Readouts (bound via Lume; updated once per second — negligible churn) ────
const ui = state({
  mode: cfg.mode,
  regime: cfg.regime,
  storeLabel: cfg.cells.toLocaleString('en-US'),
  fps: '—',
  worst: '—',
  inputDelay: '—',
  behind: '0',
  stale: '—',
  typed: '',
});
bindDom(document.body, ui);

const grid = document.getElementById('grid');
const dot = document.getElementById('dot');
const startBtn = document.getElementById('start');

// ── Cell + state model ──────────────────────────────────────────────────────
// Per-cell reactive store (independent cells, the realistic dashboard shape).
let stores = [];
let cells = [];
let pendingSince = [];   // ms timestamp of oldest unapplied write per cell, or 0
let disposers = [];
let queue = null;

let appliedCount = 0;
let maxStaleness = 0;
let applyCounts = []; // per-cell paint counter, for detecting starvation

function fmtInt(v) {
  return String(v | 0);
}

// The one DOM write, shared by every mode. Write-only (no forced layout read).
// A CSS custom property drives the cell background (paint); textContent drives
// layout — together a realistic "number + colour" dashboard cell.
function applyCellRaw(i) {
  const v = stores[i].value; // tracked read (keeps effect wiring identical across render on/off)
  if (cfg.render) {
    const cell = cells[i];
    cell.style.setProperty('--h', String((v * 3.6) | 0)); // paint (background hsl)
    if (cfg.text) cell.firstChild.nodeValue = fmtInt(v);   // layout (text) — skip for paint-only
  }
  appliedCount++;
  applyCounts[i]++;
  const p = pendingSince[i];
  if (p !== 0) {
    const age = performance.now() - p;
    if (age > maxStaleness) maxStaleness = age;
    pendingSince[i] = 0;
  }
}

// ── Simple / adaptive shared drain (no tiers, no budget, no IO, no preempt) ──
const simpleDirty = new Set();
let simpleRaf = 0;
function simpleDrain() {
  simpleRaf = 0;
  for (const i of simpleDirty) applyCellRaw(i);
  simpleDirty.clear();
}
function simpleMark(i) {
  simpleDirty.add(i);
  if (!simpleRaf) simpleRaf = requestAnimationFrame(simpleDrain);
}

// Adaptive engages deferral after a janky frame, disengages once frames recover.
let deferMode = false;

// ── bounded — round-robin cursor drain (the freeze fix) ──────────────────────
// renderQueue's Set drain, under a *uniform* re-dirty order (a grid iterating
// cells 0..N every frame), keeps re-adding every entry in the same order, so
// the drain always hits the same front cells and the tail starves — staleness
// grows without bound. This variant advances a cursor through a flat entries
// array instead, so every cell is visited within ceil(N / throughput) frames:
// no starvation, staleness bounded by design, backlog capped at N.
let bDirty = [];      // per-cell dirty flag
let bCursor = 0;
let bDirtyCount = 0;
let bRaf = 0;
function bMark(i) {
  if (!bDirty[i]) { bDirty[i] = true; bDirtyCount++; }
  if (!bRaf) bRaf = requestAnimationFrame(bDrain);
}
function bDrain() {
  bRaf = 0;
  const t0 = performance.now();
  const N = bDirty.length;
  let seen = 0;
  let n = 0;
  while (seen < N && bDirtyCount > 0) {
    const i = bCursor;
    bCursor = (bCursor + 1) % N;
    seen++;
    if (bDirty[i]) {
      applyCellRaw(i);
      bDirty[i] = false;
      bDirtyCount--;
      n++;
      if ((n & 7) === 0 && performance.now() - t0 > cfg.budgetMs) break;
    }
  }
  if (bDirtyCount > 0) bRaf = requestAnimationFrame(bDrain);
}

// ── pull — no per-cell effects at all (the flush-floor experiment) ───────────
// Every push-based scheduler (off/rq/simple/bounded) still re-runs one effect
// per changed cell every frame — the synchronous flush that dominates ~40% of
// the frame and that renderQueue leaves untouched. `pull` has zero effects: one
// rAF loop sweeps cells from a cursor, reads current state, and paints those
// whose value changed since last paint, within budget. It trades fine-grained
// reactivity (it polls) for eliminating the flush. Best when most cells change.
let pullLast = [];
let pullCursor = 0;
let pullRaf = 0;
let pullRunning = false;
function pullLoop() {
  pullRaf = 0;
  const t0 = performance.now();
  const N = stores.length;
  let seen = 0;
  let n = 0;
  while (seen < N) {
    const i = pullCursor;
    pullCursor = (pullCursor + 1) % N;
    seen++;
    const v = stores[i].value;
    if (v !== pullLast[i]) {
      pullLast[i] = v;
      applyCellRaw(i);
      n++;
      if ((n & 7) === 0 && performance.now() - t0 > cfg.budgetMs) break;
    }
  }
  if (pullRunning) pullRaf = requestAnimationFrame(pullLoop);
}

// ── Mode wiring ──────────────────────────────────────────────────────────────
function clearWiring() {
  for (const d of disposers) d();
  disposers = [];
  simpleDirty.clear();
  if (simpleRaf) { cancelAnimationFrame(simpleRaf); simpleRaf = 0; }
  if (bRaf) { cancelAnimationFrame(bRaf); bRaf = 0; }
  bDirty = new Array(stores.length).fill(false);
  bDirtyCount = 0;
  bCursor = 0;
  pullRunning = false;
  if (pullRaf) { cancelAnimationFrame(pullRaf); pullRaf = 0; }
  queue = null;
}

function wire(mode) {
  clearWiring();
  grid.classList.toggle('cv', mode === 'cv');

  if (mode === 'pull') {
    // No effects. Paint everything once, then run the pull loop continuously.
    pullLast = new Array(stores.length);
    for (let i = 0; i < stores.length; i++) { pullLast[i] = stores[i].value; applyCellRaw(i); }
    pullCursor = 0;
    pullRunning = true;
    pullRaf = requestAnimationFrame(pullLoop);
    return;
  }

  if (mode === 'rq') {
    queue = renderQueue({ budgetMs: cfg.budgetMs });
    for (let i = 0; i < stores.length; i++) {
      const idx = i;
      disposers.push(queue.schedule({
        el: cells[idx],
        track: () => stores[idx].value,
        apply: () => applyCellRaw(idx),
      }));
    }
    return;
  }

  for (let i = 0; i < stores.length; i++) {
    const idx = i;
    if (mode === 'off' || mode === 'cv') {
      // Effect body reads (tracks) then writes synchronously in the flush.
      disposers.push(effect(() => { applyCellRaw(idx); }));
    } else if (mode === 'simple') {
      let primed = false;
      applyCellRaw(idx); // immediate first paint
      disposers.push(effect(() => {
        stores[idx].value;                       // tracked read
        if (!primed) { primed = true; return; }  // first run only arms tracking
        simpleMark(idx);
      }));
    } else if (mode === 'adaptive') {
      let primed = false;
      applyCellRaw(idx);
      disposers.push(effect(() => {
        stores[idx].value;
        if (!primed) { primed = true; return; }
        if (deferMode) simpleMark(idx);
        else applyCellRaw(idx);
      }));
    } else if (mode === 'bounded') {
      let primed = false;
      applyCellRaw(idx);
      disposers.push(effect(() => {
        stores[idx].value;
        if (!primed) { primed = true; return; }
        bMark(idx);
      }));
    }
  }
}

function currentBacklog() {
  if (queue) return queue.size;
  return simpleDirty.size + bDirtyCount;
}

// Starvation detector: since reset(), how evenly were cells painted? A large
// gap between the most- and least-painted cell (or many cells at 0) means the
// drain is starving some entries rather than round-robining fairly.
function starvationStats() {
  let min = Infinity;
  let max = 0;
  let zero = 0;
  for (let i = 0; i < applyCounts.length; i++) {
    const c = applyCounts[i];
    if (c < min) min = c;
    if (c > max) max = c;
    if (c === 0) zero++;
  }
  return { min: min === Infinity ? 0 : min, max, zeroCount: zero, total: applyCounts.length };
}

// ── Build the grid ────────────────────────────────────────────────────────────
function setup(count) {
  clearWiring();
  stores = new Array(count);
  cells = new Array(count);
  pendingSince = new Array(count).fill(0);
  applyCounts = new Array(count).fill(0);
  grid.textContent = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    stores[i] = state({ value: Math.random() * 100 });
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.appendChild(document.createTextNode('0'));
    frag.appendChild(cell);
    cells[i] = cell;
  }
  grid.appendChild(frag);
  grid.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(count * 2))}, 1fr)`;
  ui.storeLabel = count.toLocaleString('en-US');
  wire(cfg.mode);
}

// ── Write regimes ────────────────────────────────────────────────────────────
function nextVal(v) {
  let n = v + (Math.random() * 24 - 12);
  if (n < 0) n = -n;
  if (n > 100) n = 200 - n;
  return n;
}
function writeCell(i) {
  if (pendingSince[i] === 0) pendingSince[i] = performance.now();
  stores[i].value = nextVal(stores[i].value);
}
function stormWrite() {
  batch(() => { for (let i = 0; i < stores.length; i++) writeCell(i); });
}
function dashboardWrite() {
  const k = Math.max(1, Math.round(stores.length * cfg.churn));
  batch(() => {
    for (let j = 0; j < k; j++) writeCell((Math.random() * stores.length) | 0);
  });
}
function burstWrite() {
  batch(() => { for (let i = 0; i < stores.length; i++) writeCell(i); });
}

// ── Input delay: two independent measures (driver computes p95/worst) ────────
// keyDelays is the robust primary: performance.now() at handler entry minus the
// event's own timeStamp — both in the page clock, so it is the true queueing
// delay before the handler ran, independent of paint or the Event Timing buffer
// (which lags badly and under-reports when frames are seconds long).
// eventDelays keeps the Event Timing view (processingStart - startTime) as a
// cross-check where it does fire.
const keyDelays = [];
const eventDelays = [];
let keyCount = 0;
function onInputEvent(e) {
  keyCount++;
  const d = performance.now() - e.timeStamp;
  if (d >= 0 && d < 600000) keyDelays.push(d);
}
document.addEventListener('keydown', onInputEvent, { passive: true });
document.addEventListener('pointerdown', onInputEvent, { passive: true });
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) eventDelays.push(e.processingStart - e.startTime);
  }).observe({ type: 'event', durationThreshold: 16 });
} catch { /* Event Timing unsupported: eventDelays stays empty */ }

// ── Main loop: frame meter + jank dot + regime writer ────────────────────────
let running = false;
const frameGaps = [];
let frames = 0;
let worstGap = 0;
let peakBacklog = 0;
let last = performance.now();
let lastSample = last;

function onFrame(now) {
  const gap = now - last;
  last = now;
  frameGaps.push(gap);
  if (gap > worstGap) worstGap = gap;
  frames++;

  // Adaptive hysteresis: engage deferral past ~30fps, release under ~50fps.
  if (gap > 32) deferMode = true;
  else if (gap < 20) deferMode = false;

  if (cfg.dot) dot.style.transform = `translateX(${(Math.sin(now / 300) + 1) * 51}px)`;

  if (running && cfg.regime === 'storm') stormWrite();
  else if (running && cfg.regime === 'dashboard') dashboardWrite();

  const bl = currentBacklog();
  if (bl > peakBacklog) peakBacklog = bl;

  const elapsed = now - lastSample;
  if (elapsed >= 1000) {
    const fps = (frames * 1000) / elapsed;
    ui.fps = String(Math.round(fps));
    ui.worst = `${worstGap.toFixed(0)} ms`;
    ui.behind = bl.toLocaleString('en-US');
    ui.stale = maxStaleness > 0 ? `${Math.round(maxStaleness)} ms` : '—';
    const wi = keyDelays.length ? Math.max(...keyDelays) : 0;
    ui.inputDelay = wi > 0 ? `${Math.round(wi)} ms` : (keyCount > 0 ? '< 1 ms' : '—');
    frames = 0;
    worstGap = 0;
    lastSample = now;
  }
  requestAnimationFrame(onFrame);
}

// ── Controls + driver API ─────────────────────────────────────────────────────
function start() {
  running = true;
  startBtn.textContent = 'Stop';
  if (cfg.regime === 'burst') { burstWrite(); running = false; startBtn.textContent = 'Start'; }
}
function stop() {
  running = false;
  startBtn.textContent = 'Start';
}
startBtn.addEventListener('click', () => (running ? stop() : start()));

window.__lab = {
  cfg,
  start,
  stop,
  rewire(mode) { cfg.mode = mode; ui.mode = mode; wire(mode); },
  resize(count) { cfg.cells = count; setup(count); },
  backlog: () => currentBacklog(),
  reset() {
    keyDelays.length = 0;
    eventDelays.length = 0;
    frameGaps.length = 0;
    peakBacklog = 0;
    maxStaleness = 0;
    appliedCount = 0;
    keyCount = 0;
    worstGap = 0;
    for (let i = 0; i < pendingSince.length; i++) { pendingSince[i] = 0; applyCounts[i] = 0; }
  },
  snapshot() {
    return {
      mode: cfg.mode,
      regime: cfg.regime,
      cells: cfg.cells,
      budgetMs: cfg.budgetMs,
      keyDelays: keyDelays.slice(),
      eventDelays: eventDelays.slice(),
      frameGaps: frameGaps.slice(),
      peakBacklog,
      maxStaleness,
      appliedCount,
      keyCount,
      currentBacklog: currentBacklog(),
      starvation: starvationStats(),
    };
  },
};

setup(cfg.cells);
requestAnimationFrame(onFrame);
