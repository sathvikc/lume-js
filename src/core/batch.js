/**
 * Lume-JS Cross-Store Batching
 *
 * While batchDepth > 0, states skip their microtask flush and enqueue a
 * small flush handle here instead (via enqueueIfBatching, called from
 * state.js's scheduler); batch() drains the set synchronously when the
 * outermost batch ends. Effects collected from all enqueued states run
 * from one Set per wave, so an effect depending on several mutated stores
 * runs exactly once per batch instead of once per store.
 *
 * This module never imports state.js — state.js imports from here — so
 * there is no cycle, no global scheduler object, and no import side effect.
 */

import { logError, logWarn } from '../utils/log.js';

// Cap for cascading flush waves (effects mutating state that re-triggers
// effects). Shared with the per-state microtask flush in state.js.
export const MAX_FLUSH_ITERATIONS = 100;

let batchDepth = 0;
const batchedStates = new Set();

/**
 * Called by state.js when a write is scheduled. Returns true if a batch is
 * active and the state's flush handle was captured (the caller must then
 * skip its own microtask scheduling).
 *
 * Internal API between core modules — not exported from the package root.
 *
 * @param {{runBeforeFlushHooks: function, notifySubscribers: function, takeEffects: function}} handle
 * @returns {boolean}
 */
export function enqueueIfBatching(handle) {
  if (batchDepth === 0) return false;
  batchedStates.add(handle);
  return true;
}

function flushBatchedStates() {
  let iterations = 0;
  while (batchedStates.size > 0 && iterations < MAX_FLUSH_ITERATIONS) {
    iterations++;
    const wave = Array.from(batchedStates);
    batchedStates.clear();

    // Notify each state's subscribers, collecting effects into one
    // deduplicated set (the same effect queued by N stores runs once).
    const effects = new Set();
    for (const s of wave) {
      s.runBeforeFlushHooks();
      s.notifySubscribers();
      for (const fx of s.takeEffects()) effects.add(fx);
    }

    // Effects run after all subscribers of the wave. Writes they make
    // re-enter batchedStates (depth is still held) → next iteration.
    for (const fx of effects) {
      try { fx(); }
      catch (err) { logError('[Lume.js state] Error in effect:', err); }
    }
  }
  if (iterations >= MAX_FLUSH_ITERATIONS) {
    // Drop the runaway wave so a future, unrelated batch doesn't inherit
    // it. Nothing is lost permanently: the states keep their queued work
    // and flush it on their next write via the normal microtask path.
    batchedStates.clear();
    logError(
      '[Lume.js state] Maximum batch flush iterations reached (100). ' +
      'This usually indicates an infinite loop caused by an effect or computed mutating state it depends on.'
    );
  }
}

/**
 * Group multiple state writes and flush them together, synchronously,
 * when the outermost batch() returns.
 *
 * Guarantees:
 * - Subscribers see only the final value of each key (intermediate writes
 *   within the batch are coalesced, as with microtask batching).
 * - An effect that depends on several stores mutated in the batch runs
 *   exactly ONCE — unlike microtask batching, which is per-state and runs
 *   such effects once per store.
 * - Nested batch() calls are absorbed: everything flushes when the
 *   outermost batch ends.
 * - If fn throws, writes made before the throw still flush, then the
 *   error propagates. State scheduling is left clean either way.
 *
 * `fn` must be synchronous — writes after an `await` happen outside the
 * batch and fall back to normal per-state microtask flushing (a console
 * warning is logged if fn returns a Promise).
 *
 * @param {function} fn - Function performing state writes
 * @returns {*} The return value of fn
 *
 * @example
 * import { state, effect, batch } from 'lume-js';
 *
 * const a = state({ value: 1 });
 * const b = state({ value: 2 });
 * effect(() => render(a.value + b.value));
 *
 * batch(() => {
 *   a.value = 10;
 *   b.value = 20;
 * }); // render() ran exactly once, seeing 30
 */
export function batch(fn) {
  if (typeof fn !== 'function') {
    throw new Error('batch() requires a function');
  }

  // Nested batch: let the outermost batch flush everything
  if (batchDepth > 0) return fn();

  batchDepth++;
  let result;
  try {
    result = fn();
    if (result && typeof result.then === 'function') {
      logWarn(
        '[Lume.js batch] batch() received an async function. Only writes before the first await are batched; ' +
        'later writes flush via normal microtasks.'
      );
    }
    return result;
  } finally {
    // Flush while depth is still held so cascading writes from
    // subscribers/effects keep collecting into batchedStates (deduped),
    // then release. Runs on success AND when fn throws (writes made
    // before the throw are committed, then the error propagates).
    try {
      flushBatchedStates();
    } finally {
      batchDepth--;
    }
  }
}
