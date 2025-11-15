/**
 * Lume-JS Reactive State Core
 *
 * Provides minimal, zero-runtime reactive state.
 * 
 * Features:
 * - Lightweight and Go-style
 * - Explicit nested states
 * - subscribe for listening to key changes
 *
 * Usage:
 *   import { state } from "lume-js";
 *   const store = state({ count: 0 });
 *   store.subscribe("count", val => console.log(val));
 */


/**
 * Creates a reactive state object.
 * 
 * @param {Object} obj - Initial state object
 * @returns {Proxy} Reactive proxy with subscribe method
 */
export function state(obj) {
  const listeners = {};

  // Notify subscribers of a key
  function notify(key, val) {
    if (listeners[key]) listeners[key].forEach(fn => fn(val));
  }

  const proxy = new Proxy(obj, {
    get(target, key) {
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      notify(key, value);
      return true;
    }
  });

  /**
   * Subscribe to changes for a specific key.
   * Calls the callback immediately with the current value.
   * 
   * @param {string} key 
   * @param {function} fn 
   */
  proxy.subscribe = (key, fn) => {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
    fn(proxy[key]); // initialize
  };

  return proxy;
}
