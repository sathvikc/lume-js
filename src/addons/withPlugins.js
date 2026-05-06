/**
 * Lume-JS withPlugins Addon
 *
 * Wraps a reactive state proxy with a plugin layer that intercepts
 * get/set/notify/subscribe operations via plugin hooks.
 *
 * Only stores that opt into debugging or custom behaviors need this.
 * Core state() is not aware of plugins.
 *
 * Usage:
 *   import { state } from "lume-js";
 *   import { withPlugins, createDebugPlugin } from "lume-js/addons";
 *
 *   const store = withPlugins(state({ count: 0 }), [createDebugPlugin({ label: 'counter' })]);
 */

/**
 * Wrap a reactive state proxy with plugin hooks.
 *
 * Plugin hooks (all optional):
 *   onInit()                         — called once at wrap time
 *   onGet(key, value) → value|void   — intercept/transform reads
 *   onSet(key, newVal, oldVal) → val|void — intercept/transform writes
 *   onNotify(key, value)             — called before subscribers are notified
 *   onSubscribe(key)                 — called when $subscribe is invoked
 *
 * @param {object} store - A reactive proxy from state()
 * @param {Array<object>} plugins - Array of plugin objects
 * @returns {Proxy} A new proxy wrapping the store with plugin behavior
 */
import { logError } from '../utils/log.js';

export function withPlugins(store, plugins = []) {
  if (!plugins.length) return store;

  // Call onInit hooks once at wrap time
  for (const p of plugins) {
    try {
      p.onInit?.();
    } catch (e) {
      logError(`[Lume.js] Plugin "${p.name}" error in onInit:`, e);
    }
  }

  // Track pending notifications for onNotify hooks.
  // Instead of a separate microtask, we hook into the underlying state's
  // flush via $beforeFlush so onNotify and subscribers share one microtask.
  const pendingNotifications = new Map();

  function runNotifyHooks() {
    for (const [key, value] of pendingNotifications) {
      for (const p of plugins) {
        try {
          p.onNotify?.(key, value);
        } catch (e) {
          logError(`[Lume.js] Plugin "${p.name}" error in onNotify:`, e);
        }
      }
    }
    pendingNotifications.clear();
  }

  // Register once on the underlying state; capture unsubscribe for cleanup.
  let flushUnsub;
  if (typeof store.$beforeFlush === 'function') {
    flushUnsub = store.$beforeFlush(runNotifyHooks);
  }

  return new Proxy(store, {
    get(target, key) {
      // $dispose — remove the beforeFlush hook and clear pending state
      if (key === '$dispose') {
        return () => {
          if (flushUnsub) flushUnsub();
          pendingNotifications.clear();
        };
      }

      // Pass $-prefixed meta methods through without interception
      if (typeof key === 'string' && key.startsWith('$')) {
        const method = target[key];
        if (key === '$subscribe' && typeof method === 'function') {
          // Wrap $subscribe to call onSubscribe hooks
          return (subKey, fn) => {
            for (const p of plugins) {
              try {
                p.onSubscribe?.(subKey);
              } catch (e) {
                logError(`[Lume.js] Plugin "${p.name}" error in onSubscribe:`, e);
              }
            }
            return method(subKey, fn);
          };
        }
        return method;
      }

      let value = target[key];

      // onGet chain
      for (const p of plugins) {
        try {
          const r = p.onGet?.(key, value);
          if (r !== undefined) value = r;
        } catch (e) {
          logError(`[Lume.js] Plugin "${p.name}" error in onGet:`, e);
        }
      }

      return value;
    },

    set(target, key, value) {
      const oldValue = target[key];
      let newValue = value;

      // onSet chain
      for (const p of plugins) {
        try {
          const r = p.onSet?.(key, newValue, oldValue);
          if (r !== undefined) newValue = r;
        } catch (e) {
          logError(`[Lume.js] Plugin "${p.name}" error in onSet:`, e);
        }
      }

      // Only queue onNotify if the value actually changed after plugin chain
      if (!Object.is(newValue, oldValue)) {
        pendingNotifications.set(key, newValue);
      }

      target[key] = newValue;
      return true;
    }
  });
}
