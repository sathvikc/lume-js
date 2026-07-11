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

// ── FLIP: measure, mutate, measure, invert, play ───────────────────────────
const EASE = 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)';

async function withFlip(mutate) {
  // Reads and writes are strictly phase-separated throughout: interleaving
  // getBoundingClientRect with style writes forces a style recalc per tile
  // and turns the whole thing O(n²) — a ~300ms stall at 1,000 tiles.

  // First: where every tile is now. Rects include in-flight transforms, so
  // interrupting a running animation starts the next one from the visual
  // position instead of jumping.
  const before = [...board.children];
  const first = new Map();
  for (const el of before) first.set(el, el.getBoundingClientRect());
  for (const el of before) {
    el.style.transition = 'none';
    el.style.transform = '';
  }

  mutate();
  // The write above schedules Lume's per-state flush as a microtask;
  // awaiting here queues this continuation after it, so the DOM is
  // reconciled but nothing has painted yet.
  await Promise.resolve();

  // Last: measure everything first...
  const after = [...board.children];
  const last = new Map();
  for (const el of after) {
    if (first.has(el)) last.set(el, el.getBoundingClientRect());
  }

  // ...then invert: put every moved tile visually back where it was.
  let moved = 0;
  let reused = 0;
  const players = [];
  for (const el of after) {
    const f = first.get(el);
    if (!f) {
      // Brand-new node: scale in.
      el.style.transition = 'none';
      el.style.transform = 'scale(0.3)';
      el.style.opacity = '0';
      players.push(el);
      continue;
    }
    reused++;
    const l = last.get(el);
    const dx = f.left - l.left;
    const dy = f.top - l.top;
    if (dx || dy) {
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      players.push(el);
      moved++;
    }
  }

  // Force one style/layout pass so the inverted transforms are the starting
  // point, then release everything to transition back to its natural spot.
  void board.offsetHeight;
  for (const el of players) {
    el.style.transition = EASE + ', opacity 480ms ease-out';
    el.style.transform = '';
    el.style.opacity = '';
  }

  ui.moved = moved.toLocaleString('en-US');
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
let stormTimer = null;
stormBtn.addEventListener('click', () => {
  if (stormTimer) {
    clearInterval(stormTimer);
    stormTimer = null;
    stormBtn.textContent = 'Storm';
    stormBtn.classList.remove('storm-on');
    return;
  }
  stormBtn.textContent = 'Stop storm';
  stormBtn.classList.add('storm-on');
  stormTimer = setInterval(() => {
    const swaps = Math.max(4, Math.round(store.tiles.length / 12));
    withFlip(() => { store.tiles = withRandomSwaps(store.tiles, swaps); });
  }, 550);
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
