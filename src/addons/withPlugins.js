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
export function withPlugins(store, plugins = []) {
  if (!plugins.length) return store;

  // Call onInit hooks once at wrap time
  for (const p of plugins) {
    try {
      p.onInit?.();
    } catch (e) {
      console.error(`[Lume.js] Plugin "${p.name}" error in onInit:`, e);
    }
  }

  // Track pending notifications for onNotify hooks.
  // We intercept set and queue notifications before flushing via a microtask,
  // mirroring the order from the original core (onNotify before subscribers).
  const pendingNotifications = new Map();
  let flushScheduled = false;

  function scheduleNotifyFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      for (const [key, value] of pendingNotifications) {
        for (const p of plugins) {
          try {
            p.onNotify?.(key, value);
          } catch (e) {
            console.error(`[Lume.js] Plugin "${p.name}" error in onNotify:`, e);
          }
        }
      }
      pendingNotifications.clear();
    });
  }

  return new Proxy(store, {
    get(target, key) {
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
                console.error(`[Lume.js] Plugin "${p.name}" error in onSubscribe:`, e);
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
          console.error(`[Lume.js] Plugin "${p.name}" error in onGet:`, e);
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
          console.error(`[Lume.js] Plugin "${p.name}" error in onSet:`, e);
        }
      }

      // Only queue onNotify if the value actually changed after plugin chain
      if (!Object.is(newValue, oldValue)) {
        pendingNotifications.set(key, newValue);
        scheduleNotifyFlush();
      }

      target[key] = newValue;
      return true;
    }
  });
}
