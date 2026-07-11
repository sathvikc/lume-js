import { withReadObserver } from './state.js';
import { logError } from '../utils/log.js';

/**
 * Lume-JS Effect
 *
 * Reactive effects with two modes:
 * 1. Auto-tracking (default): Tracks dependencies automatically via withReadObserver
 * 2. Explicit deps: You specify exactly what triggers re-runs
 *
 * Auto-tracking uses scope-based read observation — state.js has zero permanent
 * dependency on this module. Read tracking is only active during the synchronous
 * execution of an effect's body.
 *
 * Usage:
 *   import { effect } from "lume-js";
 *
 *   // Auto-tracking mode (existing behavior)
 *   effect(() => {
 *     console.log('Count is:', store.count);
 *     // Automatically re-runs when store.count changes
 *   });
 *
 *   // Explicit deps mode (new - no magic)
 *   effect(() => {
 *     console.log('Count is:', store.count);
 *   }, [[store, 'count']]);  // Only re-runs when store.count changes
 *
 * Features:
 * - Automatic dependency collection via withReadObserver scope (default)
 * - Subscriptions persist across runs: a re-run with the same reads makes
 *   zero subscribe/unsubscribe calls and zero allocations; dependencies the
 *   effect stopped reading are swept by run generation
 * - Explicit dependencies for side-effects
 * - Explicit-deps notifications are coalesced: one run per microtask,
 *   no matter how many tracked keys (or stores) changed in the same tick
 * - Returns cleanup function
 * - Compatible with per-state batching
 */

// Module-scoped effect context (prevents third-party spoofing via globalThis)
let currentEffect = null;

// withReadObserver is used below to scope read tracking to synchronous effect execution.

/**
 * Auto-tracking effect runner with persistent subscriptions.
 *
 * Dependencies live in a per-effect registry (proxy -> key -> record) that
 * survives across runs: a re-run whose reads match the previous run makes
 * zero subscriptions, zero unsubscriptions, and zero allocations — it only
 * stamps each record with the current run generation. Records not stamped
 * by the latest completed run (a dependency the effect stopped reading)
 * are swept afterwards. Runs that read nothing, and runs that throw, keep
 * every subscription so the effect stays reactive.
 *
 * @param {function} fn - The effect body
 * @returns {function} Disposer that unsubscribes everything
 */
function autoTrackedEffect(fn) {
  const deps = new Map(); // proxy -> Map<key, { unsub, gen }>
  let totalDeps = 0;
  let runGen = 0;
  let gen = 0;
  let seen = 0; // existing records re-read this run
  let added = 0; // new subscriptions made this run
  let isRunning = false;
  const context = {}; // identity: attributes reads to this effect, not a nested one

  const onRead = (proxy, key, registerEffect) => {
    // Only the currently active effect (not a nested one) tracks the read
    if (currentEffect !== context) return;
    let byKey = deps.get(proxy);
    if (!byKey) {
      byKey = new Map();
      deps.set(proxy, byKey);
    }
    const rec = byKey.get(key);
    if (rec) {
      if (rec.gen !== gen) {
        rec.gen = gen;
        seen++;
      }
      return;
    }
    byKey.set(key, { unsub: registerEffect(key, run), gen });
    added++;
    totalDeps++;
  };

  function sweep() {
    for (const [proxy, byKey] of deps) {
      for (const [key, rec] of byKey) {
        if (rec.gen !== gen) {
          rec.unsub();
          byKey.delete(key);
          totalDeps--;
        }
      }
      if (byKey.size === 0) deps.delete(proxy);
    }
  }

  function run() {
    /* v8 ignore next -- defensive guard: synchronous re-entry is unreachable through the public API */
    if (isRunning) return;
    gen = ++runGen;
    seen = 0;
    added = 0;
    // Save previous context to support nested effects/computed
    const previousEffect = currentEffect;
    currentEffect = context;
    isRunning = true;
    try {
      withReadObserver(onRead, fn);
    } catch (error) {
      // Keep every subscription (pre-existing and just-created) so the
      // effect stays reactive after a throwing run.
      logError('[Lume.js effect] Error in effect:', error);
      throw error;
    } finally {
      currentEffect = previousEffect;
      isRunning = false;
    }
    // Sweep dropped dependencies — unless nothing was read (early return:
    // keep the old subscriptions) or every pre-existing record was re-read
    // (the stable case: nothing to drop, skip the walk entirely).
    if (seen + added > 0 && seen < totalDeps - added) sweep();
  }

  run();

  return () => {
    for (const byKey of deps.values()) {
      for (const rec of byKey.values()) rec.unsub();
    }
    deps.clear();
    totalDeps = 0;
  };
}

/**
 * Creates an effect that runs reactively
 *
 * @param {function} fn - Function to run reactively
 * @param {Array<[object, string]>} [deps] - Optional explicit dependencies as [store, key] tuples
 * @returns {function} Cleanup function to stop the effect
 *
 * @example
 * // Auto-tracking (default)
 * const store = state({ count: 0 });
 * effect(() => {
 *   document.title = `Count: ${store.count}`;
 * });
 * 
 * @example
 * // Explicit deps (no magic)
 * effect(() => {
 *   analytics.log(store.count);  // Won't track store.count automatically
 * }, [[store, 'count']]);        // Explicit: only re-run on store.count
 */
export function effect(fn, deps) {
  if (typeof fn !== 'function') {
    throw new Error('effect() requires a function');
  }

  // AUTO-TRACKING MODE (default): persistent subscriptions, generation sweep
  if (!Array.isArray(deps)) {
    return autoTrackedEffect(fn);
  }

  const cleanups = [];
  let isRunning = false;

  /**
   * Execute the effect function
   */
  const execute = () => {
    /* v8 ignore next -- re-entry guard: unreachable because $subscribe fires via microtask after isRunning resets in finally */
    if (isRunning) return;
    isRunning = true;

    try {
      fn();
    } catch (error) {
      logError('[Lume.js effect] Error in effect:', error);
      throw error;
    } finally {
      isRunning = false;
    }
  };

  // EXPLICIT DEPS MODE: subscribe to the given [store, key1, key2, ...] tuples.
  // Coalesce notifications: when several tracked keys change in the same
  // flush (or several stores flush in the same tick), run the effect once
  // per microtask instead of once per changed key. This matches the
  // dedupe guarantee auto-tracking mode gets from the per-state effect queue.
  let scheduled = false;
  let disposed = false;
  cleanups.push(() => { disposed = true; });

  const scheduleExecute = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (disposed) return;
      // execute() logs and re-throws; swallow here so a throwing effect
      // doesn't become an uncaught error inside the microtask (same
      // containment the state flush loop provides for subscribers).
      try { execute(); } catch { /* already logged by execute() */ }
    });
  };

  // Subscribe to each [store, key1, key2, ...] tuple explicitly
  for (const dep of deps) {
    if (Array.isArray(dep) && dep.length >= 2) {
      const [store, ...keys] = dep;
      if (store && typeof store.$subscribe === 'function') {
        // Subscribe to each key in this tuple
        for (const key of keys) {
          // $subscribe calls immediately, then on changes
          // We want: call execute immediately once, then on changes
          let isFirst = true;
          const unsub = store.$subscribe(key, () => {
            if (isFirst) {
              isFirst = false;
              return; // Skip first call, we'll run execute() below
            }
            scheduleExecute();
          });
          cleanups.push(unsub);
        }
      }
    }
  }
  // Run immediately
  execute();

  // Return cleanup function
  return () => {
    // while/pop is faster than forEach
    while (cleanups.length) cleanups.pop()();
  };
}