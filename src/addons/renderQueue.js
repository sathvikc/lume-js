/**
 * Lume-JS renderQueue Addon (EXPERIMENTAL)
 *
 * @experimental Shipping as an experimental addon. The scheduling model is
 * validated by prototype but the API surface (schedule/flush/size, the
 * data-priority tiers) may change before it graduates to production. State
 * semantics are never affected — only presentation is scheduled.
 *
 * Makes *presentation* updates (DOM writes that mirror state) schedulable:
 * budgeted per frame, priority-ordered, and preempted by pending input.
 * State stays fully synchronous — only the pixels are scheduled.
 *
 * The load-bearing idea is the track/apply split. `track()` runs inside
 * Lume's normal flush under a real effect(), so any state read auto-arms
 * a re-run and only marks the entry dirty. `apply()` runs later, from the
 * per-frame drain, untracked, reading current state. Coalescing is
 * structural: dirty entries live in a Set keyed by entry, so N writes
 * between drains produce exactly one apply() with the latest value.
 *
 * Usage:
 *   import { renderQueue } from "lume-js/addons";
 *
 *   const queue = renderQueue({ budgetMs: 2 });
 *   const dispose = queue.schedule({
 *     el,                       // anchor Element — decides priority
 *     track: () => store.hue,   // tracked read, runs in the flush
 *     apply: () => { el.style.setProperty('--h', store.hue); }, // the DOM write
 *   });
 *
 * Drain order per frame: high -> visible-auto -> low/offscreen-auto -> idle.
 * `idle` entries only run when everything else fit inside the budget.
 * Within a tier the Set iterates in insertion order and re-dirtying an entry
 * moves it to the back, so draining is FIFO and no entry can starve.
 *
 * @module addons/renderQueue
 */

import { effect } from '../core/effect.js';
import { logError } from '../utils/log.js';

const TIERS = { high: true, low: true, idle: true };

/** Throw the addon's schedule() validation error with a shared prefix. */
function reject(what) {
  throw new Error('[Lume.js] renderQueue(): schedule() requires ' + what);
}

/** Schedule a callback for a later frame, degrading to setTimeout off-DOM. */
function raf(fn) {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fn);
  else setTimeout(fn, 16);
}

/** Monotonic-ish clock; falls back to Date.now() in constrained runtimes. */
function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** True when the platform reports a user input waiting to be handled. */
function inputPending() {
  return typeof navigator !== 'undefined' &&
    navigator.scheduling &&
    typeof navigator.scheduling.isInputPending === 'function'
    ? navigator.scheduling.isInputPending()
    : false;
}

/**
 * Resolve an entry's tier: explicit option -> nearest [data-priority]
 * ancestor -> 'auto' (inferred by viewport visibility at drain time).
 */
function resolveTier(el, priority) {
  if (TIERS[priority]) return priority;
  if (typeof el.closest === 'function') {
    const node = el.closest('[data-priority]');
    const attr = node && node.getAttribute('data-priority');
    if (TIERS[attr]) return attr;
  }
  return 'auto';
}

/**
 * Creates a priority-scheduled presentation queue.
 *
 * The queue owns no global state and starts no idle loop — a drain is only
 * scheduled while dirty entries exist, keeping the module side-effect free.
 *
 * @param {{ budgetMs?: number }} [options]
 * @param {number} [options.budgetMs=2] Max ms of apply() work per frame.
 *   A non-positive or non-finite value falls back to the default.
 * @returns {{ schedule: function, flush: function, size: number }}
 *
 * @example
 * const queue = renderQueue({ budgetMs: 2 });
 * const stop = queue.schedule({ el, track, apply });
 * queue.size;      // current backlog (honest — surface it in degrading UIs)
 * queue.flush();   // apply everything now, ignoring budget (teardown/tests)
 * stop();          // dispose this entry
 */
export function renderQueue(options) {
  const budgetMs = options && Number.isFinite(options.budgetMs) && options.budgetMs > 0
    ? options.budgetMs
    : 2;

  const dirty = new Set();
  const visible = new WeakMap();
  let scheduled = false;

  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target, e.isIntersecting);
    })
    : null;

  const isVisible = (el) => (io ? visible.get(el) !== false : true);

  function runApply(apply) {
    try {
      apply();
    } catch (err) {
      logError('[Lume.js] renderQueue(): error in apply():', err);
    }
  }

  function applyRec(rec) {
    dirty.delete(rec);
    runApply(rec.apply);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    raf(drain);
  }

  /** Drain one tier; returns true if the budget tripped (stop the frame). */
  function drainTier(match, over) {
    for (const rec of dirty) {
      if (!match(rec)) continue;
      applyRec(rec);
      if (over()) return true;
    }
    return false;
  }

  // Idle tier. Only reached when the frame stayed under budget, which means
  // tiers 1-3 already drained every non-idle entry — so all that remains in
  // `dirty` here is idle work. Still budget- and input-bounded per entry.
  function drainIdle(t0) {
    for (const rec of dirty) {
      if (now() - t0 > budgetMs || inputPending()) return;
      applyRec(rec);
    }
  }

  function drain() {
    scheduled = false;
    const t0 = now();
    let n = 0;
    const over = () => {
      n++;
      return (n & 7) === 0 && (now() - t0 > budgetMs || inputPending());
    };
    const stopped =
      drainTier((r) => r.tier === 'high', over) ||
      drainTier((r) => r.tier === 'auto' && isVisible(r.el), over) ||
      drainTier((r) => r.tier === 'low' || (r.tier === 'auto' && !isVisible(r.el)), over);
    if (!stopped) drainIdle(t0);
    if (dirty.size) schedule();
  }

  return {
    get size() {
      return dirty.size;
    },

    /**
     * Register a scheduled presentation entry.
     *
     * apply() runs once synchronously now (immediate first paint), then again
     * from the drain whenever a tracked read changes.
     *
     * @param {{ el: Element, track: function, apply: function,
     *   priority?: 'high'|'low'|'idle' }} entry
     * @returns {function} dispose — stops tracking, drops the entry, unobserves.
     */
    schedule(entry) {
      const { el, track, apply, priority } = entry || {};
      if (!el) reject('an el Element');
      if (typeof track !== 'function') reject('a track function');
      if (typeof apply !== 'function') reject('an apply function');

      const rec = { el, apply, tier: resolveTier(el, priority) };
      if (io) io.observe(el);
      runApply(apply); // immediate first paint; nothing queued yet

      // The effect runs synchronously on creation: that first run only arms
      // dependency tracking (we already painted). Later runs mark dirty.
      let primed = false;
      const dispose = effect(() => {
        track();
        if (!primed) { primed = true; return; }
        dirty.delete(rec);
        dirty.add(rec);
        schedule();
      });

      return () => {
        dispose();
        dirty.delete(rec);
        if (io) io.unobserve(el);
      };
    },

    /** Apply every dirty entry synchronously, ignoring budget and priority. */
    flush() {
      for (const rec of dirty) applyRec(rec);
    },
  };
}
