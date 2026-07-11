import { state, bindDom } from 'lume-js';
import { repeat } from 'lume-js/addons';

const board = document.getElementById('board');
const fpsEl = document.getElementById('fps');
const stormBtn = document.getElementById('storm');
const countSlider = document.getElementById('count');

let nextId = 1;
const makeTile = () => ({ id: nextId++, hue: Math.floor(Math.random() * 360) });

const store = state({
  tiles: Array.from({ length: Number(countSlider.value) }, makeTile),
});

const ui = state({
  fps: '—',
  moved: '—',
  reused: '—',
  tileCount: store.tiles.length.toLocaleString('en-US'),
});
bindDom(document.body, ui);

// ── Transform grid: position is index math, movement never touches layout ──
// The board is a uniform grid, so a tile's position is pure math on its
// index — the committed FLIP version already used that math for reads.
// This takes the same idea to its conclusion: tiles are absolutely
// positioned and placed with transform: translate(), so the browser never
// re-derives 2,000 grid boxes after a reorder (under a 20x CPU throttle
// that relayout alone was ~1s per change). repeat() still reorders the
// real DOM nodes with its keyed insertBefore pass, and DOM order always
// matches visual order; what disappears is only the redundant layout work.
// FLIP inversion disappears too: a tile's current transform IS its old
// position, so a mover simply transitions to its new target, and an
// interrupting change retargets mid-flight tiles natively — no computed-
// matrix parsing, no transitionend bookkeeping.
const GAP = 4;
const MIN_TILE = 30;
const TRANS = 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 480ms ease-out';

const metrics = { cols: 1, step: 34, tile: 30 };
// el -> the index whose position the tile currently holds (or glides toward).
const posOf = new WeakMap();
let flipGen = 0;

function computeMetrics() {
  const w = board.clientWidth;
  const cols = Math.max(1, Math.floor((w + GAP) / (MIN_TILE + GAP)));
  metrics.cols = cols;
  metrics.tile = (w - (cols - 1) * GAP) / cols;
  metrics.step = metrics.tile + GAP;
  board.style.setProperty('--tile', metrics.tile + 'px');
}

function translateOf(i) {
  const x = (i % metrics.cols) * metrics.step;
  const y = Math.floor(i / metrics.cols) * metrics.step;
  return `translate(${x}px, ${y}px)`;
}

function sizeBoard(count) {
  const rows = Math.ceil(count / metrics.cols);
  board.style.height = (rows ? rows * metrics.step - GAP : 0) + 'px';
}

// Resize: recompute the math and snap every tile to its position.
let resizeQueued = false;
window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    computeMetrics();
    sizeBoard(board.children.length);
    let i = 0;
    for (const el of board.children) {
      el.style.transition = 'none';
      el.style.transform = translateOf(i);
      posOf.set(el, i++);
    }
  });
});

computeMetrics();
sizeBoard(store.tiles.length);

// One repeat() call renders the whole board. Tiles are immutable data, so
// everything visual is set once in create(); reorders just move the nodes.
repeat(board, store, 'tiles', {
  key: t => t.id,
  create: (t, el, i) => {
    el.className = 'tile';
    el.style.setProperty('--h', String(t.hue));
    el.textContent = String(t.id);
    el.style.transform = translateOf(i);
  },
});

// Seed the position map for the initial render (create() leaves it unset so
// the reorder pass can tell brand-new tiles from moved ones).
{
  let i = 0;
  for (const el of board.children) posOf.set(el, i++);
}

// ── Adaptive animation budget ──────────────────────────────────────────────
// Starting a compositor animation has a real per-element cost (~1ms each
// under a 20x CPU throttle — measured, and true for WAAPI and CSS
// transitions alike), so on slow CPUs gliding EVERY tile of a big board is
// beyond what any library can do. The reorder itself always covers all
// tiles; when the measured costs say the CPU can't animate them all, an
// evenly sampled subset glides and the rest snap. Two measurements feed
// the budget: the critical-path cost per tile (the synchronous work of a
// change) and the per-transition start cost (learned from the frame gaps
// between release waves). The "tiles animated" readout reports the honest
// number.
let animBudget = Infinity;
let startCost = 0.05; // ms per transition start, EMA learned from wave gaps

function updateAnimBudget(criticalMs, processed) {
  if (!processed) return;
  const perTile = criticalMs / processed;
  // ~80ms of critical-path work per change is a tolerable single hitch.
  const critBudget = Math.floor(80 / Math.max(perTile, 0.001));
  // Keep each release wave under ~50ms and the release under ~8 waves.
  const waveBudget = Math.floor(50 / startCost) * 8;
  animBudget = Math.max(300, Math.min(critBudget, waveBudget));
}

// Release transitions in rAF waves sized so no single frame stalls on
// transition starts. The gap between wave callbacks measures what a start
// actually costs right now, which feeds the budget for the next change.
// A newer change (gen mismatch) abandons the rest — it retargets those
// tiles itself.
function releaseInWaves(players, gen) {
  const perWave = Math.max(50, Math.min(800, Math.floor(50 / startCost)));
  let idx = 0;
  let lastNow = 0;
  let lastChunk = 0;
  const wave = now => {
    if (gen !== flipGen) return;
    if (lastChunk >= 20 && lastNow) {
      const est = (now - lastNow - 12) / lastChunk;
      if (est > 0.02) startCost = startCost * 0.7 + est * 0.3;
    }
    const end = Math.min(idx + perWave, players.length);
    lastChunk = end - idx;
    lastNow = now;
    for (; idx < end; idx++) {
      const p = players[idx];
      p[0].style.transition = TRANS;
      p[0].style.transform = translateOf(p[1]);
      p[0].style.opacity = '';
    }
    if (idx < players.length) requestAnimationFrame(wave);
  };
  requestAnimationFrame(wave);
}

// ── The reorder pass: mutate, diff indices, snap or glide ─────────────────
async function withReorder(mutate) {
  const gen = ++flipGen;
  const t0 = performance.now();
  mutate();
  // The write above schedules Lume's per-state flush as a microtask;
  // awaiting here queues this continuation after it, so the DOM is
  // reconciled but nothing has painted yet.
  await Promise.resolve();

  const kids = board.children;
  const count = kids.length;
  sizeBoard(count);

  // Diff each tile's index against the one its transform currently holds.
  // No DOM reads — posOf carries the geometry state.
  let reused = 0;
  const entering = [];
  const movers = [];
  for (let i = 0; i < count; i++) {
    const el = kids[i];
    const prev = posOf.get(el);
    if (prev === undefined) {
      entering.push([el, i]);
    } else {
      reused++;
      if (prev !== i) movers.push([el, i]);
    }
    posOf.set(el, i);
  }

  // Within budget (evenly sampled so the motion looks uniform): entering
  // tiles get their pre-paint scale-in state, movers keep their old
  // transform until their release wave hands them a transition. Beyond
  // budget: snap to the new position before the first paint.
  const total = entering.length + movers.length;
  const stride = total > animBudget ? total / animBudget : 1;
  const players = [];
  let acc = 0;
  for (const [el, i] of entering) {
    acc += 1;
    if (acc >= stride) {
      acc -= stride;
      el.style.transition = 'none';
      el.style.transform = translateOf(i) + ' scale(0.3)';
      el.style.opacity = '0';
      players.push([el, i]);
    }
    // Beyond budget: create() already placed it — it appears in place.
  }
  for (const [el, i] of movers) {
    acc += 1;
    if (acc >= stride) {
      acc -= stride;
      players.push([el, i]);
    } else {
      el.style.transition = 'none';
      el.style.transform = translateOf(i);
    }
  }
  updateAnimBudget(performance.now() - t0, count);
  releaseInWaves(players, gen);

  ui.moved = stride > 1
    ? `${players.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`
    : total.toLocaleString('en-US');
  ui.reused = reused.toLocaleString('en-US');
  ui.tileCount = store.tiles.length.toLocaleString('en-US');
}

// ── Array operations (always a new array; items are reused by key) ────────
function shuffled(arr) {
  const next = arr.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function resized(arr, target) {
  if (target <= arr.length) return arr.slice(0, target);
  return arr.concat(Array.from({ length: target - arr.length }, makeTile));
}

function withRandomRemovals(arr, n) {
  const next = arr.slice();
  for (let k = 0; k < n && next.length > 0; k++) {
    next.splice(Math.floor(Math.random() * next.length), 1);
  }
  return next;
}

function withRandomInserts(arr, n) {
  const next = arr.slice();
  for (let k = 0; k < n; k++) {
    next.splice(Math.floor(Math.random() * (next.length + 1)), 0, makeTile());
  }
  return next;
}

function withRandomSwaps(arr, n) {
  const next = arr.slice();
  for (let k = 0; k < n; k++) {
    const i = Math.floor(Math.random() * next.length);
    const j = Math.floor(Math.random() * next.length);
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

document.getElementById('shuffle').addEventListener('click', () => {
  withReorder(() => { store.tiles = shuffled(store.tiles); });
});
document.getElementById('sort').addEventListener('click', () => {
  withReorder(() => { store.tiles = store.tiles.slice().sort((a, b) => a.hue - b.hue); });
});
document.getElementById('reverse').addEventListener('click', () => {
  withReorder(() => { store.tiles = store.tiles.slice().reverse(); });
});
document.getElementById('add').addEventListener('click', () => {
  withReorder(() => { store.tiles = withRandomInserts(store.tiles, 100); });
});
document.getElementById('remove').addEventListener('click', () => {
  withReorder(() => { store.tiles = withRandomRemovals(store.tiles, 100); });
});
countSlider.addEventListener('change', () => {
  withReorder(() => { store.tiles = resized(store.tiles, Number(countSlider.value)); });
});

// ── Storm mode: a rolling wave of random swaps ─────────────────────────────
// Self-pacing by real frames: the next tick waits for the browser to
// actually produce frames after the previous one. rAF starves while the
// renderer is catching up, so the storm physically cannot queue work
// faster than the device retires it (a fixed interval piles up and
// freezes slow CPUs). Bonus: rAF never fires in hidden tabs, so a
// backgrounded storm pauses instead of burning battery.
let stormOn = false;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
async function stormLoop() {
  while (stormOn) {
    const swaps = Math.max(4, Math.round(store.tiles.length / 12));
    await withReorder(() => { store.tiles = withRandomSwaps(store.tiles, swaps); });
    await nextFrame();
    await nextFrame();
    await new Promise(r => setTimeout(r, 550));
  }
}
stormBtn.addEventListener('click', () => {
  stormOn = !stormOn;
  stormBtn.textContent = stormOn ? 'Stop storm' : 'Storm';
  stormBtn.classList.toggle('storm-on', stormOn);
  if (stormOn) stormLoop();
});

// ── FPS meter ──────────────────────────────────────────────────────────────
let frames = 0;
let lastSample = performance.now();
function onFrame(now) {
  frames++;
  if (now - lastSample >= 1000) {
    const fps = (frames * 1000) / (now - lastSample);
    ui.fps = String(Math.round(fps));
    fpsEl.className = `v ${fps >= 50 ? 'fps-good' : fps >= 30 ? 'fps-mid' : 'fps-bad'}`;
    frames = 0;
    lastSample = now;
  }
  requestAnimationFrame(onFrame);
}
requestAnimationFrame(onFrame);
