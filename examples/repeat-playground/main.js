import { state, bindDom } from 'lume-js';
import { repeat } from 'lume-js/addons';

// A grid of colored tiles you can reorder by hand. repeat() keys tiles by id
// and moves only the DOM nodes that are out of place; the readouts count the
// real insertBefore/removeChild calls so every claim on screen is measured.

const board = document.getElementById('board');
const countSlider = document.getElementById('count');

let nextId = 1;
const makeTile = () => ({ id: nextId++, hue: Math.floor(Math.random() * 360) });

const store = state({
  tiles: Array.from({ length: Number(countSlider.value) }, makeTile),
});

const ui = state({ moves: '—', ms: '—', fps: '—', count: String(store.tiles.length) });
bindDom(document.body, ui);

// ── Count real DOM operations on the board ─────────────────────────────────
// reconcile calls insertBefore/removeChild on the container, so wrapping the
// board's own methods counts exactly the reorder work — nothing else.
let domOps = 0;
for (const method of ['insertBefore', 'removeChild']) {
  const original = board[method].bind(board);
  board[method] = (...args) => { domOps++; return original(...args); };
}

// ── Tiles are placed by transform: reorders never trigger grid relayout ────
const GAP = 4;
const MIN_TILE = 26;
const metrics = { cols: 1, step: 30, tile: 26 };

function computeMetrics() {
  const width = board.clientWidth;
  const cols = Math.max(1, Math.floor((width + GAP) / (MIN_TILE + GAP)));
  metrics.cols = cols;
  metrics.tile = (width - (cols - 1) * GAP) / cols;
  metrics.step = metrics.tile + GAP;
  board.style.setProperty('--tile', metrics.tile + 'px');
}

function translateOf(index) {
  const x = (index % metrics.cols) * metrics.step;
  const y = Math.floor(index / metrics.cols) * metrics.step;
  return `translate(${x}px, ${y}px)`;
}

function layout() {
  const n = store.tiles.length;
  board.style.height = Math.ceil(n / metrics.cols) * metrics.step - GAP + 'px';
  let index = 0;
  for (const el of board.children) {
    if (el !== draggedEl) el.style.transform = translateOf(index);
    el.style.opacity = '1';
    index++;
  }
}

computeMetrics();

repeat('#board', store, 'tiles', {
  key: (tile) => tile.id,
  create: (tile, el, index) => {
    el.className = 'tile';
    el.style.setProperty('--h', tile.hue);
    // Born in place, invisible: layout() fades it in without a fly-in.
    el.style.transform = translateOf(index);
    el.style.opacity = '0';
  },
});

// ── Every mutation goes through commit(): measure, reconcile, reposition ───
async function commit(nextTiles) {
  domOps = 0;
  const t0 = performance.now();
  store.tiles = nextTiles;
  await Promise.resolve(); // resumes after the flush microtask has reconciled
  ui.ms = (performance.now() - t0).toFixed(1);
  ui.moves = domOps.toLocaleString('en-US');
  ui.count = store.tiles.length.toLocaleString('en-US');
  layout();
}

commit(store.tiles);

window.addEventListener('resize', () => {
  computeMetrics();
  layout();
});

// ── Drag to reorder: the array follows the pointer, tiles glide aside ──────
let draggedEl = null;
let draggedId = null;
let grabDX = 0;
let grabDY = 0;
let lastTarget = -1;
let reorderQueued = false;

function pointerIndex(event) {
  const rect = board.getBoundingClientRect();
  const col = Math.min(metrics.cols - 1, Math.max(0, Math.floor((event.clientX - rect.left) / metrics.step)));
  const row = Math.max(0, Math.floor((event.clientY - rect.top) / metrics.step));
  return Math.min(store.tiles.length - 1, row * metrics.cols + col);
}

board.addEventListener('pointerdown', (event) => {
  const el = event.target.closest('.tile');
  if (!el) return;
  const rect = el.getBoundingClientRect();
  draggedEl = el;
  // DOM order always matches array order, so the child index is the tile.
  draggedId = store.tiles[Array.prototype.indexOf.call(board.children, el)].id;
  // Grab by the point under the finger, not the tile corner.
  grabDX = event.clientX - rect.left;
  grabDY = event.clientY - rect.top;
  lastTarget = pointerIndex(event);
  el.classList.add('dragging');
  el.setPointerCapture(event.pointerId);
});

board.addEventListener('pointermove', (event) => {
  if (!draggedEl) return;
  const rect = board.getBoundingClientRect();
  const x = event.clientX - rect.left - grabDX;
  const y = event.clientY - rect.top - grabDY;
  draggedEl.style.transform = `translate(${x}px, ${y}px) scale(1.12)`;

  const target = pointerIndex(event);
  if (target === lastTarget || reorderQueued) return;
  lastTarget = target;
  reorderQueued = true;
  requestAnimationFrame(() => {
    reorderQueued = false;
    const tiles = store.tiles;
    const from = tiles.findIndex((tile) => tile.id === draggedId);
    if (from === -1 || from === target) return;
    const next = [...tiles];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    commit(next);
  });
});

function endDrag() {
  if (!draggedEl) return;
  const el = draggedEl;
  draggedEl = null;
  draggedId = null;
  el.classList.remove('dragging');
  layout(); // snap into the slot it was dropped on
}

board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

// ── Controls ────────────────────────────────────────────────────────────────
function shuffled(tiles) {
  const next = [...tiles];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

document.getElementById('shuffle').addEventListener('click', () => {
  commit(shuffled(store.tiles));
});

document.getElementById('sort').addEventListener('click', () => {
  commit([...store.tiles].sort((a, b) => a.hue - b.hue));
});

document.getElementById('reverse').addEventListener('click', () => {
  commit([...store.tiles].reverse());
});

document.getElementById('add').addEventListener('click', () => {
  const next = [...store.tiles];
  for (let i = 0; i < 24; i++) {
    next.splice(Math.floor(Math.random() * (next.length + 1)), 0, makeTile());
  }
  commit(next);
});

document.getElementById('remove').addEventListener('click', () => {
  const next = [...store.tiles];
  for (let i = 0; i < 24 && next.length > 1; i++) {
    next.splice(Math.floor(Math.random() * next.length), 1);
  }
  commit(next);
});

countSlider.addEventListener('change', () => {
  const target = Number(countSlider.value);
  const next = [...store.tiles];
  while (next.length < target) next.push(makeTile());
  next.length = Math.min(next.length, target);
  commit(next);
});

// ── Storm: a rolling wave of random far swaps, self-paced by commit() ──────
const stormBtn = document.getElementById('storm');
let stormOn = false;

async function stormLoop() {
  while (stormOn) {
    const tiles = [...store.tiles];
    const swaps = Math.max(4, Math.round(tiles.length / 12));
    for (let i = 0; i < swaps; i++) {
      const a = Math.floor(Math.random() * tiles.length);
      const b = Math.floor(Math.random() * tiles.length);
      [tiles[a], tiles[b]] = [tiles[b], tiles[a]];
    }
    await commit(tiles);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

stormBtn.addEventListener('click', () => {
  stormOn = !stormOn;
  stormBtn.classList.toggle('storm-on', stormOn);
  stormBtn.textContent = stormOn ? 'Stop' : 'Storm';
  if (stormOn) stormLoop();
});

// ── FPS meter ───────────────────────────────────────────────────────────────
const fpsEl = document.getElementById('fps');
let frames = 0;
let windowStart = performance.now();

function meter(now) {
  frames++;
  if (now - windowStart >= 1000) {
    const fps = Math.round((frames * 1000) / (now - windowStart));
    ui.fps = String(fps);
    fpsEl.className = 'v ' + (fps >= 45 ? 'fps-good' : fps >= 20 ? 'fps-mid' : 'fps-bad');
    frames = 0;
    windowStart = now;
  }
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);
