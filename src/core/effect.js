/**
 * Lume-JS Effect
 * 
 * Reactive effects with two modes:
 * 1. Auto-tracking (default): Tracks dependencies automatically
 * 2. Explicit deps: You specify exactly what triggers re-runs
 * 
 * Part of core because it's fundamental to modern reactivity.
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
 * - Automatic dependency collection (default)
 * - Explicit dependencies for side-effects
 * - Returns cleanup function
 * - Compatible with per-state batching
 */

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

  const cleanups = [];
  let isRunning = false;

  /**
   * Execute the effect function
   */
  const execute = () => {
    if (isRunning) return;
    isRunning = true;

    try {
      fn();
    } catch (error) {
      console.error('[Lume.js effect] Error in effect:', error);
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
      if (isRunning) return;

      // Clean up previous subscriptions
      cleanups.forEach(cleanup => cleanup());
      cleanups.length = 0;

      // Create effect context for tracking
      const effectContext = {
        fn,
        cleanups,
        execute: executeWithTracking,
        tracking: {}
      };

      // Set as current effect (for state.js to detect)
      globalThis.__LUME_CURRENT_EFFECT__ = effectContext;
      isRunning = true;

      try {
        fn();
      } catch (error) {
        console.error('[Lume.js effect] Error in effect:', error);
        throw error;
      } finally {
        globalThis.__LUME_CURRENT_EFFECT__ = undefined;
        isRunning = false;
      }
    };

    // Run immediately to collect initial dependencies
    executeWithTracking();
  }

  // Return cleanup function
  return () => {
    cleanups.forEach(cleanup => cleanup());
    cleanups.length = 0;
  };
}