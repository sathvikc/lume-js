import { getCurrentEffect } from './effect.js';

/**
 * Lume-JS Reactive State Core
 *
 * Provides minimal reactive state with standard JavaScript.
 * Features automatic microtask batching for performance.
 * Supports automatic dependency tracking for effects.
 *
 * Features:
 * - Lightweight and Go-style
 * - Explicit nested states
 * - $subscribe for listening to key changes
 * - Cleanup with unsubscribe
 * - Per-state microtask batching for writes
 * - Effect dependency tracking support (deduped per state flush)
 *
 * Usage:
 *   import { state } from "lume-js";
 *
 *   const store = state({ count: 0 });
 *   const unsub = store.$subscribe("count", val => console.log(val));
 *   unsub(); // cleanup
 */

// Per-state batching – each state object maintains its own microtask flush.
// This keeps effects simple and aligned with Lume's minimal philosophy.

/**
 * Creates a reactive state object.
 *
 * @param {Object} obj - Initial state object (must be plain object)
 * @returns {Proxy} Reactive proxy with $subscribe method
 *
 * @example
 * const store = state({ count: 0 });
 */

export function state(obj) {
  // Validate input
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('state() requires a plain object');
  }

  // Object.create(null) - no prototype chain lookups
  const listeners = Object.create(null);
  const pendingNotifications = new Map(); // Per-state pending changes
  const pendingEffects = new Set(); // Dedupe effects per state
  const beforeFlushHooks = [];
  let flushScheduled = false;

  /**
   * Schedule a single microtask flush for this state object.
   *
   * Flush order per state:
   * 1) Notify subscribers for changed keys (key → subscribers)
   * 2) Run each queued effect exactly once (Set-based dedupe)
   *
   * Notes:
   * - Batching is per state; effects that depend on multiple states
   *   may run once per state that changed (by design).
   */
  function scheduleFlush() {
    if (flushScheduled) return;

    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;

      // Run registered before-flush hooks (e.g. plugin onNotify)
      for (let i = 0; i < beforeFlushHooks.length; i++) {
        beforeFlushHooks[i]();
      }

      // Notify all subscribers of changed keys
      for (const [key, value] of pendingNotifications) {
        if (listeners[key]) {
          const subs = listeners[key];
          let i = 0;
          while (i < subs.length) {
            const fn = subs[i];
            fn(value);
            // Only advance if fn wasn't removed (something shifted into its place)
            if (subs[i] === fn) i++;
          }
        }
      }

      pendingNotifications.clear();

      // Run each effect exactly once (Set deduplicates)
      const effects = new Array(pendingEffects.size);
      let idx = 0;
      for (const effect of pendingEffects) {
        effects[idx++] = effect;
      }
      pendingEffects.clear();
      for (let i = 0; i < effects.length; i++) {
        effects[i]();
      }
    });
  }

  // Brand symbol for type-level reactive identification
  const REACTIVE_BRAND = Symbol.for('lume.reactive');
  obj[REACTIVE_BRAND] = true;

  const proxy = new Proxy(obj, {
    get(target, key) {
      // Skip effect tracking for internal meta methods (e.g. $subscribe)
      if (typeof key === 'string' && key.startsWith('$')) {
        return target[key];
      }

      const value = target[key];

      // Effect tracking — check if we're inside an effect context
      const currentEffect = getCurrentEffect();
      if (currentEffect && !currentEffect.tracking[key]) {
        // Mark as tracked
        currentEffect.tracking[key] = true;

        // Subscribe to changes for this key (skip initial call for effects)
        const unsubscribe = (() => {
          if (!listeners[key]) listeners[key] = [];

          const effectFn = () => {
            // Queue effect in this state's pending set
            // Set deduplicates - effect runs once even if multiple keys change
            pendingEffects.add(currentEffect.execute);
          };

          listeners[key].push(effectFn);

          // Return unsubscribe function (no initial call for effects)
          return () => {
            if (listeners[key]) {
              const idx = listeners[key].indexOf(effectFn);
              if (idx !== -1) {
                listeners[key].splice(idx, 1);
                if (listeners[key].length === 0) delete listeners[key];
              }
            }
          };
        })();

        // Store cleanup function
        currentEffect.cleanups.push(unsubscribe);
      }

      return value;
    },

    set(target, key, value) {
      const oldValue = target[key];

      // Skip update if value unchanged - Object.is() handles NaN and -0 correctly
      if (Object.is(oldValue, value)) return true;

      target[key] = value;

      // Batch notifications at the state level (per-state, not global)
      pendingNotifications.set(key, value);
      scheduleFlush();

      return true;
    }
  });

  /**
   * Subscribe to changes for a specific key.
   * Calls the callback immediately with the current value.
   * Returns an unsubscribe function for cleanup.
   *
   * @param {string} key - Property key to watch
   * @param {function} fn - Callback function
   * @returns {function} Unsubscribe function
   */
  // Set on obj (not proxy) to avoid triggering the set trap.
  // The get trap already returns target[key] directly for $-prefixed keys.
  /**
   * Register a callback to run before each flush.
   * Returns an unsubscribe function.
   */
  obj.$beforeFlush = (fn) => {
    if (typeof fn !== 'function') {
      throw new Error('$beforeFlush requires a function');
    }
    beforeFlushHooks.push(fn);
    return () => {
      const idx = beforeFlushHooks.indexOf(fn);
      if (idx !== -1) {
        beforeFlushHooks.splice(idx, 1);
      }
    };
  };

  obj.$subscribe = (key, fn) => {
    if (typeof fn !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);

    // Call immediately with current value (NOT batched)
    fn(proxy[key]);

    // Return unsubscribe function
    return () => {
      if (listeners[key]) {
        const idx = listeners[key].indexOf(fn);
        if (idx !== -1) {
          listeners[key].splice(idx, 1);
          if (listeners[key].length === 0) delete listeners[key];
        }
      }
    };
  };

  return proxy;
}
