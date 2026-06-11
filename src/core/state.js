/**
 * Lume-JS Reactive State Core
 *
 * Provides minimal reactive state with standard JavaScript.
 * Features automatic microtask batching for performance.
 * Read tracking is opt-in via withReadObserver — state.js has zero permanent
 * dependency on effect.js or any other module.
 *
 * Features:
 * - Lightweight and Go-style
 * - Explicit nested states
 * - $subscribe for listening to key changes
 * - Cleanup with unsubscribe
 * - Per-state microtask batching for writes
 * - Scope-based read tracking via withReadObserver (multi-observer safe)
 *
 * Usage:
 *   import { state } from "lume-js";
 *
 *   const store = state({ count: 0 });
 *   const unsub = store.$subscribe("count", val => console.log(val));
 *   unsub(); // cleanup
 */

import { logError, logWarn } from '../utils/log.js';

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

// Active read observers — only populated during withReadObserver scopes.
// This keeps state.js pure: tracking only happens when someone explicitly
// asks to observe reads within a synchronous function call.
//
// Note: This Set is module-level, so all reactive state instances and effects
// within the SAME module instance share it. This is standard behavior for
// auto-tracking reactive libraries (Vue, MobX, Solid, etc.). Multiple copies
// of the lume-js module (e.g. from different bundled chunks) each get their
// own independent Set via ES module / CommonJS isolation.
const readers = new Set();

/**
 * Brand symbol stamped on every object passed to state().
 *
 * Uses the global symbol registry (Symbol.for) so independent copies of
 * lume-js on the same page (e.g. a CDN build next to a bundled chunk)
 * agree on the same brand. This is a type tag for reliable detection
 * (see isReactive in addons), not a security boundary — any code can
 * stamp it.
 *
 * Internal API — exported for addons; not re-exported from the package root.
 */
export const REACTIVE_BRAND = Symbol.for('lume.reactive');

/**
 * Run a function with a read observer active.
 * The observer receives (proxy, key, registerEffect) for every property read.
 * Multiple observers can be active simultaneously (nested effects, devtools, etc.)
 *
 * Internal API — used by effect.js for auto-tracking. May be stabilized
 * for third-party addons in a future release.
 *
 * @security The observer sees reads from ALL state instances within the same
 * module instance, including nested scopes. Only pass trusted observer functions.
 * A future scoped variant (e.g., scopedReadObserver(store, fn)) may limit
 * observation to a single state instance.
 *
 * @param {function} onRead - Called on each property access inside fn
 * @param {function} fn - The function to run under observation
 */
export function withReadObserver(onRead, fn) {
  readers.add(onRead);
  try {
    return fn();
  } finally {
    readers.delete(onRead);
  }
}

export function state(obj) {
  // Validate input
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('state() requires a plain object');
  }
  if (Object.isFrozen(obj) || Object.isSealed(obj)) {
    throw new Error('state() requires a mutable plain object');
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
   * 3) Repeat up to 100 iterations to handle cascading updates,
   *    then log an error to prevent infinite loops.
   *
   * Notes:
   * - Batching is per state; effects that depend on multiple states
   *   may run once per state that changed (by design).
   */
  function scheduleFlush() {
    if (flushScheduled) return;

    flushScheduled = true;
    // eslint-disable-next-line sonarjs/cognitive-complexity -- single-pass flush loop: hooks → subscribers → effects → cycle detection; must stay atomic
    queueMicrotask(() => {
      let iterations = 0;
      const MAX_ITERATIONS = 100;

      try {
        while ((pendingNotifications.size > 0 || pendingEffects.size > 0) && iterations < MAX_ITERATIONS) {
          iterations++;

          // Run registered before-flush hooks (e.g. plugin onNotify)
          for (let i = 0; i < beforeFlushHooks.length; i++) {
            try {
              beforeFlushHooks[i]();
            } catch (err) {
              logError('[Lume.js state] Error in beforeFlush hook:', err);
            }
          }

          // Notify all subscribers of changed keys
          for (const [key, value] of pendingNotifications) {
            if (listeners[key]) {
              const subs = listeners[key];
              let i = 0;
              while (i < subs.length) {
                const fn = subs[i];
                try {
                  fn(value);
                } catch (err) {
                  logError(`[Lume.js state] Error notifying subscriber for key "${String(key)}":`, err);
                }
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
            try {
              effects[i]();
            } catch (err) {
              logError('[Lume.js state] Error in effect:', err);
            }
          }
        }
      } finally {
        flushScheduled = false;
      }

      if (iterations >= MAX_ITERATIONS) {
        logError(
          '[Lume.js state] Maximum flush iterations reached (100). ' +
          'This usually indicates an infinite loop caused by an effect or computed mutating state it depends on.'
        );
      }
    });
  }

  // Stamp the shared brand (non-enumerable: spreads/Object.assign copies
  // of a store do not inherit the brand and won't masquerade as reactive).
  Object.defineProperty(obj, REACTIVE_BRAND, { value: true });

  const MAX_SUBSCRIBERS = 1000;
  const noopUnsubscribe = () => {};

  /**
   * Shared listener registration with a per-key cap (subscriber DoS
   * protection). Applied identically to $subscribe callbacks and effect
   * subscriptions so both paths degrade the same way: a loud console
   * error and a no-op unsubscribe.
   */
  function addListener(key, fn, kind) {
    if (!listeners[key]) listeners[key] = [];
    if (listeners[key].length >= MAX_SUBSCRIBERS) {
      logError(
        `[Lume.js state] Subscriber limit (${MAX_SUBSCRIBERS}) reached for key "${String(key)}". ` +
        `${kind} ignored — it will NOT receive updates. ` +
        'This usually means subscriptions are created in a loop without cleanup.'
      );
      return noopUnsubscribe;
    }
    listeners[key].push(fn);
    return () => {
      if (listeners[key]) {
        const idx = listeners[key].indexOf(fn);
        if (idx !== -1) {
          listeners[key].splice(idx, 1);
          if (listeners[key].length === 0) delete listeners[key];
        }
      }
    };
  }

  // Defined once per state instance — not per property read — to avoid per-read closure allocation.
  const registerEffect = (key, executeFn) => {
    const callback = () => {
      pendingEffects.add(executeFn);
    };
    return addListener(key, callback, 'Effect subscription');
  };

  const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

  const proxy = new Proxy(obj, {
    get(target, key) {
      // Skip effect tracking for internal meta methods (e.g. $subscribe)
      if (typeof key === 'string' && key.startsWith('$')) {
        return target[key];
      }

      const value = target[key];

      // Notify active read observers (effects, devtools, etc.)
      if (readers.size > 0) {
        for (const reader of readers) {
          reader(proxy, key, registerEffect);
        }
      }

      return value;
    },

    set(target, key, value) {
      if (typeof key === 'string' && BLOCKED_KEYS.has(key)) {
        logWarn(`[Lume.js state] Blocked write to reserved key "${key}"`);
        return true;
      }

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
    if (beforeFlushHooks.indexOf(fn) === -1) {
      beforeFlushHooks.push(fn);
    }
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

    const unsubscribe = addListener(key, fn, 'New subscriber');

    // Over the cap: listener was not added, skip the immediate call too
    if (unsubscribe === noopUnsubscribe) return unsubscribe;

    // Call immediately with current value (NOT batched)
    fn(proxy[key]);

    return unsubscribe;
  };

  return proxy;
}
