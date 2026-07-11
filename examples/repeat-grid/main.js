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

// One repeat() call renders the whole board. Tiles are immutable data, so
// everything visual is set once in create(); reorders just move the nodes.
repeat(board, store, 'tiles', {
  key: t => t.id,
  create: (t, el) => {
    el.className = 'tile';
    el.style.setProperty('--h', String(t.hue));
    el.textContent = String(t.id);
  },
});

// ── FLIP: geometry math, mutate, invert, release in waves ──────────────────
// Tuned to stay smooth even under DevTools' 20x CPU throttle. The two big
// costs of a naive FLIP are removed: per-tile getBoundingClientRect (the
// board is a uniform grid, so a tile's position is pure math on its index;
// three rect reads replace 2N and the forced post-reconcile layout goes
// away), and starting N transitions in one frame (released in rAF waves,
// whose frame boundary also replaces the forced reflow). What remains is
// the DOM reorder itself — that part is the point of the demo.
const EASE = 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)';
const WAVES = 4;

// Tiles that may still carry a transform (inverted or mid-transition).
const hot = new Set();
board.addEventListener('transitionend', e => hot.delete(e.target));
let flipGen = 0;

function boardMetrics() {
  const cols = getComputedStyle(board).gridTemplateColumns.split(' ').length;
  const kids = board.children;
  let stepX = 0;
  let stepY = 0;
  if (kids.length > 1) {
    const r0 = kids[0].getBoundingClientRect();
    if (cols > 1) stepX = kids[1].getBoundingClientRect().left - r0.left;
    if (kids.length > cols) stepY = kids[cols].getBoundingClientRect().top - r0.top;
  }
  return { cols, stepX, stepY };
}

// Current visual offset of a hot tile, from its computed transform. Lets an
// interrupting change start tiles from where they are instead of jumping.
function currentOffset(el) {
  const m = getComputedStyle(el).transform;
  if (!m.startsWith('matrix(')) return null;
  const p = m.slice(7, -1).split(',');
  return [parseFloat(p[4]), parseFloat(p[5])];
}

// Adaptive animation budget. Starting a compositor animation has a real
// per-element cost (~1ms each under a 20x CPU throttle — measured, and true
// for WAAPI and CSS transitions alike), so on slow CPUs gliding EVERY tile
// of a big board is beyond what any library can do. The reorder itself
// always covers all tiles; when the measured per-tile cost says the CPU
// can't animate them all, an evenly sampled subset glides and the rest
// snap. The "tiles animated" readout reports the honest number.
let animBudget = Infinity;

function updateAnimBudget(criticalMs, processed) {
  if (!processed) return;
  const perTile = criticalMs / processed;
  // ~80ms of critical-path work per change is a tolerable single hitch.
  const next = Math.floor(80 / Math.max(perTile, 0.001));
  animBudget = Math.max(300, next);
}

async function withFlip(mutate) {
  const gen = ++flipGen;
  const t0 = performance.now();
  const { cols, stepX, stepY } = boardMetrics();

  const beforeIndex = new Map();
  let bi = 0;
  for (const el of board.children) beforeIndex.set(el, bi++);

  const inFlight = new Map();
  for (const el of hot) {
    if (!el.isConnected) { hot.delete(el); continue; }
    const off = currentOffset(el);
    if (off) inFlight.set(el, off);
    el.style.transition = 'none';
    el.style.transform = '';
  }
  hot.clear();

  mutate();
  // The write above schedules Lume's per-state flush as a microtask;
  // awaiting here queues this continuation after it, so the DOM is
  // reconciled but nothing has painted yet.
  await Promise.resolve();

  // Candidates: pure index math, no DOM reads.
  let reused = 0;
  let ai = 0;
  const entering = [];
  const candidates = [];
  for (const el of board.children) {
    const i = ai++;
    const b = beforeIndex.get(el);
    if (b === undefined) {
      entering.push(el);
      continue;
    }
    reused++;
    const off = inFlight.get(el);
    let dx = ((b % cols) - (i % cols)) * stepX;
    let dy = (Math.floor(b / cols) - Math.floor(i / cols)) * stepY;
    if (off) { dx += off[0]; dy += off[1]; }
    if (dx || dy) candidates.push([el, dx, dy]);
  }

  // Invert the tiles within budget (evenly sampled so the motion looks
  // uniform); everything else simply appears in place.
  const total = entering.length + candidates.length;
  const stride = total > animBudget ? total / animBudget : 1;
  let moved = 0;
  let acc = 0;
  const players = [];
  for (const el of entering) {
    acc += 1;
    if (acc < stride) continue;
    acc -= stride;
    // Brand-new node: scale in.
    el.style.transition = 'none';
    el.style.transform = 'scale(0.3)';
    el.style.opacity = '0';
    players.push(el);
    hot.add(el);
  }
  for (const [el, dx, dy] of candidates) {
    acc += 1;
    if (acc < stride) continue;
    acc -= stride;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    players.push(el);
    hot.add(el);
    moved++;
  }
  updateAnimBudget(performance.now() - t0, board.children.length);

  // Release in waves on the frames that follow. The first paint shows the
  // inverted (old) positions; each wave then hands a slice of tiles to the
  // compositor. A newer change (gen mismatch) abandons the rest — its own
  // inFlight pass picks those tiles up from wherever they stand.
  const chunk = Math.ceil(players.length / WAVES) || 1;
  let wave = 0;
  const releaseWave = () => {
    if (gen !== flipGen) return;
    const start = wave * chunk;
    const end = Math.min(start + chunk, players.length);
    for (let k = start; k < end; k++) {
      const el = players[k];
      el.style.transition = `${EASE}, opacity 480ms ease-out`;
      el.style.transform = '';
      el.style.opacity = '';
    }
    wave++;
    if (wave * chunk < players.length) requestAnimationFrame(releaseWave);
  };
  requestAnimationFrame(releaseWave);

  ui.moved = stride > 1
    ? `${players.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`
    : moved.toLocaleString('en-US');
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
  withFlip(() => { store.tiles = shuffled(store.tiles); });
});
document.getElementById('sort').addEventListener('click', () => {
  withFlip(() => { store.tiles = store.tiles.slice().sort((a, b) => a.hue - b.hue); });
});
document.getElementById('reverse').addEventListener('click', () => {
  withFlip(() => { store.tiles = store.tiles.slice().reverse(); });
});
document.getElementById('add').addEventListener('click', () => {
  withFlip(() => { store.tiles = withRandomInserts(store.tiles, 100); });
});
document.getElementById('remove').addEventListener('click', () => {
  withFlip(() => { store.tiles = withRandomRemovals(store.tiles, 100); });
});
countSlider.addEventListener('change', () => {
  withFlip(() => { store.tiles = resized(store.tiles, Number(countSlider.value)); });
});

// ── Storm mode: a rolling wave of random swaps ─────────────────────────────
// Self-pacing by real frames: the next tick waits for the browser to
// actually produce frames after the previous one. rAF starves while the
// renderer is catching up on layout/paint, so the storm physically cannot
// queue work faster than the device retires it (a fixed interval piles up
// and freezes slow CPUs). Bonus: rAF never fires in hidden tabs, so a
// backgrounded storm pauses instead of burning battery.
let stormOn = false;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
async function stormLoop() {
  while (stormOn) {
    const swaps = Math.max(4, Math.round(store.tiles.length / 12));
    await withFlip(() => { store.tiles = withRandomSwaps(store.tiles, swaps); });
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
