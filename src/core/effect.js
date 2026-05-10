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
 * - Explicit dependencies for side-effects
 * - Returns cleanup function
 * - Compatible with per-state batching
 */

// Module-scoped effect context (prevents third-party spoofing via globalThis)
let currentEffect = null;

// withReadObserver is used below to scope read tracking to synchronous effect execution.

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
// eslint-disable-next-line sonarjs/cognitive-complexity -- handles both auto-tracking and explicit-deps modes with cleanup; splitting would require exporting internal state
export function effect(fn, deps) {
  if (typeof fn !== 'function') {
    throw new Error('effect() requires a function');
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

  // EXPLICIT DEPS MODE: deps array provided
  if (Array.isArray(deps)) {
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
              execute();
            });
            cleanups.push(unsub);
          }
        }
      }
    }
    // Run immediately
    execute();
  }
  // AUTO-TRACKING MODE: no deps (existing behavior)
  else {
    const executeWithTracking = () => {
      /* v8 ignore next -- defensive guard: synchronous re-entry is unreachable through the public API */
      if (isRunning) return;

      // Save previous subscriptions instead of cleaning immediately.
      // If fn() doesn't read any state (early return / error), we restore
      // them so the effect stays reactive.
      const oldCleanups = cleanups.splice(0);

      const myContext = {
        fn,
        cleanups,
        execute: executeWithTracking,
        tracking: new WeakMap()
      };

      // Set as current effect (for state.js to detect)
      // Save previous context to support nested effects/computed
      const previousEffect = currentEffect;
      currentEffect = myContext;
      isRunning = true;

      try {
        const onRead = (proxy, key, registerEffect) => {
          // Only the currently active effect (not a nested one) creates subscriptions
          if (currentEffect !== myContext) return;
          let keys = myContext.tracking.get(proxy);
          if (!keys) {
            keys = new Set();
            myContext.tracking.set(proxy, keys);
          }
          if (keys.has(key)) return;
          keys.add(key);
          myContext.cleanups.push(registerEffect(key, myContext.execute));
        };
        withReadObserver(onRead, fn);
      } catch (error) {
        // On error, restore old subscriptions so the effect stays reactive
        cleanups.length = 0;
        cleanups.push(...oldCleanups);
        logError('[Lume.js effect] Error in effect:', error);
        throw error;
      } finally {
        // Restore previous context (not undefined) to support nesting
        currentEffect = previousEffect;
        isRunning = false;
      }

      // If fn() created new subscriptions, clean old ones.
      // If it didn't (e.g., early return), keep old subscriptions intact.
      if (cleanups.length > 0) {
        for (const cleanup of oldCleanups) cleanup();
      } else {
        cleanups.push(...oldCleanups);
      }
    };

    // Run immediately to collect initial dependencies
    executeWithTracking();
  }

  // Return cleanup function
  return () => {
    // while/pop is faster than forEach
    while (cleanups.length) cleanups.pop()();
  };
}