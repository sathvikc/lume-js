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
 * - batch() for grouping writes across states with cross-store effect dedupe
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
import { enqueueIfBatching, MAX_FLUSH_ITERATIONS } from './batch.js';

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

// batch() lives in ./batch.js (which never imports this module — no cycle).
// state.js participates through enqueueIfBatching in scheduleFlush below.

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
  // EXPERIMENT: live count of subscriptions across all keys (both $subscribe
  // callbacks and effect subscriptions register through addListener). Kept in
  // sync there so the set trap can skip all notify/flush work for a store that
  // nothing observes — the "no-subscriber fast path" (see the set trap below).
  let listenerCount = 0;

  // ── Flush steps ──────────────────────────────────────────────────────
  // Named pieces shared by the per-state microtask flush and batch().

  function runBeforeFlushHooks() {
    for (let i = 0; i < beforeFlushHooks.length; i++) {
      try {
        beforeFlushHooks[i]();
      } catch (err) {
        logError('[Lume.js state] Error in beforeFlush hook:', err);
      }
    }
  }

  function notifySubscribers() {
    // Drain BEFORE delivering. Iterating the live Map is wrong twice over:
    // a subscriber writing back to an already-delivered key would update
    // the in-flight entry (never revisited) and the trailing clear() would
    // destroy it — a silently lost update; and a subscriber opening a
    // batch() would re-deliver every in-flight entry through the wave's
    // re-entrant call. Draining first means write-backs land in the now-
    // empty live Map and are delivered by the next flush iteration/wave.
    // EXPERIMENT: no listeners on any key — skip the Array.from allocation and
    // the delivery loop entirely; just drop the coalesced pending writes. Only
    // reachable now via a beforeFlush-only flush (the set trap short-circuits
    // the common no-observer write before it ever schedules).
    if (listenerCount === 0) { pendingNotifications.clear(); return; }
    const entries = Array.from(pendingNotifications);
    pendingNotifications.clear();
    for (const [key, value] of entries) {
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
  }

  /** Drain queued effects (Set deduplicates) into an array. */
  function takeEffects() {
    const effects = Array.from(pendingEffects);
    pendingEffects.clear();
    return effects;
  }

  // Handle this state gives batch() — flush steps only, no live queues.
  const batchHandle = { runBeforeFlushHooks, notifySubscribers, takeEffects };

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
   *   may run once per state that changed (by design). Use batch() to
   *   group writes across states and run such effects once.
   * - Inside batch(), the microtask is skipped: the state enqueues
   *   itself for the synchronous flush at the end of the batch.
   */
  function scheduleFlush() {
    // Inside batch(): the batch captures this state's flush handle and
    // flushes synchronously at the end — skip the microtask.
    if (enqueueIfBatching(batchHandle)) return;

    if (flushScheduled) return;

    flushScheduled = true;
    queueMicrotask(() => {
      let iterations = 0;

      try {
        while ((pendingNotifications.size > 0 || pendingEffects.size > 0) && iterations < MAX_FLUSH_ITERATIONS) {
          iterations++;
          runBeforeFlushHooks();
          notifySubscribers();
          const effects = takeEffects();
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

      if (iterations >= MAX_FLUSH_ITERATIONS) {
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
    listenerCount++; // EXPERIMENT: keep the fast-path count in sync
    return () => {
      if (listeners[key]) {
        const idx = listeners[key].indexOf(fn);
        if (idx !== -1) {
          listeners[key].splice(idx, 1);
          listenerCount--; // EXPERIMENT: (idx check makes this fire once per fn)
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

      // EXPERIMENT: no-subscriber fast path. With zero listeners and no
      // beforeFlush hooks nothing observes this write — populating the pending
      // map, enqueuing the store into the batch, and running the flush would
      // notify nobody. This is the pull/plain-data pattern: cell values are
      // read back by a rAF poll, never by a subscriber. Storing the value on
      // the target is the whole job; skip every downstream scheduling cost
      // (O(N) per storm frame in state.js + batch.js). A later subscribe()
      // still delivers the current value immediately, so no update is missed.
      if (listenerCount === 0 && beforeFlushHooks.length === 0) return true;

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
